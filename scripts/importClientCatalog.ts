import { readFileSync } from "node:fs"
import {
  adminTarget,
  executionGate,
  flag,
  hash,
  json,
  main,
  privateDirectory,
  required,
  writePrivate,
} from "./lib/admin"
import { catalogRows, reviewCatalog } from "./lib/catalog"
import { DEFAULT_REPAYMENT_PLANS } from "../src/utils/repaymentPlans"

main(async () => {
  const target = adminTarget()
  const rows = catalogRows(readFileSync(required("csv"), "utf8"))
  const root = (await target.db.ref().get()).val() || {}
  const categoryNames = new Set<string>([
    ...Object.values(root.categories || {}).map((c: any) => c.name),
    "Seasoning",
    "Coffee",
    "Shampoo",
    "Conditioner",
  ])
  const review = reviewCatalog(
    rows,
    root.suppliers || {},
    categoryNames,
    root.settings?.retailMarkupMultiplier ?? 1.05,
  )
  const existing = Object.values(root.products || {}) as any[]
  const conflicts = review.products
    .filter((p) =>
      existing.some(
        (e) => e.sku?.trim().toUpperCase() === p.sku || e.id === p.id,
      ),
    )
    .map((p) => p.sku)
  console.log(
    JSON.stringify(
      {
        dryRun: !flag("execute") || flag("dry-run"),
        approvedRows: review.products.length,
        errors: review.errors,
        discrepancies: review.discrepancies,
        conflicts,
        note: "Explicit price discrepancies are preserved. Existing SKU updates require a separate reviewed migration.",
      },
      null,
      2,
    ),
  )
  if (review.errors.length || conflicts.length || !rows.length)
    throw new Error(
      "Catalog review failed or existing SKUs would be overwritten. No products imported.",
    )
  if (!flag("execute") || flag("dry-run")) return
  executionGate("IMPORT", target)
  if (!root.maintenance?.enabled)
    throw new Error(
      "Import requires maintenance mode and a verified cleanup receipt.",
    )
  const rules = await target.db.getRulesJSON() as { rules?: Record<string, unknown> }
  if (rules.rules?.[".write"] !== false || Object.values(rules.rules || {}).some((v: any) => v && typeof v === "object" && JSON.stringify(v).includes('".write"'))) {
    throw new Error("Catalog import requires the verified browser write freeze used for cleanup.")
  }
  for (const product of review.products.filter(p => p.status === "active")) {
    const response = await fetch(product.imageUrl!, { method: "HEAD", signal: AbortSignal.timeout(15000) })
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`Photo unavailable for ${product.sku}; no import performed.`)
  }
  const receipt = json(required("cleanup-receipt"))
  if (
    !receipt.verified ||
    receipt.projectId !== target.projectId ||
    receipt.databaseURL !== target.databaseURL ||
    receipt.actualHash !== hash(root)
  )
    throw new Error(
      "Cleanup receipt is stale or does not match the import target.",
    )
  const dir = privateDirectory(required("out"))
  const paths: Record<string, any> = {}
  for (const product of review.products)
    paths[`products/${product.id}`] = JSON.parse(JSON.stringify(product))
  for (const name of ["Seasoning", "Coffee", "Shampoo", "Conditioner"])
    if (
      !Object.values(root.categories || {}).some((c: any) => c.name === name)
    ) {
      const id = `cat_${name.toLowerCase()}`
      paths[`categories/${id}`] = { id, name }
    }
  // Merge only missing defaults; preserve custom plans and all existing financing snapshots.
  const plans = Array.isArray(root.settings?.repaymentPlans)
    ? [...root.settings.repaymentPlans]
    : [...DEFAULT_REPAYMENT_PLANS]
  if (!plans.some((p) => p.durationUnit === "month" && p.durationValue === 3))
    plans.push(DEFAULT_REPAYMENT_PLANS[2])
  paths["settings/repaymentPlans"] = plans
  paths["settings/retailMinimumQuantity"] =
    root.settings?.retailMinimumQuantity ?? 12
  paths["settings/retailMarkupMultiplier"] =
    root.settings?.retailMarkupMultiplier ?? 1.05
  writePrivate(dir, `catalog-${Date.now()}.before.json`, {
    projectId: target.projectId,
    root,
  })
  if (hash((await target.db.ref().get()).val() || {}) !== hash(root))
    throw new Error("Concurrent change detected. Nothing imported.")
  await target.db.ref().update(paths)
  const actual = (await target.db.ref().get()).val() || {}
  const expected = structuredClone(root)
  for (const [path, value] of Object.entries(paths)) {
    const [node, id] = path.split("/")
    expected[node] ??= {}
    expected[node][id] = value
  }
  const verified = hash(actual) === hash(expected)
  writePrivate(dir, `catalog-${Date.now()}.receipt.json`, {
    projectId: target.projectId,
    verified,
    products: review.products.map((p) => ({
      id: p.id,
      sku: p.sku,
      imageUrl: p.imageUrl,
    })),
    sourceHash: hash(rows),
    discrepancies: review.discrepancies,
    sourceReview: rows.map(({ sku, variant, unitDescription, imageSourceUrl, imageLicenseStatus, reviewer }) => ({ sku, variant, unitDescription, imageSourceUrl, imageLicenseStatus, reviewer })),
    expectedHash: hash(expected),
    actualHash: hash(actual),
  })
  if (!verified)
    throw new Error(
      "Catalog verification failed. Keep maintenance enabled and review the saved backup.",
    )
  console.log(
    JSON.stringify({ verified: true, imported: review.products.length }),
  )
})
