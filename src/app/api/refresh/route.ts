import { NextResponse } from "next/server"
import { syncAllProjects } from "@/lib/github/store"

export const dynamic = "force-dynamic"

let isSyncing = false
let lastSyncStartedAt: number | null = null

async function handleRefresh(request: Request) {
  const url = new URL(request.url)
  const wait = url.searchParams.get("wait") === "true"

  if (isSyncing) {
    return NextResponse.json(
      {
        message: "Sync is already in progress in the background",
        status: "in_progress",
        startedAt: lastSyncStartedAt ? new Date(lastSyncStartedAt).toISOString() : null,
      },
      { status: 200 }
    )
  }

  isSyncing = true
  lastSyncStartedAt = Date.now()

  const syncPromise = syncAllProjects({ force: true })
    .then((result) => {
      console.log(`[Refresh API] Background sync completed: ${result.synced} synced, ${result.errors.length} errors`)
      return result
    })
    .catch((err) => {
      console.error("[Refresh API] Background sync error:", err)
      return { success: false, synced: 0, errors: [String(err)] }
    })
    .finally(() => {
      isSyncing = false
    })

  if (wait) {
    const result = await syncPromise
    return NextResponse.json(result)
  }

  // Return instant 202 Accepted response in ~5ms
  return NextResponse.json(
    {
      message: "Sync started in background",
      status: "accepted",
      timestamp: new Date().toISOString(),
    },
    { status: 202 }
  )
}

export async function GET(request: Request) {
  return handleRefresh(request)
}

export async function POST(request: Request) {
  return handleRefresh(request)
}

