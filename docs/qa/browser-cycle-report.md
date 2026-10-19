# Browser cycle check — 19 October 2026

Checked localhost:8443 in the in-app browser at 1440×1000 and 1366×768 desktop sizes. Checked all 19 walkthrough frames at 360×800 with voice enabled, plus the reported first-step layout at 390×844.

## Fixed and retested

- POS cash checkout failed with “New orders must await payment or financing approval.” POS now reserves pending orders, then confirms collected cash through the existing settlement flow. A saved ₱4.00 test sale reached paid/processing.
- Financing summaries and full-settlement dialogs rounded balances to whole pesos. Outstanding amounts now preserve centavos. Settlement uses the unpaid schedule, including final-payment rounding and penalties, rather than estimating from paid principal. A ₱90.85 loan, after a ₱7.57 installment, settled at exactly ₱83.28.
- Admin/supervisor “Orders Today” used all-time records or the first five records. Counts now use the Philippine calendar date.
- Recent customer/admin activity was not chronological. Lists now sort actual event dates. Admin top-product ranking uses completed order lines instead of an assumed original stock of 120.
- Reports counted rejected financing as deployed capital, rounded average orders, displayed a fixed 100% cleared rate, and showed old/unsettled transactions in the recent feed. These now use the selected period and settled/approved records. The remaining-balance label includes finance charges accurately.
- Mobile guide metadata collided with voice/replay controls. Metadata and controls now occupy separate rows with an unbroken step counter. Measured guide height reserves scrolling space above the panel. Supplier pages now scroll within their viewport. Smaller, relevant spotlight targets prevent whole-page/card cutoffs. Minimized state resets when the guide closes.

## Browser cases completed

- Admin, supervisor, customer and both supplier sign-ins; current catalog/search; quantity clamping; same price at 1 and 12 units; product form required-field validation.
- Calculator and checkout previews for 1/2/3 months with 1/2/3% interest and 4/8/12 weekly installments.
- Actual saved two-supplier financed checkout: ORD-0011/0012, FIN-0005/0006. Supervisor approval; each supplier's isolated order; ready → out for delivery → delivered; customer receipt → completed.
- Cash installment and full-settlement requests remained pending with no credit release until supervisor confirmation. Simulated GCash final settlement completed the remaining loan. All 24 schedule entries were paid, used credit returned to zero, and configured credit growth applied.
- Successful POS cash sale after the fix; pending online cash order cancellation and stock release.
- Insufficient-credit split checkout: ₱236.88 cart = ₱100 financed + ₱136.88 cash. One supplier financing was rejected and its stock released. The other stayed awaiting payment after financing approval, then processed after cash confirmation.
- Supplier restock intake, saved shipment history and resulting inventory; admin inventory, suppliers, employees, reports/date filters, audit and settings rendering; no horizontal page overflow on checked screens.
- Every walkthrough frame matched its actual tab. Pause/resume, skip, minimize/open, exit/relaunch and voice controls were exercised. All 19 mobile targets stayed above the guide after the fix; detailed measurements are in mobile-tour-checks.json.

## Verification and test data

102 tests in 9 files passed. App/functions/scripts TypeScript checks and production build passed. Build retains its existing bundle-size warning.

The synthetic QA customer, six orders, four financing records, six payments, one restock and related QA audit events were removed after a private backup. All 22 products and pre-existing business records were verified against the pre-test snapshot; original stock is restored. Cleanup receipt: test-data-cleanup.json. Authentication audit entries from the role sign-ins remain.

This was mock-payment testing on localhost, not a real GCash wallet transaction or a deployment. Narration controls were checked; audible output was not recorded. Employee-specific account creation, external photo upload, report printing and every CRUD permutation were not exhaustively tested. Existing shortcuts for the mock defense remain unchanged.
