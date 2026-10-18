import { describe, expect, it } from "vitest"
import { hash, privateDirectory } from "./admin"
import { cleanupPreflight, type CleanupManifest } from "./migrationSafety"

function fixture() {
  const root = {
    maintenance: { enabled: true },
    products: { demo: { stock: 2 } },
    settings: { keep: true },
  }
  const manifest: CleanupManifest = {
    projectId: "demo",
    databaseURL: "https://demo.firebaseio.com",
    mode: "staging",
    snapshotHash: hash(root),
    actor: "operator",
    reviewer: "owner",
    ownerApproved: true,
    retentionApproved: false,
    backupFile: "private-backup.json",
    backupHash: "hash",
    restoreReceiptFile: "receipt.json",
    entries: [
      {
        path: "products/demo",
        classification: "demo",
        reason: "approved test product",
        recordHash: hash(root.products.demo),
        approved: true,
      },
    ],
  }
  return { root, manifest }
}
describe("cleanup safeguards", () => {
  it("rejects application directories before writing private backups", () => {
    expect(() => privateDirectory(process.cwd())).toThrow("outside the application")
  })
  it("reports unsafe prototype paths without traversing them", () => {
    const { root, manifest } = fixture()
    manifest.entries[0].path = "constructor/prototype"
    expect(cleanupPreflight(root, manifest).blockers).toContain("Unsafe path: constructor/prototype")
    expect(Object.prototype.hasOwnProperty).toBeTypeOf("function")
  })
  it("previews counts without modifying its input", () => {
    const { root, manifest } = fixture()
    const before = hash(root)
    const result = cleanupPreflight(root, manifest)
    expect(result.blockers).toEqual([])
    expect(result.before.products).toBe(1)
    expect(result.after.products).toBe(0)
    expect(hash(root)).toBe(before)
  })
  it.each([
    "unsafe-path",
    "changed",
    "surviving-reference",
    "no-freeze",
    "no-review",
    "production-finance",
  ] as const)("fails closed on %s", (scenario) => {
    const { root, manifest } = fixture()
    const data: any = root
    if (scenario === "unsafe-path") manifest.entries[0].path = "products"
    if (scenario === "changed") data.products.demo.stock = 3
    if (scenario === "surviving-reference")
      data.orders = { real: { items: [{ productId: "demo" }] } }
    if (scenario === "no-freeze") data.maintenance.enabled = false
    if (scenario === "no-review") manifest.reviewer = manifest.actor
    if (scenario === "production-finance") {
      manifest.mode = "production"
      manifest.entries[0].path = "financing/demo"
    }
    expect(cleanupPreflight(data, manifest).blockers.length).toBeGreaterThan(0)
  })
})
