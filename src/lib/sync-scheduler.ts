import { syncAllProjects } from "./github/store"

let schedulerStarted = false

export function initSyncScheduler() {
  if (schedulerStarted) return
  if (process.env.NODE_ENV !== "production") return

  schedulerStarted = true
  console.log("[Scheduler] Production background auto-sync started (every 15m)")

  // Trigger initial sync in background after 10s
  setTimeout(() => {
    syncAllProjects().catch((err) =>
      console.error("[Scheduler] Initial background sync error:", err)
    )
  }, 10_000)

  // Recurring sync every 15 minutes (900,000 ms)
  setInterval(() => {
    syncAllProjects().catch((err) =>
      console.error("[Scheduler] Recurring background sync error:", err)
    )
  }, 15 * 60 * 1000)
}
