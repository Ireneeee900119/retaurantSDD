# API Contract: Order Placement & Status

**Version**: v1 | **Base path**: `/api/v1` | **Date**: 2026-05-26

---

## POST /api/v1/orders

Submit a new order. Synchronous in Phase 1–3 (returns 201 with full order).
Asynchronous in Phase 4 (returns 202 Accepted immediately; order processed by queue worker).

**Auth**: None required (customer-facing, no login)

**Request body**:

```json
{
  "items": [
    { "menuItemId": "uuid", "quantity": 2 },
    { "menuItemId": "uuid", "quantity": 1 }
  ],
  "customerNote": "少冰，謝謝",
  "idempotencyKey": "uuid-v4"
}
```

| Field | Required | Notes |
|---|---|---|
| `items` | Yes | At least 1 item; max 50 items per order |
| `items[].menuItemId` | Yes | Must reference an available MenuItem |
| `items[].quantity` | Yes | Integer 1–99 |
| `customerNote` | No | Max 500 characters |
| `idempotencyKey` | No (Phase 4: recommended) | Client UUID v4; enables deduplication |

**Response 201** (Phase 1–3, synchronous):

```json
{
  "orderId": "uuid",
  "referenceNumber": "ORD-00042",
  "status": "RECEIVED",
  "totalAmount": "195.00",
  "items": [
    {
      "menuItemId": "uuid",
      "name": "珍珠奶茶",
      "quantity": 2,
      "unitPrice": "65.00",
      "subtotal": "130.00"
    },
    {
      "menuItemId": "uuid",
      "name": "雞蛋沙拉三明治",
      "quantity": 1,
      "unitPrice": "65.00",
      "subtotal": "65.00"
    }
  ],
  "createdAt": "2026-05-26T10:30:00Z"
}
```

**Response 202** (Phase 4, async queue):

```json
{
  "referenceNumber": "ORD-00042",
  "status": "QUEUED",
  "message": "Order received and queued for processing. Use referenceNumber to track status."
}
```

**Response 400** — Validation errors:

```json
{
  "error": "VALIDATION_ERROR",
  "details": [
    { "field": "items[0].menuItemId", "message": "Item is currently unavailable" },
    { "field": "items", "message": "At least 1 item required" }
  ]
}
```

**Response 409** — Duplicate idempotency key (Phase 4+):

```json
{
  "error": "DUPLICATE_ORDER",
  "referenceNumber": "ORD-00042",
  "message": "Order with this idempotency key already exists"
}
```

**Response 503** — Queue at capacity (Phase 4 only):

```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Order queue is at capacity. Please retry after 5 seconds.",
  "retryAfter": 5
}
```

**Business rules enforced server-side**:
- All `menuItemId` values must exist and have `isAvailable: true`
- `totalAmount` is computed server-side from current item prices; client total is ignored
- Price at time of order is captured and stored regardless of future menu changes

---

## GET /api/v1/orders/:referenceNumber

Retrieve order details and current status. Used by customers to track their order.

**Auth**: None required (reference number acts as the access token)

**Path parameters**:
- `referenceNumber` (string, required) — e.g., `ORD-00042`

**Response 200**:

```json
{
  "orderId": "uuid",
  "referenceNumber": "ORD-00042",
  "status": "PREPARING",
  "totalAmount": "195.00",
  "customerNote": "少冰，謝謝",
  "items": [
    {
      "name": "珍珠奶茶",
      "quantity": 2,
      "unitPrice": "65.00",
      "subtotal": "130.00"
    }
  ],
  "createdAt": "2026-05-26T10:30:00Z",
  "updatedAt": "2026-05-26T10:32:00Z"
}
```

**Response 404**:

```json
{ "error": "ORDER_NOT_FOUND", "message": "No order found with this reference number" }
```

**Cache behaviour** (Phase 2+): Cached under `order:status:{referenceNumber}` with 30 s
TTL. Staff status update triggers invalidation.
