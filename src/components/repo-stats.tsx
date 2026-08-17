"use client"

import { useLanguage } from "@/lib/language-context"
import { isInPeriod } from "@/lib/stats"
import { cn } from "@/lib/utils"
import type { ProjectData } from "@/lib/github/types"

export function RepoStats({ data }: { data: ProjectData }) {
  const { t } = useLanguage()

  const total = data.issues.length
  const commented = data.issues.filter((i) => i.comments.count > 0).length
  const maintainerReplied = data.issues.filter(
    (i) => i.comments.status === "maintainer" && isInPeriod(i.maintainerRepliedAt)
  ).length
  const assigned = data.issues.filter(
    (i) => i.assignees.length > 0 && isInPeriod(i.assignedAt)
  ).length
  const prsInPeriod = data.stats.prsInPeriod ?? 0
  const closedInPeriod = data.stats.closedInPeriod ?? 0

  const maintainers = new Set((data.maintainers ?? []).map((m) => m.toLowerCase()))
  const contributorsInPeriod = new Set(
    (data.pulls ?? [])
      .filter((pr) => {
        const login = pr.user?.login
        if (!login || login.endsWith("[bot]") || login === "ghost") return false
        if (maintainers.has(login.toLowerCase())) return false
        return isInPeriod(pr.createdAt)
      })
      .map((pr) => pr.user.login.toLowerCase())
  ).size

  const items = [
    {
      label: t("القضايا المفتوحة", "Open Issues"),
      value: total,
      color: "text-blue-600 dark:text-blue-400",
      dotBg: "bg-blue-500",
    },
    {
      label: t("مع تعليقات", "With Comments"),
      value: commented,
      color: "text-amber-600 dark:text-amber-400",
      dotBg: "bg-amber-500",
    },
    {
      label: t("ردّ المشرف", "Maintainer Replied"),
      value: maintainerReplied,
      color: "text-emerald-600 dark:text-emerald-400",
      dotBg: "bg-emerald-500",
    },
    {
      label: t("مسندة في الفترة", "Assigned in Period"),
      value: assigned,
      color: "text-purple-600 dark:text-purple-400",
      dotBg: "bg-purple-500",
    },
    {
      label: t("برات في الفترة", "PRs in Period"),
      value: prsInPeriod,
      color: "text-indigo-600 dark:text-indigo-400",
      dotBg: "bg-indigo-500",
    },
    {
      label: t("مغلقة في الفترة", "Closed in Period"),
      value: closedInPeriod,
      color: "text-rose-600 dark:text-rose-400",
      dotBg: "bg-rose-500",
    },
    {
      label: t("المساهمون في الفترة", "Contributors in Period"),
      value: contributorsInPeriod,
      color: "text-teal-600 dark:text-teal-400",
      dotBg: "bg-teal-500",
    },
  ]

  return (
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <span className={cn("size-1.5 rounded-full shrink-0", item.dotBg)} />
            {item.label}
          </span>
          <span className={cn("text-base font-bold tabular-nums ps-3", item.color)}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
