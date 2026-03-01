# Internal Task Board

Minimal internal task board built with Next.js App Router, TypeScript, PostgreSQL, Prisma, and JWT (access + refresh).

## Tech Stack

- Next.js (App Router)
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT auth with refresh token in httpOnly cookie
- dnd-kit for drag and drop

## Features

- No registration
- Exactly 3 seeded users
- Single board with 3 seeded columns
- Column CRUD (create, rename, delete empty column)
- Column reorder with drag and drop
- Task CRUD updates (create, edit, move, assign)
- Task history (`moved`, `assigned`, `edited`)
- Access token kept in memory (not localStorage)

## Seeded Users

Password for seeded users is taken from env: `SEED_DEFAULT_PASSWORD`.

- pasha@company.local
- oleg@company.local
- gena@company.local

## Required Environment Variables

Copy `.env.example` to `.env` and update values.

```bash
DATABASE_URL="postgresql://taskboard:taskboard@localhost:5432/taskboard?schema=public"
JWT_ACCESS_SECRET="replace-with-a-long-random-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-secret"
BCRYPT_ROUNDS="12"
SEED_DEFAULT_PASSWORD="replace-with-strong-shared-password"
SEED_FORCE_PASSWORD_RESET="false"
```

## Setup

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate:dev --name init
pnpm db:seed
pnpm dev
```

## API Endpoints

Auth:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Protected (JWT middleware):

- `GET /api/columns`
- `POST /api/columns`
- `PATCH /api/columns/:id`
- `DELETE /api/columns/:id`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `PATCH /api/tasks/:id/move`
- `PATCH /api/tasks/:id/assign`
- `GET /api/tasks/:id/history`

## Folder Structure

```text
app/
  api/
    auth/
      login/route.ts
      refresh/route.ts
      logout/route.ts
    columns/route.ts
    columns/[id]/route.ts
    tasks/
      route.ts
      [id]/route.ts
      [id]/move/route.ts
      [id]/assign/route.ts
      [id]/history/route.ts
  board/page.tsx
  login/page.tsx
components/
  board/
    ...
  login-form.tsx
  ui/
    modal.tsx
lib/
  auth/
    cookies.ts
    jwt.ts
    password.ts
    request.ts
  client/
    auth.ts
  db.ts
  http.ts
  validation.ts
prisma/
  schema.prisma
  seed.ts
middleware.ts
docker-compose.yml
Dockerfile
```

## Docker (Production with Caddy + HTTPS)

Target URL: `https://plane.pog-sandbox.com`

### 1. DNS and Firewall

- Point `plane.pog-sandbox.com` A record to your server public IP
- Open inbound ports `80` and `443` on the server firewall/security group
- Make sure no other service is already binding `80/443`

### 2. Prepare Production Environment

```bash
cp .env.production.example .env.production
```

Set strong values in `.env.production`:

- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `SEED_DEFAULT_PASSWORD`
- optional: `RUN_DB_SEED=true` for first startup only

### 3. Start Stack

```bash
docker compose --env-file .env.production up -d --build
```

Run seed once (recommended after first deploy):

```bash
docker compose --env-file .env.production exec app pnpm db:seed
```

Optional: force reset seeded user passwords by setting `SEED_FORCE_PASSWORD_RESET=true` before running seed.

Services:

- `caddy` (TLS termination and reverse proxy)
- `app` (Next.js)
- `db` (PostgreSQL)

### 4. Verify

```bash
docker compose ps
docker compose logs -f caddy
docker compose logs -f app
```

When certificate issuance succeeds, app will be available at:

- `https://plane.pog-sandbox.com`

## GitHub Auto Deploy (main -> server)

Workflow file:

- `.github/workflows/deploy.yml`

It runs on every push to `main` and executes on the server:

1. `git pull --ff-only origin main`
2. `docker compose --env-file .env.production up -d --build`

Add these repository secrets in GitHub:

- `DEPLOY_HOST` (example: `your.server.ip`)
- `DEPLOY_USER` (example: `team`)
- `DEPLOY_PORT` (optional, usually `22`)
- `DEPLOY_PATH` (example: `/var/www/internal-task-board`)
- `DEPLOY_SSH_KEY` (private SSH key content used to connect to server)
- `DEPLOY_ENV_FILE_B64` (base64 of full `.env.production` file content)

Generate `DEPLOY_ENV_FILE_B64` from your local `.env.production`:

```bash
# Linux
base64 -w0 .env.production

# macOS
base64 < .env.production | tr -d '\n'
```
