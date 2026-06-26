const repo = require('../models/repository');
const views = require('../views/pages');
const security = require('../middleware/security');

function dashboard(req, res, session, flash = '') {
  res.html(views.dashboard({ user: session.user, csrf: session.csrf, data: repo.dashboard(), flash }));
}

function students(req, res, session, flash = '') {
  res.html(views.students({ user: session.user, csrf: session.csrf, rows: repo.balances(), terms: repo.terms(), flash }));
}

function studentProfile(req, res, session, studentId, flash = '') {
  const profile = repo.studentProfile(studentId);
  if (!profile) {
    res.statusCode = 404;
    return res.html(views.errorPage({ user: session.user, csrf: session.csrf, status: 404, message: 'Learner not found.' }));
  }
  res.html(views.studentProfile({ user: session.user, csrf: session.csrf, profile, terms: repo.terms(), flash }));
}

function payments(req, res, session, filters, flash = '') {
  res.html(views.payments({ user: session.user, csrf: session.csrf, rows: repo.paymentRegister(filters), filters, flash }));
}

function studentForm(req, res, session, flash = '') {
  res.html(views.studentForm({ user: session.user, csrf: session.csrf, flash }));
}

async function createStudent(req, res, session) {
  const body = await security.collectBody(req);
  security.requireCsrf(req, session, body);
  try {
    repo.createStudent(body, session.user);
    res.redirect('/students?flash=Learner%20created');
  } catch (error) {
    res.statusCode = 400;
    res.html(views.studentForm({ user: session.user, csrf: session.csrf, flash: error.message }));
  }
}

function paymentForm(req, res, session, flash = '') {
  res.html(views.paymentForm({ user: session.user, csrf: session.csrf, students: repo.students(), terms: repo.terms(), flash }));
}

async function createPayment(req, res, session) {
  const body = await security.collectBody(req);
  security.requireCsrf(req, session, body);
  try {
    const payment = repo.createPayment(body, session.user);
    res.redirect(`/receipts/${payment.receiptNo}`);
  } catch (error) {
    res.statusCode = 400;
    res.html(views.paymentForm({ user: session.user, csrf: session.csrf, students: repo.students(), terms: repo.terms(), flash: error.message }));
  }
}

function receipt(req, res, session, receiptNo) {
  const payment = repo.paymentByReceipt(receiptNo);
  if (!payment) {
    res.statusCode = 404;
    return res.html(views.errorPage({ user: session.user, csrf: session.csrf, status: 404, message: 'Receipt not found.' }));
  }
  res.html(views.receipt({ user: session.user, csrf: session.csrf, payment }));
}

function reports(req, res, session, flash = '') {
  res.html(views.reports({ user: session.user, csrf: session.csrf, data: repo.reports(), flash }));
}

function audit(req, res, session, flash = '') {
  res.html(views.audit({ user: session.user, csrf: session.csrf, rows: repo.auditLogs(), flash }));
}

function alerts(req, res, session, flash = '') {
  res.html(views.alerts({ user: session.user, csrf: session.csrf, rows: repo.alerts(), flash }));
}

function terms(req, res, session, flash = '') {
  res.html(views.terms({ user: session.user, csrf: session.csrf, terms: repo.terms(), flash }));
}

async function createTerm(req, res, session) {
  const body = await security.collectBody(req);
  security.requireCsrf(req, session, body);
  try {
    repo.createTerm(body, session.user);
    res.redirect('/settings/terms?flash=Term%20created');
  } catch (error) {
    res.statusCode = 400;
    res.html(views.terms({ user: session.user, csrf: session.csrf, terms: repo.terms(), flash: error.message }));
  }
}

function plans(req, res, session, flash = '') {
  res.html(views.plans({ user: session.user, csrf: session.csrf, rows: repo.balances(), flash }));
}

async function createPlan(req, res, session) {
  const body = await security.collectBody(req);
  security.requireCsrf(req, session, body);
  try {
    repo.createPaymentPlan(body, session.user);
    res.redirect(`/students/${body.studentId}?flash=Payment%20plan%20created`);
  } catch (error) {
    res.statusCode = 400;
    res.html(views.plans({ user: session.user, csrf: session.csrf, rows: repo.balances(), flash: error.message }));
  }
}

function reminders(req, res, session, flash = '') {
  res.html(views.reminders({ user: session.user, csrf: session.csrf, rows: repo.balances(), flash }));
}

async function sendReminder(req, res, session) {
  const body = await security.collectBody(req);
  security.requireCsrf(req, session, body);
  try {
    repo.sendReminder(body, session.user);
    res.redirect('/reminders?flash=Reminder%20simulated');
  } catch (error) {
    res.statusCode = 400;
    res.html(views.reminders({ user: session.user, csrf: session.csrf, rows: repo.balances(), flash: error.message }));
  }
}

function reconciliation(req, res, session, flash = '') {
  res.html(views.reconciliation({ user: session.user, csrf: session.csrf, rows: repo.reconciliation(), flash }));
}

function backup(req, res, session, flash = '') {
  res.html(views.backup({ user: session.user, csrf: session.csrf, flash }));
}

async function restoreBackup(req, res, session) {
  const body = await security.collectBody(req);
  security.requireCsrf(req, session, body);
  try {
    repo.restoreBackup(body.backupJson, session.user);
    res.redirect('/backup?flash=Backup%20restored');
  } catch (error) {
    res.statusCode = 400;
    res.html(views.backup({ user: session.user, csrf: session.csrf, flash: error.message }));
  }
}

function guardian(req, res, flash = '') {
  const profile = req.query && req.query.learnerCode ? repo.guardianLookup(req.query.learnerCode, req.query.phoneLast4) : null;
  res.html(views.guardian({ profile, query: req.query || {}, flash }));
}

function summaryApi(req, res) {
  res.json(repo.dashboard());
}

module.exports = { dashboard, students, studentProfile, payments, studentForm, createStudent, paymentForm, createPayment, receipt, reports, audit, alerts, terms, createTerm, plans, createPlan, reminders, sendReminder, reconciliation, backup, restoreBackup, guardian, summaryApi };
