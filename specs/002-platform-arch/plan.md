# Implementation Plan: Scalable Platform Architecture (4-Phase Evolution)

**Branch**: `002-platform-arch` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-platform-arch/spec.md`

## Summary

Restaurant ordering and management platform built to scale from a single-store MVP to a
distributed, high-concurrency operation — without rewrites. Each of the four phases is
independently deployable and adds capability additively on top of the previous phase.

Backend: Node.js + NestJS (TypeScript). Frontend: React 18 + Vite (TypeScript).
Database: PostgreSQL + Prisma ORM. Cache: Redis (Phase 2+). Queue: BullMQ → Kafka
(Phase 3–4). CDN: Cloudflare (Phase 4). Containers: Docker + Docker Compose (all phases
for local dev), cloud-managed orchestration (Phase 3+).

## Technical Context

**Language/Version**: TypeScript 5.x — Node.js 20 LTS (backend) + React 18 (frontend)

**Primary Dependencies**: NestJS 10 (backend framework), React 18 + Vite (frontend),
Prisma 5 (ORM), PostgreSQL 16, Redis 7 (Phase 2+), BullMQ (Phase 3+),
Docker + Docker Compose (all phases for local dev)

**Storage**: PostgreSQL (primary relational store, all phases); Redis (cache + job queue,
Phase 2+); local filesystem for uploads (Phase 1), object storage S3-compatible (Phase 3+)

**Testing**: Jest + Supertest (unit + integration); Playwright (E2E for critical paths)

**Target Platform**: Web browser (desktop + mobile responsive); Linux server/container
(Phase 1: single VPS → Phase 3+: cloud container orchestration)

**Project Type**: Full-stack web application (REST API + React SPA)

**Performance Goals**:
- Phase 1: 100 concurrent users, p95 < 2s, single server
- Phase 2: 500 concurrent users, p95 < 500ms menu, after Redis cache
- Phase 3: 2,000 concurrent users across auto-scaled instances
- Phase 4: 10,000 concurrent order submissions, async ACK < 5s, 100% order durability

**Constraints**:
- Phase 1 MUST run on a single server with no external services (no Redis, no queue)
- Each phase transition is additive — no rewrites of working Phase N code
- Phase 2 optimizations MUST be API-contract-transparent (no breaking changes)
- Phase 4 microservice split is determined by observed bottlenecks, not decided upfront

**Scale/Scope**: Single store (Phase 1–2); multi-branch with logical isolation (Phase 3+)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Domain-Driven Design | PASS | NestJS modules map 1:1 to Menu, Order, Branch, Staff domains |
| II. API-First Design | PASS | OpenAPI contracts defined before frontend wiring; versioned from day 1 |
| III. Independent Testable Stories | PASS | Each phase ships and tests independently |
| IV. Observability | PASS | Structured JSON logging Phase 1; distributed tracing Phase 3+ |
| V. Simplicity First | PASS | Phase 1 has no Redis, no queue — plain NestJS + PostgreSQL |

**Violations**: None. Complexity Tracking table not required.

*Post-design re-check*: All contracts versioned at `/api/v1/`; domain module boundaries
enforced in NestJS; no cross-domain direct DB access in any module.

---

## Phase Evolution Blueprint

Four stages from a single bubble-tea counter to a nationally distributed platform.

```
+----------------------------------------------------------------------------+
|  PHASE 1 — Single-Machine MVP                  Target: ~100 concurrent    |
|  手搖店初期 · Launch fast, prove the concept                               |
|                                                                            |
|   Browser ──► [React SPA (Vite build, served by NestJS static)]           |
|                      |  REST /api/v1                                       |
|               [NestJS HTTP Server]                                         |
|                      |                                                     |
|               [PostgreSQL 16]   [Local File Storage]                      |
|                                                                            |
|   One server. No external services. Deploy: docker-compose up             |
+----------------------------------------------------------------------------+
          |
          |  Trigger: p95 > 2s | DB CPU > 70% sustained
          v
+----------------------------------------------------------------------------+
|  PHASE 2 — Single-Machine Optimized            Target: ~500 concurrent    |
|  口碑傳開期 · Survive the spike without moving servers                     |
|                                                                            |
|   Browser ──► [React SPA]                                                 |
|                      |  REST /api/v1  (API contracts unchanged)           |
|               [NestJS Server]                                              |
|                   |         |                                              |
|          [PostgreSQL]   [Redis 7]                                          |
|          + Query Indexes  (menu cache, session, rate-limit)               |
|                                                                            |
|   Same VPS. Redis added as sidecar. Zero breaking API changes.            |
+----------------------------------------------------------------------------+
          |
          |  Trigger: VPS CPU/RAM > 80% peak | opening 2nd branch
          v
+----------------------------------------------------------------------------+
|  PHASE 3 — Cloud Distributed + CI/CD           Target: ~2,000 concurrent  |
|  全台開分店期 · Reliability, automation, multi-branch                      |
|                                                                            |
|   Browser ──► [Load Balancer]                                             |
|                /     |     \                                               |
|          [App] [App] [App]    <- Docker containers, auto-scale            |
|               \      |     /                                               |
|       [PostgreSQL Primary + Read Replica]                                 |
|                      |                                                     |
|               [Redis Cluster]                                              |
|                      |                                                     |
|       [GitHub Actions CI/CD] -> registry -> cloud deploy                 |
|                                                                            |
|   Cloud-native. Multi-branch isolation. Zero-downtime deploy.            |
+----------------------------------------------------------------------------+
          |
          |  Trigger: order errors during peak | queue depth growing
          v
+----------------------------------------------------------------------------+
|  PHASE 4 — High Concurrency + Microservices    Target: 10,000+ concurrent |
|  萬人搶購期 · Absorb the flash-sale; never lose an order                   |
|                                                                            |
|   Browser ──► [Cloudflare CDN] ──► [API Gateway / Nginx]                 |
|                                       /          \                         |
|                         [Menu Service]  [Order Service]  [Staff Svc]     |
|                         (read-heavy)    (write-heavy)    (internal)      |
|                               |                |               |          |
|                       [Read Replica]  [BullMQ / Kafka]  [PostgreSQL]     |
|                       [Redis Cache]         |                             |
|                                     [Order Processors]                    |
|                                     (async worker pool)                   |
|                                                                            |
|   Read/write split. Queue absorbs spikes. CDN shields backend.           |
+----------------------------------------------------------------------------+
```

---

## Technical Strategy Analysis

### 1. Database Read/Write Separation

| Phase | Strategy | Rationale |
|---|---|---|
| 1–2 | Single PostgreSQL instance | All traffic fits; separation adds ops complexity with no gain |
| 3 | Primary + 1 read replica; Prisma routes by query type | Menu + status reads to replica; writes to primary |
| 4 | Read Service uses replica pool only; Write Service uses primary only | Independent horizontal scaling of each path |

**Prisma dual-client pattern** (Phase 3+, zero logic changes in domain services):

```typescript
// prisma.service.ts
export class PrismaService {
  readonly write = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_WRITE_URL } } })
  readonly read  = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_READ_URL  } } })
}
// MenuService injects prisma.read; OrdersService injects prisma.write
```

Phase 1–2: `DATABASE_READ_URL` and `DATABASE_WRITE_URL` point to the same instance.
Phase 3+: they diverge. No business logic changes required.

### 2. Redis Caching Strategy

| Cache Layer | Key | TTL | Invalidation Trigger |
|---|---|---|---|
| Full menu snapshot | `menu:full` | 60 s | Staff updates any item or category |
| Per-category items | `menu:category:{id}` | 60 s | Category or its items updated |
| Order status | `order:status:{ref}` | 30 s | Staff updates order status |
| Rate limit counter | `rl:order:{ip}` | 60 s | Auto-expiry (rolling window) |

**Cache-aside pattern** (Phase 2, unchanged through Phase 4):

```
Request
  -> CacheService.get(key)
     HIT  -> return cached JSON
     MISS -> query PostgreSQL -> CacheService.set(key, value, ttl) -> return

Staff update
  -> domain service writes to DB -> CacheService.del(key)
```

`CacheService` in Phase 1 uses an `in-memory Map` stub that implements the same interface.
Swapping Redis in Phase 2 requires only a configuration change — no caller code changes.

### 3. High-Concurrency Order Processing (Phase 4)

**Problem**: 10,000 simultaneous synchronous DB writes collapse the write path.

**Queue-based ingestion flow**:

```
1. Customer submits order
2. API validates payload + checks idempotency key for duplicates
3. Job enqueued in BullMQ -> 202 Accepted { orderRef, status: "QUEUED" }
4. Order processor worker dequeues -> writes to DB -> updates status
5. Customer polls GET /api/v1/orders/{ref} (or WebSocket push for real-time)
```

**Deduplication**: Client sends a UUID v4 `idempotencyKey` with each submission.
Worker checks `processed_keys` table before writing. Duplicate returns existing
`orderRef` with no DB write.

**Backpressure**: When BullMQ queue depth > `MAX_QUEUE_DEPTH`, the API returns
`503 Service Unavailable` with `Retry-After: 5` rather than accepting unbounded work.

**Durability**: BullMQ persists jobs in Redis with `removeOnComplete: false` for 24 h.
Failed jobs auto-retry up to 3 times with exponential backoff before moving to a
dead-letter queue for manual review.

---

## Resource Allocation & Performance Comparison

### Infrastructure Per Phase

| | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| **App servers** | 1 VPS (2 vCPU / 2 GB) | 1 VPS (2–4 vCPU / 4 GB) | 2–5 containers (auto-scale) | 5–20 service containers |
| **Database** | Single PostgreSQL | PostgreSQL + indexes | Primary + 1 read replica | Primary + 2+ replicas |
| **Cache** | In-memory stub | Redis 7 single node | Redis Cluster (3 nodes) | Redis Cluster (multi-AZ) |
| **Queue** | None | None | BullMQ (Redis-backed) | BullMQ or Kafka |
| **CDN** | None | Optional (static only) | Yes (frontend bundle) | Yes + edge caching |
| **CI/CD** | Manual compose | Manual | GitHub Actions automated | Automated + blue-green |
| **Monitoring** | stdout JSON logs | Logs + Redis metrics | APM (Grafana / Datadog) | Full distributed tracing |

### Load Capacity

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| Concurrent users | ~100 | ~500 | ~2,000 | 10,000+ |
| Orders / minute | ~30 | ~150 | ~600 | 3,000+ (async) |
| Menu p95 latency | < 2 s | < 500 ms | < 200 ms | < 100 ms (CDN) |
| Order submit p95 | < 3 s | < 2 s | < 1 s | < 5 s (202 ACK) |
| Uptime target | 95% | 99% | 99.5% | 99.9% |
| Single-point failure | High | High | Low | Very Low |
| Data loss risk | Low (PG durable) | Low | Very Low | Near-zero (queue + replay) |

### Estimated Monthly Cost (USD, managed cloud, approximate)

| Component | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| Compute | $20–50 | $30–60 | $150–400 | $600–2,500 |
| Database (managed) | $15–30 | $15–30 | $80–200 | $300–800 |
| Redis (managed) | — | $15–30 | $40–120 | $120–500 |
| Message Queue | — | — | Incl. in Redis | $60–250 (Kafka) |
| CDN | — | $5–10 | $20–60 | $60–250 |
| CI/CD | Free | Free | Free–$25 | $25–120 |
| Object Storage | — | — | $5–15 | $15–50 |
| Monitoring / APM | Free tier | Free tier | $30–100 | $100–400 |
| **Monthly Total** | **$35–80** | **$65–130** | **$325–920** | **$1,280–4,870** |

> Figures assume a mid-tier managed cloud provider (AWS / GCP / Azure). Self-hosted
> alternatives reduce cost by ~40% at the expense of increased operational burden.

### Phase Transition Checklist

| Observed Signal | Action |
|---|---|
| Menu p95 > 2 s consistently | Add Redis cache (Phase 1 -> 2) |
| DB slow query log showing full-table scans | Add indexes (Phase 2) |
| VPS CPU/RAM > 80% during peak hours | Cloud multi-instance (Phase 2 -> 3) |
| Manual deploy blocking or causing errors | CI/CD pipeline (Phase 2 -> 3) |
| Opening 2nd physical branch | Multi-branch infrastructure (Phase 3) |
| Order errors / timeouts during peak | Message queue (Phase 3 -> 4) |
| Frontend CDN not yet enabled | Add CDN for static assets (Phase 4) |
| Staff service bottlenecking order path | Microservice split (Phase 4) |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-platform-arch/
├── plan.md              # This file
├── research.md          # Technology decisions and rationale
├── data-model.md        # Domain entity definitions
├── quickstart.md        # Phase 1 local setup guide
└── contracts/
    ├── menu-api.md      # Menu browsing endpoints
    ├── order-api.md     # Order placement and status endpoints
    └── staff-api.md     # Staff order management endpoints
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── menu/                  # Menu domain (NestJS module)
│   │   ├── menu.controller.ts
│   │   ├── menu.service.ts
│   │   ├── menu.module.ts
│   │   └── dto/
│   ├── orders/                # Order domain (NestJS module)
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts
│   │   ├── orders.module.ts
│   │   └── dto/
│   ├── staff/                 # Staff auth + order management module
│   ├── cache/                 # CacheService (in-memory Phase 1, Redis Phase 2+)
│   ├── queue/                 # BullMQ queue module (Phase 3+)
│   ├── common/                # Guards, interceptors, pipes, structured logging
│   └── app.module.ts
├── prisma/
│   └── schema.prisma
└── tests/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── pages/
│   │   ├── menu/              # Menu browsing
│   │   ├── order/             # Order placement + confirmation
│   │   └── track/             # Order status tracking
│   ├── components/
│   ├── services/              # API client (typed from OpenAPI spec)
│   └── types/                 # Shared TypeScript interfaces
└── tests/

infra/
├── docker-compose.yml         # Phase 1-2: local + single-server deploy
├── docker-compose.prod.yml    # Phase 3: multi-instance
├── docker/
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
└── .github/
    └── workflows/
        └── deploy.yml         # Phase 3: CI/CD pipeline
```

**Structure Decision**: Web application layout (Option 2). Backend and frontend are
independently deployable. `infra/` is created in Phase 1 for local Docker Compose
development and expanded for cloud in Phase 3.

## Complexity Tracking

> No constitution violations identified. Table not required.
