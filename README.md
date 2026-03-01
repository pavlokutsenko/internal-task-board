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
- Task CRUD updates (create, edit, move, assign)
- Task history (`moved`, `assigned`, `edited`)

## Seeded Users

Default password for all users: `Password123!`

- alex@company.local
- maria@company.local
- jordan@company.local

## Required Environment Variables

Copy `.env.example` to `.env` and update values.

```bash
DATABASE_URL="postgresql://taskboard:taskboard@localhost:5432/taskboard?schema=public"
JWT_ACCESS_SECRET="replace-with-a-long-random-secret"
JWT_REFRESH_SECRET="replace-with-a-long-random-secret"
BCRYPT_ROUNDS="12"
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
    tasks/
      route.ts
      [id]/route.ts
      [id]/move/route.ts
      [id]/assign/route.ts
      [id]/history/route.ts
  board/page.tsx
  login/page.tsx
components/
  board-client.tsx
  login-form.tsx
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

## Docker

```bash
docker compose up --build
```

Then run seed once (if needed):

```bash
docker compose exec app pnpm db:seed
```
