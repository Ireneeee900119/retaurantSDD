# Research: Scalable Platform Architecture

**Feature**: `002-platform-arch` | **Date**: 2026-05-26

## Technology Decisions

### Backend Framework

**Decision**: NestJS 10 (Node.js + TypeScript)

**Rationale**: NestJS modules map directly to DDD domain boundaries (Menu, Order, Staff,
Branch). Its modular architecture means each domain can be extracted into a microservice in
Phase 4 with minimal refactoring — modules already have clear boundaries. TypeScript
alignment with the React frontend enables a shared type layer.

**Alternatives considered**:
- *Express.js*: Simpler Phase 1 setup, but no built-in module system — leads to ad-hoc
  folder structures that complicate Phase 3-4 extraction.
- *Fastify*: Better raw throughput than Express, but smaller ecosystem; NestJS can use
  Fastify as an adapter if needed in Phase 4.
- *Python / FastAPI*: Would require a separate language/toolchain from the React frontend;
  rejected to maintain a single TypeScript codebase across backend and frontend.

---

### Database

**Decision**: PostgreSQL 16 with Prisma 5 ORM

**Rationale**: Relational integrity is non-negotiable for order totals, item price-at-time-
of-order, and financial accuracy. PostgreSQL's `READ COMMITTED` isolation prevents dirty
reads on concurrent order submissions. Prisma provides type-safe queries that align with
TypeScript and supports connection routing (write vs. read URL) for Phase 3 replicas.

**Alternatives considered**:
- *MySQL 8*: Comparable capability; PostgreSQL chosen for superior JSON support and
  row-level locking semantics in high-concurrency Phase 4 scenarios.
- *MongoDB*: Flexible schema appealing for menu items, but lack of joins complicates
  order + item + pricing queries; rejected.
- *PlanetScale (MySQL)*: Managed and scalable, but vendor lock-in risk for a
  multi-phase evolution strategy.

---

### Cache Layer

**Decision**: Redis 7 (Phase 2+) with BullMQ for job queuing (Phase 3+)

**Rationale**: Redis serves dual purpose — cache (Phase 2) and job queue backend (Phase 3+)
— reducing operational complexity of managing two separate systems. BullMQ is a mature
Redis-backed queue library for Node.js with built-in retry, dead-letter, and rate-limiting.

**Cache interface abstraction** (critical for Phase 1 simplicity):
A `CacheService` interface is implemented as an in-memory `Map` in Phase 1 and swapped
to Redis in Phase 2 via NestJS dependency injection — zero changes to `MenuService` or
`OrdersService` code.

**Alternatives considered**:
- *Memcached*: No persistence, no pub/sub, no job queue capability; rejected.
- *Upstash Redis (serverless)*: Good for Phase 1-2 managed Redis; considered for Phase 2
  if operator prefers serverless. BullMQ requires persistent Redis connection, so Phase 3+
  requires a dedicated Redis instance regardless.

---

### Message Queue (Phase 4)

**Decision**: BullMQ (Phase 3) → evaluate Kafka migration at Phase 4 onset

**Rationale**: BullMQ uses Redis as its backend, so introducing it in Phase 3 adds zero new
infrastructure dependencies. If Phase 4 order volumes exceed Redis queue capacity
(>50,000 messages/second sustained), Kafka provides higher throughput and longer retention.
The migration is an infrastructure concern only — the NestJS queue module's producer/consumer
interface is identical.

**Decision trigger for Kafka**: Queue depth consistently > 100k messages, or need for
multi-consumer fan-out across microservices with replay from offset.

**Alternatives considered**:
- *RabbitMQ*: Mature, but adds a new infrastructure component in Phase 3; BullMQ + Redis
  reuses existing Redis investment.
- *AWS SQS / Google Pub-Sub*: Managed, no ops burden; viable if already using that cloud
  provider. Deferred to Phase 4 infrastructure planning.

---

### Container & Orchestration

**Decision**: Docker + Docker Compose (Phase 1–2) → cloud-managed container orchestration
(Phase 3+), specific provider decided at Phase 3 onset

**Rationale**: Docker Compose covers Phase 1 single-server deployment and local development
consistently across all phases. Phase 3 cloud orchestration options (AWS ECS, GCP Cloud Run,
Kubernetes) are deferred to avoid premature commitment — the container images are
orchestration-agnostic.

**Phase 3 orchestration shortlist**: AWS ECS (lowest ops overhead), GCP Cloud Run
(serverless container, zero idle cost), Kubernetes (most control, highest ops burden).
Choose based on team cloud familiarity at Phase 3 transition.

---

### CDN (Phase 4)

**Decision**: Cloudflare (Phase 4 default)

**Rationale**: Cloudflare's free tier covers static asset caching globally. The paid tier
adds edge caching for API responses (e.g., menu snapshot at the edge), reducing backend
origin requests by >80% for read-heavy traffic. Provider-agnostic — switching to AWS
CloudFront or Fastly requires only DNS and origin changes.

---

### Frontend

**Decision**: React 18 + Vite + TypeScript

**Rationale**: Specified in the project constitution. Vite provides fast local development
and optimized production bundles. TypeScript types are generated from the OpenAPI contract
spec, ensuring frontend–backend type safety across all phases.

---

## Key Open Questions (Deferred to Phase-Specific Planning)

| Question | Deferred To |
|---|---|
| Cloud provider for Phase 3 | Phase 3 planning cycle |
| Kafka vs. stay BullMQ for Phase 4 | Phase 4 onset evaluation |
| Staff authentication method (JWT / session / SSO) | Staff auth spec |
| Multi-branch physical DB isolation (if needed) | Phase 3 planning cycle |
| Object storage provider for menu images | Phase 3 planning cycle |
