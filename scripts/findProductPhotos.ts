import { readFileSync, writeFileSync } from "node:fs"
import { catalogRows } from "./lib/catalog"
import { main, required } from "./lib/admin"

// Review worksheet: generates exact-match research queries, never fabricates packaging or licensing.
main(async () => {
  const rows = catalogRows(readFileSync(required("csv"), "utf8"))
  const review = rows.map((row) => ({
    sku: row.sku,
    name: row.name,
    variant: row.variant,
    unitDescription: row.unitDescription,
    query: [
      row.name,
      row.variant,
      row.unitDescription,
      "Philippines official product photo",
    ]
      .filter(Boolean)
      .join(" "),
    photoCandidateUrl: "",
    sourcePage: "",
    rights: "needs-permission",
    matchedNameAndSize: false,
    reviewStatus: "pending",
    reviewer: "",
    localPath: "",
    missing: [
      !row.sku && "sku",
      !row.variant && "variant",
      !row.unitDescription && "sale unit",
    ].filter(Boolean),
  }))
  writeFileSync(required("out"), JSON.stringify(review, null, 2), {
    flag: "wx",
  })
  console.log(
    JSON.stringify({
      queriesPrepared: review.length,
      downloaded: 0,
      uploaded: 0,
      next: "Research exact packaging, record rights, then obtain approval before downloading and uploading.",
    }),
  )
})
