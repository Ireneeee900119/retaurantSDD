# Data Model: Scalable Platform Architecture

**Feature**: `002-platform-arch` | **Date**: 2026-05-26

All entities below exist from Phase 1 unless noted. Fields prefixed `[Phase N+]` are added
at that phase transition. No entity is removed between phases.

---

## MenuCategory

Organizes menu items into logical groups (e.g., Drinks, Snacks, Combos).

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, auto-generated | |
| `name` | string (100) | NOT NULL, UNIQUE | e.g., "手搖飲料", "輕食" |
| `displayOrder` | integer | NOT NULL, DEFAULT 0 | Controls sort order on menu page |
| `isActive` | boolean | NOT NULL, DEFAULT true | Inactive categories hidden from customers |
| `createdAt` | timestamp | NOT NULL, DEFAULT now() | |
| `updatedAt` | timestamp | NOT NULL | Auto-updated on write |

**Indexes**: `isActive` (partial index on active categories for menu queries)

---

## MenuItem

A single dish, drink, or product available for ordering.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, auto-generated | |
| `categoryId` | UUID | FK -> MenuCategory.id, NOT NULL | |
| `name` | string (200) | NOT NULL | |
| `description` | text | NULLABLE | |
| `price` | decimal(10,2) | NOT NULL, CHECK > 0 | Stored in TWD; no floating-point |
| `imageUrl` | string (500) | NULLABLE | Phase 1: local path; Phase 3+: object storage URL |
| `isAvailable` | boolean | NOT NULL, DEFAULT true | Staff-controlled; triggers cache invalidation |
| `displayOrder` | integer | NOT NULL, DEFAULT 0 | Within-category sort |
| `createdAt` | timestamp | NOT NULL, DEFAULT now() | |
| `updatedAt` | timestamp | NOT NULL | |

**Indexes**:
- `(categoryId, isAvailable)` — menu browsing query
- `(isAvailable)` — staff availability filter

---

## Branch

Represents a physical restaurant location. Introduced in Phase 3.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, auto-generated | |
| `name` | string (200) | NOT NULL | e.g., "台北信義店" |
| `address` | text | NOT NULL | |
| `isActive` | boolean | NOT NULL, DEFAULT true | |
| `createdAt` | timestamp | NOT NULL, DEFAULT now() | |

> **Phase 1–2**: Single implicit branch. `branchId` column added to `Order` at Phase 3
> migration with a DEFAULT pointing to the seed "main branch" record. No data loss.

---

## Order

A customer's submitted request to the kitchen.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, auto-generated | Internal identifier |
| `referenceNumber` | string (20) | NOT NULL, UNIQUE | Human-readable, e.g., "ORD-00042" |
| `branchId` | UUID | FK -> Branch.id, NULLABLE [Phase 3+] | NULL = single-branch Phase 1/2 |
| `status` | OrderStatus enum | NOT NULL, DEFAULT 'RECEIVED' | |
| `totalAmount` | decimal(10,2) | NOT NULL | Sum of OrderItem.subtotal; verified on write |
| `idempotencyKey` | string (100) | UNIQUE, NULLABLE [Phase 4+] | Client-provided UUID for dedup |
| `customerNote` | text | NULLABLE | Optional note from customer |
| `createdAt` | timestamp | NOT NULL, DEFAULT now() | |
| `updatedAt` | timestamp | NOT NULL | |

**Indexes**:
- `referenceNumber` (unique — customer polling)
- `(branchId, status, createdAt)` — staff order list query [Phase 3+]
- `(status, createdAt)` — staff order list query [Phase 1-2]
- `idempotencyKey` (unique partial — Phase 4+ dedup guard)

---

## OrderItem

A line item within an order. Captures price at time of order to prevent drift.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, auto-generated | |
| `orderId` | UUID | FK -> Order.id, NOT NULL | |
| `menuItemId` | UUID | FK -> MenuItem.id, NOT NULL | |
| `quantity` | integer | NOT NULL, CHECK > 0 | |
| `unitPrice` | decimal(10,2) | NOT NULL | Copied from MenuItem.price at submission time |
| `subtotal` | decimal(10,2) | NOT NULL | Computed: quantity * unitPrice; stored for auditability |

**Indexes**: `(orderId)` — fetch all items for an order

---

## OrderStatus (Enum)

State machine governing order lifecycle:

```
QUEUED -> RECEIVED -> PREPARING -> READY -> DELIVERED
   ^
   |__ Phase 4 only: initial state when order enters the message queue
       Transitions to RECEIVED once processor writes to DB

CANCELLED (terminal, from any non-DELIVERED state)
```

| Value | Description | Who Sets It |
|---|---|---|
| `QUEUED` | Order accepted by queue, not yet written to DB | System (Phase 4 only) |
| `RECEIVED` | Order written to DB, awaiting kitchen action | System (on DB write) |
| `PREPARING` | Kitchen is preparing the order | Staff |
| `READY` | Order ready for pickup/delivery | Staff |
| `DELIVERED` | Order handed to customer | Staff |
| `CANCELLED` | Order cancelled before delivery | Staff or System |

---

## ProcessedIdempotencyKey (Phase 4)

Deduplication guard for the async order processor.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `key` | string (100) | PK | Client-provided UUID from order submission |
| `orderId` | UUID | FK -> Order.id, NOT NULL | Resolved order reference |
| `processedAt` | timestamp | NOT NULL, DEFAULT now() | |

Rows are retained for 24 hours then purged by a scheduled job.

---

## Entity Relationships

```
MenuCategory 1──* MenuItem
                     |
                     | (menuItemId captured at submission)
                     v
Order 1──* OrderItem (unitPrice snapshot)
  |
  | branchId [Phase 3+]
  v
Branch

Order 1──1 ProcessedIdempotencyKey [Phase 4+]
```

---

## Migration Strategy Per Phase

| Phase | Migration Actions |
|---|---|
| 1 | Create all tables except `Branch`, `ProcessedIdempotencyKey`; `Order.branchId` absent |
| 2 | `CREATE INDEX` statements only; no schema changes |
| 3 | `ALTER TABLE Order ADD COLUMN branchId UUID NULLABLE`; seed Branch record; backfill |
| 4 | Add `Order.idempotencyKey`; create `ProcessedIdempotencyKey` table |

All migrations are additive (add column/index/table). No existing columns are modified or
removed between phases.
