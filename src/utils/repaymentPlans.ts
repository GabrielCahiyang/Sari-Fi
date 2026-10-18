import type {
  Financing,
  InstallmentSchedule,
  PaymentFrequency,
  RepaymentPlan,
  SystemSettings,
} from "../types"

export const DEFAULT_REPAYMENT_PLANS: RepaymentPlan[] = [
  {
    id: "plan_1_month",
    name: "1-Month Plan",
    durationValue: 1,
    durationUnit: "month",
    paymentFrequency: "weekly",
    installmentCount: 4,
    active: true,
  },
  {
    id: "plan_2_months",
    name: "2-Month Plan",
    durationValue: 2,
    durationUnit: "month",
    paymentFrequency: "weekly",
    installmentCount: 8,
    active: true,
  },
  {
    id: "plan_3_months",
    name: "3-Month Plan",
    durationValue: 3,
    durationUnit: "month",
    paymentFrequency: "weekly",
    installmentCount: 12,
    active: true,
  },
]

export function getRepaymentPlans(
  settings?: Partial<SystemSettings> | null,
): RepaymentPlan[] {
  if (Array.isArray(settings?.repaymentPlans)) {
    return settings.repaymentPlans
  }

  return DEFAULT_REPAYMENT_PLANS.map((plan, index) => ({
    ...plan,
    installmentCount:
      index === 0
        ? (settings?.plan1Installments ?? plan.installmentCount)
        : index === 1
          ? (settings?.plan2Installments ?? plan.installmentCount)
          : plan.installmentCount,
  }))
}

export function normalizeRepaymentSettings(
  settings: SystemSettings,
): SystemSettings {
  return {
    retailMinimumQuantity: 12,
    retailMarkupMultiplier: 1.05,
    ...settings,
    repaymentPlans: getRepaymentPlans(settings),
  }
}

export function isEligiblePlan(plan: RepaymentPlan): boolean {
  return (
    plan.active &&
    plan.durationUnit === "month" &&
    Number.isSafeInteger(plan.durationValue) &&
    plan.durationValue > 0 &&
    Number.isSafeInteger(plan.installmentCount) &&
    plan.installmentCount > 0 &&
    plan.installmentCount <= 999 &&
    ["daily", "weekly", "monthly"].includes(plan.paymentFrequency)
  )
}

export function getPlanChargePercent(plan: RepaymentPlan): number {
  if (!isEligiblePlan({ ...plan, active: true }))
    throw new Error(
      "Finance terms must use positive whole months and a valid installment count.",
    )
  return plan.durationValue
}

export function pluralizeUnit(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`
}

export function formatPlanDuration(
  plan: Pick<RepaymentPlan, "durationValue" | "durationUnit">,
): string {
  return pluralizeUnit(plan.durationValue, plan.durationUnit)
}

export function formatFrequency(frequency: PaymentFrequency): string {
  return frequency === "daily"
    ? "Daily"
    : frequency === "monthly"
      ? "Monthly"
      : "Weekly"
}

export function formatPlanSummary(plan: RepaymentPlan): string {
  return `${formatPlanDuration(plan)} · ${getPlanChargePercent(plan)}% one-time total interest · ${plan.installmentCount} ${plan.paymentFrequency} payments`
}

export function getFinancingPlanName(financing: Financing): string {
  if (financing.planName) return financing.planName
  return `${financing.plan}-Month Plan`
}

export function getFinancingFrequency(financing: Financing): PaymentFrequency {
  return financing.paymentFrequency ?? "weekly"
}

export function getFinancingInstallmentAmount(financing: Financing): number {
  return financing.installmentAmount ?? financing.weeklyInstallment
}

function dateForInstallment(
  start: Date,
  installmentIndex: number,
  frequency: PaymentFrequency,
): Date {
  // Schedules store calendar dates, not instants. Use the store's Philippine
  // calendar in every browser/server timezone, including month-end clamping.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(start)
  const part = (name: string) => Number(parts.find(p => p.type === name)!.value)
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")))
  if (frequency === "daily") {
    date.setUTCDate(date.getUTCDate() + installmentIndex)
    return date
  }
  if (frequency === "weekly") {
    date.setUTCDate(date.getUTCDate() + installmentIndex * 7)
    return date
  }

  const originalDay = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + installmentIndex)
  const finalDay = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    0,
  )).getUTCDate()
  date.setUTCDate(Math.min(originalDay, finalDay))
  return date
}

export function buildInstallmentSchedule(
  count: number,
  amount: number,
  frequency: PaymentFrequency,
  start = new Date(),
  firstStatus: InstallmentSchedule["status"] = "upcoming",
  totalRepayable?: number,
): InstallmentSchedule[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > 999)
    throw new Error("Invalid installment count")
  const cents = Math.round(amount * 100)
  const totalCents = Math.round((totalRepayable ?? amount * count) * 100)
  if (totalCents < 0 || cents < 0 || totalCents - cents * (count - 1) < 0)
    throw new Error("Invalid installment amount")
  return Array.from({ length: count }, (_, index) => ({
    weekNo: index + 1,
    dueDate: dateForInstallment(start, index + 1, frequency)
      .toISOString()
      .split("T")[0],
    baseAmount:
      (index === count - 1 ? totalCents - cents * (count - 1) : cents) / 100,
    penalty: 0,
    status: index === 0 ? firstStatus : "upcoming",
  }))
}

export function rescheduleInstallments(
  schedule: InstallmentSchedule[],
  frequency: PaymentFrequency,
  start = new Date(),
): InstallmentSchedule[] {
  return schedule.map((entry, index) => ({
    ...entry,
    dueDate: dateForInstallment(start, index + 1, frequency)
      .toISOString()
      .split("T")[0],
    status: index === 0 ? "due" : "upcoming",
  }))
}
