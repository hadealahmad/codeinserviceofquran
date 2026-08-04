"use client"

import { STATS_PERIOD_LABEL } from "@/lib/stats"
import type { ProjectData } from "@/lib/github/types"

export function RepoStats({ data }: { data: ProjectData }) {
  const total = data.issues.length
  const commented = data.issues.filter((i) => i.comments.count > 0).length
  const maintainerReplied = data.issues.filter(
    (i) => i.comments.status === "maintainer"
  ).length
  const assigned = data.issues.filter((i) => i.assignees.length > 0).length
  const prsInPeriod = data.stats.prsInPeriod ?? 0
  const closedInPeriod = data.stats.closedInPeriod ?? 0

  const items = [
    { label: "القضايا المفتوحة", value: total },
    { label: "مع تعليقات", value: commented },
    { label: "ردّ المشرف", value: maintainerReplied },
    { label: "مسندة", value: assigned },
    { label: "برات في 30 يوم", value: prsInPeriod, hint: STATS_PERIOD_LABEL },
    { label: "مغلقة في 30 يوم", value: closedInPeriod, hint: STATS_PERIOD_LABEL },
  ]

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center justify-center rounded-md border border-border/50 bg-card p-2 text-center shadow-2xs"
        >
          <span className="text-[11px] font-medium text-muted-foreground">
            {item.label}
          </span>
          <span className="text-base font-bold tabular-nums text-card-foreground">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
