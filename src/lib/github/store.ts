import { saveProjectToDb } from "@/lib/db"
import { PROJECTS } from "@/lib/projects"

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
      const data = await loadProject(project, {
        force: options.force ?? true,
        skipDb: true,
      })
      const saved = await saveProjectToDb(id, data)
      if (saved) synced++
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
