"use client"

import { useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Navbar } from "@/components/navbar"
import { ProjectCard } from "@/components/project-card"
import { StatsSection } from "@/components/stats-section"
import { useLanguage } from "@/lib/language-context"
import type { ProjectData } from "@/lib/github/types"
import type { Project } from "@/lib/projects"

export type ProjectSection = {
  project: Project
  data: ProjectData | null
}

const projectId = (section: ProjectSection) =>
  `${section.project.owner}/${section.project.repo}`

export function ProjectsView({
  sections,
  initialSelected = "all",
  rateLimited,
}: {
  sections: ProjectSection[]
  initialSelected?: string
  rateLimited: boolean
}) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState(() =>
    sections.some((section) => projectId(section) === initialSelected)
      ? initialSelected
      : "all"
  )
  const [filterNoComments, setFilterNoComments] = useState(false)
  const [filterUnassigned, setFilterUnassigned] = useState(false)
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({})

  const visible = useMemo(
    () =>
      selected === "all"
        ? sections
        : sections.filter((section) => projectId(section) === selected),
    [sections, selected]
  )

  const projectsOptions = useMemo(
    () =>
      sections.map((section) => ({
        id: projectId(section),
        label: projectId(section),
      })),
    [sections]
  )

  const allCollapsed = useMemo(() => {
    if (visible.length === 0) return true
    return visible.every((s) => (collapsedMap[projectId(s)] ?? true))
  }, [visible, collapsedMap])

  const handleSelect = (value: string) => {
    setSelected(value)
    const url = new URL(window.location.href)
    if (value === "all") url.searchParams.delete("project")
    else url.searchParams.set("project", value)
    window.history.replaceState(null, "", url.pathname + url.search)
  }

  const toggleCollapseAll = () => {
    setCollapsedMap((prev) => {
      const next = { ...prev }
      const shouldCollapse = !allCollapsed
      visible.forEach((s) => {
        next[projectId(s)] = shouldCollapse
      })
      return next
    })
  }

  const toggleCollapse = (id: string) => {
    setCollapsedMap((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? true),
    }))
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Sticky Navbar */}
      <Navbar
        filterNoComments={filterNoComments}
        onToggleNoComments={() => setFilterNoComments((prev) => !prev)}
        filterUnassigned={filterUnassigned}
        onToggleUnassigned={() => setFilterUnassigned((prev) => !prev)}
        selectedProject={selected}
        onSelectProject={handleSelect}
        projects={projectsOptions}
        allCollapsed={allCollapsed}
        onToggleCollapseAll={toggleCollapseAll}
      />

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6">
        {rateLimited && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="size-4" />
            <AlertTitle>{t("تم بلوغ حدّ طلبات GitHub", "GitHub Rate Limit Exceeded")}</AlertTitle>
            <AlertDescription>
              {t(
                "تُعرض البيانات المخزّنة سابقًا، وتحدّث تلقائيًا لاحقًا.",
                "Displaying cached data. It will auto-refresh later."
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Global Summary Stats */}
        <StatsSection sections={visible} />

        {/* Projects Cards List */}
        <div className="mt-6 space-y-6">
          {visible.map((section) => {
            const id = projectId(section)
            const isCollapsed = collapsedMap[id] ?? true

            return section.data ? (
              <ProjectCard
                key={id}
                data={section.data}
                filterNoComments={filterNoComments}
                filterUnassigned={filterUnassigned}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => toggleCollapse(id)}
              />
            ) : (
              <Alert
                key={id}
                className="border-destructive/40 bg-destructive/5 text-destructive"
              >
                <AlertTriangle className="size-4" />
                <AlertTitle>{t(`تعذّر تحميل ${id}`, `Failed to load ${id}`)}</AlertTitle>
                <AlertDescription>
                  {t("أعد المحاولة بعد قليل.", "Please try again later.")}
                </AlertDescription>
              </Alert>
            )
          })}
        </div>
      </div>
    </div>
  )
}
