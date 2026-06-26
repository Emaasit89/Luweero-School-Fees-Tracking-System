const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');

function money(amount) {
  return Number(amount.toFixed(0));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(':');
  const actual = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function receiptCode(id) {
  return `LSF-${String(id).padStart(5, '0')}`;
}

function mobileMoneyRef(index) {
  return `MM${new Date().getFullYear()}${String(730000 + index)}`;
}

function seedData() {
  const grades = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
  const terms = [
    { id: 1, name: 'Term 1 2026', startsOn: '2026-02-03', endsOn: '2026-05-08', feeAmount: 185000 },
    { id: 2, name: 'Term 2 2026', startsOn: '2026-06-01', endsOn: '2026-08-28', feeAmount: 190000 },
    { id: 3, name: 'Term 3 2026', startsOn: '2026-09-14', endsOn: '2026-12-04', feeAmount: 195000 }
  ];

  const names = [
    ['Amina Nakato', 'Sarah Nakato'], ['Brian Kato', 'Moses Kato'], ['Clare Namusoke', 'Grace Namusoke'],
    ['David Ssekitoleko', 'Peter Ssekitoleko'], ['Esther Nansubuga', 'Ruth Nansubuga'], ['Faridah Nakitende', 'Hajara Nakitende'],
    ['Grace Nabukenya', 'Juliet Nabukenya'], ['Hassan Kirabo', 'Ibrahim Kirabo'], ['Irene Nambi', 'Rose Nambi'],
    ['Joel Ssenyonga', 'Paul Ssenyonga'], ['Kevin Mugisha', 'Mary Mugisha'], ['Lydia Namaganda', 'Agnes Namaganda'],
    ['Mariam Naluwooza', 'Rebecca Naluwooza'], ['Noah Kiyingi', 'John Kiyingi'], ['Olivia Namatovu', 'Catherine Namatovu'],
    ['Paul Wasswa', 'Joseph Wasswa'], ['Queen Nakibuuka', 'Immaculate Nakibuuka'], ['Ronald Walusimbi', 'Charles Walusimbi'],
    ['Stella Babirye', 'Jane Babirye'], ['Timothy Lutaaya', 'Samuel Lutaaya']
  ];

  const students = names.map(([studentName, guardianName], index) => ({
    id: index + 1,
    learnerCode: `LW-${String(index + 1).padStart(4, '0')}`,
    name: studentName,
    grade: grades[index % grades.length],
    guardianName,
    guardianPhone: `+25677${String(1000000 + index * 3471).slice(0, 7)}`,
    village: ['Katikamu', 'Wobulenzi', 'Bombo', 'Kikyusa', 'Zirobwe'][index % 5],
    scholarshipRate: [0, 0, 0.15, 0, 0.25][index % 5],
    active: true,
    createdAt: '2026-01-12T08:00:00.000Z'
  }));

  const payments = [];
  let paymentId = 1;
  students.forEach((student, index) => {
    terms.slice(0, 2).forEach((term) => {
      const required = money(term.feeAmount * (1 - student.scholarshipRate));
      const paid = index % 4 === 0 ? required : index % 4 === 1 ? money(required * 0.65) : index % 4 === 2 ? money(required * 0.35) : required;
      if (paid > 0) {
        payments.push({
          id: paymentId,
          studentId: student.id,
          termId: term.id,
          amount: paid,
          method: index % 3 === 0 ? 'Cash' : 'Mobile Money',
          provider: index % 2 === 0 ? 'MTN MoMo' : 'Airtel Money',
          phone: student.guardianPhone,
          transactionRef: index % 3 === 0 ? `CASH-${String(paymentId).padStart(4, '0')}` : mobileMoneyRef(paymentId),
          receiptNo: receiptCode(paymentId),
          status: 'Verified',
          notes: 'Seeded mock payment',
          receivedBy: 'bursar',
          paidAt: new Date(Date.UTC(2026, 5, Math.min(22, 1 + index), 8 + (index % 8), 15)).toISOString(),
          createdAt: new Date(Date.UTC(2026, 5, Math.min(22, 1 + index), 8 + (index % 8), 20)).toISOString()
        });
        paymentId += 1;
      }
    });
  });

  return {
    meta: { nextStudentId: students.length + 1, nextPaymentId: paymentId, nextAuditId: 1 },
    users: [
      { id: 1, username: 'admin', role: 'admin', displayName: 'System Administrator', passwordHash: hashPassword('admin123') },
      { id: 2, username: 'bursar', role: 'bursar', displayName: 'School Bursar', passwordHash: hashPassword('bursar123') },
      { id: 3, username: 'headteacher', role: 'headteacher', displayName: 'Head Teacher', passwordHash: hashPassword('head123') }
    ],
    terms,
    students,
    payments,
    auditLogs: []
  };
}

function ensureDatabase() {
  if (!fs.existsSync(config.databaseFile)) {
    fs.mkdirSync(require('path').dirname(config.databaseFile), { recursive: true });
    fs.writeFileSync(config.databaseFile, JSON.stringify(seedData(), null, 2));
  }
}

function read() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(config.databaseFile, 'utf8'));
}

function write(data) {
  fs.writeFileSync(config.databaseFile, JSON.stringify(data, null, 2));
}

function reset() {
  fs.mkdirSync(require('path').dirname(config.databaseFile), { recursive: true });
  fs.writeFileSync(config.databaseFile, JSON.stringify(seedData(), null, 2));
}

module.exports = { read, write, reset, hashPassword, verifyPassword, receiptCode, mobileMoneyRef };
