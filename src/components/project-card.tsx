"use client"

import { useCallback, useState } from "react"
import {
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  CircleDot,
  ExternalLink,
  GitPullRequest,
  MessageSquare,
  UserCheck,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RepoStats } from "@/components/repo-stats"
import { useLanguage } from "@/lib/language-context"
import { isInPeriod } from "@/lib/stats"
import { getCategoryBadgeClass } from "@/lib/tag-styles"
import { cn } from "@/lib/utils"
import type {
  Assignee,
  CommentStatus,
  ProcessedIssue,
  ProjectData,
  RelatedPr,
} from "@/lib/github/types"

const PR_STATE: Record<RelatedPr["state"], { className: string }> = {
  open: { className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  merged: { className: "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300" },
  closed: { className: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
}

function formatDate(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso))
}

function initial(login: string): string {
  return login.charAt(0).toUpperCase()
}

export function Assignees({
  assignees,
  assignedAt,
}: {
  assignees: Assignee[]
  assignedAt?: string | null
}) {
  const { lang, t } = useLanguage()
  if (assignees.length === 0) {
    return <span className="text-sm text-muted-foreground">{t("غير مسند", "Unassigned")}</span>
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex -space-x-2">
        {assignees.map((assignee) => (
          <Tooltip key={assignee.login}>
            <TooltipTrigger
              render={
                <a
                  href={assignee.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-transform hover:-translate-y-0.5"
                />
              }
            >
              <Avatar className="size-7 ring-2 ring-card shadow-2xs">
                <AvatarImage src={assignee.avatarUrl} alt={assignee.login} />
                <AvatarFallback>{initial(assignee.login)}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{assignee.login}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      {assignedAt && (
        <span className="text-[11px] text-muted-foreground font-normal whitespace-nowrap">
          {t("أُسند:", "Assigned:")} {formatDate(assignedAt, lang)}
        </span>
      )}
    </div>
  )
}

export function CommentsCell({ comments }: { comments: ProcessedIssue["comments"] }) {
  const { lang, t } = useLanguage()

  const commentStatusMap: Record<CommentStatus, { label: string; className: string }> = {
    none: {
      label: t("لا توجد تعليقات", "No comments"),
      className: "border-border/80 bg-muted/60 text-muted-foreground",
    },
    awaiting: {
      label: t("بانتظار ردّ المشرف", "Awaiting maintainer"),
      className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    maintainer: {
      label: t("ردّ المشرف", "Maintainer replied"),
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
  }

  const status = commentStatusMap[comments.status]
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="inline-flex items-center gap-1 text-sm font-medium">
        <MessageSquare className="size-3.5 text-muted-foreground" />
        {comments.count}
      </span>
      <Badge variant="outline" className={status.className}>
        {status.label}
      </Badge>
      {comments.status !== "none" && comments.lastCommentAt && (
        <span className="text-[11px] text-muted-foreground font-normal whitespace-nowrap">
          {t("آخر تعليق:", "Last comment:")} {formatDate(comments.lastCommentAt, lang)}
        </span>
      )}
    </div>
  )
}

export function RelatedPrs({ prs }: { prs: RelatedPr[] }) {
  if (prs.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>
  }
  return (
    <div className="flex flex-col items-start gap-1.5">
      {prs.map((pr) => {
        const state = PR_STATE[pr.state]
        return (
          <Badge
            key={pr.number}
            variant="outline"
            className={state.className}
            render={<a href={pr.htmlUrl} target="_blank" rel="noreferrer" />}
          >
            <GitPullRequest className="size-3" />
            #{pr.number}
          </Badge>
        )
      })}
    </div>
  )
}

export function IssueCell({ issue }: { issue: ProcessedIssue }) {
  const { lang } = useLanguage()
  return (
    <div className="min-w-0">
      <a
        href={issue.htmlUrl}
        target="_blank"
        rel="noreferrer"
        className="line-clamp-2 font-medium text-foreground underline-offset-4 hover:underline"
      >
        {issue.title}
      </a>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>#{issue.number}</span>
        <span aria-hidden>·</span>
        <span>{formatDate(issue.createdAt, lang)}</span>
        {issue.labels.length > 0 && (
          <>
            <span aria-hidden>·</span>
            <span className="flex flex-wrap gap-1">
              {issue.labels.slice(0, 3).map((label) => (
                <span
                  key={label.name}
                  className="rounded-full px-1.5 py-px text-[10px] font-medium"
                  style={{
                    backgroundColor: `#${label.color}26`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}66`,
                  }}
                >
                  {label.name}
                </span>
              ))}
              {issue.labels.length > 3 && (
                <span>+{issue.labels.length - 3}</span>
              )}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

export function ProjectInlineStats({
  data,
  periodScope = "period",
}: {
  data: ProjectData
  periodScope?: "period" | "all"
}) {
  const { t } = useLanguage()

  const issues = data.issues ?? []
  const total = issues.length
  const commented = issues.filter((i) => {
    if (i.comments.count === 0) return false
    return periodScope === "all" || isInPeriod(i.comments.lastCommentAt ?? i.updatedAt)
  }).length
  const maintainerReplied = issues.filter((i) => {
    if (i.comments.status !== "maintainer") return false
    return periodScope === "all" || isInPeriod(i.maintainerRepliedAt)
  }).length
  const assigned = issues.filter((i) => {
    if (i.assignees.length === 0) return false
    return periodScope === "all" || isInPeriod(i.assignedAt)
  }).length
  const prsInPeriod = data.stats.prsInPeriod ?? 0
  const closedInPeriod = data.stats.closedInPeriod ?? 0

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <span
        title={t("إجمالي القضايا المفتوحة", "Total Open Issues")}
        className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400"
      >
        <CircleDot className="size-3.5" />
        <span>{total}</span>
      </span>

      <span
        title={t("قضايا مع تعليقات", "With Comments")}
        className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400"
      >
        <MessageSquare className="size-3.5" />
        <span>{commented}</span>
      </span>

      <span
        title={t("ردّ المشرف في الفترة", "Maintainer Replied in Period")}
        className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
      >
        <CheckCircle2 className="size-3.5" />
        <span>{maintainerReplied}</span>
      </span>

      <span
        title={t("مسندة في الفترة", "Assigned in Period")}
        className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400"
      >
        <UserCheck className="size-3.5" />
        <span>{assigned}</span>
      </span>

      <span
        title={t("برات في الفترة", "PRs in Period")}
        className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
      >
        <GitPullRequest className="size-3.5" />
        <span>{prsInPeriod}</span>
      </span>

      <span
        title={t("مغلقة في الفترة", "Closed in Period")}
        className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
      >
        <CheckSquare className="size-3.5" />
        <span>{closedInPeriod}</span>
      </span>
    </div>
  )
}

function IssuesTable({
  issues,
  emptyMessage,
}: {
  issues: ProcessedIssue[]
  emptyMessage?: string
}) {
  const { t } = useLanguage()
  const defaultEmpty = t("لا توجد قضايا", "No issues")

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[44%]">{t("القضية", "Issue")}</TableHead>
          <TableHead className="w-[18%]">{t("المسندون", "Assignees")}</TableHead>
          <TableHead className="w-[18%]">{t("التعليقات", "Comments")}</TableHead>
          <TableHead className="w-[20%]">{t("البرات ذات الصلة", "Related PRs")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {issues.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={4}
              className="h-24 text-center text-muted-foreground"
            >
              {emptyMessage || defaultEmpty}
            </TableCell>
          </TableRow>
        ) : (
          issues.map((issue) => (
            <TableRow key={issue.number}>
              <TableCell className="align-top">
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
      </TableBody>
    </Table>
  )
}

export function ProjectCard({
  data,
  filterNoComments,
  filterHasComments = false,
  filterUnassigned,
  filterAssigned = false,
  filterMaintainerReplied = false,
  searchQuery = "",
  isCollapsed = false,
  onToggleCollapse,
}: {
  data: ProjectData
  filterNoComments: boolean
  filterHasComments?: boolean
  filterUnassigned: boolean
  filterAssigned?: boolean
  filterMaintainerReplied?: boolean
  searchQuery?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}) {
  const { t } = useLanguage()
  const [state, setState] = useState<"open" | "closed">("open")
  const [closedData, setClosedData] = useState<{
    issues: ProcessedIssue[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadClosed = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    fetch(
      `/api/repos/${data.project.owner}/${data.project.repo}?state=closed`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("failed")
        return res.json()
      })
      .then((json) => {
        setClosedData(json)
        setLoading(false)
      })
      .catch(() => {
        setLoadError(t("تعذّر تحميل القضايا المغلقة", "Failed to load closed issues"))
        setLoading(false)
      })
  }, [data.project, t])

  const changeState = (value: string) => {
    setState(value === "closed" ? "closed" : "open")
    if (value === "closed" && !closedData) loadClosed()
  }

  const filterIssues = useCallback(
    (issues: ProcessedIssue[]) =>
      issues.filter((issue) => {
        if (filterNoComments && issue.comments.count > 0) return false
        if (filterHasComments && issue.comments.count === 0) return false
        if (filterUnassigned && issue.assignees.length > 0) return false
        if (filterAssigned) {
          if (issue.assignees.length === 0) return false
          if (!isInPeriod(issue.assignedAt)) return false
        }
        if (filterMaintainerReplied) {
          if (issue.comments.status !== "maintainer") return false
          if (!isInPeriod(issue.maintainerRepliedAt)) return false
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

  const openIssues = filterIssues(data.issues)
  const closedIssues = closedData ? filterIssues(closedData.issues) : null
  const shown = state === "open" ? openIssues.length : (closedIssues?.length ?? 0)
  const total = state === "open" ? data.issues.length : (closedData?.issues.length ?? 0)

  const { meta } = data

  return (
    <Card className="shadow-xs hover:shadow-md transition-shadow duration-200 border-border/80 bg-card">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <a
              href={meta.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-lg font-semibold hover:underline text-foreground"
            >
              {data.project.owner}/{data.project.repo}
              <ExternalLink className="size-4 text-muted-foreground" />
            </a>

            <Badge variant="outline" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
              {t(`${data.issues.length} قضية`, `${data.issues.length} issues`)}
            </Badge>

            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleCollapse}
                title={isCollapsed ? t("توسيع المستودع", "Expand repository") : t("طَي المستودع", "Collapse repository")}
                className="size-7"
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform duration-200",
                    !isCollapsed && "rotate-180"
                  )}
                />
              </Button>
            )}
          </div>

          {data.project.tag && (
            <Badge
              variant="outline"
              className={cn("text-xs font-semibold px-2.5 py-0.5 shadow-2xs", getCategoryBadgeClass(data.project.tag))}
            >
              {data.project.tag}
            </Badge>
          )}
        </div>

        {/* Per-repository statistics columns (always visible) */}
        <RepoStats data={data} />
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-2">
          <Tabs value={state} onValueChange={changeState} className="w-full">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="open">
                  {t("مفتوحة", "Open")} ({data.issues.length})
                </TabsTrigger>
                <TabsTrigger value="closed">
                  {t("مغلقة", "Closed")}
                  {closedData ? ` (${closedData.issues.length})` : ""}
                </TabsTrigger>
              </TabsList>

              {filtersActive && (
                <span className="text-xs text-muted-foreground">
                  {t(`${shown} من ${total}`, `${shown} of ${total}`)}
                </span>
              )}
            </div>

            <TabsContent value="open">
              <IssuesTable
                issues={openIssues}
                emptyMessage={
                  filtersActive ? t("لا توجد قضايا مطابقة للفلتر", "No issues matching filter") : undefined
                }
              />
            </TabsContent>

            <TabsContent value="closed">
              {loading ? (
                <div className="space-y-2" aria-label="جاري التحميل">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : loadError ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {loadError}
                </p>
              ) : closedIssues ? (
                <IssuesTable
                  issues={closedIssues}
                  emptyMessage={
                    filtersActive ? t("لا توجد قضايا مطابقة للفلتر", "No issues matching filter") : undefined
                  }
                />
              ) : null}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}
