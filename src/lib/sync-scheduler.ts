import { syncAllProjects } from "./github/store"

let schedulerStarted = false

export function initSyncScheduler() {
  if (schedulerStarted) return
  if (process.env.NODE_ENV !== "production") return

  schedulerStarted = true
  console.log("[Scheduler] Production background auto-sync started (every 30m)")

  // Trigger initial sync in background after 10s. Non-forced, so it reuses
  // cached GitHub responses and only refreshes what has expired.
  setTimeout(() => {
    syncAllProjects({ force: false }).catch((err) =>
      console.error("[Scheduler] Initial background sync error:", err)
    )
  }, 10_000)

  // Recurring non-forced sync every 30 minutes (1,800,000 ms)
  setInterval(
    () => {
      syncAllProjects({ force: false }).catch((err) =>
        console.error("[Scheduler] Recurring background sync error:", err)
      )
    },
    30 * 60 * 1000
  )
}
