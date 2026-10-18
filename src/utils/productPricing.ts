import type { Product, SystemSettings } from "../types"

export const DEFAULT_RETAIL_MIN_QTY = 12
export const DEFAULT_REGULAR_MULTIPLIER = 1.05

/** Currency amounts are rounded once, then added and multiplied as integer centavos. */
export function toCentavos(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error("Invalid currency amount")
  const value = Math.round(
    (amount + Number.EPSILON * Math.max(1, amount)) * 100,
  )
  if (!Number.isSafeInteger(value))
    throw new Error("Currency amount is too large")
  return value
}

export function sumMoney(amounts: number[]): number {
  const total = amounts.reduce((sum, amount) => sum + toCentavos(amount), 0)
  if (!Number.isSafeInteger(total))
    throw new Error("Currency total is too large")
  return total / 100
}

export function retailThreshold(settings?: Partial<SystemSettings>): number {
  const threshold = settings?.retailMinimumQuantity ?? DEFAULT_RETAIL_MIN_QTY
  if (!Number.isSafeInteger(threshold) || threshold < 1)
    throw new Error("Invalid retail threshold")
  return threshold
}

export function getUnitPrice(
  product: Product,
  quantity: number,
  settings?: Partial<SystemSettings>,
): number {
  if (!Number.isSafeInteger(quantity) || quantity < 1)
    throw new Error("Invalid quantity")
  const threshold = retailThreshold(settings)
  const regular = toCentavos(product.sellingPrice)
  const retail =
    product.retailPrice === undefined
      ? undefined
      : toCentavos(product.retailPrice)
  if (
    regular < 1 ||
    (retail !== undefined && (retail < 1 || retail > regular))
  ) {
    throw new Error("Invalid product price")
  }
  return (
    (retail !== undefined && quantity >= threshold ? retail : regular) / 100
  )
}

export function getLineTotal(
  product: Product,
  quantity: number,
  settings?: Partial<SystemSettings>,
): number {
  const total = toCentavos(getUnitPrice(product, quantity, settings)) * quantity
  if (!Number.isSafeInteger(total)) throw new Error("Line total is too large")
  return total / 100
}

export function deriveRegularPrice(
  retail: number,
  multiplier = DEFAULT_REGULAR_MULTIPLIER,
): number {
  if (retail <= 0 || !Number.isFinite(multiplier) || multiplier < 1)
    throw new Error("Invalid regular price inputs")
  return toCentavos(retail * multiplier) / 100
}

export function isCurrencyInput(value: string, allowZero = false): boolean {
  return (
    /^\d+(\.\d{1,2})?$/.test(value.trim()) &&
    Number.isFinite(Number(value)) &&
    (allowZero ? Number(value) >= 0 : Number(value) > 0)
  )
}
