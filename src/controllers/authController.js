const repo = require('../models/repository');
const store = require('../models/datastore');
const views = require('../views/pages');
const security = require('../middleware/security');

function showLogin(res, flash = '') {
  res.html(views.login({ flash }));
}

async function login(req, res) {
  const body = await security.collectBody(req);
  const demoUsers = { admin: 'admin123', bursar: 'bursar123', headteacher: 'head123' };
  const demoRole = String(body.demoRole || '').toLowerCase();
  const username = demoUsers[demoRole] ? demoRole : body.username;
  const password = demoUsers[demoRole] || String(body.password || '');
  const user = repo.findUser(username);
  if (!user || !store.verifyPassword(password, user.passwordHash)) {
    res.statusCode = 401;
    return res.html(views.login({ flash: 'Invalid username or password.' }));
  }
  const session = security.makeSession(user);
  res.setHeader('Set-Cookie', security.sessionCookie(session.cookie));
  res.redirect('/dashboard');
}

async function logout(req, res, session) {
  const body = await security.collectBody(req);
  security.requireCsrf(req, session, body);
  security.destroySession(req);
  res.setHeader('Set-Cookie', security.clearCookie());
  res.redirect('/');
}

module.exports = { showLogin, login, logout };
