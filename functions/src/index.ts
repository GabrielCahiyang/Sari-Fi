import { initializeApp } from "firebase-admin/app"
import { getDatabase } from "firebase-admin/database"
import { HttpsError, onCall } from "firebase-functions/v2/https"
import {
  planReservationPaths,
  type ReservationBundle,
} from "../../src/domain/checkoutReservation"

initializeApp()

/** Roles/customerId must be server-issued Firebase custom claims, never writable user profiles. */
export const reserveCheckout = onCall(
  { region: "asia-southeast1", maxInstances: 5 },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Sign in before checkout.")
    const bundles = request.data?.bundles as ReservationBundle[]
    if (
      !Array.isArray(bundles) ||
      !bundles.length ||
      JSON.stringify(bundles).length > 500000
    )
      throw new HttpsError("invalid-argument", "Invalid checkout.")
    const claims = request.auth.token
    const isStaff = ["employee", "supervisor", "admin"].includes(
      String(claims.role),
    )
    if (
      !isStaff &&
      (claims.role !== "customer" ||
        !claims.customerId ||
        bundles.some((b) => b.order?.customerId !== claims.customerId))
    ) {
      throw new HttpsError(
        "permission-denied",
        "This checkout does not belong to your account.",
      )
    }
    let failure = ""
    // The whole checkout and stock changes share one server-side compare-and-retry transaction.
    // Root contention is acceptable for this small demo; partition/reserve on a dedicated ledger before scaling.
    const result = await getDatabase()
      .ref()
      .transaction((current) => {
        failure = ""
        if (!current) {
          failure = "The store database is empty."
          return current
        } // Retry if the initial cache was empty.
        try {
          const paths = planReservationPaths(bundles, current)
          for (const [path, value] of Object.entries(paths)) {
            const parts = path.split("/")
            let target = current
            for (const key of parts.slice(0, -1)) target = target[key] ??= {}
            target[parts.at(-1)!] = JSON.parse(JSON.stringify(value))
          }
          return current
        } catch (error) {
          failure =
            error instanceof Error
              ? error.message
              : "Checkout validation failed."
          return
        }
      })
    if (failure || !result.committed)
      throw new HttpsError(
        "failed-precondition",
        failure || "Checkout could not be committed. Retry after refreshing.",
      )
    return { orderIds: bundles.map((b) => b.order.id) }
  },
)
