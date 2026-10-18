import dotenv from "dotenv"
import {
  applicationDefault,
  initializeApp,
  getApps,
  deleteApp,
} from "firebase-admin/app"
import { getDatabase } from "firebase-admin/database"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { isAbsolute, join, resolve, parse, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

dotenv.config({ path: ".env", quiet: true })
export function arg(name: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.slice(name.length + 3)
  const index = process.argv.indexOf(`--${name}`)
  return index < 0
    ? undefined
    : process.argv[index + 1]?.startsWith("--")
      ? undefined
      : process.argv[index + 1]
}
export const flag = (name: string) => process.argv.includes(`--${name}`)
export function required(name: string): string {
  const value = arg(name)
  if (!value) throw new Error(`Required --${name}`)
  return value
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`
  return JSON.stringify(value) ?? "null"
}
export const hash = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex")
export const json = <T = any>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8"))
export function privateDirectory(path: string): string {
  if (!isAbsolute(path))
    throw new Error("Backup/report directory must be an absolute private path.")
  const target = resolve(path)
  if (target === parse(target).root) throw new Error("Use a dedicated private output directory, never a filesystem root.")
  const projectRoot = fileURLToPath(new URL("../../", import.meta.url))
  const inside = relative(projectRoot, target)
  if (!inside || (!inside.startsWith(`..${sep}`) && inside !== ".." && !isAbsolute(inside))) {
    throw new Error("Private backups/reports must be outside the application directory so the development server cannot serve them.")
  }
  const marker = join(target, ".sarifi-private-output")
  if (existsSync(target) && readdirSync(target).length && !existsSync(marker)) {
    throw new Error("Output directory already contains unrelated files. Choose a new dedicated backup folder.")
  }
  mkdirSync(target, { recursive: true, mode: 0o700 })
  if (process.platform === "win32") {
    const account = execFileSync("whoami", [], { encoding: "utf8" }).trim()
    execFileSync(
      "icacls",
      [target, "/inheritance:r", "/grant:r", `${account}:(OI)(CI)F`],
      { stdio: "pipe" },
    )
  }
  if (!existsSync(marker)) writeFileSync(marker, "Sari-Fi private administrative output\n", { flag: "wx", mode: 0o600 })
  return target
}
export function writePrivate(
  directory: string,
  name: string,
  value: unknown,
): string {
  if (!/^[\w.-]+$/.test(name)) throw new Error("Unsafe report name")
  const file = join(directory, name)
  writeFileSync(file, JSON.stringify(value, null, 2), {
    mode: 0o600,
    flag: "wx",
  })
  return file
}
export function targetConfig() {
  const projectId = required("project-id")
  const databaseURL = required("database-url")
  const mode = required("mode")
  if (!["staging", "production"].includes(mode))
    throw new Error("Mode must be staging or production.")
  const url = new URL(databaseURL)
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Supply the exact HTTPS database instance origin.")
  const targets = JSON.parse(
    process.env.SARIFI_ADMIN_TARGETS || "[]",
  ) as Array<{
    projectId: string
    databaseURL: string
    mode: string
  }>
  if (
    !targets.some(
      (t) =>
        t.projectId === projectId &&
        new URL(t.databaseURL).origin === url.origin &&
        t.mode === mode,
    )
  )
    throw new Error(
      "Project/database/mode is not explicitly allowlisted in SARIFI_ADMIN_TARGETS.",
    )
  return { projectId, databaseURL: url.origin, mode }
}
export function adminTarget() {
  const target = targetConfig()
  const app = initializeApp({
    credential: applicationDefault(),
    projectId: target.projectId,
    databaseURL: target.databaseURL,
  })
  return { ...target, app, db: getDatabase(app) }
}
export function executionGate(
  action: string,
  target: ReturnType<typeof targetConfig>,
): void {
  if (!flag("execute") || flag("dry-run"))
    throw new Error("Execution requires --execute without --dry-run.")
  const expected = `${action}:${target.projectId}:${target.mode}:${new URL(target.databaseURL).hostname}`
  if (arg("confirm") !== expected)
    throw new Error(`Exact confirmation required: --confirm "${expected}"`)
}
export function main(task: () => Promise<void>): void {
  task()
    .catch((error) => {
      // SDK errors may contain URLs/tokens. Print only our safe validation messages for known errors.
      const message =
        error instanceof Error ? error.message : "Operation failed"
      console.error(
        message
          .replace(/cloudinary:\/\/\S+/g, "[REDACTED]")
          .replace(/https?:\/\/\S*[?]\S+/g, "[URL REDACTED]"),
      )
      process.exitCode = 1
    })
    .finally(async () => {
      await Promise.all(getApps().map((app) => deleteApp(app)))
    })
}
