import { existsSync, readFileSync, statSync } from "node:fs"
import { extname, resolve } from "node:path"
import { configuredCloudinary } from "./lib/cloudinary"
import {
  flag,
  hash,
  json,
  main,
  privateDirectory,
  required,
  writePrivate,
} from "./lib/admin"

interface Photo {
  sku: string
  name: string
  variant: string
  unitDescription: string
  localPath: string
  sourcePage: string
  rights: string
  matchedNameAndSize: boolean
  reviewStatus: string
  reviewer: string
}
main(async () => {
  const rows = json<Photo[]>(required("manifest"))
  const errors: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (!/^[A-Za-z0-9_-]+$/.test(row.sku) || seen.has(row.sku))
      errors.push("Invalid/duplicate SKU")
    seen.add(row.sku)
    if (
      row.reviewStatus !== "approved" ||
      !row.reviewer ||
      !row.matchedNameAndSize ||
      !row.name ||
      !row.variant ||
      !row.unitDescription ||
      !row.sourcePage ||
      !["client-owned", "licensed", "manufacturer-approved"].includes(
        row.rights,
      )
    )
      errors.push(`${row.sku}: exact packaging/rights/review incomplete`)
    if (
      !existsSync(row.localPath) ||
      ![".jpg", ".jpeg", ".png", ".webp"].includes(
        extname(row.localPath).toLowerCase(),
      )
    ) {
      errors.push(`${row.sku}: approved local image missing/unsupported`)
      continue
    }
    if (
      !statSync(row.localPath).size ||
      statSync(row.localPath).size > 5 * 1024 * 1024
    )
      errors.push(`${row.sku}: image must be at most 5 MB`)
  }
  console.log(
    JSON.stringify({
      dryRun: !flag("execute") || flag("dry-run"),
      files: rows.length,
      errors,
      uploaded: 0,
    }),
  )
  if (errors.length || !rows.length)
    throw new Error("Photo manifest failed review. No uploads performed.")
  if (!flag("execute") || flag("dry-run")) return
  if (!flag("confirm-demo"))
    throw new Error(
      "Reviewed demo photo upload requires --execute --confirm-demo.",
    )
  const dir = privateDirectory(required("out"))
  const cloudinary = configuredCloudinary()
  // Resume safely using deterministic public IDs and overwrite=false. Existing assets require review.
  for (const row of rows) {
    const digest = hash({
      sku: row.sku,
      file: readFileSync(row.localPath).toString("base64"),
    })
    const public_id = `${row.sku.toLowerCase()}-${digest.slice(0, 12)}`
    const result = await cloudinary.uploader.upload(resolve(row.localPath), {
      folder: "sarifi/demo-products",
      public_id,
      overwrite: false,
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    })
    writePrivate(dir, `${row.sku}-${Date.now()}.upload.json`, {
      sku: row.sku,
      fileHash: digest,
      secure_url: result.secure_url,
      public_id: result.public_id,
      asset_id: result.asset_id,
      sourcePage: row.sourcePage,
      rights: row.rights,
      reviewer: row.reviewer,
    })
  }
  console.log(
    JSON.stringify({
      uploaded: rows.length,
      note: "Copy verified secure_url values into the reviewed catalog CSV; no database writes were performed.",
    }),
  )
})
