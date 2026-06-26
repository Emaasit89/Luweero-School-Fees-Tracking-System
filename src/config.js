const path = require('path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  appName: 'Luweero School Fees',
  port: Number(process.env.PORT || 3100),
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-change-me-before-deployment',
  isProduction: process.env.NODE_ENV === 'production',
  rootDir: ROOT,
  publicDir: path.join(ROOT, 'public'),
  databaseFile: path.join(ROOT, 'data', 'database.json'),
  allowedRoles: ['admin', 'bursar', 'headteacher', 'viewer']
};
