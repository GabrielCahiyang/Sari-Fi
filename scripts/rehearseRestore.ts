import { readFileSync } from "node:fs"
import { initializeApp } from "firebase-admin/app"
import { getDatabase } from "firebase-admin/database"
import {
  flag,
  hash,
  json,
  main,
  privateDirectory,
  required,
  writePrivate,
} from "./lib/admin"

main(async () => {
  const backupFile = required("backup")
  const backup = json(backupFile)
  const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST
  if (!host || !/^(127\.0\.0\.1|localhost):\d+$/.test(host))
    throw new Error(
      "Restore rehearsal requires a loopback-only FIREBASE_DATABASE_EMULATOR_HOST.",
    )
  const projectId = required("emulator-project")
  if (!/^demo-sarifi-restore-[a-z0-9-]+$/.test(projectId))
    throw new Error("Use a dedicated demo-sarifi-restore-* emulator project.")
  const app = initializeApp({
    projectId,
    databaseURL: `http://${host}?ns=${projectId}`,
  })
  const db = getDatabase(app)
  if (!flag("execute")) {
    console.log(
      JSON.stringify({
        dryRun: true,
        backupHash: hash(backup),
        environment: "emulator",
        projectId,
      }),
    )
    return
  }
  if ((await db.ref().get()).exists())
    throw new Error(
      "Restore rehearsal requires an empty, isolated emulator namespace.",
    )
  await db.ref().set(backup.root)
  const verified = hash((await db.ref().get()).val()) === hash(backup.root)
  writePrivate(
    privateDirectory(required("out")),
    `restore-${Date.now()}.json`,
    { backupHash: hash(backup), verified, environment: "emulator", projectId },
  )
  if (!verified) throw new Error("Restore checksum mismatch.")
  console.log(JSON.stringify({ verified, environment: "emulator" }))
})
