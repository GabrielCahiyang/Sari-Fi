import { configuredCloudinary } from "./lib/cloudinary"
import { flag, main } from "./lib/admin"

main(async () => {
  const cloudinary = configuredCloudinary()
  const name = "sarifi_demo_products"
  const config = {
    name,
    unsigned: true,
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    asset_folder: "sarifi/demo-products",
    disallow_public_id: true,
    overwrite: false,
  }
  let existing: any
  try {
    existing = await cloudinary.api.upload_preset(name)
  } catch (error: any) {
    if (error.http_code !== 404 && error.error?.http_code !== 404)
      throw new Error(
        "Cloudinary preset lookup failed. Check the private account configuration.",
      )
  }
  if (existing) {
    if (
      !existing.unsigned ||
      !existing.settings?.disallow_public_id ||
      existing.settings.allowed_formats?.some(
        (f: string) => !config.allowed_formats.includes(f),
      ) ||
      !existing.settings.allowed_formats?.length
    )
      throw new Error(
        "Existing preset needs manual review; no settings were overwritten.",
      )
    console.log(JSON.stringify({ configured: true, name, created: false }))
    return
  }
  if (!flag("execute") || flag("dry-run")) {
    console.log(JSON.stringify({ dryRun: true, wouldCreate: config }))
    return
  }
  await cloudinary.api.create_upload_preset(config)
  const verified = await cloudinary.api.upload_preset(name)
  if (!verified.unsigned || !verified.settings?.disallow_public_id)
    throw new Error(
      "Preset created but verification failed. Inspect Cloudinary settings.",
    )
  console.log(
    JSON.stringify({
      configured: true,
      created: true,
      name,
      uploadedAssets: 0,
    }),
  )
})
