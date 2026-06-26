# Luweero School Fees

Fee tracker for rural schools using simulated Mobile Money and digital receipts.

## Selected tooling stack

- Frontend UI: HTML5, CSS3, Vanilla JavaScript.
- Backend and MVC: Node.js, implemented with the built-in HTTP runtime to keep the demo runnable without package downloads in restricted lab environments.
- ORM/database choice: SQLite was the preferred production database from the provided options; this runnable submission uses a JSON file-backed repository that mirrors simple ORM model boundaries because native SQLite/Sequelize packages are not bundled in this environment.
- Data visualization: Chart.js from CDN, with a native canvas fallback when offline.
- Hosting deployment: Localhost verified, with Render deployment notes below.

## Features

- Login-protected dashboard for school bursars and administrators.
- Seeded learners, guardians, villages, term fees, scholarships, payments, balances, and receipts.
- Simulated Mobile Money references for MTN MoMo/Airtel Money payments.
- Digital receipt pages with print support.
- Collection metrics, defaulter list, class balances, and charts.
- Searchable payment register with method filters.
- Management reports for term collections, scholarships, and follow-up balances.
- Audit log screen for sensitive learner and payment activity.
- Learner profile pages with balances, payment history, plans, and reminder history.
- Simulated SMS/WhatsApp guardian reminders.
- Installment payment plan tracking.
- CSV exports for balances and payments.
- Mobile Money reconciliation screen using simulated statements.
- Alert screen for high balances, duplicate references, and no-payment learners.
- Admin term configuration and JSON backup/restore.
- Public guardian balance lookup using learner code and phone verification.
- Role checks for operational/admin-only workflows.
- MVC folder structure: controllers, models, views, middleware, and public assets.

## Security controls

- PBKDF2 password hashing with per-user salts.
- Signed HTTP-only session cookies.
- CSRF tokens on state-changing forms.
- Server-side input validation and amount limits.
- Content Security Policy, X-Frame-Options, Referrer-Policy, and nosniff headers.
- Static file path traversal protection.
- Audit log entries for learner and payment creation.

## Run locally

Use Node.js 18 or newer.

```bash
npm start
```

Then open:

```text
http://localhost:3100
```

Demo accounts:

```text
admin / admin123
bursar / bursar123
headteacher / head123
```

Reset seed data:

```bash
npm run seed
```

Run the lightweight self-test:

```bash
npm test
```

## Project structure

```text
src/server.js                 HTTP server and route dispatch
src/controllers/              MVC controllers
src/models/                   Seeded datastore and repository functions
src/views/                    Server-rendered HTML views
src/middleware/security.js    Sessions, CSRF, and headers
public/                       CSS and browser JavaScript
data/database.json            Generated local data file
```

## Render deployment notes

1. Create a new Web Service on Render and connect the GitHub repository.
2. Set the runtime to Node.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. Add environment variables:
   - `NODE_ENV=production`
   - `SESSION_SECRET=<long random value>`
   - `PORT` can be left to Render.
6. For production persistence, replace the JSON repository with PostgreSQL or SQLite storage and keep the controller/view contracts unchanged.

## GitHub repository

This folder is repository-ready. In this environment, `git` was only available through the bundled runtime and no GitHub authentication/remote URL was provided, so the public/shared GitHub URL must be created by pushing this folder to GitHub.
