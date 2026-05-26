# Feature Specification: Online Menu Browsing & Ordering

**Feature Branch**: `001-menu-ordering`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "Online menu browsing and ordering — customers browse the menu and place orders online (table-side or web)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the Menu (Priority: P1)

A customer opens the restaurant's menu on their device (phone, tablet, or web browser) and
browses available dishes organized by category. Each item shows its name, description, price,
and an optional photo. The customer can filter or scroll through categories to find what they
want.

**Why this priority**: This is the foundational step in any ordering flow. Without browsing,
ordering cannot happen. It delivers standalone value as a digital menu even before ordering
is implemented.

**Independent Test**: Open the menu page with no account or session. Verify that all menu
categories and items are displayed with correct names, descriptions, and prices. No login
required.

**Acceptance Scenarios**:

1. **Given** the restaurant has menu items in at least two categories, **When** a customer
   opens the menu page, **Then** they see all categories and can scroll or tap to view items
   within each category.
2. **Given** a menu item has a photo attached, **When** the customer views that item,
   **Then** the photo is displayed alongside the name, description, and price.
3. **Given** the restaurant has marked an item as unavailable, **When** the customer views
   the menu, **Then** that item is shown as unavailable and cannot be added to an order.

---

### User Story 2 - Build and Place an Order (Priority: P2)

A customer selects one or more items from the menu, reviews their order (item names,
quantities, prices, and total), and submits it. The kitchen or staff receives the order for
preparation. The customer gets a confirmation that their order was received.

**Why this priority**: This is the core commercial action. It depends on menu browsing (P1)
but can be tested independently by pre-seeding the menu and submitting a test order.

**Independent Test**: Select two different items, adjust quantity on one, proceed to review,
and submit. Verify that an order record is created with the correct items, quantities, and
total, and that a confirmation is shown to the customer.

**Acceptance Scenarios**:

1. **Given** a customer has selected at least one item, **When** they tap "Add to Order",
   **Then** the item is added to their current order with a default quantity of 1.
2. **Given** an item is in the order, **When** the customer changes its quantity to 0 or
   removes it, **Then** the item is removed from the order.
3. **Given** the customer reviews their order, **When** they confirm and submit, **Then**
   the order is recorded, a unique order reference number is shown, and the kitchen/staff
   is notified.
4. **Given** the customer submits an order, **When** the submission succeeds, **Then** the
   order total matches the sum of (item price × quantity) for all items in the order.

---

### User Story 3 - Track Order Status (Priority: P3)

After placing an order, the customer can see its current status (e.g., Received, Preparing,
Ready, Delivered). Staff can update the status as the order progresses through the kitchen.

**Why this priority**: Improves the customer experience and reduces staff interruptions from
customers asking about their order. Depends on ordering (P2) but is independently valuable
once an order exists.

**Independent Test**: Place a test order (or use an existing order record), have a staff
member update its status from "Received" to "Preparing", and verify that the customer's
view reflects the updated status.

**Acceptance Scenarios**:

1. **Given** a customer placed an order and has their order reference, **When** they view
   their order, **Then** they see the current status and a list of all items ordered.
2. **Given** a staff member updates an order's status, **When** the customer refreshes or
   the view auto-updates, **Then** the customer sees the new status within a reasonable time.
3. **Given** an order reaches "Ready" status, **When** the customer views the order,
   **Then** a clear notification or visual indicator highlights that the order is ready.

---

### Edge Cases

- What happens when a customer submits an order but a selected item becomes unavailable
  between adding it to the order and submitting?
- How does the system handle a customer who navigates away mid-order? Is the cart preserved?
- What happens if two customers try to order the last available portion of a limited item
  simultaneously?
- How does the system behave when the kitchen is closed or the restaurant stops accepting
  orders?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display all active menu items grouped by category, with name,
  description, price, and availability status.
- **FR-002**: Customers MUST be able to add items to an order, adjust quantities, and remove
  items before submitting.
- **FR-003**: The system MUST calculate and display an accurate order total (sum of item price
  × quantity) before the customer submits.
- **FR-004**: Customers MUST be able to submit an order and receive a unique order reference
  number upon success.
- **FR-005**: The system MUST record each order with: reference number, timestamp, list of
  items (name, quantity, unit price), and total amount.
- **FR-006**: Staff MUST be able to view incoming orders and update each order's status
  (Received → Preparing → Ready → Delivered).
- **FR-007**: Customers MUST be able to view the current status of their order using their
  order reference number.
- **FR-008**: The system MUST prevent ordering of items marked as unavailable.
- **FR-009**: The system MUST allow the restaurant to mark individual items or entire
  categories as unavailable without removing them from the menu permanently.
- **FR-010**: The system MUST operate without requiring customers to create an account or
  log in to browse the menu or place an order.

### Key Entities *(include if feature involves data)*

- **MenuItem**: Represents a dish or drink on the menu. Key attributes: name, description,
  price, category, photo (optional), availability status.
- **MenuCategory**: Groups related menu items (e.g., Starters, Mains, Desserts, Drinks).
- **Order**: A customer's submitted request. Key attributes: reference number, timestamp,
  status, list of ordered items, total amount.
- **OrderItem**: A line in an order. Key attributes: reference to MenuItem, quantity,
  unit price at time of order.
- **OrderStatus**: Enum of states an order moves through: Received, Preparing, Ready,
  Delivered.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer can browse the full menu and place a complete order in under
  3 minutes on a standard mobile device.
- **SC-002**: Order submission confirmation is shown to the customer within 5 seconds of
  tapping submit under normal network conditions.
- **SC-003**: Staff see a new order appear in their view within 10 seconds of the customer
  submitting it.
- **SC-004**: 95% of first-time customers can successfully place an order without assistance
  (measured by order completion rate vs. menu page views).
- **SC-005**: The order total displayed to the customer matches the stored order total
  100% of the time (zero rounding or calculation errors).

## Assumptions

- Customers access the menu and ordering interface via a web browser on their own device
  (phone, tablet, or desktop) or a table-side tablet provided by the restaurant.
- No customer account or login is required to browse the menu or place an order; the order
  reference number serves as the only identifier.
- Staff access the order management view through a separate staff interface (authentication
  method for staff is out of scope for this feature and will be addressed in a future spec).
- The menu is maintained by restaurant administrators through a separate admin interface
  (menu editing is out of scope for this feature).
- Payment processing is out of scope for this feature; the focus is on menu browsing and
  order placement only.
- The restaurant operates with a single physical location for the initial version.
- Cart state is preserved for the duration of the browser session; abandoning the browser
  clears the cart.
