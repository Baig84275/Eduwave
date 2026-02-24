# EduWave – Developer Playbook (Backend + Mobile + Render + EAS)

## Repository structure (high level)
- `backend/`: Node.js + Express API (TypeScript) + Prisma (PostgreSQL)
- `mobile/`: Expo React Native app (TypeScript)
- Root uses npm workspaces for `backend` and `mobile` (see root `package.json`)

## Core modules delivered (what exists today)
### Backend routes
The API mounts routers in [routes/index.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/index.ts):
- Auth: `/auth/*`
- Children: `/children/*`
- Progress: `/progress/*`
- Admin: `/admin/*`
- Users: `/users/*`
- Resources: `/resources/*`
- Directory: `/directory/*`
- Check-ins: `/check-ins/*`
- Supervision: `/supervision-logs/*`
- Training: `/training/*` (LearnWorlds link-based tracking + reflections)
- Organisation overview: `/org/overview`
- Trainer dashboard: `/trainer/*`
- Invitations: `/invitations/*`
- Accessibility: `/accessibility/*`
- Uploads: `/upload/*` and `/uploads/*`

### Training tracking (LearnWorlds link-based)
Training endpoints are implemented in [training.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/training.ts). Key behaviors:
- Trainers/Admins can upsert modules and assign them to facilitators.
- Facilitators can fetch assigned modules, open the external LMS URL, and update completion status.
- Reflections exist (submitted after a module is completed).
- Organisation overview aggregates training completion counts (anonymised).

### Organisation overview (anonymised)
Aggregation endpoint: [org.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/org.ts)
- Check-in totals and averages
- Supervision totals and follow-up totals
- Training completion totals by status

### Admin permissions + safe delete
Admin capabilities are in [admin.ts](file:///Users/wshah/Documents/Eduwave/backend/src/routes/admin.ts):
- Super Admin can grant/revoke admin permissions.
- Users can be listed with/without deleted entries.
- Organisations can be created and users can be assigned to organisations.

## Environment variables (backend)
Backend environment schema is validated using Zod in [env.ts](file:///Users/wshah/Documents/Eduwave/backend/src/lib/env.ts). Required keys:
- `DATABASE_URL`
- `JWT_SECRET` (min 16 chars)
- `ENCRYPTION_KEY_BASE64` (base64 string that decodes to exactly 32 bytes)

Common optional keys:
- `PORT` (defaults to 4000)
- `UPLOADS_PUBLIC_BASE_URL` (important in production so file URLs are correct)
- Seed-only admin credentials:
  - `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`

Local example exists at the repo root `.env.example`.

## Local development (backend + mobile)
### Install dependencies (workspaces)
From repo root:
- `npm install`

### Backend
From repo root:
- Start dev server: `npm run dev:backend`
- Build: `npm --workspace backend run build`
- Run tests: `npm test`
- Run lint: `npm run lint`

Notes:
- Backend reads `.env` from `backend/.env` and also from root `../.env` (see [index.ts](file:///Users/wshah/Documents/Eduwave/backend/src/index.ts)).
- Prisma generate runs automatically after install via root `postinstall`.

### Mobile (Expo)
From repo root:
- Start Expo: `npm run dev:mobile`

API base URL behavior is defined in [baseUrl.ts](file:///Users/wshah/Documents/Eduwave/mobile/src/api/baseUrl.ts):
- If `EXPO_PUBLIC_API_BASE_URL` is set, the app uses it.
- Otherwise it defaults to the Render backend URL.

## Render deployment (backend + Postgres)
Render uses the Blueprint file [render.yaml](file:///Users/wshah/Documents/Eduwave/render.yaml).

### What the Blueprint creates
- 1 Web service: `eduwave-backend`
- 1 PostgreSQL database: `eduwave-db`

### Key Render settings (why they matter)
- Uses `NODE_VERSION` pinned to `20.18.0` (prevents unexpected breakage from Render’s default Node updates).
- Build installs dev dependencies to satisfy TypeScript type packages during compilation.
- `DATABASE_URL` is wired using the database internal connection string.
- Startup runs migrations, retrying once if the database is still provisioning.

### Render environment variables (must set)
In Render service → Environment:
- `ENCRYPTION_KEY_BASE64` (required, otherwise the server will crash at startup)
  - Generate locally with:
    - `openssl rand -base64 32`
    - or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `UPLOADS_PUBLIC_BASE_URL`
  - Set to: `https://<your-render-service>.onrender.com/uploads`

Optional but recommended:
- `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (for seeded logins)

### Migrations + seed on Render
- Migrations run automatically via `prisma migrate deploy` during service start.
- Seed can be run via Render Shell:
  - `cd backend && npm run prisma:seed`
Seed logic: [seed.ts](file:///Users/wshah/Documents/Eduwave/backend/prisma/seed.ts)

### Health check
Backend exposes:
- `GET /health` returning `{ ok: true }` (see [app.ts](file:///Users/wshah/Documents/Eduwave/backend/src/app.ts))

## EAS (Build + Update) for client distribution
This project is configured for EAS using:
- [app.json](file:///Users/wshah/Documents/Eduwave/mobile/app.json) (bundle/package IDs + runtimeVersion policy)
- [eas.json](file:///Users/wshah/Documents/Eduwave/mobile/eas.json) (preview build profile)

### One-time setup
From `mobile/`:
- `eas init`
- `eas update:configure`

### First build (client install)
Android internal share build (APK):
- `eas build -p android --profile preview`

iOS requires Apple Developer + TestFlight for external testers:
- `eas build -p ios --profile production`

### Publish updates (no rebuild needed for most UI/logic changes)
From `mobile/`:
- `eas update --message "Describe your change"`

Notes:
- EAS Update covers JS + assets. Native dependency changes require a rebuild and reinstall.

## Troubleshooting (common)
### Render build fails with missing type declarations
Symptom:
- TypeScript errors like “Could not find a declaration file for module 'express'”
Cause:
- Dev dependencies (like `@types/*`) not installed during build.
Fix:
- Ensure the Render build installs dev dependencies (handled in [render.yaml](file:///Users/wshah/Documents/Eduwave/render.yaml)).

### Render prisma migrate deploy fails with P1001 (DB not reachable)
Symptom:
- `P1001: Can't reach database server`
Cause:
- Database is still provisioning or network/connection string mismatch.
Fix:
- Ensure database is in the same Render region as the web service and `DATABASE_URL` uses the internal connection string (handled in [render.yaml](file:///Users/wshah/Documents/Eduwave/render.yaml)).

### Render server crashes with ENCRYPTION_KEY_BASE64 missing
Symptom:
- Zod error for `ENCRYPTION_KEY_BASE64` being undefined.
Fix:
- Set `ENCRYPTION_KEY_BASE64` in Render environment variables (see above).

### EAS CLI permission error creating local config directories
If EAS CLI fails creating OS preference directories, run commands with sandboxed dirs:
- `HOME=. XDG_CONFIG_HOME=.config XDG_CACHE_HOME=.cache eas <command>`

https://eduwave-backend-qx7f.onrender.com/health