export const STATS_PERIOD = {
  start: "2026-08-10",
  end: "2026-12-10",
} as const

export const STATS_PERIOD_LABEL = "10 أغسطس – 10 ديسمبر 2026"
export const STATS_PERIOD_LABEL_EN = "10 Aug – 10 Dec 2026"

export function isInPeriod(
  dateStr?: string | null,
  startStr: string = STATS_PERIOD.start,
  endStr: string = STATS_PERIOD.end
): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr).getTime()
  const start = new Date(`${startStr}T00:00:00Z`).getTime()
  const end = new Date(`${endStr}T23:59:59Z`).getTime()
  return date >= start && date <= end
}
