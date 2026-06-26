const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const store = require('./models/datastore');
const repo = require('./models/repository');
const security = require('./middleware/security');
const auth = require('./controllers/authController');
const app = require('./controllers/appController');
const views = require('./views/pages');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function attachHelpers(res) {
  res.html = (body) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(body);
  };
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  };
  res.download = (filename, contentType, body) => {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(body);
  };
  res.redirect = (location) => {
    res.statusCode = 302;
    res.setHeader('Location', location);
    res.end();
  };
}

function serveStatic(req, res, pathname) {
  const filePath = path.normalize(path.join(config.rootDir, pathname.replace(/^\/+/, '')));
  if (!filePath.startsWith(config.publicDir)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.statusCode = 404;
    return res.end('Not found');
  }
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Content-Type', mimeTypes[path.extname(filePath)] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
}

function requireAuth(res, session) {
  if (!session) {
    res.redirect('/');
    return false;
  }
  return true;
}

function requireRole(res, session, roles) {
  if (!roles.includes(session.user.role)) {
    res.statusCode = 403;
    res.html(views.errorPage({ user: session.user, csrf: session.csrf, status: 403, message: 'Your role is not allowed to perform this action.' }));
    return false;
  }
  return true;
}

async function router(req, res) {
  attachHelpers(res);
  security.setSecurityHeaders(res);
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsed.pathname;
  const session = security.readSession(req);
  const query = Object.fromEntries(parsed.searchParams.entries());
  const flash = query.flash || '';
  req.query = query;

  try {
    if (pathname.startsWith('/public/')) return serveStatic(req, res, pathname);
    if (req.method === 'GET' && pathname === '/guardian') return app.guardian(req, res, flash);
    if (req.method === 'GET' && pathname === '/') return session ? res.redirect('/dashboard') : auth.showLogin(res, flash);
    if (req.method === 'POST' && pathname === '/login') return await auth.login(req, res);
    if (req.method === 'POST' && pathname === '/logout') return await auth.logout(req, res, session);

    if (!requireAuth(res, session)) return;

    if (req.method === 'GET' && pathname === '/dashboard') return app.dashboard(req, res, session, flash);
    if (req.method === 'GET' && pathname === '/students') return app.students(req, res, session, flash);
    if (req.method === 'GET' && /^\/students\/\d+$/.test(pathname)) return app.studentProfile(req, res, session, pathname.split('/').pop(), flash);
    if (req.method === 'GET' && pathname === '/payments') return app.payments(req, res, session, query, flash);
    if (req.method === 'GET' && pathname === '/reports') return app.reports(req, res, session, flash);
    if (req.method === 'GET' && pathname === '/alerts') return app.alerts(req, res, session, flash);
    if (req.method === 'GET' && pathname === '/settings/terms') return requireRole(res, session, ['admin']) && app.terms(req, res, session, flash);
    if (req.method === 'POST' && pathname === '/settings/terms') {
      if (!requireRole(res, session, ['admin'])) return;
      return await app.createTerm(req, res, session);
    }
    if (req.method === 'GET' && pathname === '/plans') return requireRole(res, session, ['admin', 'bursar']) && app.plans(req, res, session, flash);
    if (req.method === 'POST' && pathname === '/plans') {
      if (!requireRole(res, session, ['admin', 'bursar'])) return;
      return await app.createPlan(req, res, session);
    }
    if (req.method === 'GET' && pathname === '/reminders') return requireRole(res, session, ['admin', 'bursar']) && app.reminders(req, res, session, flash);
    if (req.method === 'POST' && pathname === '/reminders') {
      if (!requireRole(res, session, ['admin', 'bursar'])) return;
      return await app.sendReminder(req, res, session);
    }
    if (req.method === 'GET' && pathname === '/reconciliation') return requireRole(res, session, ['admin', 'bursar', 'headteacher']) && app.reconciliation(req, res, session, flash);
    if (req.method === 'GET' && pathname === '/backup') return requireRole(res, session, ['admin']) && app.backup(req, res, session, flash);
    if (req.method === 'GET' && pathname === '/backup/download') return requireRole(res, session, ['admin']) && res.download('luweero-school-fees-backup.json', 'application/json; charset=utf-8', repo.backupJson());
    if (req.method === 'POST' && pathname === '/backup/restore') {
      if (!requireRole(res, session, ['admin'])) return;
      return await app.restoreBackup(req, res, session);
    }
    if (req.method === 'GET' && pathname === '/audit') return app.audit(req, res, session, flash);
    if (req.method === 'GET' && pathname === '/students/new') return app.studentForm(req, res, session, flash);
    if (req.method === 'POST' && pathname === '/students') {
      if (!requireRole(res, session, ['admin', 'bursar'])) return;
      return await app.createStudent(req, res, session);
    }
    if (req.method === 'GET' && pathname === '/payments/new') return app.paymentForm(req, res, session, flash);
    if (req.method === 'POST' && pathname === '/payments') {
      if (!requireRole(res, session, ['admin', 'bursar'])) return;
      return await app.createPayment(req, res, session);
    }
    if (req.method === 'GET' && pathname === '/export/payments.csv') return res.download('payments.csv', 'text/csv; charset=utf-8', repo.csv('payments'));
    if (req.method === 'GET' && pathname === '/export/balances.csv') return res.download('balances.csv', 'text/csv; charset=utf-8', repo.csv('balances'));
    if (req.method === 'GET' && pathname === '/api/summary') return app.summaryApi(req, res);
    if (req.method === 'GET' && pathname.startsWith('/receipts/') && pathname.endsWith('/download')) {
      const receiptNo = decodeURIComponent(pathname.split('/')[2]);
      const payment = repo.paymentByReceipt(receiptNo);
      if (!payment) {
        res.statusCode = 404;
        return res.html(views.errorPage({ user: session.user, csrf: session.csrf, status: 404, message: 'Receipt not found.' }));
      }
      const body = `Luweero School Fees Receipt\n\nReceipt: ${payment.receiptNo}\nLearner: ${payment.student.name} (${payment.student.learnerCode})\nTerm: ${payment.term.name}\nAmount: UGX ${payment.amount.toLocaleString('en-UG')}\nMethod: ${payment.method} - ${payment.provider}\nTransaction Ref: ${payment.transactionRef}\nPaid At: ${payment.paidAt}\nReceived By: ${payment.receivedBy}\n`;
      return res.download(`${payment.receiptNo}.txt`, 'text/plain; charset=utf-8', body);
    }
    if (req.method === 'GET' && pathname.startsWith('/receipts/')) return app.receipt(req, res, session, decodeURIComponent(pathname.split('/').pop()));

    res.statusCode = 404;
    return res.html(views.errorPage({ user: session.user, csrf: session.csrf, status: 404, message: 'Page not found.' }));
  } catch (error) {
    res.statusCode = error.status || 500;
    const user = session && session.user;
    const csrf = session && session.csrf;
    res.html(views.errorPage({ user, csrf, status: res.statusCode, message: error.message || 'Unexpected error.' }));
  }
}

function selfTest() {
  store.reset();
  const repo = require('./models/repository');
  const summary = repo.dashboard();
  const report = repo.reports();
  const firstStudent = repo.students()[0];
  if (!summary.studentCount || !summary.totalPaid || !repo.payments()[0].receiptNo || !repo.paymentRegister({ method: 'Mobile Money' }).length || !report.termRows.length || !repo.alerts().length || !repo.studentProfile(firstStudent.id) || !repo.reconciliation().length || !repo.csv('payments').includes('Receipt')) {
    throw new Error('Seeded data self-test failed.');
  }
  console.log(`Self-test passed: ${summary.studentCount} learners, UGX ${summary.totalPaid.toLocaleString('en-UG')} collected.`);
}

if (process.argv.includes('--seed-only')) {
  store.reset();
  console.log(`Seeded ${config.databaseFile}`);
} else if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  store.read();
  http.createServer(router).listen(config.port, () => {
    console.log(`${config.appName} running at http://localhost:${config.port}`);
  });
}

module.exports = { router };
