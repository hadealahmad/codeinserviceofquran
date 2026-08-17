import type { ProjectData } from "@/lib/github/types"
import { isInPeriod } from "@/lib/stats"

export function isBotUser(login: string): boolean {
  if (!login) return true
  const lower = login.toLowerCase()
  return (
    lower.endsWith("[bot]") ||
    lower === "actions-user" ||
    lower === "ghost" ||
    lower.includes("bot")
  )
}

export function isMaintainer(
  login: string,
  maintainers: string[] | Set<string>
): boolean {
  if (!login) return false
  const lower = login.toLowerCase()
  if (maintainers instanceof Set) {
    for (const m of maintainers) {
      if (m.toLowerCase() === lower) return true
    }
    return false
  }
  return maintainers.some((m) => m.toLowerCase() === lower)
}

/**
 * Pure client-safe calculation for the number of unique contributors across projects,
 * excluding maintainers of each project.
 */
export function countUniqueContributors(
  sections: { data: ProjectData | null }[],
  periodScope: "period" | "all" = "period"
): number {
  const uniqueUsers = new Set<string>()

  for (const section of sections) {
    const data = section.data
    if (!data) continue

    const maintainers = new Set(
      (data.maintainers ?? []).map((m) => m.toLowerCase())
    )
    const pulls = data.pulls ?? []

    for (const pull of pulls) {
      const login = pull.user?.login
      if (!login || isBotUser(login)) continue
      if (maintainers.has(login.toLowerCase())) continue
      if (periodScope === "period" && !isInPeriod(pull.createdAt)) continue

      uniqueUsers.add(login.toLowerCase())
    }
  }

  return uniqueUsers.size
}
