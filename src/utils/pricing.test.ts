import { describe, expect, it } from "vitest"
import type { Product } from "../types"
import {
  deriveRegularPrice,
  getLineTotal,
  getUnitPrice,
  sumMoney,
} from "./productPricing"
import {
  DEFAULT_REPAYMENT_PLANS,
  getRepaymentPlans,
  isEligiblePlan,
} from "./repaymentPlans"
import {
  calculateCheckoutFinancing,
  calculateFinancing,
} from "./financingCalculator"

const canton: Product = {
  id: "canton",
  name: "Pancit Canton",
  sku: "CANTON",
  category: "Noodles",
  supplierId: "supplier",
  sellingPrice: 12.39,
  retailPrice: 11.8,
  costPrice: 10,
  stock: 100,
  reorderLevel: 12,
  status: "active",
}
describe("same-SKU quantity pricing", () => {
  it.each([
    [1, 12.39],
    [11, 136.29],
    [12, 141.6],
    [13, 153.4],
  ])("prices %i units at %f", (qty, total) =>
    expect(getLineTotal(canton, qty)).toBe(total),
  )
  it("never combines different SKUs into a dozen", () => {
    const coffee = {
      ...canton,
      id: "coffee",
      sellingPrice: 7.35,
      retailPrice: 7,
    }
    expect(sumMoney([getLineTotal(canton, 6), getLineTotal(coffee, 6)])).toBe(
      118.44,
    )
  })
  it("leaves legacy prices unchanged and respects configured threshold", () => {
    expect(getUnitPrice({ ...canton, retailPrice: undefined }, 13)).toBe(12.39)
    expect(getUnitPrice(canton, 6, { retailMinimumQuantity: 6 })).toBe(11.8)
  })
  it.each([0, -1, 1.5, NaN, Infinity])("rejects quantity %s", (qty) =>
    expect(() => getUnitPrice(canton, qty)).toThrow(),
  )
  it.each([
    [2.5, 2.63],
    [4.5, 4.73],
    [5.5, 5.78],
    [3.8, 3.99],
  ])("derives %f as %f with half-cent rounding", (retail, expected) =>
    expect(deriveRegularPrice(retail)).toBe(expected),
  )
})
describe("term-based financing", () => {
  it("uses the Philippine calendar near UTC midnight", () => {
    const quote = calculateFinancing(1000, DEFAULT_REPAYMENT_PLANS[0], new Date("2026-10-18T17:00:00Z"))
    expect(quote.schedule[0].dueDate).toBe("2026-10-26")
  })
  it("clamps monthly installments to month end consistently on the server", () => {
    const quote = calculateFinancing(1000, { ...DEFAULT_REPAYMENT_PLANS[0], paymentFrequency: "monthly" }, new Date("2026-01-30T20:00:00Z"))
    expect(quote.schedule[0].dueDate).toBe("2026-02-28")
  })
  it.each([1, 2, 3, 7])(
    "%i month(s) have the same once-only percentage",
    (months) => {
      const quote = calculateFinancing(1000, {
        ...DEFAULT_REPAYMENT_PLANS[0],
        durationValue: months,
      })
      expect(quote.chargeAmount).toBe(months * 10)
      expect(quote.totalRepayable).toBe(1000 + months * 10)
    },
  )
  it("charges only the financed portion in split mode", () =>
    expect(
      calculateFinancing(600, DEFAULT_REPAYMENT_PLANS[2]).totalRepayable,
    ).toBe(618))
  it("applies the quantity discount before financing", () =>
    expect(
      calculateFinancing(getLineTotal(canton, 12), DEFAULT_REPAYMENT_PLANS[1])
        .totalRepayable,
    ).toBe(144.43))
  it.each(["daily", "weekly", "monthly"] as const)(
    "schedules exactly the total with %s installments",
    (frequency) => {
      const quote = calculateFinancing(141.6, {
        ...DEFAULT_REPAYMENT_PLANS[1],
        paymentFrequency: frequency,
      })
      expect(
        quote.schedule.reduce(
          (cents, row) => cents + Math.round(row.baseAmount * 100),
          0,
        ),
      ).toBe(14443)
    },
  )
  it("sums supplier-specific rounding in the checkout preview", () => {
    const plan = DEFAULT_REPAYMENT_PLANS[0]
    const quote = calculateCheckoutFinancing([10.5, 10.5], 21, plan)
    expect(quote.chargeAmount).toBe(0.22)
    expect(quote.totalRepayable).toBe(21.22)
    expect(calculateCheckoutFinancing([100, 500], 300, plan).chargeAmount).toBe(
      3,
    )
  })
  it("preserves an explicit empty list and legacy fallback counts", () => {
    expect(getRepaymentPlans({ repaymentPlans: [] })).toEqual([])
    expect(
      getRepaymentPlans({ plan1Installments: 5, plan2Installments: 9 }).map(
        (p) => p.installmentCount,
      ),
    ).toEqual([5, 9, 12])
  })
  it("rejects non-month terms and invalid installment counts", () => {
    expect(
      isEligiblePlan({ ...DEFAULT_REPAYMENT_PLANS[0], durationUnit: "week" }),
    ).toBe(false)
    expect(() =>
      calculateFinancing(1000, {
        ...DEFAULT_REPAYMENT_PLANS[0],
        durationValue: 0,
      }),
    ).toThrow()
    expect(() =>
      calculateFinancing(1000, {
        ...DEFAULT_REPAYMENT_PLANS[0],
        installmentCount: 0,
      }),
    ).toThrow()
  })
})
