# Sari-Fi — Complete Business Flow & Bug-Fix Implementation Plan

## Purpose

This document is the implementation plan for fixing the Sari-Fi React/Firebase prototype.

The objective is **not** to rewrite the application or introduce unnecessary architecture. The objective is to make the existing customer, employee/POS, supervisor, financing, payment, inventory, credit-limit, order, Firebase, and audit flows internally consistent.

The implementation must preserve the current UI, routing, data model, and overall architecture unless a change is necessary to fix a business-flow defect.

---

# 1. Core Engineering Rule

> **Do not fix these problems by adding more state mutations. First identify the single source of truth for each business event. Every order, financing, payment, inventory, credit, and audit event must happen exactly once.**

The largest problems in the current implementation are caused by the same business event being processed in multiple places.

Examples:

- A page updates Firebase.
- The same page dispatches a reducer action.
- The reducer performs the same mutation again.
- A page manually creates an audit.
- `deriveAudit()` creates another audit for the same action.

The fix must eliminate this duplication rather than adding additional compensating logic.

---

# 2. Project Scope

Relevant architecture:

- React 19
- TypeScript
- Vite
- React Context + `useReducer`
- Firebase Realtime Database
- Firebase Storage
- Customer pages
- Employee/POS pages
- Supervisor pages
- Admin pages
- Shared pages/services
- Existing `src/types.ts`
- Existing Firebase service layer
- Existing centralized reducer/audit system

Important files identified during review:

- `src/pages/customer/CheckoutPage.tsx`
- `src/pages/shared/POSPage.tsx`
- `src/pages/shared/OrdersManagementPage.tsx`
- `src/pages/shared/FinancingManagementPage.tsx`
- `src/pages/shared/PaymentsManagementPage.tsx`
- `src/context/AppContext.tsx`
- `src/data/audit.ts`
- `src/services/firebase/rtdbService.ts`
- `src/types.ts`

Before changing anything, inspect the entire repository and confirm whether additional call sites affect these flows.

---

# 3. Required First Step — Repository Audit

## DO NOT MODIFY CODE YET.

First inspect the entire repository.

Create a dependency/flow map showing:

1. Where orders are created.
2. Where payments are created.
3. Where financing records are created.
4. Where inventory is decremented.
5. Where inventory is restored.
6. Where `customer.usedCredit` is increased.
7. Where `customer.usedCredit` is decreased.
8. Where financing status changes.
9. Where order status changes.
10. Where payment status changes.
11. Where audit records are created.
12. Which actions are handled by `AppContext` reducer.
13. Which pages directly write to Firebase.
14. Which pages dispatch reducer actions after Firebase writes.
15. Which Firebase subscriptions synchronize state back into React.

For every business mutation, identify whether it currently occurs:

- in a page,
- in a service,
- in the reducer,
- or in multiple locations.

Produce a proposed patch plan before modifying code.

Do not perform an architectural rewrite.

---

# 4. Golden Business Invariants

These invariants are mandatory.

## Financing

1. Submitting financing must **not** consume customer credit.
2. Submitting financing must **not permanently consume inventory** if the business flow requires supervisor approval first.
3. Approving financing consumes the financed principal **exactly once**.
4. Rejecting financing consumes **zero** customer credit.
5. Paying principal decreases `usedCredit` **exactly once**.
6. Full settlement releases the remaining principal **exactly once**.
7. `usedCredit` must never increase twice because both Firebase logic and reducer logic processed the same approval.
8. `usedCredit` must never exceed `creditLimit` because of duplicate mutations.
9. A rejected financing application must not leave the customer with consumed credit.
10. Financing status transitions must be deterministic and idempotent.

## Inventory

1. Each physical sale decrements inventory exactly once.
2. Refreshing the page must not decrement inventory again.
3. Re-login must not decrement inventory again.
4. Synchronization from Firebase must never mutate inventory.
5. A rejected financing application must restore any reserved/deducted stock exactly once if stock was reserved at submission.
6. A cancelled order must not restore inventory twice.
7. Restocking increases inventory exactly once.
8. An already-processed order must not be processed as a new sale again.

## Orders

1. Every order has exactly one authoritative lifecycle.
2. Order status must reflect the actual business state.
3. Payment state and order state must not contradict each other.
4. Financing orders cannot become completed merely because a financing application was submitted.
5. Financing approval and physical fulfillment should be separate concepts unless the existing thesis requirements explicitly define approval as completion.
6. Pending cash orders must remain pending until cash is actually confirmed.
7. GCash payments are currently simulated and must remain clearly treated as mock/demo payment processing.

## Payments

1. Every payment must be recorded exactly once.
2. A payment cannot be marked paid twice.
3. Installment principal reduction must occur exactly once.
4. Full settlement must occur exactly once.
5. Payment records must correspond to their order/financing relationship.
6. Payment status must be synchronized consistently between the payment record and order/financing state.

## Audit

1. One user action = one audit event.
2. Every audit event must identify the actor.
3. Every audit event must contain actor role.
4. Every audit event must identify the action.
5. Every audit event should identify the target when applicable.
6. Audit records must not be duplicated because both a page and reducer create the same event.
7. Firebase synchronization actions must not create audits.
8. Login/logout auditing must remain functional.
9. Financial/business actions must produce meaningful audit summaries.

---

# 5. Single Source of Truth Strategy

The implementation should use a consistent rule:

## Business Event

A business event should have one authoritative mutation path.

For example:

### Order placement

Do not do:

```text
CheckoutPage
    ↓
write Firebase
    ↓
dispatch PLACE_ORDER
    ↓
reducer changes local inventory
```

if both paths perform the same business mutation.

Instead, establish one authoritative mutation strategy and make the other path synchronization-only.

### Financing approval

Do not do:

```text
FinancingManagementPage
    ↓
write Firebase
    ↓
dispatch APPROVE_FINANCING
    ↓
reducer approves financing again
    ↓
usedCredit += principal again
```

Approval must happen once.

### Audit

Do not do:

```text
page manually calls logAudit()
+
reducer deriveAudit()
```

for the same event.

Pick one centralized audit mechanism.

---

# 6. Recommended State Architecture

Preserve the existing architecture, but enforce these responsibilities.

## Pages

Pages should:

- collect user input,
- validate input,
- invoke the authoritative business action,
- display success/error state,
- avoid duplicating business mutations.

Pages should not perform a business mutation and then dispatch another action that performs the same mutation.

## Reducer

The reducer should remain the central state-transition mechanism where practical.

If the application chooses reducer-first mutations, the reducer should own:

- order state transitions,
- financing state transitions,
- payment state transitions,
- local inventory changes,
- local credit changes.

Firebase persistence should not independently perform the same mutation a second time.

## Firebase Service

The Firebase layer should:

- persist authoritative records,
- load data,
- subscribe to changes,
- provide reusable persistence helpers.

It should not silently perform additional business mutations that are also performed by the reducer.

## Synchronization

`SYNC_*` actions should only synchronize state.

They must not:

- decrement inventory,
- increment used credit,
- create payments,
- create financing applications,
- create audit entries.

---

# 7. Phase 1 — Fix Order Placement Duplication

## Files to inspect

- `src/pages/customer/CheckoutPage.tsx`
- `src/pages/shared/POSPage.tsx`
- `src/context/AppContext.tsx`
- Firebase order/payment/financing services

## Current problem

Customer Checkout and POS currently perform Firebase business mutations and then dispatch `PLACE_ORDER`.

`PLACE_ORDER` also:

- adds order,
- adds payment,
- adds financing,
- decrements inventory,
- increments customer `usedCredit`.

This creates duplicate mutation risk.

## Required fix

Choose one authoritative mutation path.

Recommended:

- Create a single order-placement business action/service.
- It should calculate the intended order, payment, financing, inventory effect, and credit effect.
- Persist the resulting records once.
- Update local state consistently.
- Do not repeat the same mutation through another path.

If preserving `PLACE_ORDER`, make sure page-level code does not independently perform the same local business mutation.

## Acceptance test

Create a POS cash order.

Expected:

```text
1 order
1 payment
inventory -quantity exactly once
usedCredit unchanged
order completed
payment paid
one audit
```

Then refresh.

Expected:

```text
inventory remains at the same value
no second payment
no second audit
```

---

# 8. Phase 2 — Fix Customer Online Checkout

## File

`src/pages/customer/CheckoutPage.tsx`

## Cash

Current intended flow:

```text
Customer checkout
    ↓
order pending_payment
    ↓
payment pending
    ↓
employee confirms cash
    ↓
order completed
    ↓
payment paid
```

Preserve this behavior.

Do not mark cash orders completed before cash confirmation.

## GCash — Add a Small Webhook-Style Mock Payment Flow

The current GCash implementation is too simplistic: the user presses the GCash payment button and the system immediately marks the payment as paid.

Replace that behavior with a **small mock GCash webhook architecture**.

This is NOT a request for a real GCash API integration.

The goal is to make the thesis prototype behave like a real asynchronous payment integration while remaining completely local/mock.

### Required mock flow

Instead of:

```text
Click GCash
    ↓
Immediately paid
```

implement:

```text
Customer selects GCash
    ↓
Create payment with:
    status = pending
    paymentMethod = gcash
    mockTransactionId = generated ID
    ↓
Show "Waiting for GCash payment"
    ↓
Mock GCash payment action/process
    ↓
Mock webhook event generated
    ↓
Webhook handler receives event
    ↓
Verify transaction/payment reference
    ↓
Mark payment = paid
    ↓
Update order payment status
    ↓
Continue order lifecycle
    ↓
Create ONE payment audit
```

### Mock webhook design

Create a small internal mock webhook layer/service rather than calling a real external GCash API.

For example, conceptually:

```text
src/services/payment/
    mockGcashService.ts
    mockGcashWebhook.ts
```

The exact filenames may differ if the repository has a better existing structure.

The mock service should provide functionality conceptually equivalent to:

```ts
createMockGcashPayment(...)
```

which generates a mock transaction/reference ID and leaves the payment in:

```text
pending
```

Then provide a mock webhook simulation equivalent to:

```ts
simulateGcashWebhook(...)
```

which produces an event such as:

```ts
{
    event: "payment.success",
    transactionId: "...",
    referenceId: "...",
    amount: ...,
    status: "SUCCESS",
    timestamp: ...
}
```

The webhook handler should then process the event and perform the application's normal payment-success transition.

### Important: webhook processing must be idempotent

The same webhook must NOT be able to pay the order twice.

For example:

```text
Webhook SUCCESS #1
    ↓
payment pending → paid
```

Then:

```text
Same webhook SUCCESS #2
    ↓
payment already paid
    ↓
NO second payment
NO second inventory deduction
NO second credit mutation
NO second audit
```

Use the existing payment/order identifiers to identify the transaction.

### Mock UI behavior

The GCash UI should demonstrate the asynchronous flow.

Recommended:

```text
[Pay with GCash]
        ↓
Payment Created
        ↓
Waiting for GCash Confirmation...
        ↓
[Simulate GCash Payment]   ← thesis/demo only
        ↓
Webhook Received
        ↓
Payment Confirmed
```

The customer should NOT simply click "Pay with GCash" and instantly receive a paid status.

The demo button can simulate the external GCash app/payment provider completing the payment.

Clearly label it as a mock/simulation so nobody mistakes it for a production GCash integration.

### Webhook endpoint simulation

If the current architecture can support it cleanly, create a small mock endpoint/handler conceptually equivalent to:

```text
POST /api/mock/gcash/webhook
```

However, do NOT introduce a full backend solely for this if the existing thesis architecture does not have one.

If the frontend-only Firebase prototype cannot expose a real HTTP endpoint, implement the same contract as an internal mock webhook handler/function.

The important requirement is the **event-driven contract**, not an actual public webhook server.

### Webhook validation

The mock handler should validate at minimum:

- transaction/reference ID exists
- payment exists
- amount matches the expected amount
- payment method is GCash
- payment is currently pending
- webhook status represents successful payment

Reject invalid or mismatched events.

### Payment states

At minimum, the mock GCash flow should support:

```text
pending
paid
failed
```

Do not automatically mark failed payments as paid.

A failed webhook should leave the order/payment in an appropriate unpaid/failed state.

### GCash business rule

The mock webhook is only responsible for confirming the payment.

It must NOT independently perform unrelated business mutations.

For example, do not have:

```text
GCash webhook
    ↓
inventory - quantity
    ↓
credit changes
    ↓
order completed
```

if those mutations belong to the central order/payment business flow.

Instead:

```text
GCash webhook
    ↓
validated payment-success event
    ↓
authoritative payment transition
    ↓
normal order business flow
```

This prevents GCash confirmation from becoming another source of duplicate inventory/credit mutations.

### POS GCash

The same mock webhook architecture must work for POS GCash payments.

Do not create one completely different implementation for customer checkout and another for POS.

Both should use the same payment confirmation logic where practical.

### Acceptance test — GCash

Test:

1. Customer chooses GCash.
2. Payment record is created as `pending`.
3. Order is NOT falsely marked paid yet.
4. A mock transaction/reference ID exists.
5. User triggers the demo payment simulation.
6. Mock webhook event is generated.
7. Webhook validates the transaction.
8. Payment becomes `paid`.
9. Order payment state updates correctly.
10. Inventory changes exactly once.
11. Exactly one audit is generated.
12. Send/process the same webhook again.
13. Verify nothing is duplicated.

Expected final invariant:

```text
1 GCash transaction
1 payment record
1 successful payment transition
1 inventory mutation
1 audit event
```

### Important limitation

This is intentionally a **mock GCash webhook architecture for the thesis prototype**.

Do NOT claim that it is a real GCash integration.

A real production GCash integration would require actual merchant/payment-provider credentials, API access, webhook security/signature verification, server-side infrastructure, and provider-specific integration requirements.

For this thesis, the objective is to demonstrate the correct asynchronous payment architecture and webhook-style flow without requiring real GCash credentials.

## Financing

Required:

```text
Customer submits financing
    ↓
financing = pending
    ↓
order = pending_financing
    ↓
NO credit consumption
    ↓
NO permanent inventory consumption
```

Supervisor then reviews it.

Approval:

```text
pending
    ↓
approved/active
    ↓
principal consumed exactly once
    ↓
order moves into fulfillment lifecycle
```

Rejection:

```text
pending
    ↓
rejected
    ↓
order cancelled
    ↓
credit consumption = 0
    ↓
reserved inventory restored if necessary
```

---

# 9. Phase 3 — Fix POS Financing

## File

`src/pages/shared/POSPage.tsx`

POS financing must follow the exact same business invariants as online financing.

Do not create a separate business logic implementation that behaves differently.

Expected:

```text
Employee creates financing sale
        ↓
pending_financing
        ↓
Supervisor reviews
        ↓
APPROVE or REJECT
```

Approval:

- financing becomes active/approved,
- credit consumed exactly once,
- order proceeds into fulfillment.

Rejection:

- financing rejected,
- order cancelled,
- used credit remains unchanged,
- reserved inventory restored if necessary.

---

# 10. Phase 4 — Fix Financing Approval

## File

`src/pages/shared/FinancingManagementPage.tsx`

## Current problems

The page:

- updates Firebase,
- dispatches `APPROVE_FINANCING`,
- and the reducer also changes financing/order/customer state.

This can double-count `usedCredit`.

## Required fix

Make approval one atomic logical event.

Approval must:

1. Find the financing.
2. Verify it is currently pending.
3. Verify it has not already been approved/rejected.
4. Mark it approved/active.
5. Consume principal exactly once.
6. Update order state.
7. Persist the resulting records.
8. Update local state.
9. Create exactly one audit.

## Idempotency requirement

If an already-approved financing is submitted to the approval handler again:

```text
NO additional usedCredit
NO additional inventory change
NO duplicate payment
NO duplicate audit
```

---

# 11. Phase 5 — Fix Financing Rejection

## Required behavior

When supervisor rejects pending financing:

```text
financing = rejected
order = cancelled
usedCredit += 0
```

If inventory was reserved at submission:

```text
reserved inventory → restored exactly once
```

If inventory was not reserved:

```text
do not invent a restoration
```

The implementation must determine which inventory strategy is actually used and consistently apply it.

---

# 12. Phase 6 — Fix Order Lifecycle

The current order statuses include:

```text
pending_payment
pending_financing
approved
processing
ready
out_for_delivery
delivered
completed
cancelled
```

Use them consistently.

Recommended financing lifecycle:

```text
pending_financing
    ↓
approved / processing
    ↓
ready
    ↓
out_for_delivery
    ↓
delivered
    ↓
completed
```

If the thesis business rules explicitly define financing approval as immediate completion, preserve that requirement. Otherwise, do not conflate financing approval with physical order completion.

Cash:

```text
pending_payment
    ↓
cash confirmed
    ↓
processing
    ↓
ready
    ↓
out_for_delivery
    ↓
delivered
    ↓
completed
```

Adjust only if the existing thesis specification requires a different lifecycle.

---

# 13. Phase 7 — Fix Cash Confirmation

## File

`src/pages/shared/OrdersManagementPage.tsx`

Current behavior:

- page updates Firebase,
- dispatches `CONFIRM_CASH_PAYMENT`,
- manually logs audit,
- reducer also generates audit.

## Required fix

Cash confirmation should:

1. Verify order is actually awaiting cash confirmation.
2. Verify payment is pending.
3. Mark payment paid exactly once.
4. Set `paidAt`.
5. Set `confirmedBy`.
6. Update order payment status.
7. Update order lifecycle.
8. Create one audit event.

Do not allow repeated confirmation to generate another payment or audit.

---

# 14. Phase 8 — Fix Installment Payment

## Files

- `src/context/AppContext.tsx`
- payment management pages
- financing/payment Firebase services

For `PAY_INSTALLMENT`:

1. Verify installment is unpaid.
2. Mark installment paid exactly once.
3. Calculate principal portion exactly once.
4. Increase `paidPrincipal` exactly once.
5. Decrease `customer.usedCredit` by principal portion exactly once.
6. Create one installment payment.
7. Update financing totals.
8. Generate one audit.

Repeated submission of the same installment must be idempotent.

Expected:

```text
usedCredit_before
    -
principal_component
    =
usedCredit_after
```

and never:

```text
usedCredit_before
    -
principal_component
    -
principal_component
```

---

# 15. Phase 9 — Fix Full Settlement

For `PAY_FULL_BALANCE`:

1. Verify financing is active and has a remaining balance.
2. Verify settlement has not already occurred.
3. Mark schedule/financing completed exactly once.
4. Release remaining principal from `usedCredit` exactly once.
5. Create one settlement payment.
6. Generate one audit.

If the remaining principal is `X`:

```text
usedCredit_after = usedCredit_before - X
```

not:

```text
usedCredit_before - X - X
```

Repeated settlement requests must have no additional financial effect.

---

# 16. Phase 10 — Centralize Audit Generation

## File

`src/data/audit.ts`

`deriveAudit()` is already intended to provide centralized audit generation.

Recommended approach:

> Use centralized reducer-derived auditing as the single source of truth.

Remove duplicate manual `logAudit()` calls where the corresponding reducer action already produces an audit.

Important pages to inspect:

- `OrdersManagementPage.tsx`
- `FinancingManagementPage.tsx`
- `PaymentsManagementPage.tsx`
- admin pages
- product/customer/employee/supplier management pages

## Rule

For any event:

```text
one action
→ one audit
```

Not:

```text
one action
→ reducer audit
→ page audit
```

## Audit should contain

- actor ID
- actor name
- actor role
- category
- action
- summary
- target type
- target ID
- target label
- amount where relevant
- timestamp

---

# 17. Phase 11 — Firebase Synchronization Review

## File

`src/services/firebase/rtdbService.ts`

Do not perform a major production-grade rewrite.

This is a thesis prototype.

However, verify that Firebase operations do not accidentally cause business mutations twice.

Review:

- save operations
- update operations
- subscriptions
- sync actions
- audit persistence
- product image operations

Important rule:

```text
Firebase synchronization ≠ business event
```

A `SYNC_PRODUCTS` action should not decrement stock.

A `SYNC_CUSTOMERS` action should not alter `usedCredit`.

A `SYNC_ORDERS` action should not create payments.

A `SYNC_FINANCING` action should not approve financing.

---

# 18. Phase 12 — Preserve Existing UI

Do not redesign the application.

Do not:

- replace React Context with Redux,
- replace Firebase,
- rewrite the application into a new framework,
- replace all pages,
- redesign the UI,
- introduce unnecessary dependencies.

Only modify UI when required to accurately communicate the corrected business state.

Examples of acceptable UI changes:

- disable an already-approved financing button,
- show "Pending Supervisor Approval",
- show "Cash Confirmation Required",
- show payment status correctly,
- show a meaningful error when an operation has already been processed.

---

# 19. Phase 13 — Add Defensive Guards

Business actions should validate their current state before applying mutations.

Examples:

### Financing approval

```text
if financing.status !== 'pending':
    reject duplicate approval
```

### Financing rejection

```text
if financing.status !== 'pending':
    reject duplicate rejection
```

### Cash confirmation

```text
if payment.status === 'paid':
    do nothing / report already confirmed
```

### Installment

```text
if installment.status === 'paid':
    do not process again
```

### Settlement

```text
if financing.status === 'completed':
    do not process again
```

### Inventory

Never decrement inventory merely because an order appears in a Firebase subscription.

---

# 20. Phase 14 — Error Handling

Business operations should fail safely.

If a Firebase write fails:

- do not leave local state pretending the operation succeeded,
- display an appropriate error,
- avoid creating a second operation automatically,
- avoid duplicate retries without idempotency.

If practical within the existing architecture, use a clear sequence:

```text
validate
→ calculate
→ persist
→ update local state
→ display success
```

or the project's existing equivalent.

Do not introduce an entirely new transaction architecture unless necessary.

---

# 21. Phase 15 — Acceptance Tests

After implementation, manually simulate these workflows.

## Scenario A — Customer Online Financing Approval

1. Customer logs in.
2. Customer creates financed order.
3. Verify:
   - order = `pending_financing`
   - financing = `pending`
   - usedCredit unchanged
   - no duplicate inventory deduction
4. Supervisor opens financing management.
5. Supervisor approves.
6. Verify:
   - financing = active/approved
   - usedCredit increases by principal exactly once
   - order progresses correctly
   - one approval audit
7. Refresh application.
8. Verify:
   - usedCredit unchanged from the approved value
   - inventory unchanged from the post-approval value
   - no duplicate records.

## Scenario B — Customer Financing Rejection

1. Customer submits financing.
2. Verify pending state.
3. Supervisor rejects.
4. Verify:
   - financing = rejected
   - order = cancelled
   - usedCredit unchanged from before submission
   - reserved stock restored exactly once if applicable
   - one rejection audit
5. Refresh.
6. Verify no second restoration.

## Scenario C — POS Financing Approval

1. Employee creates POS financing.
2. Verify pending financing.
3. Supervisor approves.
4. Verify principal is consumed exactly once.
5. Refresh.
6. Verify no duplicate credit consumption.

## Scenario D — POS Financing Rejection

1. Employee creates POS financing.
2. Supervisor rejects.
3. Verify:
   - financing rejected
   - order cancelled
   - credit unchanged
   - inventory correctly restored if reserved
   - one audit.

## Scenario E — POS Cash Sale

1. Employee creates cash order.
2. Verify pending cash state if required by current business rules.
3. Confirm cash.
4. Verify:
   - payment paid once
   - order completed/progresses correctly
   - inventory decremented once
   - one audit.
5. Refresh.
6. Verify inventory remains unchanged.

## Scenario F — POS GCash

1. Employee selects GCash.
2. Mock processing occurs.
3. Verify:
   - one payment
   - correct order status
   - inventory decremented once
   - no duplicate payment/audit.

## Scenario G — Split Payment

1. Create split order.
2. Verify:
   - immediate remainder payment recorded once
   - financing remains pending
   - no premature credit consumption
3. Approve financing.
4. Verify principal consumed once.
5. Reject instead.
6. Verify credit remains unchanged and stock behavior is correct.

## Scenario H — Installment

1. Open active financing.
2. Pay one installment.
3. Verify:
   - installment paid once
   - principal reduced once
   - usedCredit reduced by principal component once
   - payment created once
   - one audit.
4. Refresh.
5. Verify no additional reduction.

## Scenario I — Full Settlement

1. Open financing with remaining balance.
2. Pay full balance.
3. Verify:
   - financing completed
   - remaining principal released once
   - settlement payment created once
   - one audit.
4. Repeat/refresh.
5. Verify no additional credit release.

---

# 22. Regression Testing

After each implementation phase:

1. Inspect every changed file.
2. Search all call sites of changed actions/functions.
3. Search for duplicate writes.
4. Search for direct `usedCredit` mutations.
5. Search for direct inventory mutations.
6. Search for `logAudit`.
7. Search for `deriveAudit`.
8. Search for `PLACE_ORDER`.
9. Search for `APPROVE_FINANCING`.
10. Search for `REJECT_FINANCING`.
11. Search for `CONFIRM_CASH_PAYMENT`.
12. Search for `PAY_INSTALLMENT`.
13. Search for `PAY_FULL_BALANCE`.

The goal is to prove that each business transition happens once.

---

# 23. Required Invariant Review After Every Phase

After each phase, explicitly answer:

### Inventory

- Where is inventory decremented?
- Can this code execute twice?
- Can refresh execute it?
- Can Firebase sync execute it?
- Can reducer + page execute it?
- Can cancellation restore it twice?

### Credit

- Where is `usedCredit` increased?
- Where is it decreased?
- Can approval execute twice?
- Can reducer + page execute it?
- Can refresh execute it?

### Payments

- Where is the payment created?
- Can the same action create two payments?
- Can repeated clicks create two payments?

### Financing

- Where is status changed?
- Can approval happen twice?
- Can rejection happen after approval?
- Can rejection consume credit?

### Orders

- Who owns order status?
- Can payment state contradict order state?
- Can approval prematurely complete an order?

### Audit

- Who creates the audit?
- Is the same event logged twice?

---

# 24. Code Quality Requirements

Use the existing TypeScript types.

Avoid:

```ts
any
```

unless genuinely necessary.

Do not duplicate business logic between:

- customer checkout,
- POS,
- supervisor financing,
- payment management.

Where possible, extract small reusable business helpers instead of copying logic.

Prefer clear functions such as:

```text
calculateOrderTotals()
validateFinancingApproval()
calculatePrincipalComponent()
validateInstallmentPayment()
validateSettlement()
```

Do not create an over-engineered domain framework.

---

# 25. What NOT to Change

Do not unnecessarily modify:

- Firebase provider/project configuration
- existing authentication architecture
- existing UI design
- route structure
- unrelated admin functionality
- unrelated styling
- existing thesis features
- existing product/customer schemas unless required

Security weaknesses such as plaintext passwords or weak client-side route enforcement may exist, but they are **out of scope for this flow-fix task** unless a security issue directly prevents the business workflow from functioning.

Do not derail the implementation into a production security rewrite.

---

# 26. Implementation Order

Follow this order:

```text
PHASE 0
Repository audit / mapping
        ↓
PHASE 1
Order placement duplication
        ↓
PHASE 2
Customer checkout
        ↓
PHASE 3
POS financing
        ↓
PHASE 4
Financing approval
        ↓
PHASE 5
Financing rejection / inventory restoration
        ↓
PHASE 6
Order lifecycle
        ↓
PHASE 7
Cash confirmation
        ↓
PHASE 8
Installments
        ↓
PHASE 9
Full settlement
        ↓
PHASE 10
Centralized audit
        ↓
PHASE 11
Firebase synchronization review
        ↓
PHASE 12
UI/state consistency
        ↓
PHASE 13
Defensive/idempotency guards
        ↓
PHASE 14
Error handling
        ↓
PHASE 15
Full acceptance testing
```

Do not skip Phase 0.

Do not blindly implement every phase at once.

---

# 27. Gemini/Coding-Agent Operating Instructions

Use high reasoning/thinking mode.

The agent must work in phases.

## First instruction

Before changing anything:

> Inspect the entire Sari-Fi repository and map every business mutation related to orders, financing, payments, inventory, customer credit, and audit logging. Identify duplicate mutation paths and conflicting responsibilities. Do not modify code yet. Produce a file/function-level implementation plan and identify any conflicts with the plan above.

After inspection, wait for/continue only when instructed to implement.

## For each implementation phase

Use this operating procedure:

```text
1. Read all relevant files.
2. Identify current behavior.
3. Identify the exact duplicate/conflicting mutation.
4. Make the smallest correct change.
5. Inspect all affected call sites.
6. Search for duplicate mutation paths.
7. Verify the golden invariants.
8. Run/build/type-check where available.
9. Report exactly what changed.
10. Do not silently move on to unrelated phases.
```

Do not rewrite the whole project.

Do not replace the architecture simply because another architecture might be more production-ready.

---

# 28. Required Agent Report After Each Phase

After completing a phase, report:

### Files changed

List every changed file.

### Why each file changed

One or two sentences per file.

### Business mutation before

Describe the old flow.

### Business mutation after

Describe the new flow.

### Duplicate mutation removed

Explicitly identify the duplicate path removed.

### Invariants verified

List which invariants were checked.

### Tests performed

List build/type-check/manual/static checks.

### Remaining risks

State anything that could not be verified.

Do not claim a test passed if it was not actually run.

---

# 29. Final Verification Report

At the end, provide a final report containing:

## Fixed

- order placement duplication
- financing approval duplication
- financing rejection flow
- inventory handling
- customer used-credit handling
- cash confirmation
- installment payments
- full settlement
- audit duplication
- Firebase synchronization issues
- GCash mock webhook/payment confirmation flow
- lifecycle inconsistencies
- idempotency guards

Only mark an item fixed if the code actually supports it.

## Files changed

Provide the complete list.

## Invariants

Explicitly confirm:

```text
[ ] Financing submission does not consume credit
[ ] Financing approval consumes credit exactly once
[ ] Financing rejection consumes zero credit
[ ] Installment reduces credit exactly once
[ ] Settlement releases credit exactly once
[ ] Inventory decrements exactly once
[ ] Inventory restoration occurs exactly once
[ ] Refresh does not mutate business state
[ ] Firebase sync does not mutate business state
[ ] Payments are created exactly once
[ ] Cash confirmation is idempotent
[ ] Financing approval is idempotent
[ ] Installment payment is idempotent
[ ] Settlement is idempotent
[ ] One business action produces one audit
```

## Known limitations

Clearly state anything that remains mock/demo behavior.

In particular:

- GCash remains a mock integration, but now uses an asynchronous webhook-style payment flow instead of immediately marking the payment as paid.
- No real GCash API credentials or production webhook infrastructure are required.
- Firebase architecture remains appropriate for the prototype but is not being converted into a fully transactional production backend.
- Security hardening is outside this flow-fix scope unless required.

---

# 30. Final Success Criteria

The implementation is successful only when these statements are true:

> A customer can place an order without duplicate inventory or credit mutations.

> A customer financing application can be submitted, approved, or rejected without duplicate state changes.

> A POS employee can create the same business flows without a separate inconsistent implementation.

> A supervisor can approve or reject financing exactly once.

> Inventory remains correct after refresh and synchronization.

> Customer `usedCredit` remains mathematically correct throughout the financing lifecycle.

> Installment and settlement payments cannot double-apply financial changes.

> Cash confirmation cannot double-pay an order.

> Audits are generated once per business action.

> The existing UI and architecture remain intact.

> The application does not need to be rewritten to achieve these fixes.

---

# 31. Critical Final Instruction

**Do not confuse "the code runs" with "the business flow is correct."**

A successful implementation must trace the actual state transition from:

```text
Customer
   ↓
Checkout
   ↓
Order
   ↓
Payment / Financing
   ↓
Inventory
   ↓
Supervisor
   ↓
Approval / Rejection
   ↓
Credit
   ↓
Fulfillment
   ↓
Payment lifecycle
   ↓
Audit
```

For every transition, prove:

```text
WHO performed it?
WHAT changed?
WHERE did it change?
HOW MANY TIMES did it change?
WHAT happens after refresh?
WHAT happens if the same action is submitted twice?
```

The primary goal is **business correctness and exactly-once logical behavior**, not merely eliminating TypeScript errors or making the UI appear to work.
