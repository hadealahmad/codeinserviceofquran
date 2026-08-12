"use client"

import { Fragment, useCallback, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  CircleDot,
  ExternalLink,
  GitPullRequest,
  MessageSquare,
  UserCheck,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/navbar"
import {
  Assignees,
  CommentsCell,
  IssueCell,
  RelatedPrs,
} from "@/components/project-card"
import { StatsSection } from "@/components/stats-section"
import { useLanguage } from "@/lib/language-context"
import { isInPeriod } from "@/lib/stats"
import { getCategoryBadgeClass } from "@/lib/tag-styles"
import { cn } from "@/lib/utils"
import type { ProcessedIssue, ProjectData } from "@/lib/github/types"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [filterNoComments, setFilterNoComments] = useState(false)
  const [filterHasComments, setFilterHasComments] = useState(false)
  const [filterUnassigned, setFilterUnassigned] = useState(false)
  const [filterAssigned, setFilterAssigned] = useState(false)
  const [filterMaintainerReplied, setFilterMaintainerReplied] = useState(false)
  const [periodScope, setPeriodScope] = useState<"period" | "all">("period")
  const [issueState, setIssueState] = useState<"open" | "closed">("open")

  const [closedMap, setClosedMap] = useState<Record<string, ProcessedIssue[]>>({})
  const [loadingClosed, setLoadingClosed] = useState(false)

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

  const handleSelect = (value: string) => {
    setSelected(value)
    const url = new URL(window.location.href)
    if (value === "all") url.searchParams.delete("project")
    else url.searchParams.set("project", value)
    window.history.replaceState(null, "", url.pathname + url.search)
  }

  const loadClosedForVisible = useCallback(
    (targetSections: ProjectSection[]) => {
      const missing = targetSections.filter(
        (s) => s.data && !closedMap[projectId(s)]
      )
      if (missing.length === 0) return

      setLoadingClosed(true)
      Promise.all(
        missing.map((s) =>
          fetch(
            `/api/repos/${s.project.owner}/${s.project.repo}?state=closed`
          )
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => ({ id: projectId(s), issues: (json?.issues as ProcessedIssue[]) ?? [] }))
            .catch(() => ({ id: projectId(s), issues: [] }))
        )
      ).then((results) => {
        setClosedMap((prev) => {
          const next = { ...prev }
          results.forEach((r) => {
            next[r.id] = r.issues
          })
          return next
        })
        setLoadingClosed(false)
      })
    },
    [closedMap]
  )

  const handleStateChange = (val: string) => {
    const nextState = val === "closed" ? "closed" : "open"
    setIssueState(nextState)
    if (nextState === "closed") {
      loadClosedForVisible(visible)
    }
  }

  const filterIssueList = useCallback(
    (issues: ProcessedIssue[]) =>
      issues.filter((issue) => {
        if (filterNoComments && issue.comments.count > 0) return false
        if (filterHasComments) {
          if (issue.comments.count === 0) return false
          if (
            periodScope === "period" &&
            !isInPeriod(issue.comments.lastCommentAt ?? issue.updatedAt)
          ) {
            return false
          }
        }
        if (filterUnassigned && issue.assignees.length > 0) return false
        if (filterAssigned) {
          if (issue.assignees.length === 0) return false
          if (periodScope === "period" && !isInPeriod(issue.assignedAt)) return false
        }
        if (filterMaintainerReplied) {
          if (issue.comments.status !== "maintainer") return false
          if (periodScope === "period" && !isInPeriod(issue.maintainerRepliedAt)) return false
        }
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase().trim()
          const matchesTitle = issue.title.toLowerCase().includes(q)
          const matchesNumber = String(issue.number).includes(q)
          const matchesLabel = issue.labels.some((l) =>
            l.name.toLowerCase().includes(q)
          )
          if (!matchesTitle && !matchesNumber && !matchesLabel) return false
        }
        return true
      }),
    [
      filterNoComments,
      filterHasComments,
      filterUnassigned,
      filterAssigned,
      filterMaintainerReplied,
      periodScope,
      searchQuery,
    ]
  )

  const filtersActive =
    filterNoComments ||
    filterHasComments ||
    filterUnassigned ||
    filterAssigned ||
    filterMaintainerReplied ||
    searchQuery.trim() !== ""

  // Calculate totals for active state
  let totalShown = 0
  let totalIssuesInState = 0
  visible.forEach((section) => {
    if (!section.data) return
    const rawList =
      issueState === "open"
        ? section.data.issues
        : (closedMap[projectId(section)] ?? [])
    totalIssuesInState += rawList.length
    totalShown += filterIssueList(rawList).length
  })

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Sticky Navbar with 2 rows */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterNoComments={filterNoComments}
        onToggleNoComments={() => setFilterNoComments((prev) => !prev)}
        filterHasComments={filterHasComments}
        onToggleHasComments={() => setFilterHasComments((prev) => !prev)}
        filterUnassigned={filterUnassigned}
        onToggleUnassigned={() => setFilterUnassigned((prev) => !prev)}
        filterAssigned={filterAssigned}
        onToggleAssigned={() => setFilterAssigned((prev) => !prev)}
        filterMaintainerReplied={filterMaintainerReplied}
        onToggleMaintainerReplied={() => setFilterMaintainerReplied((prev) => !prev)}
        periodScope={periodScope}
        onTogglePeriodScope={() =>
          setPeriodScope((prev) => (prev === "period" ? "all" : "period"))
        }
        selectedProject={selected}
        onSelectProject={handleSelect}
        projects={projectsOptions}
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
        <StatsSection sections={visible} periodScope={periodScope} />

        {/* Unified Issues Table Container */}
        <Card className="mt-6 shadow-xs border-border/80 bg-card overflow-hidden">
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-muted/20">
            <Tabs value={issueState} onValueChange={handleStateChange}>
              <TabsList>
                <TabsTrigger value="open">
                  {t("مفتوحة", "Open")}
                </TabsTrigger>
                <TabsTrigger value="closed">
                  {t("مغلقة", "Closed")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {filtersActive && (
              <span className="text-xs font-medium text-muted-foreground">
                {t(`${totalShown} من ${totalIssuesInState}`, `${totalShown} of ${totalIssuesInState}`)}
              </span>
            )}
          </div>

          <CardContent className="p-0">
            {loadingClosed && issueState === "closed" && Object.keys(closedMap).length === 0 ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[44%]">{t("القضية", "Issue")}</TableHead>
                    <TableHead className="w-[18%]">{t("المسندون", "Assignees")}</TableHead>
                    <TableHead className="w-[18%]">{t("التعليقات", "Comments")}</TableHead>
                    <TableHead className="w-[20%]">{t("البرات ذات الصلة", "Related PRs")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((section) => {
                    const id = projectId(section)

                    if (!section.data) {
                      return (
                        <TableRow key={id}>
                          <TableCell colSpan={4} className="p-4">
                            <Alert variant="destructive" className="border-destructive/40 bg-destructive/5 text-destructive py-2">
                              <AlertTriangle className="size-4" />
                              <AlertTitle>{t(`تعذّر تحميل ${id}`, `Failed to load ${id}`)}</AlertTitle>
                            </Alert>
                          </TableCell>
                        </TableRow>
                      )
                    }

                    const rawIssues =
                      issueState === "open"
                        ? section.data.issues
                        : (closedMap[id] ?? [])
                    const filtered = filterIssueList(rawIssues)
                    const issues = section.data.issues ?? []

                    const assignedCount = issues.filter((i) => {
                      if (i.assignees.length === 0) return false
                      return periodScope === "all" || isInPeriod(i.assignedAt)
                    }).length

                    const commentedCount = issues.filter((i) => {
                      if (i.comments.count === 0) return false
                      return periodScope === "all" || isInPeriod(i.comments.lastCommentAt ?? i.updatedAt)
                    }).length

                    const maintainerCount = issues.filter((i) => {
                      if (i.comments.status !== "maintainer") return false
                      return periodScope === "all" || isInPeriod(i.maintainerRepliedAt)
                    }).length

                    return (
                      <Fragment key={id}>
                        {/* Project Header Row Aligned 1-to-1 with Table Columns */}
                        <TableRow className="bg-muted/70 hover:bg-muted/80 border-t-2 border-b border-border/80 font-semibold text-xs">
                          {/* Col 1: Issue Title & Category Tag & Total Open Issues Count */}
                          <TableCell className="py-2.5 px-3 align-middle whitespace-normal">
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={section.data.meta.htmlUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground hover:underline"
                              >
                                {id}
                                <ExternalLink className="size-3.5 text-muted-foreground" />
                              </a>
                              {section.project.tag && (
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px] font-semibold px-1.5 py-0.5 shadow-2xs", getCategoryBadgeClass(section.project.tag))}
                                >
                                  {section.project.tag}
                                </Badge>
                              )}
                              <span
                                title={t("إجمالي القضايا المفتوحة", "Total Open Issues")}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400"
                              >
                                <CircleDot className="size-3.5" />
                                <span>{issues.length}</span>
                              </span>
                            </div>
                          </TableCell>

                          {/* Col 2: Assignees Column -> Assigned Count */}
                          <TableCell className="py-2.5 px-3 align-middle">
                            <span
                              title={
                                periodScope === "period"
                                  ? t("مسندة في الفترة", "Assigned in Period")
                                  : t("قضايا مسندة", "Assigned Issues")
                              }
                              className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400"
                            >
                              <UserCheck className="size-3.5" />
                              <span>{assignedCount}</span>
                            </span>
                          </TableCell>

                          {/* Col 3: Comments Column -> With Comments & Maintainer Replied Counts */}
                          <TableCell className="py-2.5 px-3 align-middle">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                title={
                                  periodScope === "period"
                                    ? t("مع تعليقات في الفترة", "Comments in Period")
                                    : t("قضايا مع تعليقات", "With Comments")
                                }
                                className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400"
                              >
                                <MessageSquare className="size-3.5" />
                                <span>{commentedCount}</span>
                              </span>

                              <span
                                title={
                                  periodScope === "period"
                                    ? t("ردّ المشرف في الفترة", "Maintainer Replied in Period")
                                    : t("ردّ المشرف", "Maintainer Replied")
                                }
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                              >
                                <CheckCircle2 className="size-3.5" />
                                <span>{maintainerCount}</span>
                              </span>
                            </div>
                          </TableCell>

                          {/* Col 4: Related PRs Column -> PRs & Closed Counts */}
                          <TableCell className="py-2.5 px-3 align-middle">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                title={t("برات في الفترة", "PRs in Period")}
                                className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                              >
                                <GitPullRequest className="size-3.5" />
                                <span>{section.data.stats.prsInPeriod ?? 0}</span>
                              </span>

                              <span
                                title={t("مغلقة في الفترة", "Closed in Period")}
                                className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
                              >
                                <CheckSquare className="size-3.5" />
                                <span>{section.data.stats.closedInPeriod ?? 0}</span>
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Issue Rows */}
                        {filtered.length === 0 ? (
                          <TableRow className="bg-background">
                            <TableCell colSpan={4} className="h-14 text-center text-xs text-muted-foreground">
                              {filtersActive
                                ? t("لا توجد قضايا مطابقة للفلتر في هذا المشروع", "No matching issues in this project")
                                : t("لا توجد قضايا", "No issues")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filtered.map((issue) => (
                            <TableRow key={issue.number} className="bg-background hover:bg-muted/30">
                              <TableCell className="align-top whitespace-normal">
                                <IssueCell issue={issue} />
                              </TableCell>
                              <TableCell className="align-top">
                                <Assignees assignees={issue.assignees} assignedAt={issue.assignedAt} />
                              </TableCell>
                              <TableCell className="align-top">
                                <CommentsCell comments={issue.comments} />
                              </TableCell>
                              <TableCell className="align-top">
                                <RelatedPrs prs={issue.relatedPRs} />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
