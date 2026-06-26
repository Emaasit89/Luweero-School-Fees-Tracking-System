function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function currency(amount) {
  return `UGX ${Number(amount || 0).toLocaleString('en-UG')}`;
}

function date(value) {
  return new Intl.DateTimeFormat('en-UG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function layout({ title, user, csrf, flash = '', body }) {
  const nav = user ? `
    <aside class="sidebar">
      <div class="brand"><span>LSF</span><strong>Luweero School Fees</strong></div>
      <nav>
        <a href="/dashboard">Dashboard</a>
        <a href="/students">Learners</a>
        <a href="/payments">Payments</a>
        <a href="/reports">Reports</a>
        <a href="/alerts">Alerts</a>
        <a href="/reminders">Reminders</a>
        <a href="/plans">Payment plans</a>
        <a href="/reconciliation">Reconciliation</a>
        <a href="/settings/terms">Terms</a>
        <a href="/backup">Backup</a>
        <a href="/audit">Audit log</a>
        <a href="/payments/new">Record payment</a>
      </nav>
      <form method="post" action="/logout" class="logout">
        <input type="hidden" name="csrf" value="${esc(csrf)}">
        <button type="submit">Sign out</button>
      </form>
    </aside>` : '';
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${esc(title)} | Luweero School Fees</title>
      <link rel="stylesheet" href="/public/styles.css">
    </head>
    <body class="${user ? 'app-shell' : 'login-shell'}">
      ${nav}
      <main>
        ${user ? `<header class="topbar"><div><p>${esc(user.role)}</p><h1>${esc(title)}</h1></div><span>${esc(user.displayName)}</span></header>` : ''}
        ${flash ? `<div class="flash">${esc(flash)}</div>` : ''}
        ${body}
      </main>
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
      <script src="/public/app.js"></script>
    </body>
  </html>`;
}

module.exports = { layout, esc, currency, date };
