import { hash } from "./admin"

export interface CleanupManifest {
  projectId: string
  databaseURL: string
  mode: "staging" | "production"
  snapshotHash: string
  actor: string
  reviewer: string
  ownerApproved: boolean
  retentionApproved: boolean
  backupFile: string
  backupHash: string
  restoreReceiptFile: string
  entries: Array<{
    path: string
    classification: "demo" | "old-approved"
    reason: string
    recordHash: string
    approved: boolean
  }>
}
const collections = [
  "payments",
  "financing",
  "orders",
  "restockOrders",
  "products",
  "customers",
  "suppliers",
  "employees",
  "users",
  "auditLog",
]
export function counts(root: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(root).map(([node, value]) => [
      node,
      value && typeof value === "object" ? Object.keys(value).length : 1,
    ]),
  )
}
interface RecordReference {
  from: string
  to: string
  missing: boolean
}
export function references(
  root: Record<string, any>,
): RecordReference[] {
  const refs: RecordReference[] = []
  const add = (from: string, collection: string, id: unknown) => {
    if (typeof id === "string" && id)
      refs.push({
        from,
        to: `${collection}/${id}`,
        missing: !root[collection]?.[id],
      })
  }
  for (const collection of [
    "orders",
    "financing",
    "payments",
    "restockOrders",
    "products",
    "users",
  ]) {
    for (const [id, value] of Object.entries(
      root[collection] || {},
    ) as Array<[string, any]>) {
      const from = `${collection}/${id}`
      add(from, "customers", value.customerId)
      add(from, "suppliers", value.supplierId)
      add(from, "orders", value.orderId)
      add(from, "financing", value.financingId)
      add(from, "employees", value.employeeId)
      for (const item of value.items || [])
        add(from, "products", item.productId)
    }
  }
  return refs
}
export function cleanupPreflight(
  root: Record<string, any>,
  manifest: CleanupManifest,
) {
  const blockers: string[] = []
  const paths = new Set(manifest.entries.map((e) => e.path))
  if (paths.size !== manifest.entries.length || !paths.size)
    blockers.push("Manifest must contain distinct exact record paths.")
  if (
    !manifest.ownerApproved ||
    !manifest.actor ||
    !manifest.reviewer ||
    manifest.actor === manifest.reviewer
  )
    blockers.push("Owner approval and a separate reviewer are required.")
  if (manifest.mode === "production" && !manifest.retentionApproved)
    blockers.push("Production requires retention approval.")
  if (!root.maintenance?.enabled)
    blockers.push("Verified maintenance/write freeze is required.")
  for (const entry of manifest.entries) {
    const match = /^([A-Za-z]+)\/([A-Za-z0-9_-]+)$/.exec(entry.path)
    if (
      !match ||
      !collections.includes(match[1]) ||
      ["__proto__", "constructor", "prototype"].includes(match[2])
    ) {
      blockers.push(`Unsafe path: ${entry.path}`)
      continue
    }
    const [collection, id] = [match[1], match[2]]
    const value = root[collection]?.[id]
    if (
      !entry.approved ||
      !entry.reason ||
      !["demo", "old-approved"].includes(entry.classification)
    )
      blockers.push(`Unapproved record: ${entry.path}`)
    if (!value || hash(value) !== entry.recordHash)
      blockers.push(`Missing or changed record: ${entry.path}`)
    if (
      value?.role === "admin" ||
      ["admin", "administrator"].includes(id.toLowerCase())
    )
      blockers.push(`Admin identity must survive: ${entry.path}`)
    if (collection === "customers" && value?.usedCredit > 0)
      blockers.push(`Reconcile customer credit before cleanup: ${entry.path}`)
    if (
      collection === "orders" &&
      (value?.stockReservationStatus === "reserved" ||
        ["approved", "processing", "ready", "out_for_delivery"].includes(
          value?.status,
        ))
    )
      blockers.push(`Unreconciled stock/fulfillment: ${entry.path}`)
    if (
      manifest.mode === "production" &&
      (entry.classification !== "demo" ||
        ["financing", "payments", "customers", "users", "employees"].includes(
          collection,
        ))
    )
      blockers.push(
        `Production finance/identity records are retained: ${entry.path}`,
      )
    if (
      collection === "financing" &&
      ["active", "overdue", "approved"].includes(value?.status)
    )
      blockers.push(
        `Outstanding financing must be reconciled first: ${entry.path}`,
      )
    if (collection === "restockOrders" && value?.status === "ordered")
      blockers.push(`Open procurement must be reconciled first: ${entry.path}`)
  }
  for (const ref of references(root))
    if (!paths.has(ref.from) && paths.has(ref.to))
      blockers.push(`Surviving reference: ${ref.from} -> ${ref.to}`)
  for (const [id, p] of Object.entries(
    root.products || {},
  ) as Array<[string, any]>)
    if (
      !paths.has(`products/${id}`) &&
      (!Number.isSafeInteger(p.stock) || p.stock < 0)
    )
      blockers.push(`Invalid surviving stock: products/${id}`)
  const remaining = structuredClone(root)
  for (const path of paths) {
    if (!/^([A-Za-z]+)\/([A-Za-z0-9_-]+)$/.test(path)) continue
    const [node, id] = path.split("/")
    if (!collections.includes(node) || ["__proto__", "constructor", "prototype"].includes(id)) continue
    if (remaining[node]) delete remaining[node][id]
  }
  for (const [id, customer] of Object.entries(remaining.customers || {}) as Array<[string, any]>) {
    const expectedCredit = Object.values(remaining.financing || {})
      .filter((loan: any) => loan.customerId === id && ["active", "overdue", "approved"].includes(loan.status))
      .reduce((sum: number, loan: any) => sum + Math.round(Math.max(0, loan.principal - (loan.paidPrincipal || 0)) * 100), 0)
    if (!Number.isFinite(customer.usedCredit) || customer.usedCredit < 0 || Math.round(customer.usedCredit * 100) !== expectedCredit) blockers.push(`Reconcile surviving used credit: customers/${id}`)
  }
  const orphanReferences = references(remaining).filter((r) => r.missing)
  if (orphanReferences.length) blockers.push("Resolve surviving orphan references before cleanup.")
  return {
    blockers,
    paths: Array.from(paths),
    before: counts(root),
    after: counts(remaining),
    orphanReferences,
  }
}
