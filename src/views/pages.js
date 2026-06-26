const { layout, esc, currency, date } = require('./layout');

function login({ flash = '' }) {
  return layout({
    title: 'Sign in',
    flash,
    body: `<section class="login-panel">
      <div class="hero-copy">
        <p class="eyebrow">Rural school fee tracker</p>
        <h1>Luweero School Fees</h1>
        <p class="muted">A secure fee office for modern schools: track term balances, verify simulated Mobile Money payments, and issue printable digital receipts.</p>
        <div class="hero-stats" aria-label="System highlights">
          <span><strong>20</strong> seeded learners</span>
          <span><strong>3</strong> active terms</span>
          <span><strong>100%</strong> receipt traceability</span>
        </div>
      </div>
      <figure class="school-hero">
        <img src="/public/homepage-school.png" alt="Modern school campus with solar panels and landscaped courtyard">
        <figcaption>Modern fee tracking for accountable school administration.</figcaption>
      </figure>
      <form method="post" action="/login" class="card form login-card">
        <p class="eyebrow">Secure portal</p>
        <h2>Sign in</h2>
        <div class="demo-roles" aria-label="Demo role sign in">
          <button class="role-option" type="submit" name="demoRole" value="admin"><span aria-hidden="true">A</span><strong>Admin</strong><small>System setup and audit</small></button>
          <button class="role-option" type="submit" name="demoRole" value="bursar"><span aria-hidden="true">B</span><strong>Bursar</strong><small>Payments and receipts</small></button>
          <button class="role-option" type="submit" name="demoRole" value="headteacher"><span aria-hidden="true">H</span><strong>Head Teacher</strong><small>Reports and oversight</small></button>
        </div>
        <div class="divider"><span>or use account details</span></div>
        <label>Username <input name="username" autocomplete="username"></label>
        <label>Password <input name="password" type="password" autocomplete="current-password"></label>
        <button type="submit">Sign in</button>
        <p class="hint">Demo access is available by role. Passwords are kept off this page.</p>
      </form>
    </section>`
  });
}

function dashboard({ user, csrf, data, flash = '' }) {
  const gradeRows = data.byGrade.map((row) => `<tr><td>${esc(row.grade)}</td><td>${currency(row.expected)}</td><td>${currency(row.paid)}</td><td>${currency(row.balance)}</td></tr>`).join('');
  const recent = data.recentPayments.map((payment) => `<tr><td><a href="/receipts/${esc(payment.receiptNo)}">${esc(payment.receiptNo)}</a></td><td>${esc(payment.student.name)}</td><td>${currency(payment.amount)}</td><td>${esc(payment.method)}</td><td>${date(payment.paidAt)}</td></tr>`).join('');
  const defaulters = data.defaulters.map((row) => `<li><span>${esc(row.student.name)} <small>${esc(row.student.grade)}</small></span><strong>${currency(row.totalBalance)}</strong></li>`).join('');
  return layout({
    title: 'Dashboard',
    user,
    csrf,
    flash,
    body: `<section class="metrics">
      <div><span>Total expected</span><strong>${currency(data.totalExpected)}</strong></div>
      <div><span>Total collected</span><strong>${currency(data.totalPaid)}</strong></div>
      <div><span>Outstanding</span><strong>${currency(data.totalOutstanding)}</strong></div>
      <div><span>Collection rate</span><strong>${data.collectionRate}%</strong></div>
    </section>
    <section class="grid two">
      <div class="panel"><h2>Collection by class</h2><canvas id="gradeChart" height="180"></canvas></div>
      <div class="panel"><h2>Payment methods</h2><canvas id="methodChart" height="180"></canvas></div>
    </section>
    <section class="grid two">
      <div class="panel"><h2>Class balances</h2><table><thead><tr><th>Class</th><th>Expected</th><th>Paid</th><th>Balance</th></tr></thead><tbody>${gradeRows}</tbody></table></div>
      <div class="panel"><h2>Top outstanding balances</h2><ul class="defaulters">${defaulters}</ul></div>
    </section>
    <section class="panel"><h2>Recent receipts</h2><table><thead><tr><th>Receipt</th><th>Learner</th><th>Amount</th><th>Method</th><th>Paid at</th></tr></thead><tbody>${recent}</tbody></table></section>
    <script type="application/json" id="dashboard-data">${JSON.stringify({ byGrade: data.byGrade, methods: data.methods })}</script>`
  });
}

function students({ user, csrf, rows, terms, flash = '' }) {
  const table = rows.map((row) => `<tr><td>${esc(row.student.learnerCode)}</td><td><a href="/students/${row.student.id}">${esc(row.student.name)}</a></td><td>${esc(row.student.grade)}</td><td>${esc(row.student.guardianName)}</td><td>${currency(row.totalPaid)}</td><td>${currency(row.totalBalance)}</td></tr>`).join('');
  const termHeaders = terms.map((term) => `<th>${esc(term.name)}</th>`).join('');
  const balanceRows = rows.map((row) => `<tr><td>${esc(row.student.name)}</td>${row.rows.map((item) => `<td>${currency(item.balance)}</td>`).join('')}</tr>`).join('');
  return layout({
    title: 'Learners',
    user,
    csrf,
    flash,
    body: `<section class="toolbar"><a class="button" href="/students/new">Add learner</a><a class="button secondary" href="/payments/new">Record payment</a><a class="button secondary" href="/export/balances.csv">Export balances CSV</a></section>
    <section class="panel"><h2>Learner accounts</h2><table><thead><tr><th>Code</th><th>Name</th><th>Class</th><th>Guardian</th><th>Paid</th><th>Balance</th></tr></thead><tbody>${table}</tbody></table></section>
    <section class="panel"><h2>Term balances</h2><table><thead><tr><th>Learner</th>${termHeaders}</tr></thead><tbody>${balanceRows}</tbody></table></section>`
  });
}

function studentProfile({ user, csrf, profile, flash = '' }) {
  const { student, balance, payments, plans, reminders } = profile;
  const balanceRows = balance.rows.map((row) => `<tr><td>${esc(row.term.name)}</td><td>${currency(row.required)}</td><td>${currency(row.paid)}</td><td>${currency(row.balance)}</td></tr>`).join('');
  const paymentRows = payments.map((payment) => `<tr><td><a href="/receipts/${esc(payment.receiptNo)}">${esc(payment.receiptNo)}</a></td><td>${esc(payment.term.name)}</td><td>${currency(payment.amount)}</td><td>${esc(payment.method)}</td><td>${date(payment.paidAt)}</td></tr>`).join('');
  const planRows = plans.map((plan) => `<tr><td>${date(plan.dueDate)}</td><td>${currency(plan.amount)}</td><td>${esc(plan.status)}</td><td>${esc(plan.note)}</td></tr>`).join('');
  const reminderRows = reminders.map((reminder) => `<tr><td>${date(reminder.createdAt)}</td><td>${esc(reminder.channel)}</td><td>${esc(reminder.status)}</td><td>${esc(reminder.message)}</td></tr>`).join('');
  return layout({
    title: student.name,
    user,
    csrf,
    flash,
    body: `<section class="metrics">
      <div><span>Learner code</span><strong>${esc(student.learnerCode)}</strong></div>
      <div><span>Class</span><strong>${esc(student.grade)}</strong></div>
      <div><span>Total paid</span><strong>${currency(balance.totalPaid)}</strong></div>
      <div><span>Total balance</span><strong>${currency(balance.totalBalance)}</strong></div>
    </section>
    <section class="grid two">
      <div class="panel"><h2>Guardian</h2><dl class="details"><div><dt>Name</dt><dd>${esc(student.guardianName)}</dd></div><div><dt>Phone</dt><dd>${esc(student.guardianPhone)}</dd></div><div><dt>Village</dt><dd>${esc(student.village)}</dd></div><div><dt>Scholarship</dt><dd>${Math.round(Number(student.scholarshipRate || 0) * 100)}%</dd></div></dl></div>
      <div class="panel"><h2>Actions</h2><div class="action-list"><a class="button" href="/payments/new">Record payment</a><a class="button secondary" href="/plans">Add payment plan</a><a class="button secondary" href="/reminders">Send reminder</a></div></div>
    </section>
    <section class="panel"><h2>Term balances</h2><table><thead><tr><th>Term</th><th>Required</th><th>Paid</th><th>Balance</th></tr></thead><tbody>${balanceRows}</tbody></table></section>
    <section class="grid two">
      <div class="panel"><h2>Payment history</h2><table><thead><tr><th>Receipt</th><th>Term</th><th>Amount</th><th>Method</th><th>Paid</th></tr></thead><tbody>${paymentRows || '<tr><td colspan="5">No payments yet.</td></tr>'}</tbody></table></div>
      <div class="panel"><h2>Payment plans</h2><table><thead><tr><th>Due</th><th>Amount</th><th>Status</th><th>Note</th></tr></thead><tbody>${planRows || '<tr><td colspan="4">No plan yet.</td></tr>'}</tbody></table></div>
    </section>
    <section class="panel"><h2>Reminder history</h2><table><thead><tr><th>Sent</th><th>Channel</th><th>Status</th><th>Message</th></tr></thead><tbody>${reminderRows || '<tr><td colspan="4">No reminders yet.</td></tr>'}</tbody></table></section>`
  });
}

function payments({ user, csrf, rows, filters = {}, flash = '' }) {
  const q = esc(filters.q || '');
  const method = filters.method || 'All';
  const table = rows.map((payment) => `<tr>
    <td><a href="/receipts/${esc(payment.receiptNo)}">${esc(payment.receiptNo)}</a></td>
    <td>${esc(payment.student.name)}<small>${esc(payment.student.learnerCode)} - ${esc(payment.student.grade)}</small></td>
    <td>${esc(payment.term.name)}</td>
    <td>${currency(payment.amount)}</td>
    <td>${esc(payment.method)}<small>${esc(payment.provider)}</small></td>
    <td>${esc(payment.transactionRef)}</td>
    <td>${date(payment.paidAt)}</td>
  </tr>`).join('');
  return layout({
    title: 'Payments',
    user,
    csrf,
    flash,
    body: `<section class="toolbar split">
      <form method="get" action="/payments" class="filter-bar">
        <label>Search <input name="q" value="${q}" placeholder="Learner, receipt, transaction"></label>
        <label>Method <select name="method">${['All','Mobile Money','Cash','Bank'].map((item) => `<option ${item === method ? 'selected' : ''}>${item}</option>`).join('')}</select></label>
        <button type="submit">Filter</button>
      </form>
      <div class="action-list"><a class="button secondary" href="/payments/new">Record payment</a><a class="button secondary" href="/export/payments.csv">Export payments CSV</a></div>
    </section>
    <section class="panel"><h2>Payment register</h2><table><thead><tr><th>Receipt</th><th>Learner</th><th>Term</th><th>Amount</th><th>Method</th><th>Reference</th><th>Paid at</th></tr></thead><tbody>${table || '<tr><td colspan="7">No payments matched the filter.</td></tr>'}</tbody></table></section>`
  });
}

function studentForm({ user, csrf, flash = '' }) {
  return layout({
    title: 'Add learner',
    user,
    csrf,
    flash,
    body: `<form method="post" action="/students" class="panel form wide">
      <div class="form-grid">
        <label>Learner name <input name="name" required></label>
        <label>Class <select name="grade">${['P1','P2','P3','P4','P5','P6','P7'].map((grade) => `<option>${grade}</option>`).join('')}</select></label>
        <label>Guardian name <input name="guardianName" required></label>
        <label>Guardian phone <input name="guardianPhone" placeholder="+25677..." required></label>
        <label>Village <input name="village" required></label>
        <label>Scholarship rate <select name="scholarshipRate"><option value="0">None</option><option value="0.15">15%</option><option value="0.25">25%</option><option value="0.5">50%</option></select></label>
      </div>
      <input type="hidden" name="csrf" value="${esc(csrf)}">
      <button type="submit">Save learner</button>
    </form>`
  });
}

function paymentForm({ user, csrf, students, terms, flash = '' }) {
  return layout({
    title: 'Record payment',
    user,
    csrf,
    flash,
    body: `<form method="post" action="/payments" class="panel form wide">
      <div class="form-grid">
        <label>Learner <select name="studentId">${students.map((student) => `<option value="${student.id}">${esc(student.learnerCode)} - ${esc(student.name)} (${esc(student.grade)})</option>`).join('')}</select></label>
        <label>Term <select name="termId">${terms.map((term) => `<option value="${term.id}">${esc(term.name)} - ${currency(term.feeAmount)}</option>`).join('')}</select></label>
        <label>Amount <input name="amount" type="number" min="1000" max="5000000" step="1000" required></label>
        <label>Method <select name="method"><option>Mobile Money</option><option>Cash</option><option>Bank</option></select></label>
        <label>Provider <select name="provider"><option>MTN MoMo</option><option>Airtel Money</option></select></label>
        <label>Payer phone <input name="phone" placeholder="+25677..."></label>
      </div>
      <label>Notes <textarea name="notes" rows="3"></textarea></label>
      <input type="hidden" name="csrf" value="${esc(csrf)}">
      <button type="submit">Generate receipt</button>
    </form>`
  });
}

function receipt({ user, csrf, payment, flash = '' }) {
  return layout({
    title: `Receipt ${payment.receiptNo}`,
    user,
    csrf,
    flash,
    body: `<section class="receipt">
      <div class="receipt-head"><div><p class="eyebrow">Digital receipt</p><h2>${esc(payment.receiptNo)}</h2></div><strong>${esc(payment.status)}</strong></div>
      <dl>
        <div><dt>Learner</dt><dd>${esc(payment.student.name)} (${esc(payment.student.learnerCode)})</dd></div>
        <div><dt>Class</dt><dd>${esc(payment.student.grade)}</dd></div>
        <div><dt>Term</dt><dd>${esc(payment.term.name)}</dd></div>
        <div><dt>Amount</dt><dd>${currency(payment.amount)}</dd></div>
        <div><dt>Method</dt><dd>${esc(payment.method)} - ${esc(payment.provider)}</dd></div>
        <div><dt>Transaction ref</dt><dd>${esc(payment.transactionRef)}</dd></div>
        <div><dt>Paid at</dt><dd>${date(payment.paidAt)}</dd></div>
        <div><dt>Received by</dt><dd>${esc(payment.receivedBy)}</dd></div>
      </dl>
      <div class="action-list"><button onclick="window.print()">Print receipt</button><a class="button secondary" href="/receipts/${esc(payment.receiptNo)}/download">Download receipt</a></div>
    </section>`
  });
}

function reports({ user, csrf, data, flash = '' }) {
  const termRows = data.termRows.map((row) => `<tr><td>${esc(row.term.name)}</td><td>${currency(row.expected)}</td><td>${currency(row.paid)}</td><td>${currency(row.balance)}</td><td>${row.rate}%</td></tr>`).join('');
  const outstandingRows = data.outstandingRows.slice(0, 12).map((row) => `<tr><td>${esc(row.student.name)}</td><td>${esc(row.student.grade)}</td><td>${esc(row.student.guardianPhone)}</td><td>${currency(row.totalBalance)}</td></tr>`).join('');
  return layout({
    title: 'Reports',
    user,
    csrf,
    flash,
    body: `<section class="metrics">
      <div><span>Fully paid learners</span><strong>${data.fullyPaidCount}</strong></div>
      <div><span>Learners with balances</span><strong>${data.owingCount}</strong></div>
      <div><span>Scholarship support</span><strong>${currency(data.scholarshipTotal)}</strong></div>
      <div><span>Generated</span><strong>${new Date(data.generatedAt).toLocaleDateString('en-UG')}</strong></div>
    </section>
    <section class="grid two">
      <div class="panel"><h2>Term collection report</h2><table><thead><tr><th>Term</th><th>Expected</th><th>Paid</th><th>Balance</th><th>Rate</th></tr></thead><tbody>${termRows}</tbody></table></div>
      <div class="panel"><h2>Follow-up list</h2><table><thead><tr><th>Learner</th><th>Class</th><th>Phone</th><th>Balance</th></tr></thead><tbody>${outstandingRows}</tbody></table></div>
    </section>`
  });
}

function audit({ user, csrf, rows, flash = '' }) {
  const table = rows.map((row) => `<tr><td>${date(row.at)}</td><td>${esc(row.actor)}</td><td>${esc(row.role)}</td><td>${esc(row.action.replace(/_/g, ' '))}</td><td>${esc(row.detail)}</td></tr>`).join('');
  return layout({
    title: 'Audit log',
    user,
    csrf,
    flash,
    body: `<section class="panel"><h2>Accountability trail</h2><table><thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Detail</th></tr></thead><tbody>${table || '<tr><td colspan="5">No audit activity yet.</td></tr>'}</tbody></table></section>`
  });
}

function alerts({ user, csrf, rows, flash = '' }) {
  const table = rows.map((row) => `<tr><td>${esc(row.severity)}</td><td>${esc(row.type)}</td><td>${esc(row.detail)}</td></tr>`).join('');
  return layout({ title: 'Alerts', user, csrf, flash, body: `<section class="panel"><h2>Dashboard alerts</h2><table><thead><tr><th>Severity</th><th>Type</th><th>Detail</th></tr></thead><tbody>${table || '<tr><td colspan="3">No alerts found.</td></tr>'}</tbody></table></section>` });
}

function terms({ user, csrf, terms, flash = '' }) {
  const rows = terms.map((term) => `<tr><td>${esc(term.name)}</td><td>${esc(term.startsOn)}</td><td>${esc(term.endsOn)}</td><td>${currency(term.feeAmount)}</td></tr>`).join('');
  return layout({
    title: 'Term settings',
    user,
    csrf,
    flash,
    body: `<section class="grid two">
      <form method="post" action="/settings/terms" class="panel form"><h2>Add term</h2><label>Name <input name="name" required></label><label>Starts on <input name="startsOn" type="date" required></label><label>Ends on <input name="endsOn" type="date" required></label><label>Fee amount <input name="feeAmount" type="number" min="10000" step="1000" required></label><input type="hidden" name="csrf" value="${esc(csrf)}"><button type="submit">Save term</button></form>
      <div class="panel"><h2>Configured terms</h2><table><thead><tr><th>Name</th><th>Starts</th><th>Ends</th><th>Fee</th></tr></thead><tbody>${rows}</tbody></table></div>
    </section>`
  });
}

function plans({ user, csrf, rows, flash = '' }) {
  const options = rows.filter((row) => row.totalBalance > 0).map((row) => `<option value="${row.student.id}">${esc(row.student.learnerCode)} - ${esc(row.student.name)} (${currency(row.totalBalance)} due)</option>`).join('');
  return layout({ title: 'Payment plans', user, csrf, flash, body: `<form method="post" action="/plans" class="panel form wide"><h2>Create installment plan</h2><div class="form-grid"><label>Learner <select name="studentId">${options}</select></label><label>Due date <input name="dueDate" type="date" required></label><label>Amount <input name="amount" type="number" min="1000" step="1000" required></label><label>Note <input name="note" placeholder="Agreed installment note"></label></div><input type="hidden" name="csrf" value="${esc(csrf)}"><button type="submit">Save plan</button></form>` });
}

function reminders({ user, csrf, rows, flash = '' }) {
  const options = rows.filter((row) => row.totalBalance > 0).map((row) => `<option value="${row.student.id}">${esc(row.student.learnerCode)} - ${esc(row.student.name)} (${esc(row.student.guardianPhone)})</option>`).join('');
  return layout({ title: 'Reminders', user, csrf, flash, body: `<form method="post" action="/reminders" class="panel form wide"><h2>Simulate guardian reminder</h2><div class="form-grid"><label>Learner <select name="studentId">${options}</select></label><label>Channel <select name="channel"><option>SMS</option><option>WhatsApp</option></select></label></div><label>Message <textarea name="message" rows="4" required>Please clear the outstanding school fees balance. Contact the bursar for a receipt update.</textarea></label><input type="hidden" name="csrf" value="${esc(csrf)}"><button type="submit">Send simulated reminder</button></form>` });
}

function reconciliation({ user, csrf, rows, flash = '' }) {
  const table = rows.map((row) => `<tr><td>${esc(row.status)}</td><td>${esc(row.provider)}</td><td>${esc(row.phone)}</td><td>${currency(row.amount)}</td><td>${esc(row.transactionRef)}</td><td>${row.match ? esc(row.match.receiptNo) : '-'}</td></tr>`).join('');
  return layout({ title: 'Mobile Money reconciliation', user, csrf, flash, body: `<section class="panel"><h2>Statement matching</h2><table><thead><tr><th>Status</th><th>Provider</th><th>Phone</th><th>Amount</th><th>Reference</th><th>Receipt</th></tr></thead><tbody>${table}</tbody></table></section>` });
}

function backup({ user, csrf, flash = '' }) {
  return layout({ title: 'Backup and restore', user, csrf, flash, body: `<section class="grid two"><div class="panel"><h2>Backup</h2><p class="muted">Download a JSON copy of learners, terms, payments, plans, reminders, statements, users, and audit logs.</p><a class="button" href="/backup/download">Download backup</a></div><form method="post" action="/backup/restore" class="panel form"><h2>Restore</h2><label>Backup JSON <textarea name="backupJson" rows="12" required></textarea></label><input type="hidden" name="csrf" value="${esc(csrf)}"><button type="submit">Restore backup</button></form></section>` });
}

function guardian({ profile, query = {}, flash = '' }) {
  const result = profile ? `<section class="metrics"><div><span>Learner</span><strong>${esc(profile.student.name)}</strong></div><div><span>Class</span><strong>${esc(profile.student.grade)}</strong></div><div><span>Paid</span><strong>${currency(profile.balance.totalPaid)}</strong></div><div><span>Balance</span><strong>${currency(profile.balance.totalBalance)}</strong></div></section><section class="panel"><h2>Term balances</h2><table><thead><tr><th>Term</th><th>Required</th><th>Paid</th><th>Balance</th></tr></thead><tbody>${profile.balance.rows.map((row) => `<tr><td>${esc(row.term.name)}</td><td>${currency(row.required)}</td><td>${currency(row.paid)}</td><td>${currency(row.balance)}</td></tr>`).join('')}</tbody></table></section>` : (query.learnerCode ? '<div class="flash">No matching learner found. Check the learner code and guardian phone last four digits.</div>' : '');
  return layout({ title: 'Guardian portal', flash, body: `<section class="login-panel guardian-panel"><div class="hero-copy"><p class="eyebrow">Guardian access</p><h1>Check fees balance</h1><p class="muted">Use the learner code and the last four digits of the registered guardian phone number.</p></div><form method="get" action="/guardian" class="card form login-card"><label>Learner code <input name="learnerCode" value="${esc(query.learnerCode || '')}" required></label><label>Phone last 4 digits <input name="phoneLast4" value="${esc(query.phoneLast4 || '')}" maxlength="4" required></label><button type="submit">Check balance</button><p class="hint"><a href="/">Staff sign in</a></p></form></section>${result}` });
}

function errorPage({ user, csrf, message, status = 500 }) {
  return layout({ title: `Error ${status}`, user, csrf, flash: message, body: '<section class="panel"><p>Please go back and try again.</p></section>' });
}

module.exports = { login, dashboard, students, studentProfile, payments, studentForm, paymentForm, receipt, reports, audit, alerts, terms, plans, reminders, reconciliation, backup, guardian, errorPage };
