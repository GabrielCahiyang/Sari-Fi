import type { Financing, RepaymentPlan } from "../types"
import {
  buildInstallmentSchedule,
  getPlanChargePercent,
} from "./repaymentPlans"
import { sumMoney, toCentavos } from "./productPricing"

/** The unpaid schedule is authoritative, including final-payment rounding and penalties. */
export function getRemainingBalance(financing: Pick<Financing, "schedule">): number {
  return sumMoney(financing.schedule
    .filter((entry) => entry.status !== "paid")
    .map((entry) => sumMoney([entry.baseAmount, entry.penalty])))
}

export function calculateFinancing(
  principal: number,
  plan: RepaymentPlan,
  start = new Date(),
) {
  const chargePercent = getPlanChargePercent(plan)
  const principalCents = toCentavos(principal)
  const chargeCents = Math.round((principalCents * chargePercent) / 100)
  const totalRepayable = (principalCents + chargeCents) / 100
  const installmentAmount =
    Math.floor((principalCents + chargeCents) / plan.installmentCount) / 100
  return {
    principal: principalCents / 100,
    chargePercent,
    chargeAmount: chargeCents / 100,
    totalRepayable,
    installmentAmount,
    schedule: buildInstallmentSchedule(
      plan.installmentCount,
      installmentAmount,
      plan.paymentFrequency,
      start,
      "upcoming",
      totalRepayable,
    ),
  }
}

/** Mirrors supplier order allocation so preview and saved contracts have identical rounding. */
export function calculateCheckoutFinancing(
  groupTotals: number[],
  financedPrincipal: number,
  plan: RepaymentPlan,
) {
  let remaining = toCentavos(financedPrincipal)
  const loans = groupTotals.map((total) => {
    const allocated = Math.min(remaining, toCentavos(total))
    remaining -= allocated
    return calculateFinancing(allocated / 100, plan)
  })
  return {
    chargeAmount: sumMoney(loans.map((loan) => loan.chargeAmount)),
    totalRepayable: sumMoney(loans.map((loan) => loan.totalRepayable)),
    installmentAmount: sumMoney(loans.map((loan) => loan.installmentAmount)),
  }
}
