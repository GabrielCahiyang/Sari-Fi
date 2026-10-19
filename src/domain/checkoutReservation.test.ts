import { describe, expect, it } from "vitest"
import {
  planReservationPaths,
  type CheckoutSnapshot,
  type ReservationBundle,
} from "./checkoutReservation"
import { calculateFinancing } from "../utils/financingCalculator"
import { DEFAULT_REPAYMENT_PLANS } from "../utils/repaymentPlans"
import type { Customer } from "../types"

function fixture() {
  const data: CheckoutSnapshot = {
    customers: {
      customer: {
        id: "customer",
        status: "active",
        creditLimit: 5000,
        usedCredit: 0,
      } as Customer,
    },
    products: {
      canton: {
        id: "canton",
        name: "Canton",
        sku: "CANTON",
        category: "Noodles",
        supplierId: "supplier",
        sellingPrice: 12.39,
        costPrice: 10,
        stock: 13,
        reorderLevel: 12,
        status: "active",
      },
    },
    suppliers: { supplier: { id: "supplier", status: "active" } as any },
    settings: { repaymentPlans: DEFAULT_REPAYMENT_PLANS },
  }
  const now = "2026-10-19T03:00:00.000Z"
  const plan = DEFAULT_REPAYMENT_PLANS[1]
  const quote = calculateFinancing(148.68, plan, new Date(now))
  const bundle: ReservationBundle = {
    order: {
      id: "order",
      orderNo: "ORD-1",
      checkoutGroupId: "checkout",
      customerId: "customer",
      supplierId: "supplier",
      items: [
        {
          productId: "canton",
          productName: "Canton",
          supplierId: "supplier",
          quantity: 12,
          price: 12.39,
        },
      ],
      total: 148.68,
      status: "pending_financing",
      paymentType: "financing",
      paymentStatus: "pending",
      stockReservationStatus: "reserved",
      financingId: "loan",
      createdAt: now,
      updatedAt: now,
    },
    financing: {
      id: "loan",
      financingNo: "FIN-1",
      customerId: "customer",
      orderId: "order",
      ...quote,
      plan: plan.id,
      planId: plan.id,
      planName: plan.name,
      planDurationValue: 2,
      planDurationUnit: "month",
      paymentFrequency: "weekly",
      installmentCount: 8,
      weeklyInstallment: quote.installmentAmount,
      paidPrincipal: 0,
      status: "pending",
      createdAt: now,
    },
  }
  return { data, bundle }
}
describe("fresh checkout integrity", () => {
  it("rejects the retired lower price on a new 12-unit checkout", () => {
    const { data, bundle } = fixture()
    Object.assign(data.products!.canton, { retailPrice: 11.8 })
    bundle.order.items[0].price = 11.8
    bundle.order.total = 141.6
    expect(() => planReservationPaths([bundle], data)).toThrow("Order pricing changed")
  })
  it("reserves stock at the selling price and saves an exact financing snapshot", () => {
    const { data, bundle } = fixture()
    const paths = planReservationPaths([bundle], data)
    expect(paths["products/canton/stock"]).toBe(1)
    expect((paths["financing/loan"] as any).totalRepayable).toBe(151.65)
  })
  it.each([
    "price",
    "stock",
    "supplier",
    "charge",
    "schedule",
    "plan",
    "credit",
    "maintenance",
    "duplicate",
  ] as const)("rejects changed/tampered %s", (scenario) => {
    const { data, bundle } = fixture()
    if (scenario === "price")
      data.products!.canton.sellingPrice = 15
    if (scenario === "stock") data.products!.canton.stock = 11
    if (scenario === "supplier")
      bundle.order.items[0].supplierId = "someone_else"
    if (scenario === "charge") bundle.financing!.chargePercent = 0
    if (scenario === "schedule")
      bundle.financing!.schedule[7].baseAmount += 0.01
    if (scenario === "plan") data.settings!.repaymentPlans = []
    if (scenario === "credit") data.customers!.customer.creditLimit = 100
    if (scenario === "maintenance") data.maintenance = { enabled: true }
    if (scenario === "duplicate")
      bundle.order.items.push({ ...bundle.order.items[0] })
    expect(() => planReservationPaths([bundle], data)).toThrow()
  })
  it("allows exact retries without reserving stock twice", () => {
    const { data, bundle } = fixture()
    data.orders = { order: structuredClone(bundle.order) }
    expect(planReservationPaths([bundle], data)).toEqual({})
    bundle.order.total = 200
    expect(() => planReservationPaths([bundle], data)).toThrow("already in use")
  })
  it("counts pending credit commitments", () => {
    const { data, bundle } = fixture()
    data.financing = {
      pending: { ...bundle.financing!, id: "pending", principal: 4900 },
    }
    expect(() => planReservationPaths([bundle], data)).toThrow(
      "pending requests",
    )
  })
  it("allows cash purchases independently of pending credit requests", () => {
    const { data, bundle } = fixture()
    data.financing = { pending: { ...bundle.financing!, id: "pending", principal: 5100 } }
    bundle.financing = undefined
    bundle.order.financingId = undefined
    bundle.order.status = "pending_payment"
    bundle.order.paymentType = "cash"
    bundle.payment = {
      id: "cash", paymentNo: "PAY-1", customerId: "customer", orderId: "order",
      type: "purchase", method: "cash", amount: 148.68, status: "pending", createdAt: bundle.order.createdAt,
    }
    expect(planReservationPaths([bundle], data)["payments/cash"]).toBe(bundle.payment)
  })
  it("preserves legacy contract snapshots on an exact retry", () => {
    const { data, bundle } = fixture()
    data.orders = { order: { ...bundle.order, status: "completed" } }
    data.financing = { loan: { ...bundle.financing!, chargePercent: 20, totalRepayable: 169.92 } }
    data.settings = { repaymentPlans: [] }
    expect(planReservationPaths([bundle], data)).toEqual({})
    expect(data.financing.loan.chargePercent).toBe(20)
  })
  it("reserves two suppliers and validates each loan independently", () => {
    const { data, bundle } = fixture()
    const second = structuredClone(bundle)
    second.order.id = "order2"; second.order.supplierId = "supplier2"; second.order.financingId = "loan2"
    second.order.items[0].productId = "coffee"; second.order.items[0].supplierId = "supplier2"
    second.financing!.id = "loan2"; second.financing!.orderId = "order2"
    data.suppliers!.supplier2 = { ...data.suppliers!.supplier, id: "supplier2" }
    data.products!.coffee = { ...data.products!.canton, id: "coffee", supplierId: "supplier2" }
    const paths = planReservationPaths([bundle, second], data)
    expect(paths["products/canton/stock"]).toBe(1)
    expect(paths["products/coffee/stock"]).toBe(1)
    expect((paths["financing/loan2"] as any).chargeAmount).toBe(2.97)
  })
})
