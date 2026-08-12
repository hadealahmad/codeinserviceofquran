import { loadProject } from "@/lib/github/loader"
import { RateLimitError } from "@/lib/github/errors"
import { sortedProjects } from "@/lib/projects"
import { initSyncScheduler } from "@/lib/sync-scheduler"
import { ProjectsView } from "@/components/projects-view"

export const dynamic = "force-dynamic"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ refresh?: string; project?: string }>
}) {
  initSyncScheduler()
  const { refresh, project } = await searchParams
  const force = refresh !== undefined && refresh !== ""
  const initialSelected = typeof project === "string" ? project : "all"

  const projects = sortedProjects()

  const results = await Promise.allSettled(
    projects.map((project) => loadProject(project, { state: "open", force }))
  )

  const sections = projects.map((project, index) => {
    const result = results[index]
    return {
      project,
      data: result.status === "fulfilled" ? result.value : null,
      error: result.status === "rejected" ? result.reason : null,
    }
  })

  const rateLimited = sections.some(
    (section) => section.error instanceof RateLimitError
  )

  return (
    <ProjectsView
      sections={sections}
      initialSelected={initialSelected}
      rateLimited={rateLimited}
    />
  )
}
