import type {
  Customer,
  Financing,
  Order,
  Payment,
  Product,
  Supplier,
  SystemSettings,
} from "../types"
import { calculateFinancing } from "../utils/financingCalculator"
import { getLineTotal, getUnitPrice, toCentavos } from "../utils/productPricing"
import { getRepaymentPlans, isEligiblePlan } from "../utils/repaymentPlans"

export interface ReservationBundle {
  order: Order
  payment?: Payment
  financing?: Financing
}
export interface CheckoutSnapshot {
  settings?: Partial<SystemSettings>
  customers?: Record<string, Customer>
  products?: Record<string, Product>
  suppliers?: Record<string, Supplier>
  orders?: Record<string, Order>
  payments?: Record<string, Payment>
  financing?: Record<string, Financing>
  maintenance?: { enabled?: boolean }
}
const safeId = (id: string) =>
  typeof id === "string" &&
  /^[A-Za-z0-9_-]{1,150}$/.test(id) &&
  !["__proto__", "constructor", "prototype"].includes(id)
const assertMoney = (actual: number, expected: number, message: string) => {
  if (
    !Number.isFinite(actual) ||
    actual < 0 ||
    Math.abs(actual * 100 - Math.round(actual * 100)) > 0.00001 ||
    toCentavos(actual) !== toCentavos(expected)
  )
    throw new Error(message)
}

export function validateNewFinancing(
  loan: Financing,
  order: Order,
  settings?: Partial<SystemSettings>,
): void {
  const plan = getRepaymentPlans(settings).find(
    (p) => p.id === loan.planId && isEligiblePlan(p),
  )
  if (!plan)
    throw new Error(
      "Repayment plan changed or is unavailable. Select an active month-based plan.",
    )
  if (
    !safeId(loan.id) ||
    loan.orderId !== order.id ||
    loan.customerId !== order.customerId ||
    loan.principal <= 0 ||
    loan.status !== "pending" ||
    loan.paidPrincipal !== 0 ||
    loan.approvedAt ||
    loan.approvedBy
  )
    throw new Error("Invalid new financing record.")
  const created = new Date(loan.createdAt)
  if (!Number.isFinite(created.getTime()))
    throw new Error("Invalid financing date.")
  const quote = calculateFinancing(loan.principal, plan, created)
  if (
    loan.chargePercent !== quote.chargePercent ||
    loan.plan !== plan.id ||
    loan.planName !== plan.name ||
    loan.planDurationValue !== plan.durationValue ||
    loan.planDurationUnit !== "month" ||
    loan.paymentFrequency !== plan.paymentFrequency ||
    loan.installmentCount !== plan.installmentCount
  ) {
    throw new Error(
      "Financing terms changed. Review the selected plan and retry.",
    )
  }
  assertMoney(loan.principal, quote.principal, "Invalid financed principal.")
  assertMoney(
    loan.chargeAmount,
    quote.chargeAmount,
    "Financing charge does not match the selected term.",
  )
  assertMoney(
    loan.totalRepayable,
    quote.totalRepayable,
    "Invalid total repayable.",
  )
  assertMoney(
    loan.installmentAmount!,
    quote.installmentAmount,
    "Invalid installment amount.",
  )
  assertMoney(
    loan.weeklyInstallment,
    quote.installmentAmount,
    "Invalid legacy installment amount.",
  )
  if (
    !Array.isArray(loan.schedule) ||
    loan.schedule.length !== quote.schedule.length
  )
    throw new Error("Invalid repayment schedule.")
  loan.schedule.forEach((row, index) => {
    const expected = quote.schedule[index]
    if (
      row.weekNo !== expected.weekNo ||
      row.dueDate !== expected.dueDate ||
      row.status !== "upcoming" ||
      row.penalty !== 0 ||
      row.paidAt ||
      row.paidMethod
    )
      throw new Error("Invalid repayment schedule.")
    assertMoney(
      row.baseAmount,
      expected.baseAmount,
      "Installments do not match the selected terms.",
    )
  })
}

/** Pure validation shared by demo writes and the trusted, atomic callable. No historical repricing. */
export function planReservationPaths(
  bundles: ReservationBundle[],
  data: CheckoutSnapshot,
): Record<string, unknown> {
  if (data.maintenance?.enabled)
    throw new Error(
      "The catalog is being updated. Please try checkout again shortly.",
    )
  if (!Array.isArray(bundles) || bundles.length < 1 || bundles.length > 100)
    throw new Error("A checkout requires 1–100 supplier orders.")
  const ids = bundles.map((b) => b.order?.id)
  if (ids.some((id) => !safeId(id)) || new Set(ids).size !== ids.length)
    throw new Error("Invalid or duplicate order IDs.")
  const exists = ids.map((id) => data.orders?.[id])
  if (exists.some(Boolean)) {
    if (!exists.every(Boolean))
      throw new Error(
        "Only part of this checkout exists. Contact support before retrying.",
      )
    const same = exists.every((saved, index) => {
      const incoming = bundles[index].order
      return (
        saved!.customerId === incoming.customerId &&
        saved!.total === incoming.total &&
        saved!.checkoutGroupId === incoming.checkoutGroupId &&
        JSON.stringify(saved!.items) === JSON.stringify(incoming.items)
      )
    })
    if (!same) throw new Error("An order ID is already in use.")
    return {} // Exact retry, including contracts created before the current pricing policy.
  }
  const customerId = bundles[0].order.customerId
  const customer = data.customers?.[customerId]
  if (
    !customer ||
    customer.status !== "active" ||
    bundles.some((b) => b.order.customerId !== customerId)
  )
    throw new Error("Checkout requires one active customer.")
  const paths: Record<string, unknown> = {}
  const quantities = new Map<string, number>()
  const paymentIds = new Set<string>()
  const loanIds = new Set<string>()
  let financedCents = 0
  for (const { order, payment, financing } of bundles) {
    if (
      !Array.isArray(order.items) ||
      !order.items.length ||
      order.items.length > 500 ||
      order.total <= 0
    )
      throw new Error("Invalid order items or total.")
    if (
      order.paymentStatus !== "pending" ||
      order.stockReservationStatus !== "reserved" ||
      order.status !== (financing ? "pending_financing" : "pending_payment")
    )
      throw new Error("New orders must await payment or financing approval.")
    let totalCents = 0
    const supplierIds = new Set<string>()
    for (const item of order.items) {
      if (
        !safeId(item.productId) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1
      )
        throw new Error("Every item needs a positive whole-number quantity.")
      // Canonical carts have one line per SKU. Reject duplicates across the whole checkout.
      if (quantities.has(item.productId))
        throw new Error(
          "Duplicate product lines. Combine quantities of the same SKU before checkout.",
        )
      quantities.set(item.productId, item.quantity)
      const product = data.products?.[item.productId]
      if (!product || product.status !== "active")
        throw new Error(
          "Catalog updated—review your cart. A product is unavailable.",
        )
      if (!Number.isSafeInteger(product.stock) || product.stock < item.quantity)
        throw new Error(`${product.name} has insufficient stock.`)
      if (!product.supplierId || item.supplierId !== product.supplierId)
        throw new Error("Product supplier changed. Review your cart.")
      supplierIds.add(product.supplierId)
      if (data.suppliers?.[product.supplierId]?.status !== "active")
        throw new Error("A supplier for this checkout is unavailable.")
      assertMoney(
        item.price,
        getUnitPrice(product, item.quantity, data.settings),
        "Order pricing changed. Review your cart and try again.",
      )
      totalCents += toCentavos(
        getLineTotal(product, item.quantity, data.settings),
      )
      paths[`products/${item.productId}/stock`] = product.stock - item.quantity
    }
    if (supplierIds.size !== 1 || !supplierIds.has(order.supplierId!))
      throw new Error(
        "Each fulfillment order must belong to its product supplier.",
      )
    assertMoney(
      order.total,
      totalCents / 100,
      "Order total changed. Review your cart.",
    )
    const expectedType = financing
      ? payment
        ? "split"
        : "financing"
      : payment?.method
    if (
      order.paymentType !== expectedType ||
      order.financingId !== financing?.id
    )
      throw new Error("Invalid payment allocation.")
    if (!payment && !financing)
      throw new Error("No payment or financing supplied.")
    if (payment) {
      if (
        !safeId(payment.id) ||
        paymentIds.has(payment.id) ||
        data.payments?.[payment.id] ||
        payment.orderId !== order.id ||
        payment.customerId !== customerId ||
        payment.type !== "purchase" ||
        !["cash", "gcash"].includes(payment.method) ||
        payment.status !== "pending" ||
        payment.amount <= 0 ||
        payment.paidAt ||
        payment.confirmedBy
      )
        throw new Error("Invalid purchase payment.")
      paymentIds.add(payment.id)
      paths[`payments/${payment.id}`] = payment
    }
    if (financing) {
      if (loanIds.has(financing.id) || data.financing?.[financing.id])
        throw new Error("Financing ID is already in use.")
      validateNewFinancing(financing, order, data.settings)
      loanIds.add(financing.id)
      financedCents += toCentavos(financing.principal)
      paths[`financing/${financing.id}`] = financing
    }
    assertMoney(
      (payment?.amount || 0) + (financing?.principal || 0),
      order.total,
      "Payment allocation does not match the order total.",
    )
    if (order.paymentType === "split") {
      assertMoney(
        order.splitCashAmount!,
        payment!.amount,
        "Invalid split cash allocation.",
      )
      assertMoney(
        order.splitFinancingAmount!,
        financing!.principal,
        "Invalid split financing allocation.",
      )
      if (order.splitMethod !== payment!.method)
        throw new Error("Invalid split method.")
    }
    paths[`orders/${order.id}`] = order
  }
  const pendingCents = Object.values(data.financing || {})
    .filter(
      (loan) => loan.customerId === customerId && loan.status === "pending",
    )
    .reduce((sum, loan) => sum + toCentavos(loan.principal), 0)
  if (
    financedCents > 0 && financedCents + pendingCents >
    toCentavos(customer.creditLimit) - toCentavos(customer.usedCredit)
  )
    throw new Error(
      "Financing exceeds available credit, including pending requests.",
    )
  return paths
}
