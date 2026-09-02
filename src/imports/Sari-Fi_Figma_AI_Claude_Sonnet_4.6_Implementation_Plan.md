# Sari-Fi — Figma AI Implementation Plan
## Target: Figma AI + Claude Sonnet 4.6
## Delivery Goal: 2-Day Thesis Prototype

---

# 1. Product Definition

Sari-Fi is a B2B grocery and inventory marketplace with revolving financing for approved sari-sari store owners.

Customers do not register online.

Flow:

Customer applies physically at Sari-Fi
→ Employee/Supervisor records the applicant
→ Supervisor/Admin approves
→ Staff creates the customer Personal Account
→ Customer receives login credentials
→ Customer logs in
→ Customer shops for inventory
→ Customer pays in full, uses financing, or uses split payment
→ Sari-Fi processes fulfillment
→ Customer repays financing weekly

Sari-Fi owns and manages its inventory.

Suppliers exist only as internal restocking records. There is no supplier portal.

This is a thesis prototype, not production fintech software.

---

# 2. Visual Direction — REQUIRED

## Design Style: Bento Grid Retail-Fintech

Use a modern **Bento Grid Layout** as the primary dashboard and information-layout language.

The design should be inspired by:
- Apple-style product dashboards,
- Japanese bento-box organization,
- modern SaaS dashboards,
- grocery marketplace interfaces,
- approachable fintech products.

The interface should organize information into clearly separated rounded rectangles and squares so users can scan multiple pieces of information quickly.

### Bento Rules

Use:
- rigid but adaptive grid structures,
- mixed card sizes,
- 12-column desktop grid,
- 4-column tablet grid,
- 1–2-column mobile stacking,
- consistent 20–24 px card radius,
- 16–24 px internal card padding,
- strong hierarchy between primary and secondary cards,
- short text inside cards,
- generous whitespace,
- large numeric values,
- compact supporting labels.

Do NOT make every screen a random mosaic.

Use Bento most strongly for:
- Customer Dashboard,
- Employee Dashboard,
- Supervisor Dashboard,
- Admin Dashboard,
- Financing Overview,
- Reports,
- Inventory Overview,
- Restock Center.

For data-heavy management screens such as Customers, Products, Payments, Orders, and Financing lists, use:
- Bento summary cards at the top,
- structured table/list below.

For the Shop, use:
- marketplace product cards,
- category chips,
- search,
- cart,
rather than forcing all products into oversized Bento blocks.

---

# 3. Sari-Fi Color Palette — REQUIRED

Use the palette from the supplied Sari-Fi brand reference.

## Primary Brand Colors

### Deep Navy
`#0D2B45`

Use for:
- primary text,
- navigation,
- sidebar,
- high-emphasis headings,
- dark hero/background areas,
- trustworthy financial surfaces.

### Sari-Fi Green
`#1E7D3B`

Use for:
- primary actions,
- positive financing states,
- active navigation indicators,
- growth-related information,
- success states where appropriate.

### Growth Green
`#7DBE4C`

Use for:
- secondary highlights,
- charts,
- progress,
- credit growth,
- softer positive states,
- decorative accents.

### Sari-Fi Yellow
`#FFC107`

Use for:
- inventory highlights,
- attention states,
- product/category accents,
- upcoming/due states,
- selective emphasis.

### Soft Gray
`#E6E6E6`

Use for:
- borders,
- dividers,
- neutral panels,
- disabled states,
- secondary backgrounds.

## Supporting Neutrals

Add only neutral support colors needed for usability:

- Background: `#F7F8F6`
- Surface: `#FFFFFF`
- Primary Text: `#10212B`
- Secondary Text: `#65727A`
- Border: `#E4E8E6`

Do not introduce unrelated brand colors.

For destructive/error states only, use a restrained semantic red.

---

# 4. Color Usage Philosophy

The interface should feel like a combination of:

**grocery freshness + financial trust + small-business growth**

Avoid making the system look like:
- a traditional bank,
- a crypto app,
- a neon fintech dashboard,
- a generic blue SaaS template.

Recommended balance:

- 65–70% white / soft neutral surfaces,
- 15–20% navy,
- 10–15% green,
- yellow only as an accent.

Use large saturated cards sparingly.

Example Customer Dashboard Bento:

┌─────────────────────┬──────────────────┐
│ Welcome / Store     │ Available Credit │
│ Large white card    │ Green card       │
├──────────┬──────────┼──────────────────┤
│ Limit    │ Balance  │ Next Payment     │
│ Navy     │ White    │ Yellow accent    │
├──────────┴──────────┼──────────────────┤
│ Active Financing   │ Active Order      │
│ Wide card          │ Product/Order    │
└────────────────────┴──────────────────┘

---

# 5. Typography

Use a modern, highly readable sans-serif.

Preferred:
- Inter,
- Manrope,
- or Plus Jakarta Sans.

Do not use decorative display fonts for authenticated screens.

Hierarchy:

- Display / KPI: 32–48 px
- Page Title: 28–32 px
- Section Heading: 18–22 px
- Card Title: 14–16 px
- Body: 14–16 px
- Metadata: 12–13 px

Numbers such as balances and credit should receive stronger visual weight.

---

# 6. Shape Language

Use:
- rounded cards,
- 20–24 px radius for major Bento blocks,
- 14–16 px radius for controls,
- pill badges,
- restrained shadows,
- subtle borders.

Avoid:
- excessive glassmorphism,
- strong gradients,
- thick borders,
- giant shadows,
- over-rounded everything,
- overly playful ecommerce styling.

The experience must remain credible as a financing system.

---

# 7. Roles

Exactly four roles:

## Customer
Can:
- log in,
- browse products,
- use cart,
- checkout,
- pay cash,
- pay mock GCash,
- request financing,
- use split payment,
- select 1-month or 2-month plan,
- view orders,
- view financing,
- view repayments,
- pay weekly,
- settle early,
- view account.

Cannot:
- self-register,
- approve financing,
- change credit limits,
- modify financing rules.

## Employee
Can:
- view/search customers,
- manage day-to-day orders,
- confirm cash payments,
- update order fulfillment,
- view payments,
- view inventory,
- assist customer transactions.

## Supervisor
Everything Employee can do, plus:
- approve/reject financing,
- create customer accounts,
- adjust customer limits,
- manage overdue accounts,
- manage inventory/restocking,
- supervise payment operations.

## Admin
Full access:
- all Employee and Supervisor actions,
- staff management,
- products,
- suppliers,
- finance settings,
- penalty settings,
- reports,
- activity logs,
- system configuration.

---

# 8. Authentication

Single Login screen.

No public registration.

Fields:
- Email / Username
- Password
- Login
- Forgot Password

Role-based redirect after login.

---

# 9. Customer Onboarding

Customer applies physically at Sari-Fi.

Internal staff creates:

Personal Information:
- Full Name
- Phone
- Email
- Address

Store Information:
- Store Name
- Store Address
- Years Operating
- Notes

Account:
- Login Email
- Temporary Password
- Status

Financing:
- Initial Limit, default ₱5,000

---

# 10. Financing Rules

## Starting Credit
Default: ₱5,000

## Financing Charge
Default: 20%
Admin configurable.

Example:
Principal: ₱1,000
Charge: ₱200
Total Repayable: ₱1,200

Credit usage is based on purchase principal.

## Plans

1 Month:
- 4 weekly installments

2 Months:
- 8 weekly installments

## Revolving Credit

Example:
Credit Limit: ₱5,000
Financed Principal: ₱4,000
Available: ₱1,000

As principal is repaid, available credit is restored proportionally.

## Credit Growth

Default:
- Starting limit: ₱5,000
- Increase after successful financing cycle: ₱1,000
- Automatic maximum: ₱20,000

Admin can configure values.
Supervisor/Admin can manually override a customer limit.

## Overdue Penalty

Default:
- 10% per overdue week

Admin configurable.

Example:
Base Installment: ₱500
Penalty: ₱50
Total Due: ₱550

## Early Settlement

Customer can:
- Pay Weekly Installment
- Pay Full Balance

---

# 11. Payment Modes

## Cash

Customer chooses Cash at Sari-Fi.

Status:
Awaiting Cash Payment

Employee/Supervisor/Admin presses:
Confirm Cash Received

Then:
- payment becomes Paid,
- order updates,
- customer and internal UI synchronize.

## Mock GCash

Simulate a webhook-driven GCash flow.

Customer:
Pay with GCash
→ Processing
→ Payment Successful

The mock webhook automatically marks payment as paid.

Do not require staff confirmation for GCash.

Use thesis language:
“For prototype purposes, the GCash gateway is simulated using a mocked webhook.”

---

# 12. Split Payment

Support:

Cart Total: ₱7,000
Available Credit: ₱5,000

Finance: ₱5,000
Remaining: ₱2,000

Remaining amount can be:
- Cash
- GCash

Order proceeds only after:
- financing is approved,
- remaining payment is completed.

---

# 13. Customer Navigation

Dashboard
Shop
Orders
Financing
Payments
Account

---

# 14. Customer Dashboard — Bento Layout

Use Bento Grid strongly here.

Recommended blocks:

## Large Welcome Card
- customer/store name,
- account number,
- Shop Inventory CTA.

## Available Credit Card
- current available credit,
- percentage of total limit,
- compact visual meter.

## Credit Limit Card
- current limit,
- credit-growth indicator.

## Outstanding Card
- total remaining repayment.

## Next Payment Card
- amount,
- due date,
- state.

## Active Financing Card
- principal,
- paid amount,
- remaining,
- plan.

## Active Order Card
- order number,
- items,
- delivery status.

## Recent Activity / Payments
- compact list.

Avoid a generic row of four identical KPI cards. Use purposeful mixed card sizes.

---

# 15. Shop / Sari-Fi Market

Design as a clean wholesale grocery marketplace.

Categories:
- All
- Beverages
- Snacks
- Instant Noodles
- Canned Goods
- Condiments
- Household
- Personal Care
- Others

Include:
- search,
- filter chips,
- product grid,
- stock indication,
- quantity selector,
- Add to Cart,
- cart count.

Product card example:

Coca-Cola 1L Case
12 pcs
₱720
Stock: 18

[-] 1 [+]
[ Add to Cart ]

Do not show suppliers to customers.

---

# 16. Cart

Show:
- product,
- quantity,
- price,
- subtotal,
- remove/edit,
- total.

Primary CTA:
Proceed to Checkout

---

# 17. Checkout

Provide three clear modes:

## Pay in Full
- Cash
- GCash

## Sari-Fi Financing
Show:
- cart total,
- credit limit,
- available credit,
- amount financed,
- finance charge,
- total repayable,
- plan,
- weekly installment.

## Split Payment
Show:
- financed portion,
- cash/GCash remainder,
- total.

---

# 18. Financing Request

Example:

Principal: ₱5,000
Finance Charge: 20%
Total Repayable: ₱6,000

Plan:
1 Month — 4 weekly payments
2 Months — 8 weekly payments

Primary action:
Submit Financing Request

All financing requires Supervisor/Admin approval.

---

# 19. Financing Overview — Bento Layout

Use a focused Bento composition.

Cards:
- Credit Limit,
- Available Credit,
- Used Credit,
- Outstanding Repayment,
- Next Payment,
- Active Financing,
- repayment progress,
- Pay Weekly,
- Pay Full Balance.

Avoid making every finance number look equally important.

Available Credit and Next Payment should have the strongest hierarchy.

---

# 20. Repayment Schedule

Statuses:
- Upcoming
- Due
- Paid
- Overdue

For overdue:
- Base Installment
- Penalty
- Total Due

Allow:
- Pay Installment
- Pay Full Balance

Methods:
- Cash
- GCash

---

# 21. Orders

Statuses:
- Pending Payment
- Pending Financing
- Approved
- Processing
- Ready
- Out for Delivery
- Delivered
- Completed
- Cancelled

Customer can cancel only while:
- Pending Payment
- Pending Financing

After payment/approval, only Supervisor/Admin can cancel.

---

# 22. Internal Navigation

Dashboard

OPERATIONS
- Customers
- Orders
- Payments
- Financing

INVENTORY
- Products
- Inventory
- Restocking
- Suppliers

MANAGEMENT
- Employees
- Reports
- Settings

Role-based visibility.

---

# 23. Employee Dashboard — Bento

Use operational Bento cards:

- Orders Today
- Cash Payments Waiting
- Ready for Delivery
- Low Stock

Large “Needs Attention” Bento panel:
- cash awaiting confirmation,
- orders needing action,
- low-stock alerts.

Do not show unnecessary executive analytics.

---

# 24. Supervisor Dashboard — Bento

Use:

- Pending Financing
- Outstanding Financing
- Overdue Payments
- Orders Today
- Low Stock
- Needs Attention
- Recent Decisions

Supervisor should feel operational + financial.

---

# 25. Admin Dashboard — Bento

Use mixed-size Bento blocks.

Primary:
- Total Sales
- Active Financing
- Collected This Month
- Overdue Amount

Secondary:
- Orders Today
- Customers
- Low Stock
- Pending Financing

Large blocks:
- Sales chart
- Needs Attention
- Top Products
- Recent Activity
- Payment Method Breakdown

Do not create a giant chart-first dashboard.

---

# 26. Customer Management

Customer list:
- Customer
- Store
- Account No.
- Credit Limit
- Available Credit
- Outstanding
- Standing
- Actions

Customer detail tabs:
- Overview
- Orders
- Financing
- Payments
- Account

Top of Customer Detail can use Bento summary cards.

---

# 27. Create Customer Account

Used after physical application approval.

Fields:
Personal:
- Full Name
- Phone
- Email
- Address

Store:
- Store Name
- Store Address
- Years Operating
- Notes

Account:
- Login Email
- Temporary Password
- Status

Financing:
- Initial Credit Limit
- Default ₱5,000

---

# 28. Product Management

Fields:
- Product Name
- SKU
- Category
- Supplier
- Selling Price
- Cost Price
- Stock
- Reorder Level
- Image
- Status

---

# 29. Inventory Overview — Bento + Table

Top Bento:
- Total Products
- Low Stock
- Out of Stock
- Fast Moving

Below:
structured inventory table.

States:
- Good
- Low Stock
- Out of Stock
- Fast Moving

---

# 30. Restock Center — Bento

Top:
- Needs Restock
- Low Stock
- Out of Stock

Product restock cards/table:
- Product
- Current Stock
- Reorder Level
- Sold Last 7 Days
- Suggested Restock
- Supplier
- Add to Restock

Simple rule:
if stock <= reorderLevel → Needs Restock

No AI forecasting is required.

---

# 31. Restock Orders

Statuses:
- Draft
- Ordered
- Received
- Cancelled

Example:

RESTOCK #RST-0024
Supplier: ABC Distributor
Coca-Cola ×20
Lucky Me ×30
Milo ×15
Total Supplier Cost: ₱18,500

Marking Received increases stock.

---

# 32. Suppliers

Internal only.

Fields:
- Supplier Name
- Contact
- Phone
- Email
- Address
- Categories
- Status

No supplier account or portal.

---

# 33. Payments

Payment ledger:
- Payment ID
- Customer
- Order / Financing
- Type
- Method
- Amount
- Status
- Confirmed By
- Timestamp

Payment Types:
- Purchase
- Installment
- Full Settlement

Methods:
- Cash
- GCash

---

# 34. Financing Management

Filters:
- Pending
- Approved
- Active
- Completed
- Overdue
- Rejected

Financing Review must show:

- Customer
- Store
- Principal
- Available Credit
- Plan
- Finance Charge %
- Charge Amount
- Total Repayable
- Weekly Installment
- Repayment Count
- Account Standing

Actions:
Reject
Approve

Only Supervisor/Admin can approve.

---

# 35. Employees

Admin-only staff management.

Roles:
- Employee
- Supervisor
- Admin

Actions:
- Create Staff
- Edit
- Change Role
- Disable

---

# 36. Activity Log

Examples:

Employee A confirmed ₱750 cash payment
Supervisor B approved FIN-1024
Admin changed finance charge from 20% to 15%
Supervisor increased Maria's limit to ₱8,000
Employee C marked order Delivered

---

# 37. Reports — Bento

Top Bento summaries:
- Sales
- Cash Sales
- GCash Sales
- Financed Sales
- Outstanding Financing
- Collected Payments
- Overdue
- Restock Cost

Charts:
- Sales Over Time
- Sales by Payment Type
- Financing Status
- Top Products

Use only a few high-value charts.

---

# 38. Settings

## Financing Settings
Default Financing Charge: 20%
Starting Credit Limit: ₱5,000
Automatic Limit Increase: ₱1,000
Maximum Automatic Limit: ₱20,000

## Penalty
Weekly Overdue Penalty: 10%

## Plans
1 Month = 4 installments
2 Months = 8 installments

These are editable.

---

# 39. Public Website

Secondary priority.

Sections:
- Home
- What is Sari-Fi
- How It Works
- Why Sari-Fi
- Who Can Apply
- About
- Contact
- Login

CTA:
Apply at Sari-Fi

Explain:
Visit the Sari-Fi store to apply and receive a Personal Account after approval.

No public registration.

Use Bento-style content sections selectively on the landing page.

---

# 40. Figma Page Structure

00 — Cover
01 — Foundations
02 — Components
03 — Public Website
04 — Customer
05 — Employee
06 — Supervisor
07 — Admin
08 — Prototype Flows
09 — Edge States

---

# 41. Reusable Components

Create variants for:

- Button
- Input
- Select
- Search
- Sidebar
- Topbar
- KPI/Bento Card
- Product Card
- Status Badge
- Credit Card
- Financing Card
- Payment Method Selector
- Installment Row
- Cart Item
- Order Timeline
- Table
- Filter Toolbar
- Tabs
- Modal
- Confirmation Dialog
- Toast
- Empty State
- Pagination

---

# 42. Prototype Flows

## A. Account
Admin → Create Customer → Customer Login

## B. Cash Purchase
Customer → Shop → Cart → Checkout → Cash
Employee → Confirm Cash
Customer → Paid / Processing

## C. Mock GCash
Customer → Checkout → GCash → Processing → Success

## D. Financing
Customer → Checkout → Financing → 1/2 Month → Submit
Supervisor → Review → Approve
Customer → Active Financing + Schedule

## E. Revolving Credit
Customer → Pay Installment
→ Outstanding decreases
→ Available credit restores

## F. Full Settlement
Customer → Pay Full Balance
→ Financing Completed
→ Credit fully restored
→ Limit may increase

## G. Split Payment
₱7,000 Cart
₱5,000 Financing
₱2,000 Cash/GCash
→ both conditions complete
→ Order Processing

## H. Overdue
Base ₱500
Penalty ₱50
Total ₱550

## I. Restocking
Inventory → Low Stock → Restock → Receive → Stock Increases

---

# 43. Demo Seed Data

Use populated states.

Recommended:
- 1 Admin
- 2 Supervisors
- 3 Employees
- 8–12 Customers
- 30–50 Products
- 5–8 Categories
- 3–5 Suppliers
- 10+ Orders
- 4 Active Financing Accounts
- 2 Completed Financing Accounts
- 1 Overdue Account
- 3 Restock Orders

---

# 44. Main Thesis Demo

Use:

Maria Santos
Maria's Sari-Sari Store
Starting Credit Limit: ₱5,000

Scenario:

Maria adds ₱7,000 worth of products.

Available Credit:
₱5,000

Split:
₱5,000 Sari-Fi Financing
₱2,000 GCash

GCash succeeds.

Supervisor approves financing.

20% charge:

Principal: ₱5,000
Charge: ₱1,000
Total: ₱6,000

2 months:
8 weekly installments

Weekly:
₱750

Maria pays one installment.

Show:
- successful payment,
- outstanding balance decreases,
- available credit increases,
- Admin/Supervisor overview updates.

---

# 45. Claude Sonnet 4.6 Rules

When generating screens:

1. Use the established Sari-Fi palette.
2. Use Bento Grid as the primary dashboard language.
3. Do not turn every table into Bento cards.
4. Reuse existing components.
5. Preserve completed screens unless necessary.
6. Use realistic Philippine peso values.
7. Use realistic sari-sari store products.
8. No public registration.
9. No supplier portal.
10. No extra user roles.
11. No real GCash integration.
12. Keep GCash as mock webhook behavior.
13. Keep financing rules consistent.
14. Prioritize demo clarity over feature count.
15. Avoid generic AI-looking dashboard layouts.
16. Make Customer UI feel retail-first.
17. Make Internal UI feel operational.
18. Make financing information easy to explain to a thesis panel.

---

# 46. Prompt Header for Figma AI / Claude Sonnet 4.6

Use this before major generation prompts:

```text
You are designing Sari-Fi, a thesis prototype for a B2B grocery marketplace and revolving micro-inventory financing system for approved sari-sari store owners.

DESIGN SYSTEM:
Use a modern Bento Grid layout inspired by Apple-style product dashboards and Japanese bento organization. Use mixed-size rounded cards with strong visual hierarchy, generous whitespace, and adaptive grids. Do not force Bento onto dense tables.

Use the Sari-Fi brand palette:
- Deep Navy #0D2B45
- Sari-Fi Green #1E7D3B
- Growth Green #7DBE4C
- Sari-Fi Yellow #FFC107
- Soft Gray #E6E6E6
- Background #F7F8F6
- Surface #FFFFFF

The visual personality should communicate grocery freshness, financial trust, and small-business growth.

BUSINESS RULES:
- No public registration.
- Customer accounts are created internally after physical application approval.
- Roles: Customer, Employee, Supervisor, Admin.
- Sari-Fi owns its inventory.
- Suppliers are internal restocking records; there is no supplier portal.
- Starting credit limit defaults to ₱5,000.
- Financing charge defaults to 20% and is configurable by Admin.
- 1 month = 4 weekly installments.
- 2 months = 8 weekly installments.
- Overdue penalty defaults to 10% per overdue week and is configurable.
- Credit is revolving and restores as principal is repaid.
- Successful financing cycles can increase limit by ₱1,000 up to a default ₱20,000 maximum.
- Customers can pay cash, mock GCash, financing, or split financing + cash/GCash.
- Financing requires Supervisor/Admin approval.
- GCash behaves as a mocked webhook payment and automatically confirms on success.
- Cash requires Employee/Supervisor/Admin confirmation.
- Stock decreases only after payment/financing completion conditions are satisfied.
- Customer can pay weekly installments or settle the full balance early.
- Employee handles daily operations.
- Supervisor handles operations plus financing approval.
- Admin has full control.

Design for a convincing thesis demonstration, not production fintech compliance.
```

---

# 47. Implementation Priority

## P0 — Must Finish
- Login
- Customer Dashboard
- Shop
- Cart
- Checkout
- Cash payment
- Mock GCash
- Financing request
- Supervisor/Admin approval
- Weekly repayment
- Revolving credit
- Orders
- Admin synchronization

## P1
- Customer management
- Products
- Inventory
- Restock Center
- Payments
- Overdue
- Suppliers
- Employee/Supervisor screens

## P2
- Advanced reports
- Extra charts
- Decorative animations
- Secondary cosmetic screens

---

# 48. Definition of Done

The prototype is ready when the presenter can demonstrate:

Admin creates Customer
→ Customer logs in
→ Shops
→ Checks out
→ Pays Cash/GCash or uses Financing
→ Supervisor approves
→ Order processes
→ Customer repays weekly
→ Available credit restores
→ Customer settles early
→ Credit limit can grow
→ Inventory falls
→ Restock Center identifies replenishment
→ Restock is received

without dead ends or contradictory screens.

---

# Final Direction

Do not design Sari-Fi as a generic ecommerce dashboard or traditional lending dashboard.

It combines three product experiences:

1. Grocery / inventory marketplace
2. Revolving inventory financing
3. Internal retail and finance operations

Use the supplied brand palette and Bento Grid layout to make the system feel distinctive, approachable, modern, and thesis-ready.

The final Figma design should be clear enough that a thesis panel can understand the workflow visually with minimal explanation.
