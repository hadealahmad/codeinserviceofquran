import type { Metadata } from "next"
import { extractContributors } from "@/lib/contributors"
import { loadProject } from "@/lib/github/loader"
import { sortedProjects } from "@/lib/projects"
import { initSyncScheduler } from "@/lib/sync-scheduler"
import { ContributorsView } from "@/components/contributors-view"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "المساهمون | كود يخدم القرآن",
  description:
    "لوحة شرف وإحصائيات المساهمين في مشاريع مبادرة كود يخدم القرآن ومتابعة طلبات السحب",
}

export default async function ContributorsPage({
  searchParams,
}: {
  searchParams: Promise<{ refresh?: string }>
}) {
  initSyncScheduler()
  const { refresh } = await searchParams
  const force = refresh !== undefined && refresh !== ""

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

  const contributors = await extractContributors(sections, { force })

  return <ContributorsView contributors={contributors} />
}
