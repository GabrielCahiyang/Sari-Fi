import { parse } from "csv-parse/sync"
import type { Product } from "../../src/types"
import {
  deriveRegularPrice,
  isCurrencyInput,
} from "../../src/utils/productPricing"

export interface CatalogRow extends Record<string, string> {
  sku: string
  name: string
  variant: string
  unitDescription: string
  category: string
  supplierId: string
  basePrice: string
  sellingPrice: string
  costPrice: string
  stock: string
  reorderLevel: string
  status: string
  imageUrl: string
  imageSourceUrl: string
  imageLicenseStatus: string
  approvalStatus: string
  reviewer: string
}
export function catalogRows(csv: string): CatalogRow[] {
  return parse(csv, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  })
}
export function reviewCatalog(
  rows: CatalogRow[],
  suppliers: Record<string, any>,
  categories: Set<string>,
  multiplier = 1.05,
) {
  const errors: string[] = []
  const discrepancies: Array<{
    sku: string
    explicit: number
    derived: number
  }> =
    []
  const products: Product[] = []
  const seen = new Set<string>()
  for (const [index, row] of rows.entries()) {
    const label = `row ${index + 2}`
    const sku = row.sku?.trim().toUpperCase()
    if (!sku || !/^[A-Z0-9_-]+$/.test(sku) || seen.has(sku)) {
      errors.push(`${label}: missing, unsafe, or duplicate SKU`)
      continue
    }
    seen.add(sku)
    if (row.approvalStatus !== "approved" || !row.reviewer)
      errors.push(`${label}: product approval/reviewer missing`)
    if (!row.name || !row.variant || !row.unitDescription)
      errors.push(`${label}: exact name, variant and sale unit are required`)
    if (!categories.has(row.category))
      errors.push(`${label}: category missing from the reviewed category list`)
    const supplier = suppliers[row.supplierId]
    if (
      !supplier ||
      supplier.status !== "active" ||
      !supplier.categories?.includes(row.category)
    )
      errors.push(`${label}: active supplier/category assignment missing`)
    if (
      !isCurrencyInput(row.basePrice) ||
      (row.sellingPrice && !isCurrencyInput(row.sellingPrice)) ||
      !isCurrencyInput(row.costPrice, true)
    )
      errors.push(`${label}: invalid currency input`)
    if (
      ![row.stock, row.reorderLevel].every(
        (v) => /^\d+$/.test(v || "") && Number.isSafeInteger(Number(v)),
      )
    )
      errors.push(
        `${label}: stock and reorder level must be explicit nonnegative whole numbers`,
      )
    if (!["active", "inactive"].includes(row.status))
      errors.push(`${label}: invalid publication status`)
    const basePrice = Number(row.basePrice)
    if (!Number.isFinite(basePrice) || basePrice <= 0) continue
    const derived = deriveRegularPrice(basePrice, multiplier)
    const regular = row.sellingPrice ? Number(row.sellingPrice) : derived
    if (regular < basePrice)
      errors.push(`${label}: base price cannot exceed selling price`)
    if (row.sellingPrice && regular !== derived)
      discrepancies.push({ sku, explicit: regular, derived })
    if (
      row.status === "active" &&
      (!row.imageUrl?.startsWith(
        "https://res.cloudinary.com/a5bi1hsj/image/upload/",
      ) ||
        !row.imageSourceUrl ||
        !["client-owned", "licensed", "manufacturer-approved"].includes(
          row.imageLicenseStatus,
        ))
    )
      errors.push(
        `${label}: approved Cloudinary image/source/rights are required before publication`,
      )
    if (
      row.imageUrl &&
      !row.imageUrl.startsWith(
        "https://res.cloudinary.com/a5bi1hsj/image/upload/",
      )
    )
      errors.push(`${label}: invalid catalog image URL`)
    products.push({
      id: `client_${sku.toLowerCase()}`,
      sku,
      name: `${row.name} ${row.variant} (${row.unitDescription})`,
      category: row.category,
      supplierId: row.supplierId,
      sellingPrice: regular,
      costPrice: Number(row.costPrice),
      stock: Number(row.stock),
      reorderLevel: Number(row.reorderLevel),
      status: row.status as Product["status"],
      imageUrl: row.imageUrl || undefined,
    })
  }
  return { errors, discrepancies, products }
}
