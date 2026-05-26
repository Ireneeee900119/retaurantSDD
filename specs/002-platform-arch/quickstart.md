# Quickstart: Phase 1 — Local Development Setup

**Target**: Single-machine MVP running on your local machine via Docker Compose.
Covers backend (NestJS + PostgreSQL) + frontend (React + Vite).

---

## Prerequisites

- Docker Desktop 4.x (includes Docker Compose v2)
- Node.js 20 LTS (for running outside Docker during development)
- Git

---

## 1. Clone and Configure

```bash
git clone <repo-url>
cd restaurantSDD

# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env`** — Phase 1 defaults (edit as needed):

```env
DATABASE_WRITE_URL=postgresql://postgres:postgres@db:5432/restaurant
DATABASE_READ_URL=postgresql://postgres:postgres@db:5432/restaurant
PORT=3000
NODE_ENV=development

# Phase 2+ (leave blank for Phase 1)
REDIS_URL=
MAX_QUEUE_DEPTH=
```

**`frontend/.env`**:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## 2. Start All Services

```bash
docker-compose up --build
```

This starts:
- `db` — PostgreSQL 16 on port 5432
- `backend` — NestJS on port 3000
- `frontend` — Vite dev server on port 5173

Wait for: `[NestJS] Application is running on: http://localhost:3000`

---

## 3. Run Database Migrations

```bash
docker-compose exec backend npx prisma migrate dev --name init
```

This creates all Phase 1 tables. To seed example menu data:

```bash
docker-compose exec backend npx prisma db seed
```

---

## 4. Verify the System Works

**Browse the menu** (customer view):

```bash
curl http://localhost:3000/api/v1/menu
# Expected: JSON with categories and items
```

**Place a test order**:

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"menuItemId":"<item-uuid-from-menu>","quantity":2}]}'
# Expected: 201 with referenceNumber (e.g., "ORD-00001")
```

**Check order status**:

```bash
curl http://localhost:3000/api/v1/orders/ORD-00001
# Expected: status "RECEIVED"
```

**Open the frontend**:

```
http://localhost:5173
```

---

## 5. Run Tests

```bash
# Backend unit + integration tests
docker-compose exec backend npm test

# Backend tests with coverage
docker-compose exec backend npm run test:cov
```

---

## 6. Common Issues

| Symptom | Fix |
|---|---|
| `db` container exits immediately | Check PostgreSQL logs: `docker-compose logs db`. Ensure port 5432 is not in use |
| `prisma migrate dev` fails | Ensure `db` is healthy before running: `docker-compose ps` |
| Frontend can't reach API | Verify `VITE_API_BASE_URL` in `frontend/.env` matches backend port |
| Menu returns empty array | Run `npx prisma db seed` to load example data |

---

## Phase 2 Upgrade: Add Redis

When ready to move to Phase 2, add Redis to `docker-compose.yml` and set:

```env
# backend/.env
REDIS_URL=redis://redis:6379
```

No code changes required — the `CacheService` detects `REDIS_URL` and switches from
in-memory cache to Redis automatically.

---

## Useful Commands

```bash
# Stop all services
docker-compose down

# Rebuild after Dockerfile changes
docker-compose up --build

# Open Prisma Studio (database browser)
docker-compose exec backend npx prisma studio

# Tail backend logs
docker-compose logs -f backend
```
