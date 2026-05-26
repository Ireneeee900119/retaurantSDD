# API Contract: Staff Order Management

**Version**: v1 | **Base path**: `/api/v1` | **Date**: 2026-05-26

**Auth**: All staff endpoints require a valid staff session token in the
`Authorization: Bearer {token}` header. Staff authentication implementation is out of scope
for this spec and will be defined in a dedicated auth spec.

---

## GET /api/v1/staff/orders

List all orders for the current branch, ordered by creation time (newest first).
Used by kitchen and front-of-house staff to manage the order queue.

**Auth**: Required (staff role)

**Query parameters**:

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `status` | string | (all) | Filter by OrderStatus enum value |
| `limit` | integer | 50 | Max 200 |
| `offset` | integer | 0 | Pagination offset |

**Response 200**:

```json
{
  "orders": [
    {
      "orderId": "uuid",
      "referenceNumber": "ORD-00043",
      "status": "RECEIVED",
      "totalAmount": "130.00",
      "itemCount": 2,
      "customerNote": null,
      "createdAt": "2026-05-26T10:35:00Z"
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

---

## PATCH /api/v1/staff/orders/:referenceNumber/status

Update the status of an order. The only valid transitions are:

```
RECEIVED -> PREPARING
PREPARING -> READY
READY -> DELIVERED
Any non-DELIVERED, non-CANCELLED -> CANCELLED
```

**Auth**: Required (staff role)

**Path parameters**:
- `referenceNumber` (string, required)

**Request body**:

```json
{ "status": "PREPARING" }
```

**Response 200**:

```json
{
  "referenceNumber": "ORD-00042",
  "previousStatus": "RECEIVED",
  "newStatus": "PREPARING",
  "updatedAt": "2026-05-26T10:33:00Z"
}
```

**Response 400** — Invalid transition:

```json
{
  "error": "INVALID_STATUS_TRANSITION",
  "message": "Cannot transition from DELIVERED to PREPARING",
  "currentStatus": "DELIVERED"
}
```

**Response 404**:

```json
{ "error": "ORDER_NOT_FOUND" }
```

**Side effects**: Invalidates `order:status:{referenceNumber}` cache entry (Phase 2+).

---

## PATCH /api/v1/staff/menu/items/:itemId/availability

Toggle an item's availability. Used when an ingredient runs out mid-service.

**Auth**: Required (staff or admin role)

**Request body**:

```json
{ "isAvailable": false }
```

**Response 200**:

```json
{
  "itemId": "uuid",
  "name": "珍珠奶茶",
  "isAvailable": false,
  "updatedAt": "2026-05-26T11:00:00Z"
}
```

**Side effects**: Invalidates `menu:full` and `menu:category:{categoryId}` cache keys (Phase 2+).

---

## GET /api/v1/staff/orders/:referenceNumber

Get full order detail including all items. Used when staff need to review or handle an order.

**Auth**: Required (staff role)

**Response 200**: Same schema as the customer `GET /api/v1/orders/:referenceNumber` response,
with the addition of branch information (Phase 3+):

```json
{
  "orderId": "uuid",
  "referenceNumber": "ORD-00042",
  "status": "PREPARING",
  "totalAmount": "195.00",
  "customerNote": "少冰，謝謝",
  "branchId": "uuid",
  "items": [ ... ],
  "createdAt": "...",
  "updatedAt": "..."
}
```
