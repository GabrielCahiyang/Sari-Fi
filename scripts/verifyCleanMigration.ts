import { adminTarget, hash, json, main, required } from "./lib/admin"
import { counts, references, type CleanupManifest } from "./lib/migrationSafety"

main(async () => {
  const manifest = json<CleanupManifest>(required("manifest"))
  const backup = json(manifest.backupFile)
  if (hash(backup) !== manifest.backupHash)
    throw new Error("Backup checksum mismatch.")
  const target = adminTarget()
  if (
    target.projectId !== manifest.projectId ||
    target.databaseURL !== manifest.databaseURL ||
    target.mode !== manifest.mode
  )
    throw new Error("Wrong verification target.")
  const actual = (await target.db.ref().get()).val() || {}
  const expected = structuredClone(backup.root)
  for (const entry of manifest.entries) {
    const [node, id] = entry.path.split("/")
    if (!expected[node]) continue
    delete expected[node][id]
    if (!Object.keys(expected[node]).length) delete expected[node]
  }
  const orphanReferences = references(actual).filter((ref) => ref.missing)
  const verified =
    hash(actual) === hash(expected) && orphanReferences.length === 0
  console.log(
    JSON.stringify(
      {
        verified,
        counts: counts(actual),
        orphanReferences,
        expectedHash: hash(expected),
        actualHash: hash(actual),
      },
      null,
      2,
    ),
  )
  if (!verified)
    throw new Error(
      "Migration verification failed. Do not import or leave maintenance mode.",
    )
})
