"use client"

import {
  CheckCircle2,
  CheckSquare,
  CircleDot,
  GitPullRequest,
  MessageSquare,
  UserCheck,
  Users,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { countUniqueContributors } from "@/lib/contributors-utils"
import { useLanguage } from "@/lib/language-context"
import { STATS_PERIOD_LABEL, STATS_PERIOD_LABEL_EN, isInPeriod } from "@/lib/stats"
import { cn } from "@/lib/utils"
import type { ProjectData } from "@/lib/github/types"

export function StatsSection({
  sections,
  periodScope = "period",
}: {
  sections: { data: ProjectData | null }[]
  periodScope?: "period" | "all"
}) {
  const { t } = useLanguage()

  let total = 0
  let commented = 0
  let maintainerReplied = 0
  let assigned = 0
  let prsInPeriod = 0
  let closedInPeriod = 0

  for (const section of sections) {
    const issues = section.data?.issues ?? []
    total += issues.length
    commented += issues.filter((issue) => {
      if (issue.comments.count === 0) return false
      return periodScope === "all" || isInPeriod(issue.comments.lastCommentAt ?? issue.updatedAt)
    }).length
    maintainerReplied += issues.filter((issue) => {
      if (issue.comments.status !== "maintainer") return false
      return periodScope === "all" || isInPeriod(issue.maintainerRepliedAt)
    }).length
    assigned += issues.filter((issue) => {
      if (issue.assignees.length === 0) return false
      return periodScope === "all" || isInPeriod(issue.assignedAt)
    }).length
    prsInPeriod += section.data?.stats.prsInPeriod ?? 0
    closedInPeriod += section.data?.stats.closedInPeriod ?? 0
  }

  const uniqueContributors = countUniqueContributors(sections, periodScope)
  const periodLabel = t(STATS_PERIOD_LABEL, STATS_PERIOD_LABEL_EN)

  const items = [
    {
      label: t("إجمالي القضايا المفتوحة", "Total Open Issues"),
      value: total,
      icon: CircleDot,
      color: "text-blue-600 dark:text-blue-400",
      accentBg: "bg-blue-500/10",
      borderAccent: "border-s-4 border-s-blue-500",
    },
    {
      label:
        periodScope === "period"
          ? t("مع تعليقات في الفترة", "Comments in Period")
          : t("قضايا مع تعليقات", "With Comments"),
      value: commented,
      icon: MessageSquare,
      color: "text-amber-600 dark:text-amber-400",
      accentBg: "bg-amber-500/10",
      borderAccent: "border-s-4 border-s-amber-500",
    },
    {
      label:
        periodScope === "period"
          ? t("ردّ المشرف في الفترة", "Maintainer Replied in Period")
          : t("ردّ المشرف", "Maintainer Replied"),
      value: maintainerReplied,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      accentBg: "bg-emerald-500/10",
      borderAccent: "border-s-4 border-s-emerald-500",
    },
    {
      label:
        periodScope === "period"
          ? t("مسندة في الفترة", "Assigned in Period")
          : t("قضايا مسندة", "Assigned Issues"),
      value: assigned,
      icon: UserCheck,
      color: "text-purple-600 dark:text-purple-400",
      accentBg: "bg-purple-500/10",
      borderAccent: "border-s-4 border-s-purple-500",
    },
    {
      label: t("برات في الفترة", "PRs in Period"),
      value: prsInPeriod,
      hint: periodLabel,
      icon: GitPullRequest,
      color: "text-indigo-600 dark:text-indigo-400",
      accentBg: "bg-indigo-500/10",
      borderAccent: "border-s-4 border-s-indigo-500",
    },
    {
      label: t("مغلقة في الفترة", "Closed in Period"),
      value: closedInPeriod,
      hint: periodLabel,
      icon: CheckSquare,
      color: "text-rose-600 dark:text-rose-400",
      accentBg: "bg-rose-500/10",
      borderAccent: "border-s-4 border-s-rose-500",
    },
    {
      label:
        periodScope === "period"
          ? t("المساهمون في الفترة", "Contributors in Period")
          : t("إجمالي المساهمين", "Total Contributors"),
      value: uniqueContributors,
      hint: periodScope === "period" ? periodLabel : undefined,
      icon: Users,
      color: "text-teal-600 dark:text-teal-400",
      accentBg: "bg-teal-500/10",
      borderAccent: "border-s-4 border-s-teal-500",
    },
  ]

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card
            key={item.label}
            className={cn(
              "shadow-xs hover:shadow-md transition-shadow duration-200 border-border/80 overflow-hidden",
              item.borderAccent
            )}
          >
            <CardContent className="flex flex-col gap-1.5 p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-1 text-muted-foreground">
                <span className="text-xs font-medium line-clamp-1">{item.label}</span>
                <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", item.accentBg)}>
                  <Icon className={cn("size-3.5", item.color)} />
                </div>
              </div>
              <span className={cn("text-2xl font-bold tabular-nums", item.color)}>
                {item.value}
              </span>
              {item.hint && (
                <span className="text-[10px] text-muted-foreground/80">
                  {item.hint}
                </span>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
