import { saveProjectToDb } from "@/lib/db"
import { PROJECTS } from "@/lib/projects"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function syncAllProjects(options: { force?: boolean } = {}): Promise<{
  success: boolean
  synced: number
  errors: string[]
}> {
  const { loadProject } = await import("./loader")
  const errors: string[] = []
  let synced = 0

  for (const project of PROJECTS) {
    const id = `${project.owner}/${project.repo}`
    try {
      // Sync open issues
      const data = await loadProject(project, {
        state: "open",
        force: options.force ?? true,
        skipDb: true,
      })
      const saved = await saveProjectToDb(id, data)
      if (saved) synced++

      // Sync closed issues for fast viewing
      try {
        const closedData = await loadProject(project, {
          state: "closed",
          force: options.force ?? true,
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

  return {
    success: errors.length === 0,
    synced,
    errors,
  }
}

