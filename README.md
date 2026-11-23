# Manthan Dashboard

A small coaching/tutor management app built with Node.js, Express, PostgreSQL and Socket.IO.

## What it does

- **Students & batches** — add students, put them in subject batches, set monthly fees.
- **Attendance** — pick a batch + date, mark Present / Absent / Late, "Mark All Present", save. Students see their own attendance percentage and history.
- **Tests**
  - **Question paper tests** — attach a file (PDF/Word/image, max 20 MB) and/or a **Google Drive link**.
  - **Online MCQ tests** — add questions with 4 options, correct answer and marks. Students take the test in the browser and it is **auto-graded**; marks automatically appear in Results.
  - Tutor can view submissions, reset attempts so students can retake, and mark a test completed.
- **Results** — class-wise result sheets, bulk marks entry, auto grades (A+ … F).
- **Fee portal (student login)** — students open **Pay Fees** and see the tutor's **GPay / PhonePe QR code**, UPI ID, pending amount and GPay/PhonePe/UPI buttons. Tutors upload the QR (or set a UPI ID) in **Settings → Fee Payment QR**.
- **Homework** — assign homework with due dates.
- **Notifications** — in-app notifications for attendance, tests, results and fee updates.
- **Light / dark theme** — one-click toggle (top bar or login screen), remembered per browser.
- **Global student search** and CSV export from the Students page.
- **Accessible UI** — keyboard-operable menus and cards, Escape-to-close modals with focus trapping, visible focus states, reduced-motion support, and readable contrast in both themes.

## Requirements

- Node.js 18+
- PostgreSQL 12+

## Backend Architecture (MVC Pattern)

The backend is structured using the Model-View-Controller (MVC) architectural pattern:

```
server/
├── config/              # Database pool and connection configuration
├── models/              # Data access models (queries, schema operations, and persistence)
├── views/               # Data normalization, column casing mapping, and JSON response views
├── controllers/         # Request handling, orchestration, validation, and responses
├── routes/              # Express API route definitions mounted under /api
├── middlewares/         # Multer file upload middlewares (tests, QR codes)
├── services/            # Real-time WebSocket services (Socket.IO notifications & events)
├── utils/               # Constants and helper functions
├── db.js                # Database connection export (backwards-compatible)
├── migrate.js           # Database migrations
└── server.js            # Express server initialization and middleware configuration
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` in the project root:

   ```env
   DB_HOST=localhost
   DB_USER=your_postgres_user
   DB_PASSWORD=your_postgres_password
   DB_NAME=manthan_institute
   DB_PORT=5432
   SESSION_SECRET=change_me
   PORT=3000
   ```

3. Create the database and seed demo data (creates the DB if needed):

   ```bash
   npm run setup-db
   ```

4. Start the app:

   ```bash
   npm start
   ```

   Open http://localhost:3000 — the terminal also prints a LAN URL you can open on a phone connected to the same Wi-Fi.

### Admin login

`npm run setup-db` creates a single admin login and **no demo data**:

| Role  | Username | Password   |
|-------|----------|------------|
| Admin | `admin`  | `admin123` |

Override it with `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `ADMIN_EMAIL` in `.env` before the first setup. Change the password after logging in.

All students, batches, fees, tests, etc. are empty until you add them from the app.

## Frontend build

The browser loads `public/bundle.js`, which is generated from:

```
public/app.js
public/pages/dashboard.js
public/pages/students.js
public/pages/batches.js
public/pages/attendance-fees.js
public/pages/homework-tests-results.js
public/pages/notices-reports-settings.js
```

Edit those source files, then run:

```bash
npm run build
```

`npm start` and `npm run dev` run the build automatically (`prestart` / `predev`).

## Cloud Deployment (Render + Netlify + NeonDB)

### 1. Database (NeonDB)
1. Create a serverless PostgreSQL database at [Neon.tech](https://neon.tech).
2. Copy the PostgreSQL connection string (`DATABASE_URL`), which looks like:
   `postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require`

### 2. Backend Web Service (Render)
1. In [Render Dashboard](https://dashboard.render.com), create a new **Web Service** from the GitHub repository.
2. Settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run setup-db && npm start`
3. Environment Variables:
   - `DATABASE_URL`: *(Your NeonDB connection string)*
   - `SESSION_SECRET`: *(A long random secret string)*
   - `NODE_ENV`: `production`
   - `TRUST_PROXY`: `true`
   - `COOKIE_SECURE`: `true`
   - `COOKIE_SAMESITE`: `none`
   - `CORS_ORIGIN`: `*` (or your Netlify site URL)
   - `ADMIN_USERNAME`: `admin` (or custom)
   - `ADMIN_PASSWORD`: `admin123` (or custom)

### 3. Frontend Static Hosting (Netlify)
1. In [Netlify](https://app.netlify.com), click **Add new site** > **Import an existing project** from GitHub.
2. Settings:
   - **Base directory**: *(Leave blank)*
   - **Build command**: `npm run build`
   - **Publish directory**: `public`
3. `netlify.toml` and `public/_redirects` proxy `/api/*` and `/uploads/*` to your Render backend and provide SPA fallback.
4. If connecting directly to Render without proxy, you can set `window.BACKEND_URL = 'https://your-backend.onrender.com'` or configure Netlify redirects.

## Database migrations

`server/migrate.js` is idempotent and runs on every server start. It adds:

- `student_batches` (student ↔ batch links)
- `notifications`
- `payment_requests`
- `settings` (institute details, UPI ID, uploaded QR path)
- test columns `DriveLink`, `TestType`
- `test_questions`, `test_attempts`

It also backfills `student_batches` from each student's primary batch.

## Customising the tutor

- **Institute name / contact** — Settings page.
- **Payment QR** — Settings → *Edit Payment QR / UPI*. Upload a GPay/PhonePe QR screenshot and optionally enter your UPI ID so the pay buttons work.
- **Tests** — Tests → *Create Test*. Choose *Online MCQ* for auto-graded quizzes, or *Question Paper* to attach a file / Drive link.

## Notes

- Passwords are stored as plain text in the demo schema. Add hashing and real session protection before exposing the app on the public internet.
- Files are stored under `public/uploads/`.
- To back up, dump the PostgreSQL database (`pg_dump manthan_institute > backup.sql`) and copy `public/uploads/`.
