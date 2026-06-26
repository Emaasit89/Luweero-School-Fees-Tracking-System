const crypto = require('crypto');
const querystring = require('querystring');
const config = require('../config');

const sessions = new Map();

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const [key, ...rest] = part.trim().split('=');
    return [key, decodeURIComponent(rest.join('='))];
  }));
}

function sign(value) {
  return crypto.createHmac('sha256', config.sessionSecret).update(value).digest('base64url');
}

function makeSession(user) {
  const id = crypto.randomBytes(24).toString('base64url');
  const csrf = crypto.randomBytes(18).toString('base64url');
  sessions.set(id, { user: { id: user.id, username: user.username, role: user.role, displayName: user.displayName }, csrf, createdAt: Date.now() });
  return { cookie: `${id}.${sign(id)}`, csrf };
}

function readSession(req) {
  const raw = parseCookies(req).lsf_session;
  if (!raw) return null;
  const [id, signature] = raw.split('.');
  if (!id || signature !== sign(id)) return null;
  return sessions.get(id) || null;
}

function destroySession(req) {
  const raw = parseCookies(req).lsf_session;
  if (raw) sessions.delete(raw.split('.')[0]);
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}

function sessionCookie(value) {
  const secure = config.isProduction ? '; Secure' : '';
  return `lsf_session=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure}`;
}

function clearCookie() {
  return 'lsf_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(querystring.parse(body)));
    req.on('error', reject);
  });
}

function requireCsrf(req, session, body) {
  if (!session || body.csrf !== session.csrf) {
    const error = new Error('Security check failed. Refresh the page and try again.');
    error.status = 403;
    throw error;
  }
}

module.exports = { makeSession, readSession, destroySession, sessionCookie, clearCookie, setSecurityHeaders, collectBody, requireCsrf };
