import dotenv from "dotenv"
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { resolve, relative, sep } from "node:path"
import { configuredCloudinary } from "./lib/cloudinary"
import { canonical, privateDirectory, writePrivate } from "./lib/admin"
import { getUnitPrice } from "../src/utils/productPricing"
import type { Product, AuditEntry } from "../src/types"

dotenv.config({ path: ".env", quiet: true })
const expectedURL = "https://sari-fi-4806b-default-rtdb.asia-southeast1.firebasedatabase.app"
const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL?.replace(/\/$/, "")
if (databaseURL !== expectedURL || process.env.VITE_FIREBASE_PROJECT_ID !== "sari-fi-4806b")
  throw new Error("Demo seed target does not match the owner's configured system")
const execute = process.argv.includes("--execute")
const upload = execute || process.argv.includes("--upload")
const manifest = JSON.parse(readFileSync("data/price-sheet-seed.json", "utf8")) as {
  seed: string; assumptions: string; products: Array<Product & {
    localImagePath: string; imageSha256: string; sourceProductTitle: string; basePrice: number
  }>
}
const receiptPath = "data/price-sheet-photo-receipt.json"
type Photo = { sha256: string; publicId: string; assetId: string; url: string }
const photos: Record<string, Photo> = existsSync(receiptPath)
  ? JSON.parse(readFileSync(receiptPath, "utf8")) : {}
async function readNode(path: string, etag = false) {
  const response = await fetch(`${databaseURL}/${path}.json`, {
    headers: etag ? { "X-Firebase-ETag": "true" } : {}, signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`Database read ${path}: HTTP ${response.status}`)
  return { value: await response.json(), etag: response.headers.get("etag") }
}
function productId(sku: string) { return `sheet_${sku.toLowerCase().replace(/-/g, "_")}` }
async function main() {
  if (manifest.products.length !== 22 || new Set(manifest.products.map(p => p.sku)).size !== 22)
    throw new Error("Expected exactly 22 unique sheet products")
  const [suppliers, categories, before] = await Promise.all([
    readNode("suppliers"), readNode("categories"), readNode("products", true),
  ])
  const categoryNames = new Set(Object.values(categories.value || {}).map((c: any) => c.name))
  for (const p of manifest.products) {
    const supplier = suppliers.value?.[p.supplierId]
    if (!categoryNames.has(p.category) || supplier?.status !== "active" || !supplier.categories?.includes(p.category))
      throw new Error(`Invalid supplier/category mapping: ${p.sku}`)
    if (p.stock !== 60 || p.reorderLevel !== 12 || p.costPrice < 0 || p.costPrice >= p.basePrice!)
      throw new Error(`Invalid demo defaults: ${p.sku}`)
    const path = resolve(p.localImagePath)
    if (relative(resolve("data/product-images"), path).startsWith(`..${sep}`))
      throw new Error("Photo path outside downloaded assets")
    const bytes = readFileSync(path)
    if (bytes.length > 5 * 1024 * 1024 || createHash("sha256").update(bytes).digest("hex") !== p.imageSha256)
      throw new Error(`Photo changed or too large: ${p.sku}`)
    if (getUnitPrice(p, 1) !== p.sellingPrice || getUnitPrice(p, 12) !== p.sellingPrice)
      throw new Error(`Selling price mismatch: ${p.sku}`)
    const conflicts = Object.values(before.value || {}).filter((existing: any) =>
      existing.sku?.toUpperCase() === p.sku && existing.id !== productId(p.sku))
    if (conflicts.length) throw new Error(`Existing SKU conflict: ${p.sku}`)
  }
  console.log(`Validated 22 products against live suppliers/categories; existing catalog: ${Object.keys(before.value || {}).length}`)
  if (!upload) { console.log("Dry run passed. --upload uploads photos; --execute also creates missing products."); return }
  const cloudinary = configuredCloudinary()
  for (const p of manifest.products) {
    if (photos[p.sku]) {
      if (photos[p.sku].sha256 !== p.imageSha256) throw new Error(`Photo receipt differs: ${p.sku}`)
      continue
    }
    const result = await cloudinary.uploader.upload(resolve(p.localImagePath), {
      public_id: `sarifi/price-sheet-demo/${p.sku.toLowerCase()}`,
      resource_type: "image", overwrite: false,
      tags: ["sarifi", "owner-price-sheet-demo"],
      context: { seed: manifest.seed, sku: p.sku, sha256: p.imageSha256 },
    })
    if (result.existing) {
      const existing = await cloudinary.api.resource(result.public_id, { context: true })
      if (existing.context?.custom?.sha256 !== p.imageSha256)
        throw new Error(`Existing Cloudinary asset does not match: ${p.sku}`)
    }
    photos[p.sku] = { sha256: p.imageSha256, publicId: result.public_id, assetId: result.asset_id, url: result.secure_url }
    writeFileSync(receiptPath, JSON.stringify(photos, null, 2) + "\n")
    console.log(`Photo ${Object.keys(photos).length}/22: ${p.name}`)
  }
  if (!execute) { console.log("22 photos uploaded; catalog writes not requested."); return }
  const backupDir = privateDirectory(resolve(process.env.LOCALAPPDATA!, "SariFi", "catalog-seed-backups"))
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  writePrivate(backupDir, `before-${stamp}.json`, {
    seed: manifest.seed, databaseURL, products: before.value,
    suppliers: suppliers.value, categories: categories.value,
  })
  const products: Product[] = manifest.products.map(p => ({
    id: productId(p.sku), name: p.name, sku: p.sku, category: p.category,
    supplierId: p.supplierId, sellingPrice: p.sellingPrice,
    costPrice: p.costPrice, stock: p.stock, reorderLevel: p.reorderLevel,
    status: "active", imageUrl: photos[p.sku].url,
  }))
  let created: string[] = []
  let committed = false
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readNode("products", true)
    if (!current.etag) throw new Error("Missing Firebase concurrency token")
    const merged: Record<string, Product> = current.value || {}
    created = []
    for (const p of products) {
      const sameSku = Object.values(merged).find(e => e.sku?.toUpperCase() === p.sku && e.id !== p.id)
      if (sameSku) throw new Error(`Concurrent SKU conflict: ${p.sku}`)
      if (merged[p.id]) {
        // Never reset existing stock, edited prices, or images on a repeat run.
        if (merged[p.id].sku !== p.sku) throw new Error(`Product ID collision: ${p.sku}`)
        continue
      }
      merged[p.id] = p
      created.push(p.id)
    }
    if (!created.length) { committed = true; break }
    writePrivate(backupDir, `intent-${stamp}-${attempt}.json`, {created, products: products.filter(p => created.includes(p.id))})
    const response = await fetch(`${databaseURL}/products.json`, {
      method: "PUT", headers: { "content-type": "application/json", "if-match": current.etag },
      body: JSON.stringify(merged), signal: AbortSignal.timeout(30000),
    })
    if (response.status === 412) continue
    if (!response.ok) throw new Error(`Catalog write: HTTP ${response.status}`)
    committed = true
    break
  }
  if (!committed) throw new Error("Concurrent catalog changes prevented creation; safe to rerun")
  for (const p of products) {
    if (!created.includes(p.id)) continue
    const entry: AuditEntry = {
      id: `audit_seed_${p.id}`, timestamp: new Date().toISOString(),
      actorId: null, actorName: "Owner-requested demo seed", actorRole: "system",
      category: "inventory", action: "product.create",
      summary: `Added ${p.name} (${p.sku}) from owner price sheet; stock and supplier cost are demo estimates.`,
      targetType: "product", targetId: p.id, targetLabel: p.sku, amount: p.sellingPrice,
    }
    const response = await fetch(`${databaseURL}/auditLog/${entry.id}.json`, {
      method: "PUT", headers: { "content-type": "application/json", "if-match": "null_etag" },
      body: JSON.stringify(entry), signal: AbortSignal.timeout(30000),
    })
    if (!response.ok && response.status !== 412) throw new Error(`Audit write: HTTP ${response.status}`)
  }
  const after = (await readNode("products")).value as Record<string, Product>
  for (const p of products) {
    if (!after?.[p.id] || after[p.id].sku !== p.sku) throw new Error(`Missing seeded product: ${p.sku}`)
    if (created.includes(p.id) && canonical(after[p.id]) !== canonical(p))
      throw new Error(`Product changed during verification: ${p.sku}`)
    const image = await fetch(photos[p.sku].url, { method: "HEAD", signal: AbortSignal.timeout(30000) })
    if (!image.ok || !image.headers.get("content-type")?.startsWith("image/"))
      throw new Error(`Photo unavailable: ${p.sku}`)
  }
  const report = { seed: manifest.seed, verifiedAt: new Date().toISOString(), createdCount: created.length,
    verifiedCount: products.length, totalCatalogCount: Object.keys(after).length,
    assumptions: manifest.assumptions, products: products.map(p => ({id:p.id,sku:p.sku,name:p.name,imageUrl:p.imageUrl})),
  }
  writePrivate(backupDir, `result-${stamp}.json`, report)
  writeFileSync("data/price-sheet-seed-result.json", JSON.stringify(report, null, 2) + "\n")
  console.log(`Verified ${products.length}/22 products and live Cloudinary images; created ${created.length}.`)
}
main().catch(error => {
  console.error(error instanceof Error ? error.message.replace(/https?:\/\/\S+[?]\S+/g, "[URL]") : "Seed failed")
  process.exitCode = 1
})
