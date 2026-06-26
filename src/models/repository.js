const store = require('./datastore');

function now() {
  return new Date().toISOString();
}

function sanitizeText(value, max = 120) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function ensureCollections(db) {
  db.meta = db.meta || {};
  db.meta.nextTermId = db.meta.nextTermId || Math.max(0, ...db.terms.map((term) => term.id)) + 1;
  db.meta.nextPlanId = db.meta.nextPlanId || 1;
  db.meta.nextReminderId = db.meta.nextReminderId || 1;
  db.meta.nextStatementId = db.meta.nextStatementId || 1;
  db.paymentPlans = db.paymentPlans || [];
  db.reminders = db.reminders || [];
  db.mobileMoneyStatements = db.mobileMoneyStatements || [];
  db.auditLogs = db.auditLogs || [];
  return db;
}

function findUser(username) {
  const db = ensureCollections(store.read());
  return db.users.find((user) => user.username.toLowerCase() === String(username || '').toLowerCase());
}

function terms() {
  return ensureCollections(store.read()).terms;
}

function students() {
  const db = ensureCollections(store.read());
  return db.students.filter((student) => student.active !== false).sort((a, b) => a.name.localeCompare(b.name));
}

function payments() {
  const db = ensureCollections(store.read());
  return db.payments
    .map((payment) => ({
      ...payment,
      student: db.students.find((student) => student.id === payment.studentId),
      term: db.terms.find((term) => term.id === payment.termId)
    }))
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
}

function searchText(value) {
  return sanitizeText(value, 80).toLowerCase();
}

function paymentRegister(filters = {}) {
  const query = searchText(filters.q);
  const method = sanitizeText(filters.method, 20);
  return payments().filter((payment) => {
    const haystack = [
      payment.receiptNo,
      payment.transactionRef,
      payment.method,
      payment.provider,
      payment.student && payment.student.name,
      payment.student && payment.student.learnerCode,
      payment.term && payment.term.name
    ].join(' ').toLowerCase();
    return (!query || haystack.includes(query)) && (!method || method === 'All' || payment.method === method);
  });
}

function requiredFor(student, term) {
  return Math.round(term.feeAmount * (1 - Number(student.scholarshipRate || 0)));
}

function balances() {
  const db = ensureCollections(store.read());
  return db.students.filter((student) => student.active !== false).map((student) => {
    const rows = db.terms.map((term) => {
      const required = requiredFor(student, term);
      const paid = db.payments
        .filter((payment) => payment.studentId === student.id && payment.termId === term.id && payment.status === 'Verified')
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      return { term, required, paid, balance: Math.max(required - paid, 0) };
    });
    return { student, rows, totalRequired: rows.reduce((s, r) => s + r.required, 0), totalPaid: rows.reduce((s, r) => s + r.paid, 0), totalBalance: rows.reduce((s, r) => s + r.balance, 0) };
  });
}

function dashboard() {
  const balanceRows = balances();
  const paymentRows = payments();
  const totalExpected = balanceRows.reduce((sum, row) => sum + row.totalRequired, 0);
  const totalPaid = balanceRows.reduce((sum, row) => sum + row.totalPaid, 0);
  const totalOutstanding = balanceRows.reduce((sum, row) => sum + row.totalBalance, 0);
  const byGrade = {};
  balanceRows.forEach((row) => {
    byGrade[row.student.grade] = byGrade[row.student.grade] || { grade: row.student.grade, expected: 0, paid: 0, balance: 0 };
    byGrade[row.student.grade].expected += row.totalRequired;
    byGrade[row.student.grade].paid += row.totalPaid;
    byGrade[row.student.grade].balance += row.totalBalance;
  });
  const methods = {};
  paymentRows.forEach((payment) => {
    methods[payment.method] = (methods[payment.method] || 0) + payment.amount;
  });
  return {
    totalExpected,
    totalPaid,
    totalOutstanding,
    collectionRate: totalExpected ? Math.round((totalPaid / totalExpected) * 100) : 0,
    studentCount: balanceRows.length,
    recentPayments: paymentRows.slice(0, 8),
    byGrade: Object.values(byGrade).sort((a, b) => a.grade.localeCompare(b.grade)),
    methods: Object.entries(methods).map(([method, amount]) => ({ method, amount })),
    defaulters: balanceRows.filter((row) => row.totalBalance > 0).sort((a, b) => b.totalBalance - a.totalBalance).slice(0, 8)
  };
}

function reports() {
  const balanceRows = balances();
  const paymentRows = payments();
  const termRows = terms().map((term) => {
    const expected = balanceRows.reduce((sum, row) => sum + row.rows.find((item) => item.term.id === term.id).required, 0);
    const paid = paymentRows.filter((payment) => payment.termId === term.id).reduce((sum, payment) => sum + payment.amount, 0);
    return { term, expected, paid, balance: Math.max(expected - paid, 0), rate: expected ? Math.round((paid / expected) * 100) : 0 };
  });
  const scholarshipTotal = balanceRows.reduce((sum, row) => {
    return sum + row.rows.reduce((inner, item) => inner + (item.term.feeAmount - item.required), 0);
  }, 0);
  return {
    generatedAt: now(),
    termRows,
    scholarshipTotal,
    fullyPaidCount: balanceRows.filter((row) => row.totalBalance === 0).length,
    owingCount: balanceRows.filter((row) => row.totalBalance > 0).length,
    outstandingRows: balanceRows.filter((row) => row.totalBalance > 0).sort((a, b) => b.totalBalance - a.totalBalance)
  };
}

function auditLogs() {
  return ensureCollections(store.read()).auditLogs.slice().sort((a, b) => new Date(b.at) - new Date(a.at));
}

function alerts() {
  const rows = balances();
  const paymentRows = payments();
  const duplicateRefs = paymentRows
    .filter((payment, index, list) => list.findIndex((item) => item.transactionRef === payment.transactionRef) !== index)
    .map((payment) => ({ type: 'Duplicate reference', severity: 'High', detail: `${payment.transactionRef} appears more than once.` }));
  const noPayments = rows
    .filter((row) => row.totalPaid === 0)
    .map((row) => ({ type: 'No payment', severity: 'Medium', detail: `${row.student.name} has no verified payments yet.` }));
  const highBalances = rows
    .filter((row) => row.totalBalance >= 300000)
    .map((row) => ({ type: 'Large balance', severity: 'High', detail: `${row.student.name} owes ${row.totalBalance.toLocaleString('en-UG')} UGX.` }));
  return [...duplicateRefs, ...highBalances, ...noPayments].slice(0, 20);
}

function studentProfile(studentId) {
  const id = Number(studentId);
  const db = ensureCollections(store.read());
  const student = db.students.find((row) => row.id === id && row.active !== false);
  if (!student) return null;
  const balance = balances().find((row) => row.student.id === id);
  const studentPayments = payments().filter((payment) => payment.studentId === id);
  const plans = db.paymentPlans.filter((plan) => plan.studentId === id).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const reminders = db.reminders.filter((reminder) => reminder.studentId === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { student, balance, payments: studentPayments, plans, reminders };
}

function guardianLookup(learnerCode, phoneLast4) {
  const code = sanitizeText(learnerCode, 20).toUpperCase();
  const last4 = sanitizeText(phoneLast4, 4);
  const student = students().find((row) => row.learnerCode.toUpperCase() === code && row.guardianPhone.replace(/\D/g, '').endsWith(last4));
  return student ? studentProfile(student.id) : null;
}

function createTerm(input, actor) {
  const db = ensureCollections(store.read());
  const name = sanitizeText(input.name, 80);
  const startsOn = sanitizeText(input.startsOn, 20);
  const endsOn = sanitizeText(input.endsOn, 20);
  const feeAmount = Math.round(Number(input.feeAmount || 0));
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || feeAmount < 10000) {
    throw new Error('Enter a term name, valid start/end dates, and a fee amount of at least UGX 10,000.');
  }
  const term = { id: db.meta.nextTermId++, name, startsOn, endsOn, feeAmount };
  db.terms.push(term);
  audit(db, actor, 'created_term', name);
  store.write(db);
  return term;
}

function createPaymentPlan(input, actor) {
  const db = ensureCollections(store.read());
  const studentId = Number(input.studentId);
  const amount = Math.round(Number(input.amount || 0));
  const dueDate = sanitizeText(input.dueDate, 20);
  const note = sanitizeText(input.note, 160);
  const student = db.students.find((row) => row.id === studentId && row.active !== false);
  if (!student || amount < 1000 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw new Error('Select a learner, due date, and amount of at least UGX 1,000.');
  }
  const plan = { id: db.meta.nextPlanId++, studentId, amount, dueDate, note, status: 'Open', createdBy: actor.username, createdAt: now() };
  db.paymentPlans.push(plan);
  audit(db, actor, 'created_payment_plan', `${student.learnerCode} ${amount}`);
  store.write(db);
  return plan;
}

function sendReminder(input, actor) {
  const db = ensureCollections(store.read());
  const studentId = Number(input.studentId);
  const channel = sanitizeText(input.channel, 20);
  const message = sanitizeText(input.message, 240);
  const student = db.students.find((row) => row.id === studentId && row.active !== false);
  if (!student || !['SMS', 'WhatsApp'].includes(channel) || !message) {
    throw new Error('Select a learner, channel, and reminder message.');
  }
  const reminder = { id: db.meta.nextReminderId++, studentId, channel, phone: student.guardianPhone, message, status: 'Simulated sent', createdBy: actor.username, createdAt: now() };
  db.reminders.push(reminder);
  audit(db, actor, 'sent_reminder', `${channel} ${student.learnerCode}`);
  store.write(db);
  return reminder;
}

function reconciliation() {
  const db = ensureCollections(store.read());
  if (!db.mobileMoneyStatements.length) {
    db.payments.filter((payment) => payment.method === 'Mobile Money').slice(0, 10).forEach((payment) => {
      db.mobileMoneyStatements.push({
        id: db.meta.nextStatementId++,
        provider: payment.provider,
        phone: payment.phone,
        amount: payment.amount,
        transactionRef: payment.transactionRef,
        receivedAt: payment.paidAt
      });
    });
    db.mobileMoneyStatements.push({ id: db.meta.nextStatementId++, provider: 'MTN MoMo', phone: '+256770000999', amount: 75000, transactionRef: 'MM-UNMATCHED-001', receivedAt: now() });
    store.write(db);
  }
  const paymentRows = payments();
  return db.mobileMoneyStatements.map((statement) => {
    const match = paymentRows.find((payment) => payment.transactionRef === statement.transactionRef && payment.amount === statement.amount);
    return { ...statement, match, status: match ? 'Matched' : 'Unmatched' };
  });
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function csv(type) {
  if (type === 'payments') {
    const header = ['Receipt', 'Learner', 'Code', 'Term', 'Amount', 'Method', 'Reference', 'Paid At'];
    const rows = payments().map((payment) => [payment.receiptNo, payment.student.name, payment.student.learnerCode, payment.term.name, payment.amount, payment.method, payment.transactionRef, payment.paidAt]);
    return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  }
  const header = ['Learner', 'Code', 'Class', 'Guardian', 'Phone', 'Paid', 'Balance'];
  const rows = balances().map((row) => [row.student.name, row.student.learnerCode, row.student.grade, row.student.guardianName, row.student.guardianPhone, row.totalPaid, row.totalBalance]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function backupJson() {
  return JSON.stringify(ensureCollections(store.read()), null, 2);
}

function restoreBackup(jsonText, actor) {
  const parsed = ensureCollections(JSON.parse(String(jsonText || '')));
  if (!Array.isArray(parsed.students) || !Array.isArray(parsed.terms) || !Array.isArray(parsed.payments)) {
    throw new Error('Backup must include students, terms, and payments arrays.');
  }
  audit(parsed, actor, 'restored_backup', `students:${parsed.students.length} payments:${parsed.payments.length}`);
  store.write(parsed);
}

function createStudent(input, actor) {
  const db = ensureCollections(store.read());
  const name = sanitizeText(input.name);
  const grade = sanitizeText(input.grade, 4).toUpperCase();
  const guardianName = sanitizeText(input.guardianName);
  const guardianPhone = sanitizeText(input.guardianPhone, 20);
  const village = sanitizeText(input.village);
  const scholarshipRate = Math.min(Math.max(Number(input.scholarshipRate || 0), 0), 0.9);
  if (!name || !/^P[1-7]$/.test(grade) || !guardianName || !/^\+?\d{9,15}$/.test(guardianPhone.replace(/\s/g, ''))) {
    throw new Error('Enter a learner name, class P1-P7, guardian name, and a valid phone number.');
  }
  const student = {
    id: db.meta.nextStudentId++,
    learnerCode: `LW-${String(db.meta.nextStudentId - 1).padStart(4, '0')}`,
    name,
    grade,
    guardianName,
    guardianPhone,
    village,
    scholarshipRate,
    active: true,
    createdAt: now()
  };
  db.students.push(student);
  audit(db, actor, 'created_student', student.learnerCode);
  store.write(db);
  return student;
}

function createPayment(input, actor) {
  const db = ensureCollections(store.read());
  const studentId = Number(input.studentId);
  const termId = Number(input.termId);
  const amount = Math.round(Number(input.amount || 0));
  const method = sanitizeText(input.method, 20);
  const provider = sanitizeText(input.provider, 30);
  const phone = sanitizeText(input.phone, 20);
  const student = db.students.find((row) => row.id === studentId && row.active !== false);
  const term = db.terms.find((row) => row.id === termId);
  if (!student || !term || amount < 1000 || amount > 5000000 || !['Mobile Money', 'Cash', 'Bank'].includes(method)) {
    throw new Error('Select a learner, term, valid method, and amount between UGX 1,000 and 5,000,000.');
  }
  if (method === 'Mobile Money' && !/^\+?\d{9,15}$/.test(phone.replace(/\s/g, ''))) {
    throw new Error('Mobile Money payments require a valid payer phone number.');
  }
  const id = db.meta.nextPaymentId++;
  const payment = {
    id,
    studentId,
    termId,
    amount,
    method,
    provider: method === 'Mobile Money' ? provider || 'MTN MoMo' : method,
    phone: method === 'Mobile Money' ? phone : '',
    transactionRef: method === 'Mobile Money' ? store.mobileMoneyRef(id) : `${method.toUpperCase()}-${String(id).padStart(4, '0')}`,
    receiptNo: store.receiptCode(id),
    status: 'Verified',
    notes: sanitizeText(input.notes, 200),
    receivedBy: actor.username,
    paidAt: now(),
    createdAt: now()
  };
  db.payments.push(payment);
  audit(db, actor, 'recorded_payment', `${payment.receiptNo} ${student.learnerCode}`);
  store.write(db);
  return payment;
}

function paymentByReceipt(receiptNo) {
  return payments().find((payment) => payment.receiptNo === receiptNo);
}

function audit(db, actor, action, detail) {
  db.auditLogs.push({ id: db.meta.nextAuditId++, actor: actor.username, role: actor.role, action, detail, at: now() });
}

module.exports = { findUser, terms, students, payments, paymentRegister, balances, dashboard, reports, auditLogs, alerts, studentProfile, guardianLookup, createTerm, createPaymentPlan, sendReminder, reconciliation, csv, backupJson, restoreBackup, createStudent, createPayment, paymentByReceipt, requiredFor };
