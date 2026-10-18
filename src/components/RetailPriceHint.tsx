import type { Product, SystemSettings } from "../types"
import { retailThreshold } from "../utils/productPricing"

export function RetailPriceHint({
  product,
  quantity,
  settings,
}: {
  product: Product
  quantity: number
  settings: SystemSettings
}) {
  if (product.retailPrice === undefined) return null
  const threshold = retailThreshold(settings)
  const price = product.retailPrice.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
  return (
    <div
      className="mt-1 text-[11px] leading-relaxed text-[#1E7D3B]"
      aria-live="polite"
    >
      {quantity >= threshold
        ? `Retail price applied · ${price} each`
        : `Retail ${price} each at ${threshold}+ · add ${threshold - quantity} more of this item`}
    </div>
  )
}
