import type {
  Financing,
  InstallmentSchedule,
  PaymentFrequency,
  RepaymentPlan,
  SystemSettings,
} from '../types';

export const DEFAULT_REPAYMENT_PLANS: RepaymentPlan[] = [
  {
    id: 'plan_1_month',
    name: '1-Month Plan',
    durationValue: 1,
    durationUnit: 'month',
    paymentFrequency: 'weekly',
    installmentCount: 4,
    active: true,
  },
  {
    id: 'plan_2_months',
    name: '2-Month Plan',
    durationValue: 2,
    durationUnit: 'month',
    paymentFrequency: 'weekly',
    installmentCount: 8,
    active: true,
  },
];

export function getRepaymentPlans(settings?: Partial<SystemSettings> | null): RepaymentPlan[] {
  if (Array.isArray(settings?.repaymentPlans) && settings.repaymentPlans.length > 0) {
    return settings.repaymentPlans;
  }

  return DEFAULT_REPAYMENT_PLANS.map((plan, index) => ({
    ...plan,
    installmentCount: index === 0
      ? settings?.plan1Installments ?? plan.installmentCount
      : settings?.plan2Installments ?? plan.installmentCount,
  }));
}

export function normalizeRepaymentSettings(settings: SystemSettings): SystemSettings {
  return { ...settings, repaymentPlans: getRepaymentPlans(settings) };
}

export function pluralizeUnit(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

export function formatPlanDuration(plan: Pick<RepaymentPlan, 'durationValue' | 'durationUnit'>): string {
  return pluralizeUnit(plan.durationValue, plan.durationUnit);
}

export function formatFrequency(frequency: PaymentFrequency): string {
  return frequency === 'daily' ? 'Daily' : frequency === 'monthly' ? 'Monthly' : 'Weekly';
}

export function formatPlanSummary(plan: RepaymentPlan): string {
  return `${formatPlanDuration(plan)} · ${plan.installmentCount} ${plan.paymentFrequency} payments`;
}

export function getFinancingPlanName(financing: Financing): string {
  if (financing.planName) return financing.planName;
  return `${financing.plan}-Month Plan`;
}

export function getFinancingFrequency(financing: Financing): PaymentFrequency {
  return financing.paymentFrequency ?? 'weekly';
}

export function getFinancingInstallmentAmount(financing: Financing): number {
  return financing.installmentAmount ?? financing.weeklyInstallment;
}

function dateForInstallment(start: Date, installmentIndex: number, frequency: PaymentFrequency): Date {
  const date = new Date(start);
  if (frequency === 'daily') {
    date.setDate(date.getDate() + installmentIndex);
    return date;
  }
  if (frequency === 'weekly') {
    date.setDate(date.getDate() + installmentIndex * 7);
    return date;
  }

  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + installmentIndex);
  const finalDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, finalDay));
  return date;
}

export function buildInstallmentSchedule(
  count: number,
  amount: number,
  frequency: PaymentFrequency,
  start = new Date(),
  firstStatus: InstallmentSchedule['status'] = 'upcoming',
): InstallmentSchedule[] {
  return Array.from({ length: count }, (_, index) => ({
    weekNo: index + 1,
    dueDate: dateForInstallment(start, index + 1, frequency).toISOString().split('T')[0],
    baseAmount: amount,
    penalty: 0,
    status: index === 0 ? firstStatus : 'upcoming',
  }));
}

export function rescheduleInstallments(
  schedule: InstallmentSchedule[],
  frequency: PaymentFrequency,
  start = new Date(),
): InstallmentSchedule[] {
  return schedule.map((entry, index) => ({
    ...entry,
    dueDate: dateForInstallment(start, index + 1, frequency).toISOString().split('T')[0],
    status: index === 0 ? 'due' : 'upcoming',
  }));
}
