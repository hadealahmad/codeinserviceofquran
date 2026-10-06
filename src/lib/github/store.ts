import { saveProjectToDb, saveUsersToDb } from "@/lib/db"
import { PROJECTS } from "@/lib/projects"
import type { GhUserProfile, ProjectData } from "./types"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type SyncResult = {
  success: boolean
  synced: number
  errors: string[]
}

let inFlight: Promise<SyncResult> | null = null

/**
 * Synchronize all tracked projects. Concurrent callers (scheduler, refresh
 * API, CLI) share the same in-flight run so overlapping triggers cannot
 * multiply GitHub API usage against the rate limit.
 */
export function syncAllProjects(
  options: { force?: boolean } = {}
): Promise<SyncResult> {
  if (inFlight) return inFlight
  inFlight = runSyncAllProjects(options).finally(() => {
    inFlight = null
  })
  return inFlight
}

async function runSyncAllProjects(options: { force?: boolean } = {}): Promise<SyncResult> {
  const { loadProject } = await import("./loader")
  const { getUserProfile } = await import("./api")
  const { isBotUser } = await import("@/lib/contributors-utils")

  const errors: string[] = []
  let synced = 0
  const allProjectData: ProjectData[] = []

  for (const project of PROJECTS) {
    const id = `${project.owner}/${project.repo}`
    try {
      // Sync open issues and pull requests
      const data = await loadProject(project, {
        state: "open",
        force: options.force ?? false,
        skipDb: true,
      })
      const saved = await saveProjectToDb(id, data)
      if (saved) {
        synced++
        allProjectData.push(data)
      }

      // Sync closed issues for fast viewing
      try {
        const closedData = await loadProject(project, {
          state: "closed",
          force: options.force ?? false,
          skipDb: true,
        })
        await saveProjectToDb(`${id}:closed`, closedData)
      } catch (err) {
        console.warn(`[Sync] Warning: Failed to sync closed issues for ${id}:`, err)
      }

      await sleep(150)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Sync] Failed to sync ${id}:`, msg)
      errors.push(`${id}: ${msg}`)
    }
  }

  // Sync contributor user profiles into user_cache table
  try {
    const uniqueLogins = new Set<string>()
    for (const data of allProjectData) {
      const maintainers = new Set(
        (data.maintainers ?? []).map((m) => m.toLowerCase())
      )
      for (const pull of data.pulls ?? []) {
        const login = pull.user?.login
        if (!login || isBotUser(login)) continue
        if (maintainers.has(login.toLowerCase())) continue
        uniqueLogins.add(login)
      }
    }

    if (uniqueLogins.size > 0) {
      const userProfiles: GhUserProfile[] = []
      for (const login of uniqueLogins) {
        try {
          // User profiles are effectively static; always honor their 24h TTL
          // instead of bypassing it on every refresh.
          const profile = await getUserProfile(login, false)
          if (profile) userProfiles.push(profile)
          await sleep(50)
        } catch {
          // Ignore individual user fetch failure
        }
      }
      if (userProfiles.length > 0) {
        await saveUsersToDb(userProfiles)
      }
    }
  } catch (err) {
    console.warn("[Sync] Warning: Failed to sync contributor user profiles:", err)
  }

  return {
    success: errors.length === 0,
    synced,
    errors,
  }
}
