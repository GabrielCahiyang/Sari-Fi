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
import { cleanupPreflight, type CleanupManifest } from "./lib/migrationSafety"

main(async () => {
  const manifest = json<CleanupManifest>(required("manifest"))
  const target = adminTarget()
  if (
    manifest.projectId !== target.projectId ||
    manifest.databaseURL !== target.databaseURL ||
    manifest.mode !== target.mode
  )
    throw new Error("Manifest target does not match the allowlisted target.")
  const root = (await target.db.ref().get()).val() || {}
  const report = cleanupPreflight(root, manifest)
  if (hash(root) !== manifest.snapshotHash)
    report.blockers.push("Manifest snapshot is stale. Repeat inventory/review.")
  const backup = json(manifest.backupFile)
  if (
    hash(backup) !== manifest.backupHash ||
    backup.projectId !== target.projectId ||
    hash(backup.root) !== manifest.snapshotHash
  )
    report.blockers.push("Verified backup does not match this snapshot.")
  const rehearsal = json(manifest.restoreReceiptFile)
  if (
    rehearsal.backupHash !== manifest.backupHash ||
    rehearsal.verified !== true ||
    rehearsal.environment !== "emulator"
  )
    report.blockers.push("Verified emulator restore rehearsal is missing.")
  console.log(
    JSON.stringify(
      {
        dryRun: !flag("execute") || flag("dry-run"),
        deleted: 0,
        manifestHash: hash(manifest),
        ...report,
      },
      null,
      2,
    ),
  )
  if (report.blockers.length)
    throw new Error(
      "Cleanup blocked. Resolve every preflight issue before execution.",
    )
  if (!flag("execute") || flag("dry-run")) return
  executionGate("CLEANUP", target)
  // Maintenance rules must deny browser writes across all nodes during the window.
  const rules = (await target.db.getRulesJSON()) as {
    rules?: Record<string, unknown>
  }
  if (
    rules.rules?.[".write"] !== false ||
    Object.values(rules.rules || {}).some(
      (v: any) =>
        v && typeof v === "object" && JSON.stringify(v).includes('".write"'),
    )
  )
    throw new Error(
      "Cleanup requires a separately applied write freeze: root .write=false and no child write grants.",
    )
  if (hash((await target.db.ref().get()).val() || {}) !== manifest.snapshotHash)
    throw new Error("Concurrent changes detected. Nothing deleted.")
  const dir = privateDirectory(required("out"))
  const manifestHash = hash(manifest)
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  // One explicit leaf-path update keeps dependency chains all-or-nothing. No Auth or media deletion.
  if (
    report.paths.length > 5000 ||
    JSON.stringify(report.paths).length > 500000
  )
    throw new Error(
      "Manifest exceeds one bounded atomic update. Review smaller complete dependency groups.",
    )
  const updates = Object.fromEntries(report.paths.map((path) => [path, null]))
  writePrivate(dir, `cleanup-${stamp}.intent.json`, {
    manifestHash,
    actor: manifest.actor,
    reviewer: manifest.reviewer,
    backupFile: manifest.backupFile,
    paths: report.paths,
  })
  await target.db.ref().update(updates)
  const actual = (await target.db.ref().get()).val() || {}
  const expected = structuredClone(root)
  for (const path of report.paths) {
    const [node, id] = path.split("/")
    delete expected[node][id]
    if (!Object.keys(expected[node]).length) delete expected[node]
  }
  const verified = hash(actual) === hash(expected)
  writePrivate(dir, `cleanup-${stamp}.result.json`, {
    projectId: target.projectId,
    databaseURL: target.databaseURL,
    mode: target.mode,
    manifestHash,
    verified,
    deleted: report.paths.length,
    expectedHash: hash(expected),
    actualHash: hash(actual),
    at: new Date().toISOString(),
  })
  if (!verified)
    throw new Error(
      "Post-cleanup verification failed. Keep maintenance enabled and restore/review the verified backup.",
    )
  console.log(
    JSON.stringify({
      verified,
      deleted: report.paths.length,
      retainedAuthAccounts: true,
      retainedMedia: true,
    }),
  )
})
