"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { AlertTriangle, MessageSquareOff, UserX } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProjectCard } from "@/components/project-card"
import { RefreshButton } from "@/components/refresh-button"
import { StatsSection } from "@/components/stats-section"
import { cn } from "@/lib/utils"
import type { ProjectData } from "@/lib/github/types"
import type { Project } from "@/lib/projects"

export type ProjectSection = {
  project: Project
  data: ProjectData | null
}

const projectId = (section: ProjectSection) =>
  `${section.project.owner}/${section.project.repo}`

function FilterToggle({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  )
}

export function ProjectsView({
  sections,
  initialSelected = "all",
  rateLimited,
}: {
  sections: ProjectSection[]
  initialSelected?: string
  rateLimited: boolean
}) {
  const [selected, setSelected] = useState(() =>
    sections.some((section) => projectId(section) === initialSelected)
      ? initialSelected
      : "all"
  )
  const [filterNoComments, setFilterNoComments] = useState(false)
  const [filterUnassigned, setFilterUnassigned] = useState(false)

  const visible = useMemo(
    () =>
      selected === "all"
        ? sections
        : sections.filter((section) => projectId(section) === selected),
    [sections, selected]
  )

  const handleSelect = (value: string) => {
    setSelected(value)
    const url = new URL(window.location.href)
    if (value === "all") url.searchParams.delete("project")
    else url.searchParams.set("project", value)
    window.history.replaceState(null, "", url.pathname + url.search)
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h1 className="text-2xl font-bold tracking-tight">متتبّع القضايا</h1>
        <div className="flex flex-wrap items-center gap-2">
          <FilterToggle
            label="بدون تعليقات"
            active={filterNoComments}
            onClick={() => setFilterNoComments((value) => !value)}
            icon={<MessageSquareOff className="size-3.5" />}
          />
          <FilterToggle
            label="غير مسند"
            active={filterUnassigned}
            onClick={() => setFilterUnassigned((value) => !value)}
            icon={<UserX className="size-3.5" />}
          />
          <Select
            value={selected}
            onValueChange={(value) => handleSelect(value ?? "all")}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                كل المشاريع ({sections.length})
              </SelectItem>
              {sections.map((section) => (
                <SelectItem
                  key={projectId(section)}
                  value={projectId(section)}
                >
                  {projectId(section)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RefreshButton />
        </div>
      </header>

      {rateLimited && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="size-4" />
          <AlertTitle>تم بلوغ حدّ طلبات GitHub</AlertTitle>
          <AlertDescription>
            تُعرض البيانات المخزّنة سابقًا، وتحدّث تلقائيًا لاحقًا.
          </AlertDescription>
        </Alert>
      )}

      <StatsSection sections={visible} />

      <div className="mt-6 space-y-6">
        {visible.map((section) =>
          section.data ? (
            <ProjectCard
              key={projectId(section)}
              data={section.data}
              filterNoComments={filterNoComments}
              filterUnassigned={filterUnassigned}
            />
          ) : (
            <Alert
              key={projectId(section)}
              className="border-destructive/40 bg-destructive/5 text-destructive"
            >
              <AlertTriangle className="size-4" />
              <AlertTitle>تعذّر تحميل {projectId(section)}</AlertTitle>
              <AlertDescription>أعد المحاولة بعد قليل.</AlertDescription>
            </Alert>
          )
        )}
      </div>
    </>
  )
}
