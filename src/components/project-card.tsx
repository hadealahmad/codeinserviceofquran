"use client"

import { useCallback, useState } from "react"
import {
  ChevronDown,
  ExternalLink,
  GitPullRequest,
  MessageSquare,
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
import { cn } from "@/lib/utils"
import type {
  Assignee,
  CommentStatus,
  LanguageInfo,
  ProcessedIssue,
  ProjectData,
  RelatedPr,
} from "@/lib/github/types"

const COMMENT_STATUS: Record<
  CommentStatus,
  { label: string; className: string }
> = {
  none: {
    label: "لا توجد تعليقات",
    className: "border-border text-muted-foreground",
  },
  awaiting: {
    label: "بانتظار ردّ المشرف",
    className: "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300",
  },
  maintainer: {
    label: "ردّ المشرف",
    className: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
}

const PR_STATE: Record<RelatedPr["state"], { className: string }> = {
  open: { className: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300" },
  merged: { className: "border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-900/50 dark:bg-purple-950/50 dark:text-purple-300" },
  closed: { className: "border-red-200 bg-red-100 text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300" },
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso))
}

function initial(login: string): string {
  return login.charAt(0).toUpperCase()
}

function LanguageBar({ languages }: { languages: LanguageInfo[] }) {
  if (languages.length === 0) return null
  return (
    <div className="mt-4 w-full space-y-2">
      <div
        dir="ltr"
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        {languages.map((language) => (
          <div
            key={language.name}
            className="h-full"
            style={{
              width: `${language.percent}%`,
              backgroundColor: language.color,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {languages.map((language) => (
          <span key={language.name} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: language.color }}
            />
            {language.name} {language.percent.toFixed(1)}٪
          </span>
        ))}
      </div>
    </div>
  )
}

function Assignees({ assignees }: { assignees: Assignee[] }) {
  if (assignees.length === 0) {
    return <span className="text-sm text-muted-foreground">غير مسند</span>
  }
  return (
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
            <Avatar className="size-7 ring-2 ring-card">
              <AvatarImage src={assignee.avatarUrl} alt={assignee.login} />
              <AvatarFallback>{initial(assignee.login)}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{assignee.login}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

function CommentsCell({ comments }: { comments: ProcessedIssue["comments"] }) {
  const status = COMMENT_STATUS[comments.status]
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="inline-flex items-center gap-1 text-sm font-medium">
        <MessageSquare className="size-3.5 text-muted-foreground" />
        {comments.count}
      </span>
      <Badge variant="outline" className={status.className}>
        {status.label}
      </Badge>
    </div>
  )
}

function RelatedPrs({ prs }: { prs: RelatedPr[] }) {
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

function IssueCell({ issue }: { issue: ProcessedIssue }) {
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
        <span>{formatDate(issue.createdAt)}</span>
        {issue.labels.length > 0 && (
          <>
            <span aria-hidden>·</span>
            <span className="flex flex-wrap gap-1">
              {issue.labels.slice(0, 3).map((label) => (
                <span
                  key={label.name}
                  className="rounded-full px-1.5 py-px text-[10px] font-medium"
                  style={{
                    backgroundColor: `#${label.color}1f`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}59`,
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

function IssuesTable({
  issues,
  emptyMessage = "لا توجد قضايا",
}: {
  issues: ProcessedIssue[]
  emptyMessage?: string
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[44%]">القضية</TableHead>
          <TableHead className="w-[18%]">المسندون</TableHead>
          <TableHead className="w-[18%]">التعليقات</TableHead>
          <TableHead className="w-[20%]">البرات ذات الصلة</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {issues.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={4}
              className="h-24 text-center text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          issues.map((issue) => (
            <TableRow key={issue.number}>
              <TableCell className="align-top">
                <IssueCell issue={issue} />
              </TableCell>
              <TableCell className="align-top">
                <Assignees assignees={issue.assignees} />
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
  filterUnassigned,
  isCollapsed = false,
  onToggleCollapse,
}: {
  data: ProjectData
  filterNoComments: boolean
  filterUnassigned: boolean
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}) {
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
        setLoadError("تعذّر تحميل القضايا المغلقة")
        setLoading(false)
      })
  }, [data.project])

  const changeState = (value: string) => {
    setState(value === "closed" ? "closed" : "open")
    if (value === "closed" && !closedData) loadClosed()
  }

  const filterIssues = useCallback(
    (issues: ProcessedIssue[]) =>
      issues.filter((issue) => {
        if (filterNoComments && issue.comments.count > 0) return false
        if (filterUnassigned && issue.assignees.length > 0) return false
        return true
      }),
    [filterNoComments, filterUnassigned]
  )

  const filtersActive = filterNoComments || filterUnassigned

  const openIssues = filterIssues(data.issues)
  const closedIssues = closedData ? filterIssues(closedData.issues) : null
  const shown = state === "open" ? openIssues.length : (closedIssues?.length ?? 0)
  const total = state === "open" ? data.issues.length : (closedData?.issues.length ?? 0)

  const { meta, languages } = data

  return (
    <Card className="transition-all duration-200">
      <CardHeader>
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

            <Badge variant="outline" className="text-xs">
              {data.issues.length} قضية
            </Badge>

            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleCollapse}
                title={isCollapsed ? "توسيع المستودع" : "طَي المستودع"}
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

          {meta.topics.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {meta.topics.map((topic) => (
                <a
                  key={topic}
                  href={`https://github.com/topics/${topic}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Badge variant="secondary">{topic}</Badge>
                </a>
              ))}
            </div>
          )}
        </div>
        <LanguageBar languages={languages} />
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          {/* Per-repository statistics bar */}
          <RepoStats data={data} />

          <Tabs value={state} onValueChange={changeState} className="w-full">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="open">
                  مفتوحة ({data.issues.length})
                </TabsTrigger>
                <TabsTrigger value="closed">
                  مغلقة
                  {closedData ? ` (${closedData.issues.length})` : ""}
                </TabsTrigger>
              </TabsList>

              {filtersActive && (
                <span className="text-xs text-muted-foreground">
                  {shown} من {total}
                </span>
              )}
            </div>

            <TabsContent value="open">
              <IssuesTable
                issues={openIssues}
                emptyMessage={
                  filtersActive ? "لا توجد قضايا مطابقة للفلتر" : undefined
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
                    filtersActive ? "لا توجد قضايا مطابقة للفلتر" : undefined
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
