import { getAuth } from "firebase-admin/auth"
import { getStorage } from "firebase-admin/storage"
import { v2 as cloudinary } from "cloudinary"
import {
  adminTarget,
  arg,
  flag,
  hash,
  json,
  main,
  privateDirectory,
  required,
  writePrivate,
} from "./lib/admin"
import { counts, references } from "./lib/migrationSafety"
import { configuredCloudinary } from "./lib/cloudinary"

main(async () => {
  if (arg("snapshot")) {
    const root = json(required("snapshot"))
    console.log(
      JSON.stringify(
        {
          offline: true,
          counts: counts(root),
          references: references(root),
          snapshotHash: hash(root),
        },
        null,
        2,
      ),
    )
    return
  }
  const target = adminTarget()
  const root = (await target.db.ref().get()).val() || {}
  const report = {
    projectId: target.projectId,
    mode: target.mode,
    counts: counts(root),
    references: references(root),
    snapshotHash: hash(root),
    statuses: Object.fromEntries(
      ["orders", "financing", "payments", "restockOrders"].map((node) => [
        node,
        Object.values(root[node] || {}).reduce((acc: any, row: any) => {
          acc[row.status || "unknown"] = (acc[row.status || "unknown"] || 0) + 1
          return acc
        }, {}),
      ]),
    ),
    candidateIds: Object.entries(root).flatMap(([node, rows]) =>
      Object.keys(rows && typeof rows === "object" ? rows : {})
        .filter((id) => /tour|demo|test/i.test(id))
        .map((id) => `${node}/${id}`),
    ),
    warning:
      "ID patterns are candidates for owner review, never automatic deletion approval.",
  }
  console.log(JSON.stringify(report, null, 2))
  if (flag("backup")) {
    const dir = privateDirectory(required("out"))
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const rules = await target.db.getRulesJSON()
    const authMetadata = []
    let page: string | undefined
    do {
      const batch = await getAuth(target.app).listUsers(1000, page)
      authMetadata.push(
        ...batch.users.map((user) => ({
          uid: user.uid,
          disabled: user.disabled,
          metadata: user.metadata,
          providerIds: user.providerData.map((p) => p.providerId),
        })),
      )
      page = batch.pageToken
    } while (page)
    const legacyStorage = []
    if (
      !process.env.FIREBASE_STORAGE_BUCKET &&
      !flag("confirm-no-legacy-storage")
    )
      throw new Error(
        "Set FIREBASE_STORAGE_BUCKET or verify --confirm-no-legacy-storage before backup.",
      )
    if (process.env.FIREBASE_STORAGE_BUCKET) {
      const [files] = await getStorage(target.app)
        .bucket(process.env.FIREBASE_STORAGE_BUCKET)
        .getFiles({ prefix: "products/" })
      for (const file of files) {
        const [meta] = await file.getMetadata()
        legacyStorage.push({
          name: file.name,
          size: meta.size,
          generation: meta.generation,
          contentType: meta.contentType,
        })
      }
    }
    if (!process.env.CLOUDINARY_URL)
      throw new Error(
        "Private Cloudinary configuration is needed for a complete media inventory.",
      )
    configuredCloudinary()
    const media = []
    let cursor: string | undefined
    do {
      const result = await cloudinary.api.resources({
        type: "upload",
        resource_type: "image",
        max_results: 500,
        next_cursor: cursor,
      })
      media.push(
        ...result.resources.map((a: any) => ({
          public_id: a.public_id,
          asset_id: a.asset_id,
          secure_url: a.secure_url,
        })),
      )
      cursor = result.next_cursor
    } while (cursor)
    const backup = {
      projectId: target.projectId,
      databaseURL: target.databaseURL,
      mode: target.mode,
      createdAt: new Date().toISOString(),
      root,
      rules,
      authMetadata,
      legacyStorage,
      cloudinary: media,
    }
    const backupFile = writePrivate(dir, `backup-${stamp}.json`, backup)
    writePrivate(dir, `backup-${stamp}.receipt.json`, {
      backupFile,
      backupHash: hash(backup),
      rootHash: hash(root),
      counts: report.counts,
      complete: true,
    })
    writePrivate(dir, `audit-${stamp}.json`, report)
    console.log(
      JSON.stringify({
        backupFile,
        backupHash: hash(backup),
        note: "Rehearse restore on an isolated emulator before preparing a cleanup manifest.",
      }),
    )
  }
})
