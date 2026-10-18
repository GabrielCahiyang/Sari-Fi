import type {
  AppState,
  AuthUser,
  Financing,
  Order,
  Payment,
  Product,
} from "../types"
import { DEFAULT_SETTINGS } from "../data/seed"
import {
  getLineTotal,
  getUnitPrice,
  sumMoney,
  toCentavos,
} from "../utils/productPricing"
import {
  calculateFinancing,
  calculateCheckoutFinancing,
} from "../utils/financingCalculator"
import {
  getRepaymentPlans,
  isEligiblePlan,
  rescheduleInstallments,
} from "../utils/repaymentPlans"
import { planReservationPaths } from "./checkoutReservation"
import { canTransitionOrder, resolveFinancialOrderStatus } from "./orderFlow"

const owner: AuthUser = {
  id: "walkthrough_owner",
  customerId: "walkthrough_owner",
  name: "Alex Reyes",
  email: "alex@example.test",
  role: "customer",
}
const supervisor: AuthUser = {
  id: "walkthrough_supervisor",
  employeeId: "walkthrough_supervisor",
  name: "Demo Supervisor",
  email: "supervisor@example.test",
  role: "supervisor",
}
const supplier: AuthUser = {
  id: "walkthrough_supplier",
  supplierId: "walkthrough_supplier_1",
  name: "Demo Supplier",
  email: "supplier@example.test",
  role: "supplier",
}
const employee: AuthUser = {
  id: "walkthrough_employee",
  employeeId: "walkthrough_employee",
  name: "Demo Cashier",
  email: "cashier@example.test",
  role: "employee",
}
export interface TourStep {
  id: number
  stageNumber: string
  roleName: string
  roleIcon: string
  roleBadgeColor: string
  title: string
  summary: string
  detailedInstruction: string
  targetFocusName: string
  actionButtonLabel: string
  targetPage: string
  targetUser: AuthUser
  focusTarget: string
}
function step(
  id: number,
  title: string,
  page: string,
  user: AuthUser,
  focusTarget: string,
  description: string,
): TourStep {
  const focusNames: Record<string, string> = {
    customers: "Customers · store owner account",
    "0": "Products · supplier catalog controls",
    "1": "Shop · product and quantity pricing",
    cart: "Cart · quantity discounts and supplier totals",
    plans: "Checkout · financing terms",
    methods: "Checkout · payment methods",
    "2": "Financing · approval queue",
    "3": "Orders · supplier fulfillment",
    "4": "Orders · customer receipt confirmation",
    "5": "Financing · installment schedule",
    "6": "Payments · cash confirmation",
    account: "My Account · credit balances",
    "7": "Restock · received inventory",
    pos: "Point of Sale · catalog search",
  }
  return {
    id,
    stageNumber: String(id + 1).padStart(2, "0"),
    title,
    targetPage: page,
    targetUser: user,
    focusTarget,
    roleName:
      user.role === "customer"
        ? "Store Owner"
        : user.role === "supplier"
          ? "Supplier"
          : user.role === "employee"
            ? "Cashier"
            : "Supervisor",
    roleIcon:
      user.role === "customer" ? "🏪" : user.role === "supplier" ? "📦" : "👔",
    roleBadgeColor:
      user.role === "customer"
        ? "bg-emerald-600 text-white"
        : "bg-indigo-600 text-white",
    summary: description,
    detailedInstruction: description,
    targetFocusName: focusNames[focusTarget],
    actionButtonLabel: "View example",
  }
}
export const TOUR_STEPS: TourStep[] = [
  step(
    0,
    "Create a store owner account",
    "supervisor/customers",
    supervisor,
    "customers",
    "In Customers, a supervisor or administrator records the store details, creates the login, and sets the starting credit limit after the in-person review.",
  ),
  step(
    1,
    "Review supplier products and pricing",
    "supplier/products",
    supplier,
    "0",
    "The supplier Products tab manages product photos, regular selling prices, lower retail prices, supplier costs, stock, and reorder levels. Photos are delivered through Cloudinary.",
  ),
  step(
    2,
    "Browse the current catalog",
    "customer/shop",
    owner,
    "1",
    "Shop shows current products and their suppliers. Regular pricing applies below the same-product quantity threshold.",
  ),
  step(
    3,
    "Unlock quantity pricing in Cart",
    "customer/cart",
    owner,
    "cart",
    "Cart combines quantities of the same product. Reaching the retail threshold applies that product’s lower price; different products do not combine toward the threshold.",
  ),
  step(
    4,
    "Compare the 1-month financing term",
    "customer/checkout",
    owner,
    "plans",
    "Checkout offers cash, GCash, financing, and split payment. Financing interest is 1% per term month, charged once, with exact centavo schedules.",
  ),
  step(
    5,
    "Compare the 2-month financing term",
    "customer/checkout",
    owner,
    "plans",
    "A longer term changes both total interest and installment count. The quote uses the same calculator as a normal checkout.",
  ),
  step(
    6,
    "Compare the 3-month financing term",
    "customer/checkout",
    owner,
    "plans",
    "Review the third configured term before choosing. Charges and schedules follow the selected plan rather than a legacy fixed fee.",
  ),
  step(
    7,
    "Preview split payment",
    "customer/checkout",
    owner,
    "methods",
    "Alternative example: when available credit covers only part of the cart, finance that portion and pay the remainder by cash or GCash. Split orders need both payment confirmation and financing approval.",
  ),
  step(
    8,
    "Approve supplier-separated financing",
    "supervisor/financing",
    supervisor,
    "2",
    "For the main example we submit the first financing term. One checkout creates one order and financing record per supplier. Stock is reserved at checkout; approval uses principal credit and clears each order for processing.",
  ),
  step(
    9,
    "Pack the financially cleared order",
    "supplier/orders",
    supplier,
    "3",
    "The supplier sees only their own cleared orders. Mark the packed order Ready before dispatching it.",
  ),
  step(
    10,
    "Dispatch the supplier delivery",
    "supplier/orders",
    supplier,
    "3",
    "Ready orders can move to Out for Delivery. Each supplier fulfills their own portion of the checkout.",
  ),
  step(
    11,
    "Mark the delivery delivered",
    "supplier/orders",
    supplier,
    "3",
    "The supplier marks the delivery Delivered. This does not complete the order; customer receipt confirmation is still required.",
  ),
  step(
    12,
    "Confirm receipt in Orders",
    "customer/orders",
    owner,
    "4",
    "In Orders, the store owner confirms a delivered order was received. That supplier order becomes Completed; the other supplier’s delivery remains separate.",
  ),
  step(
    13,
    "Request a cash installment payment",
    "customer/financing",
    owner,
    "5",
    "Financing shows the saved schedule. A cash payment request stays pending: it does not mark an installment paid or restore credit until a supervisor confirms receipt.",
  ),
  step(
    14,
    "Confirm cash received in Payments",
    "supervisor/payments",
    supervisor,
    "6",
    "The supervisor confirms the pending cash installment. The installment becomes paid and only its principal portion restores available credit.",
  ),
  step(
    15,
    "Settle the remaining balance through GCash",
    "customer/financing",
    owner,
    "5",
    "GCash currently uses a payment simulator. After its confirmation, the remaining balance is settled, financing completes, and the remaining principal credit is restored.",
  ),
  step(
    16,
    "Review credit growth in My Account",
    "customer/account",
    owner,
    "account",
    "Completing a financing record applies the configured credit-limit increase up to its cap. Other outstanding supplier financing still uses credit.",
  ),
  step(
    17,
    "Record a received supplier restock",
    "supplier/restock",
    supplier,
    "7",
    "The supplier Restock tab records a received intake batch and increases stock with a matching restock-history entry.",
  ),
  step(
    18,
    "See the staff Point of Sale tab",
    "employee/pos",
    employee,
    "pos",
    "Point of Sale is the staff-assisted ordering flow. It has its own ticket and uses the same quantity prices, financing calculator, and supplier order allocation as online checkout.",
  ),
]

export interface WalkthroughSession {
  base: AppState
  createdAt: string
  bundles: Array<{
    order: Order
    financing: Financing
  }>
}
const money = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Copy only catalog/settings into a synthetic session. No live identities or transactions. */
export function createWalkthroughSession(
  source: AppState,
  now = new Date(),
): WalkthroughSession {
  const settings = structuredClone(source.settings || DEFAULT_SETTINGS)
  settings.repaymentPlans = getRepaymentPlans(settings).filter(isEligiblePlan)
  const plans = settings.repaymentPlans
  if (!plans.length)
    throw new Error(
      "Add an active month-based financing plan in Settings before starting this walkthrough.",
    )
  const available = source.products.filter(
    (p) =>
      p.status === "active" &&
      source.suppliers.some(
        (s) => s.id === p.supplierId && s.status === "active",
      ),
  )
  const first =
    available.find((p) => p.retailPrice !== undefined) || available[0]
  const second = available.find((p) => p.supplierId !== first?.supplierId)
  if (!first || !second)
    throw new Error(
      "The walkthrough needs active products from two suppliers. Add those products in Products first.",
    )
  const threshold = settings.retailMinimumQuantity ?? 12
  const supplierIds = [
    ...new Set([
      first.supplierId,
      second.supplierId,
      ...available.map((p) => p.supplierId),
    ]),
  ]
  const selectedProducts = [
    first,
    second,
    ...available.filter((p) => p.id !== first.id && p.id !== second.id),
  ]
  const products = selectedProducts.map(
    (p, index): Product => ({
      id: `walkthrough_product_${index + 1}`,
      name: p.name,
      sku: p.sku,
      category: p.category,
      supplierId: `walkthrough_supplier_${supplierIds.indexOf(p.supplierId) + 1}`,
      sellingPrice: p.sellingPrice,
      retailPrice: p.retailPrice,
      costPrice: p.costPrice,
      stock: Math.max(60, threshold + 24),
      reorderLevel: p.reorderLevel,
      status: "active",
      imageUrl: p.imageUrl,
    }),
  )
  const cart = products
    .slice(0, 2)
    .map((p) => ({ productId: p.id, quantity: threshold }))
  const total = sumMoney(
    products.slice(0, 2).map((p) => getLineTotal(p, threshold, settings)),
  )
  const creditLimit = Math.max(settings.startingCreditLimit, total + 100)
  const createdAt = now.toISOString()
  const base: AppState = {
    currentUser: owner,
    currentPage: "customer/shop",
    cart,
    checkoutData: null,
    products,
    suppliers: supplierIds.map((id, index) => ({
      id: `walkthrough_supplier_${index + 1}`,
      name:
        source.suppliers.find((s) => s.id === id)?.name ||
        `Supplier ${index + 1}`,
      contact: "Demo contact",
      phone: "09000000000",
      email: `supplier${index + 1}@example.test`,
      address: "Demo warehouse",
      categories: [
        ...new Set(
          available.filter((p) => p.supplierId === id).map((p) => p.category),
        ),
      ],
      status: "active",
    })),
    customers: [
      {
        id: owner.id,
        accountNo: "SF-DEMO",
        fullName: owner.name,
        phone: "09000000000",
        email: owner.email,
        loginEmail: owner.email,
        address: "Demo address",
        storeName: "Alex’s Sari-Sari Store",
        storeAddress: "Demo store address",
        yearsOperating: 3,
        notes: "Walkthrough example",
        creditLimit,
        usedCredit: 0,
        status: "active",
        createdAt,
      },
    ],
    employees: [
      {
        id: supervisor.id,
        name: supervisor.name,
        email: supervisor.email,
        role: "supervisor",
        phone: "09000000000",
        status: "active",
        createdAt,
      },
      {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: "employee",
        phone: "09000000000",
        status: "active",
        createdAt,
      },
    ],
    categories: [...new Set(products.map((p) => p.category))].map(
      (name, index) => ({ id: `demo_category_${index}`, name }),
    ),
    orders: [],
    financing: [],
    payments: [],
    restockOrders: [],
    auditLog: [],
    settings,
    toast: null,
  }
  const bundles = products.slice(0, 2).map((p, index) => {
    const id = index === 0 ? "ord_tour_001" : "walkthrough_order_2"
    const finId = index === 0 ? "fin_tour_001" : "walkthrough_financing_2"
    const principal = getLineTotal(p, threshold, settings)
    const quote = calculateFinancing(principal, plans[0], now)
    const financing: Financing = {
      id: finId,
      financingNo: `FIN-DEMO-${index + 1}`,
      customerId: owner.id,
      orderId: id,
      ...quote,
      plan: plans[0].id,
      planId: plans[0].id,
      planName: plans[0].name,
      planDurationValue: plans[0].durationValue,
      planDurationUnit: plans[0].durationUnit,
      paymentFrequency: plans[0].paymentFrequency,
      installmentCount: plans[0].installmentCount,
      weeklyInstallment: quote.installmentAmount,
      status: "pending",
      paidPrincipal: 0,
      createdAt,
    }
    const order: Order = {
      id,
      orderNo: `ORD-DEMO-${index + 1}`,
      checkoutGroupId: "walkthrough_checkout",
      supplierId: p.supplierId,
      customerId: owner.id,
      items: [
        {
          productId: p.id,
          productName: p.name,
          quantity: threshold,
          price: getUnitPrice(p, threshold, settings),
          supplierId: p.supplierId,
        },
      ],
      total: principal,
      status: "pending_financing",
      paymentType: "financing",
      paymentStatus: "pending",
      stockReservationStatus: "reserved",
      financingId: finId,
      channel: "online",
      createdAt,
      updatedAt: createdAt,
    }
    return { order, financing }
  })
  // Keep this demonstration contract subject to the real checkout validator.
  planReservationPaths(bundles, {
    settings,
    customers: Object.fromEntries(base.customers.map((c) => [c.id, c])),
    suppliers: Object.fromEntries(base.suppliers.map((s) => [s.id, s])),
    products: Object.fromEntries(products.map((p) => [p.id, p])),
  })
  return { base, createdAt, bundles }
}

/** Each frame is derived independently: back, skip and replay never repeat a payment. */
export function walkthroughFrame(
  session: WalkthroughSession,
  index: number,
  actionDone = false,
): AppState {
  const state = structuredClone(session.base)
  const current = TOUR_STEPS[index]
  const reached = (step: number) =>
    index > step || (index === step && actionDone)
  state.currentPage = current.targetPage
  state.currentUser = { ...current.targetUser }
  if (current.targetUser.role === "supplier")
    state.currentUser.name = state.suppliers[0].name
  if (index === 2)
    state.cart = state.cart.map((item) => ({ ...item, quantity: 1 }))
  const plans = state.settings.repaymentPlans
  if (index >= 4 && index <= 7) {
    const term = index === 7 ? 0 : Math.min(index - 4, plans.length - 1)
    const total = sumMoney(
      state.cart.map((item) =>
        getLineTotal(
          state.products.find((p) => p.id === item.productId)!,
          item.quantity,
          state.settings,
        ),
      ),
    )
    state.checkoutData = {
      mode: index === 7 ? "split" : "financing",
      plan: plans[term].id,
      splitMethod: "cash",
      total,
    }
    if (index === 7)
      state.customers[0].usedCredit =
        (toCentavos(state.customers[0].creditLimit) -
          Math.floor(toCentavos(total) / 2)) /
        100
  }
  if (index >= 8) {
    state.cart = []
    state.orders = structuredClone(session.bundles.map((b) => b.order))
    state.financing = structuredClone(session.bundles.map((b) => b.financing))
    session.bundles.forEach((bundle) =>
      bundle.order.items.forEach((item) => {
        state.products.find((p) => p.id === item.productId)!.stock -=
          item.quantity
      }),
    )
    if (reached(8)) {
      state.financing.forEach((f) => {
        f.status = "active"
        f.approvedBy = supervisor.name
        f.approvedAt = session.createdAt
        f.schedule = rescheduleInstallments(
          f.schedule,
          f.paymentFrequency!,
          new Date(session.createdAt),
        )
      })
      state.customers[0].usedCredit = sumMoney(
        state.financing.map((f) => f.principal),
      )
      state.orders.forEach((o) => {
        o.status = resolveFinancialOrderStatus(o, [], state.financing)
      })
    }
    const firstOrder = state.orders[0]
    for (const [stage, next] of [
      [9, "ready"],
      [10, "out_for_delivery"],
      [11, "delivered"],
      [12, "completed"],
    ] as const) {
      if (reached(stage)) {
        if (!canTransitionOrder(firstOrder.status, next))
          throw new Error("Invalid walkthrough delivery transition")
        firstOrder.status = next
        if (next === "ready") firstOrder.stockReservationStatus = "committed"
      }
    }
    const loan = state.financing[0]
    if (reached(13)) {
      const installment = loan.schedule[0]
      const payment: Payment = {
        id: "pay_tour_001",
        paymentNo: "PAY-DEMO-1",
        customerId: owner.id,
        financingId: loan.id,
        installmentWeekNo: 1,
        type: "installment",
        method: "cash",
        amount: sumMoney([installment.baseAmount, installment.penalty]),
        status: "pending",
        createdAt: session.createdAt,
      }
      state.payments = [payment]
      if (reached(14)) {
        payment.status = "paid"
        payment.confirmedBy = supervisor.name
        payment.paidAt = session.createdAt
        installment.status = "paid"
        installment.paidAt = session.createdAt
        installment.paidMethod = "cash"
        loan.paidPrincipal = loan.principal / loan.installmentCount
        state.customers[0].usedCredit = Math.max(
          0,
          state.customers[0].usedCredit - loan.paidPrincipal,
        )
        if (loan.schedule[1]) loan.schedule[1].status = "due"
      }
      if (reached(15)) {
        const remaining =
          Math.round(
            (loan.totalRepayable -
              (loan.paidPrincipal / loan.principal) * loan.totalRepayable) *
              100,
          ) / 100
        state.payments.unshift({
          id: "walkthrough_settlement",
          paymentNo: "PAY-DEMO-2",
          customerId: owner.id,
          financingId: loan.id,
          type: "full_settlement",
          method: "gcash",
          amount: remaining,
          status: "paid",
          confirmedBy: "GCash simulator",
          createdAt: session.createdAt,
          paidAt: session.createdAt,
        })
        state.customers[0].usedCredit = Math.max(
          0,
          state.customers[0].usedCredit - (loan.principal - loan.paidPrincipal),
        )
        loan.paidPrincipal = loan.principal
        loan.status = "completed"
        loan.schedule.forEach((s) => {
          if (s.status !== "paid") {
            s.status = "paid"
            s.paidMethod = "gcash"
            s.paidAt = session.createdAt
          }
        })
        const customer = state.customers[0]
        if (
          customer.creditLimit < state.settings.maxAutomaticLimit &&
          state.settings.limitIncreaseAmount > 0
        )
          customer.creditLimit = Math.min(
            state.settings.maxAutomaticLimit,
            customer.creditLimit + state.settings.limitIncreaseAmount,
          )
      }
    }
    if (reached(17)) {
      const product = state.products[0]
      product.stock += 24
      state.restockOrders = [
        {
          id: "walkthrough_restock",
          restockNo: "RO-DEMO-1",
          supplierId: product.supplierId,
          supplierName: state.suppliers[0].name,
          items: [
            {
              productId: product.id,
              productName: product.name,
              quantity: 24,
              costPrice: product.costPrice,
            },
          ],
          totalCost: 24 * product.costPrice,
          status: "received",
          createdAt: session.createdAt,
          receivedAt: session.createdAt,
        },
      ]
    }
  }
  return state
}

export function describeWalkthroughStep(
  session: WalkthroughSession,
  index: number,
): TourStep {
  const step = {
    ...TOUR_STEPS[index],
    targetUser: { ...TOUR_STEPS[index].targetUser },
  }
  const base = session.base
  const threshold = base.settings.retailMinimumQuantity ?? 12
  const product = base.products[0]
  if (step.targetUser.role === "supplier")
    step.targetUser.name = base.suppliers[0].name
  if (index === 0)
    step.detailedInstruction += ` This fictional account starts with ${money(base.customers[0].creditLimit)} in the example.`
  if (index === 1)
    step.detailedInstruction += ` Here ${base.suppliers[0].name} supplies ${product.name}.`
  if (index === 2 || index === 3)
    step.detailedInstruction += ` ${product.name}: ${money(product.sellingPrice)} regular${
      product.retailPrice !== undefined
        ? `, ${money(product.retailPrice)} at ${threshold}+ sale units`
        : ""
    }.`
  if (index >= 4 && index <= 6) {
    const plan =
      base.settings.repaymentPlans[
        Math.min(index - 4, base.settings.repaymentPlans.length - 1)
      ]
    const quote = calculateCheckoutFinancing(
      session.bundles.map((b) => b.order.total),
      sumMoney(session.bundles.map((b) => b.order.total)),
      plan,
    )
    step.title = `Compare ${plan.name}`
    step.detailedInstruction += ` ${plan.durationValue} month(s): ${plan.durationValue}% total interest; ${plan.installmentCount} ${plan.paymentFrequency} installments. Cart ${money(sumMoney(session.bundles.map((b) => b.order.total)))} → ${money(quote.totalRepayable)} total repayable. Final installments absorb centavo rounding per supplier.`
  }
  if (index === 8)
    step.detailedInstruction += ` ${base.suppliers[0].name} and ${base.suppliers[1].name} receive separate fulfillment orders.`
  if (index === 17)
    step.detailedInstruction += " This example receives 24 sale units."
  return step
}
