# API Contract: Menu Browsing

**Version**: v1 | **Base path**: `/api/v1` | **Date**: 2026-05-26

All responses are `application/json`. All timestamps are ISO 8601 UTC.

---

## GET /api/v1/menu

Returns the full active menu grouped by category. This is the primary endpoint for the
customer menu page.

**Auth**: None required (public endpoint)

**Query parameters**: None

**Response 200**:

```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "手搖飲料",
      "displayOrder": 1,
      "items": [
        {
          "id": "uuid",
          "name": "珍珠奶茶",
          "description": "經典台式珍珠奶茶",
          "price": "65.00",
          "imageUrl": "/images/items/pearl-milk-tea.jpg",
          "isAvailable": true
        }
      ]
    }
  ]
}
```

**Cache behaviour** (Phase 2+): Response cached under key `menu:full` with 60 s TTL.
Staff availability update triggers immediate cache invalidation.

**Notes**:
- Unavailable items (`isAvailable: false`) are included with `isAvailable: false` so
  the UI can show "currently unavailable" rather than silently hiding items.
- Inactive categories (`isActive: false`) are excluded entirely.

---

## GET /api/v1/menu/categories/:categoryId/items

Returns items for a single category. Useful for paginated or lazy-loaded category views.

**Auth**: None required

**Path parameters**:
- `categoryId` (UUID, required)

**Response 200**:

```json
{
  "categoryId": "uuid",
  "categoryName": "輕食",
  "items": [
    {
      "id": "uuid",
      "name": "雞蛋沙拉三明治",
      "description": null,
      "price": "55.00",
      "imageUrl": null,
      "isAvailable": true
    }
  ]
}
```

**Response 404**:

```json
{ "error": "CATEGORY_NOT_FOUND", "message": "Category not found or inactive" }
```

**Cache behaviour** (Phase 2+): Cached under `menu:category:{categoryId}` with 60 s TTL.

---

## GET /api/v1/menu/items/:itemId

Returns a single menu item. Used for item detail views.

**Auth**: None required

**Response 200**:

```json
{
  "id": "uuid",
  "categoryId": "uuid",
  "name": "珍珠奶茶",
  "description": "經典台式珍珠奶茶，珍珠Q彈",
  "price": "65.00",
  "imageUrl": "/images/items/pearl-milk-tea.jpg",
  "isAvailable": true
}
```

**Response 404**:

```json
{ "error": "ITEM_NOT_FOUND", "message": "Menu item not found" }
```
