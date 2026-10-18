import { describe, expect, it } from "vitest"
import { catalogRows, reviewCatalog } from "./catalog"
const header =
  "sku,name,variant,unitDescription,category,supplierId,retailPrice,sellingPrice,costPrice,stock,reorderLevel,status,imageUrl,imageSourceUrl,imageLicenseStatus,approvalStatus,reviewer\n"
const row =
  "KNORR,Knorr Cubes,Chicken,10g cube,Seasoning,supplier,5.50,5.76,4.00,24,12,inactive,,,client-owned,approved,owner"
describe("catalog import review", () => {
  it("preserves explicit discrepant prices and reports them", () => {
    const result = reviewCatalog(
      catalogRows(header + row),
      { supplier: { status: "active", categories: ["Seasoning"] } },
      new Set(["Seasoning"]),
    )
    expect(result.errors).toEqual([])
    expect(result.products[0].sellingPrice).toBe(5.76)
    expect(result.discrepancies).toEqual([
      { sku: "KNORR", explicit: 5.76, derived: 5.78 },
    ])
  })
  it("blocks unknown supplier/stock/approval and duplicate SKUs", () => {
    const rows = catalogRows(header + row + "\n" + row)
    rows[0].stock = ""
    rows[0].reviewer = ""
    const result = reviewCatalog(rows, {}, new Set(["Seasoning"]))
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
  })
})
