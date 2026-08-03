"use client"

import { Card, CardContent } from "@/components/ui/card"
import { STATS_PERIOD_LABEL } from "@/lib/stats"
import type { ProjectData } from "@/lib/github/types"

export function StatsSection({
  sections,
}: {
  sections: { data: ProjectData | null }[]
}) {
  let total = 0
  let commented = 0
  let maintainerReplied = 0
  let assigned = 0
  let prsInPeriod = 0
  let closedInPeriod = 0

  for (const section of sections) {
    const issues = section.data?.issues ?? []
    total += issues.length
    commented += issues.filter((issue) => issue.comments.count > 0).length
    maintainerReplied += issues.filter(
      (issue) => issue.comments.status === "maintainer"
    ).length
    assigned += issues.filter((issue) => issue.assignees.length > 0).length
    prsInPeriod += section.data?.stats.prsInPeriod ?? 0
    closedInPeriod += section.data?.stats.closedInPeriod ?? 0
  }

  const items = [
    { label: "إجمالي القضايا المفتوحة", value: total },
    { label: "قضايا مع تعليقات", value: commented },
    { label: "ردّ المشرف", value: maintainerReplied },
    { label: "قضايا مسندة", value: assigned },
    { label: "برات في الفترة", value: prsInPeriod, hint: STATS_PERIOD_LABEL },
    { label: "مغلقة في الفترة", value: closedInPeriod, hint: STATS_PERIOD_LABEL },
  ]

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className="text-2xl font-bold tabular-nums">
              {item.value}
            </span>
            {item.hint && (
              <span className="text-[11px] text-muted-foreground">
                {item.hint}
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
