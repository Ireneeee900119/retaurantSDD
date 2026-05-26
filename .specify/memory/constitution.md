<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0  (initial ratification; all tokens replaced)
Modified principles: N/A — first-time constitution
Added sections:
  - Core Principles (5 principles)
  - Technology Standards
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md  ✅ Constitution Check section references these principles
  - .specify/templates/spec-template.md  ✅ No structural changes required
  - .specify/templates/tasks-template.md ✅ No structural changes required
Follow-up TODOs:
  - TODO(BACKEND_FRAMEWORK): Backend framework not yet chosen (Node.js/Express vs Python/FastAPI vs other).
    Decide before the first feature plan is written and update Technology Standards accordingly.
-->

# Restaurant Management App Constitution

## Core Principles

### I. Domain-Driven Design

All code MUST be organized around explicit restaurant domain concepts: **Menu**, **Order**,
**Reservation**, **Table**, and **Staff**. Each domain boundary is a first-class concern.

- Cross-domain dependencies MUST be intentional and documented in the feature plan.
- Domain entities MUST NOT leak persistence or transport concerns into their core logic.
- Naming in code, APIs, and specs MUST match the ubiquitous language used in the domain
  (e.g. `placeOrder`, not `createRecord`; `Table`, not `Seat`).
- New domain concepts require explicit rationale before introduction.

### II. API-First Design

Frontend and backend contracts MUST be defined and agreed upon before implementation begins.

- Every endpoint MUST be specified (OpenAPI schema or TypeScript interface) before any
  backend or frontend code is written for it.
- No undocumented or ad-hoc endpoints are permitted on the main branch.
- Contract changes require a versioned update and coordinated migration across both layers.

### III. Independent, Testable User Stories

Every implemented feature slice MUST be independently testable and deliver standalone value.

- No user story is considered complete until it can be demonstrated in isolation.
- Half-finished features MUST NOT be merged to the main branch.
- Each story's acceptance scenarios (Given/When/Then) are the authoritative test definition.

### IV. Observability

All business-critical operations MUST emit structured, queryable logs with sufficient context
to diagnose production issues without re-deploying.

- Operations that MUST be logged: order placement, payment events, table assignment,
  reservation creation/cancellation, and authentication failures.
- Log entries MUST include: timestamp, correlation ID, domain entity ID(s), and outcome.
- Silent failures are not acceptable; errors MUST be surfaced to the caller AND logged.

### V. Simplicity First (YAGNI)

The simplest solution that satisfies the current requirement MUST be chosen.

- No premature abstraction, generalization, or optimization.
- Adding a layer of indirection requires a documented, present-tense justification.
- Complexity violations MUST be recorded in the plan's Complexity Tracking table.

## Technology Standards

**Frontend**: React (TypeScript). Components MUST be co-located with their feature domain
where practical. Global state is reserved for cross-domain concerns only.

**Backend**: Full-stack web API — framework to be decided (TODO(BACKEND_FRAMEWORK): choose
Node.js/Express, NestJS, FastAPI, or equivalent before first feature plan). The choice MUST
be recorded here and in plan-template.md Technical Context defaults.

**Contract layer**: Shared TypeScript types or OpenAPI spec consumed by both frontend and
backend. Source of truth lives in the contract layer, not in either implementation.

**Storage**: NEEDS CLARIFICATION — database engine not yet selected. Decision required before
the data-model.md of the first feature is authored.

**Testing**: Unit tests for domain logic; integration tests for API contracts; E2E tests for
critical user journeys (order placement, reservation flow). Tests are OPTIONAL per feature
unless the spec explicitly requires them.

## Development Workflow

- All features begin with a **spec.md** authored via `/speckit-specify` before any code.
- Features live on numbered branches (`001-feature-name`) created by `/speckit-git-feature`.
- PRs MUST reference the feature's spec.md and pass the Constitution Check in plan.md.
- Code review MUST verify: domain boundary correctness, contract compliance, observability
  coverage, and test coverage for the story's acceptance scenarios (if tests are required).
- Main branch MUST remain deployable at all times.

## Governance

This constitution supersedes all other practices, style guides, and verbal agreements.
When a principle conflicts with convenience, the principle wins or must be amended.

**Amendment procedure**:
1. Open a PR updating this file with a documented rationale.
2. Obtain approval from at least one other contributor (or sole owner sign-off for solo projects).
3. Provide a migration plan if the amendment affects in-progress or completed features.
4. Increment the version according to semantic rules (MAJOR / MINOR / PATCH as defined above).

**Compliance review**: Every PR description MUST include a "Constitution Check" confirming
no active principle is violated, or a justified exception recorded in the plan's
Complexity Tracking table.

**Version policy**: MAJOR = principle removal or incompatible redefinition; MINOR = new
principle or section added; PATCH = clarification, wording, or non-semantic fix.

**Version**: 1.0.0 | **Ratified**: 2026-05-26 | **Last Amended**: 2026-05-26