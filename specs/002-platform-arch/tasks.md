---
description: "Task list for Phase 1 MVP — restaurantSDD scalable platform"
---

# Tasks: Scalable Platform Architecture — Phase 1 MVP

**Input**: Design documents from `specs/002-platform-arch/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

**Scope**: Phase 1 (Single-Machine MVP). Covers US1 (Browse Menu), US2 (Place Order),
US3 (Track Order Status). US4 (High-Concurrency) is a separate planning cycle.

**Tests**: Not explicitly requested — test tasks omitted per spec.

**Skip policy**: If a task fails twice, leave comment
`// 這個我修不好，需要專業的奶綠大大來處理` and move to next task.

**ESLint**: All ESLint errors ignored throughout implementation.

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable (different files, no shared dependencies)
- **[Story]**: US1 / US2 / US3 mapping to spec.md user stories

---

## Phase 1: Setup

**Purpose**: Initialize project structure, toolchains, and shared config.

- [x] T001 Initialize NestJS backend in `backend/` using `nest new backend --package-manager npm --skip-git`
- [x] T002 [P] Initialize React + Vite frontend in `frontend/` using `npm create vite@latest frontend -- --template react-ts`
- [x] T003 [P] Create root `docker-compose.yml` with services: `db` (postgres:16-alpine), `backend` (port 3000), `frontend` (port 5173)
- [x] T004 [P] Create `backend/Dockerfile` (node:20-alpine, multi-stage: build + runtime)
- [x] T005 [P] Create `frontend/Dockerfile` (node:20-alpine, serves Vite build via nginx)
- [x] T006 [P] Create `backend/.env.example` with DATABASE_WRITE_URL, DATABASE_READ_URL, PORT=3000, NODE_ENV=development
- [x] T007 [P] Create `frontend/.env.example` with VITE_API_BASE_URL=http://localhost:3000/api/v1
- [x] T008 Install Prisma in backend: `cd backend && npm install prisma @prisma/client && npx prisma init`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, Prisma setup, NestJS base config — MUST complete before any user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T009 Write `backend/prisma/schema.prisma` with models: MenuCategory, MenuItem, Order, OrderItem (enums: OrderStatus). Mirror `data-model.md` exactly. No Branch or idempotencyKey (Phase 3+).
- [x] T010 Create `backend/prisma/seed.ts` with 2 categories and 4 menu items (2 per category) for local development
- [x] T011 Add `prisma.generate`, `prisma.migrate`, `db:seed` scripts to `backend/package.json`
- [x] T012 Create `backend/src/prisma/prisma.service.ts` (NestJS injectable PrismaClient wrapper with `onModuleInit` connect and `onModuleDestroy` disconnect)
- [x] T013 Create `backend/src/prisma/prisma.module.ts` (global NestJS module exporting PrismaService)
- [x] T014 [P] Create `backend/src/common/filters/http-exception.filter.ts` (global NestJS exception filter returning `{ error, message }` JSON)
- [x] T015 [P] Create `backend/src/common/interceptors/logging.interceptor.ts` (structured JSON request logging: method, path, statusCode, durationMs)
- [x] T016 Update `backend/src/app.module.ts` to import PrismaModule, register global filter and interceptor, set global API prefix to `/api/v1`
- [x] T017 [P] Install backend dependencies: `npm install @nestjs/config class-validator class-transformer`
- [x] T018 [P] Install frontend dependencies: `cd frontend && npm install axios`
- [x] T019 Create `backend/src/cache/cache.service.ts` — in-memory Map implementation with `get(key)`, `set(key, value, ttlSecs)`, `del(key)` — Phase 1 stub, Redis swap in Phase 2

**Checkpoint**: Run `docker-compose up db` and `cd backend && npx prisma migrate dev --name init` successfully. Backend starts on port 3000.

---

## Phase 3: User Story 1 — Browse the Menu (Priority: P1) MVP

**Goal**: Customers can see the full menu grouped by category with prices and availability.

**Independent Test**: `curl http://localhost:3000/api/v1/menu` returns categories with items.

### Implementation for User Story 1

- [x] T020 [P] [US1] Create `backend/src/menu/dto/menu-response.dto.ts` with MenuItemDto (id, name, description, price, imageUrl, isAvailable) and MenuCategoryDto (id, name, displayOrder, items)
- [x] T021 [P] [US1] Create `backend/src/menu/menu.service.ts` — `getFullMenu()` queries all active categories + available/unavailable items ordered by displayOrder; uses PrismaService
- [x] T022 [US1] Create `backend/src/menu/menu.controller.ts` — `GET /menu` calls `MenuService.getFullMenu()`, returns MenuCategoryDto[]; `GET /menu/categories/:id/items` returns single category items; `GET /menu/items/:id` returns single item
- [x] T023 [US1] Create `backend/src/menu/menu.module.ts` importing PrismaModule and declaring MenuController + MenuService
- [x] T024 [US1] Register MenuModule in `backend/src/app.module.ts`
- [x] T025 [P] [US1] Create `frontend/src/services/menu.service.ts` — `getMenu(): Promise<MenuCategory[]>` using axios with VITE_API_BASE_URL
- [x] T026 [P] [US1] Create `frontend/src/types/menu.ts` with MenuCategory and MenuItem TypeScript interfaces matching contract
- [x] T027 [US1] Create `frontend/src/pages/menu/MenuPage.tsx` — fetches menu on mount, renders categories as sections, items as cards showing name, price, description, availability badge
- [x] T028 [US1] Create `frontend/src/pages/menu/MenuItemCard.tsx` — displays single menu item; greyed out with "目前無供應" badge if `isAvailable: false`
- [x] T029 [US1] Wire up `frontend/src/App.tsx` to render MenuPage at route `/menu` (use React Router or simple conditional render)

**Checkpoint**: Open http://localhost:5173/menu — full seeded menu visible, unavailable items shown greyed out.

---

## Phase 4: User Story 2 — Build and Place an Order (Priority: P2)

**Goal**: Customer selects items, reviews cart, submits order, receives reference number.

**Independent Test**: POST to `/api/v1/orders` with valid items returns 201 with `referenceNumber`.

### Implementation for User Story 2

- [x] T030 [P] [US2] Create `backend/src/orders/dto/create-order.dto.ts` with `items: OrderItemInputDto[]` (menuItemId: string, quantity: number 1–99), optional `customerNote: string` — use class-validator decorators
- [x] T031 [P] [US2] Create `backend/src/orders/dto/order-response.dto.ts` matching `order-api.md` response shape
- [x] T032 [US2] Create `backend/src/orders/orders.service.ts` with `createOrder(dto)`:
  - Validate all menuItemIds exist and `isAvailable: true`
  - Compute totalAmount server-side (sum of price × quantity)
  - Generate `referenceNumber` as `ORD-NNNNN` (padded sequential from DB count)
  - Write Order + OrderItems in a Prisma transaction
  - Return full OrderResponseDto
- [x] T033 [US2] Create `backend/src/orders/orders.service.ts` method `getOrderByRef(ref)`: fetch order + items by referenceNumber, throw NotFoundException if not found
- [x] T034 [US2] Create `backend/src/orders/orders.controller.ts` — `POST /orders` calls createOrder; `GET /orders/:referenceNumber` calls getOrderByRef
- [x] T035 [US2] Create `backend/src/orders/orders.module.ts` importing PrismaModule
- [x] T036 [US2] Register OrdersModule in `backend/src/app.module.ts`
- [x] T037 [P] [US2] Create `frontend/src/types/order.ts` — Cart, CartItem, OrderResponse TypeScript interfaces
- [x] T038 [P] [US2] Create `frontend/src/services/order.service.ts` — `placeOrder(items, note?)` POST to `/orders`
- [x] T039 [US2] Create `frontend/src/pages/order/CartContext.tsx` — React context with `addItem(item)`, `removeItem(id)`, `updateQuantity(id, qty)`, `clearCart()`, `items`, `total`
- [x] T040 [US2] Update `frontend/src/pages/menu/MenuItemCard.tsx` to include "加入訂單" button that calls `addItem` from CartContext
- [x] T041 [US2] Create `frontend/src/pages/order/CartDrawer.tsx` — slide-in cart showing items, quantities (editable), subtotals, total, "送出訂單" button
- [x] T042 [US2] Create `frontend/src/pages/order/OrderConfirmation.tsx` — shows referenceNumber and success message after order submitted
- [x] T043 [US2] Wire CartContext provider around app in `frontend/src/App.tsx`; add CartDrawer toggle button to menu page header

**Checkpoint**: Add 2 items to cart, submit order, see confirmation with ORD-NNNNN.

---

## Phase 5: User Story 3 — Track Order Status (Priority: P3)

**Goal**: Customer tracks order by reference number; staff can update order status.

**Independent Test**: Staff PATCH to `/api/v1/staff/orders/ORD-00001/status` with `{"status":"PREPARING"}` returns 200. Customer GET shows updated status.

### Implementation for User Story 3

- [x] T044 [P] [US3] Create `backend/src/staff/dto/update-order-status.dto.ts` with `status: OrderStatus` (enum, class-validator `@IsEnum`)
- [x] T045 [US3] Create `backend/src/staff/staff.service.ts` with:
  - `listOrders(status?)`: query orders filtered by optional status, ordered by createdAt DESC, limit 50
  - `updateOrderStatus(ref, newStatus)`: validate transition (RECEIVED→PREPARING→READY→DELIVERED, any→CANCELLED), update DB, return previous + new status
  - `toggleItemAvailability(itemId, isAvailable)`: update MenuItem.isAvailable
- [x] T046 [US3] Create `backend/src/staff/staff.controller.ts` — `GET /staff/orders`, `GET /staff/orders/:ref`, `PATCH /staff/orders/:ref/status`, `PATCH /staff/menu/items/:id/availability`
- [x] T047 [US3] Create `backend/src/staff/staff.module.ts` importing PrismaModule
- [x] T048 [US3] Register StaffModule in `backend/src/app.module.ts`
- [x] T049 [P] [US3] Create `frontend/src/services/track.service.ts` — `getOrderStatus(ref): Promise<OrderResponse>` GET to `/orders/:ref`
- [x] T050 [US3] Create `frontend/src/pages/track/TrackOrderPage.tsx` — input field for referenceNumber, "查詢" button, displays order status and items on success, error message on 404
- [x] T051 [US3] Add `/track` route to `frontend/src/App.tsx` rendering TrackOrderPage; add nav link in header

**Checkpoint**: Visit http://localhost:5173/track, enter ORD-00001, see status "RECEIVED". Use curl to PATCH status to PREPARING, refresh page, see updated status.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docker wiring, seed validation, global error handling, UI polish.

- [x] T052 Verify `docker-compose up --build` starts all three services cleanly (db, backend, frontend)
- [x] T053 [P] Add `frontend/src/components/Header.tsx` with app name "餐飲系統" and nav links: 菜單 (/menu), 查詢訂單 (/track)
- [x] T054 [P] Add global CSS reset and basic mobile-responsive styles in `frontend/src/index.css`
- [x] T055 [P] Add `backend/src/common/pipes/validation.pipe.ts` — register globally in main.ts for DTO validation via class-validator
- [x] T056 Update `backend/src/main.ts` to enable CORS for `http://localhost:5173`, register global ValidationPipe, set global prefix `/api/v1`
- [x] T057 Run `npx prisma migrate dev` and `npm run db:seed` inside docker container; verify menu endpoint returns seeded data
- [x] T058 [P] Update root `README.md` with quickstart commands mirroring `quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **US1 Browse Menu (Phase 3)**: Depends on Phase 2 — no dependency on US2/US3
- **US2 Place Order (Phase 4)**: Depends on Phase 2; integrates with US1 (MenuPage gets cart button)
- **US3 Track Order (Phase 5)**: Depends on Phase 2; independent of US1/US2 for backend; integrates lightly with UI
- **Polish (Phase 6)**: Depends on all user story phases

### Within Each User Story

- DTO types before service implementation
- Service before controller
- Controller before module registration
- Backend module before frontend service/component

### Parallel Opportunities

```bash
# Phase 1 — run together:
T002 (React init) || T003 (docker-compose) || T004 (backend Dockerfile) || T005 (frontend Dockerfile)

# Phase 2 — after T008:
T014 (exception filter) || T015 (logging interceptor) || T017 (install deps) || T018 (frontend deps)

# Phase 3 — US1 backend/frontend in parallel once T019 done:
T020 (menu DTOs) || T021 (menu service) — then T022 (controller)
T025 (frontend menu service) || T026 (types) — then T027 (MenuPage)

# Phase 4 — US2:
T030 (create-order DTO) || T031 (order-response DTO) — then T032 (service)
T037 (frontend order types) || T038 (order service) — parallel with backend T032-T036
```

---

## Implementation Strategy

### MVP First (US1 Only — ~45 min)

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1 Browse Menu
4. **STOP**: `curl http://localhost:3000/api/v1/menu` returns real data + frontend renders

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → menu browsing works (demo-able)
3. US2 → cart + order placement (MVP complete)
4. US3 → order tracking + staff management
5. Polish → production-ready Phase 1

---

## Notes

- `[P]` = different files, no incomplete-task dependencies — safe to work in parallel
- Skip policy: fail twice → add `// 這個我修不好，需要專業的奶綠大大來處理` comment, mark `- [x]` and continue
- ESLint errors: ignored entirely — do not run lint, do not fix lint
- All prices in TWD stored as `Decimal` (Prisma type) rendered as string in JSON
- `referenceNumber` generation: `ORD-` + zero-padded count from DB (`SELECT COUNT(*) FROM orders`)
