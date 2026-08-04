"use client"

import { useLanguage } from "@/lib/language-context"
import type { ProjectData } from "@/lib/github/types"

export function RepoStats({ data }: { data: ProjectData }) {
  const { t } = useLanguage()

  const total = data.issues.length
  const commented = data.issues.filter((i) => i.comments.count > 0).length
  const maintainerReplied = data.issues.filter(
    (i) => i.comments.status === "maintainer"
  ).length
  const assigned = data.issues.filter((i) => i.assignees.length > 0).length
  const prsInPeriod = data.stats.prsInPeriod ?? 0
  const closedInPeriod = data.stats.closedInPeriod ?? 0

  const items = [
    { label: t("القضايا المفتوحة", "Open Issues"), value: total },
    { label: t("مع تعليقات", "With Comments"), value: commented },
    { label: t("ردّ المشرف", "Maintainer Replied"), value: maintainerReplied },
    { label: t("مسندة", "Assigned"), value: assigned },
    { label: t("برات في 30 يوم", "PRs in 30d"), value: prsInPeriod },
    { label: t("مغلقة في 30 يوم", "Closed in 30d"), value: closedInPeriod },
  ]

  return (
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-3 sm:grid-cols-3 md:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground font-medium">
            {item.label}
          </span>
          <span className="text-base font-bold tabular-nums text-foreground">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
