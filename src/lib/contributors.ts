import { getUsersFromDb, saveUsersToDb } from "@/lib/db"
import { getUserProfile } from "@/lib/github/api"
import type {
  ContributorItem,
  ContributorProjectGroup,
  GhUserProfile,
  ProjectData,
} from "@/lib/github/types"
import type { Project } from "@/lib/projects"
import { isInPeriod } from "@/lib/stats"
import { isBotUser } from "./contributors-utils"

export * from "./contributors-utils"

export type ProjectSectionItem = {
  project: Project
  data: ProjectData | null
}

/**
 * Extract and enrich full contributor items across all projects (server-side).
 * Checks the database cache first to prevent GitHub rate limits and ensure fast loads.
 */
export async function extractContributors(
  sections: ProjectSectionItem[],
  options: { force?: boolean } = {}
): Promise<ContributorItem[]> {
  type RawContributorData = {
    login: string
    canonicalLogin: string
    avatarUrl: string
    htmlUrl: string
    prsByProjectMap: Map<
      string,
      {
        project: Project
        meta?: { fullName: string; tag?: string }
        prs: import("@/lib/github/types").ContributorPr[]
      }
    >
  }

  const rawMap = new Map<string, RawContributorData>()

  for (const section of sections) {
    const { project, data } = section
    if (!data) continue

    const repoKey = `${project.owner}/${project.repo}`
    const maintainers = new Set(
      (data.maintainers ?? []).map((m) => m.toLowerCase())
    )
    const pulls = data.pulls ?? []

    for (const pull of pulls) {
      const login = pull.user?.login
      if (!login || isBotUser(login)) continue
      if (maintainers.has(login.toLowerCase())) continue

      const key = login.toLowerCase()
      let item = rawMap.get(key)
      if (!item) {
        item = {
          login: key,
          canonicalLogin: login,
          avatarUrl: pull.user.avatarUrl,
          htmlUrl: pull.user.htmlUrl,
          prsByProjectMap: new Map(),
        }
        rawMap.set(key, item)
      }

      let projectGroup = item.prsByProjectMap.get(repoKey)
      if (!projectGroup) {
        projectGroup = {
          project,
          meta: {
            fullName: data.meta.fullName,
            tag: project.tag,
          },
          prs: [],
        }
        item.prsByProjectMap.set(repoKey, projectGroup)
      }

      projectGroup.prs.push({
        number: pull.number,
        title: pull.title,
        htmlUrl: pull.htmlUrl,
        state: pull.state,
        createdAt: pull.createdAt,
        closedAt: pull.closedAt,
        mergedAt: pull.mergedAt,
        relatedClosedIssues: pull.relatedClosedIssues ?? [],
        inPeriod: isInPeriod(pull.createdAt),
      })
    }
  }

  const allLogins = [...rawMap.values()].map((c) => c.canonicalLogin)
  const profileMap = new Map<string, GhUserProfile>()

  // 1. Read existing user profiles from Database if not forced
  if (!options.force) {
    const dbProfiles = await getUsersFromDb(allLogins)
    for (const [login, profile] of dbProfiles.entries()) {
      profileMap.set(login.toLowerCase(), profile)
    }
  }

  // 2. Determine which profiles are missing from the DB
  const missingLogins = allLogins.filter(
    (login) => !profileMap.has(login.toLowerCase())
  )

  // 3. Fetch missing profiles from GitHub API in parallel
  if (missingLogins.length > 0) {
    const newlyFetched: GhUserProfile[] = []
    const profilesResult = await Promise.allSettled(
      missingLogins.map((login) => getUserProfile(login, options.force))
    )

    profilesResult.forEach((res, index) => {
      if (res.status === "fulfilled" && res.value) {
        const user = res.value
        profileMap.set(missingLogins[index].toLowerCase(), user)
        newlyFetched.push(user)
      }
    })

    // 4. Save newly fetched profiles to Database in background
    if (newlyFetched.length > 0) {
      saveUsersToDb(newlyFetched).catch((err) => {
        console.warn("[Contributors] Warning: Failed to save users to DB:", err)
      })
    }
  }

  const contributors: ContributorItem[] = []

  for (const raw of rawMap.values()) {
    const profile = profileMap.get(raw.login)

    const prsByProject: ContributorProjectGroup[] = []
    let totalPrsCount = 0
    let prsInPeriodCount = 0
    let acceptedPrsInPeriodCount = 0
    let acceptedPrsTotalCount = 0
    const inPeriodClosedIssues = new Set<string>()
    const allClosedIssues = new Set<string>()

    for (const group of raw.prsByProjectMap.values()) {
      // Sort PRs in project newest first
      group.prs.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      prsByProject.push(group)
      totalPrsCount += group.prs.length

      for (const pr of group.prs) {
        const isMerged = pr.state === "merged"
        if (isMerged) {
          acceptedPrsTotalCount++
          if (pr.inPeriod) acceptedPrsInPeriodCount++
        }
        if (pr.inPeriod) prsInPeriodCount++

        for (const issueNum of pr.relatedClosedIssues ?? []) {
          const key = `${group.project.owner}/${group.project.repo}#${issueNum}`
          allClosedIssues.add(key)
          if (pr.inPeriod) inPeriodClosedIssues.add(key)
        }
      }
    }

    // Sort project groups by PR count descending
    prsByProject.sort((a, b) => b.prs.length - a.prs.length)

    const website = profile?.blog
      ? profile.blog.startsWith("http://") || profile.blog.startsWith("https://")
        ? profile.blog
        : `https://${profile.blog}`
      : null

    contributors.push({
      login: raw.canonicalLogin,
      name: profile?.name || null,
      avatarUrl: profile?.avatar_url || raw.avatarUrl,
      htmlUrl: profile?.html_url || raw.htmlUrl,
      email: profile?.email || null,
      website: website && website.trim() !== "" ? website.trim() : null,
      bio: profile?.bio || null,
      prsInPeriodCount,
      acceptedPrsInPeriodCount,
      acceptedPrsTotalCount,
      relatedClosedIssuesInPeriodCount: inPeriodClosedIssues.size,
      relatedClosedIssuesTotalCount: allClosedIssues.size,
      totalPrsCount,
      projectsCount: prsByProject.length,
      prsByProject,
    })
  }

  // Default sort: number of PRs made in period descending, then total PRs descending, then name
  contributors.sort((a, b) => {
    if (b.prsInPeriodCount !== a.prsInPeriodCount) {
      return b.prsInPeriodCount - a.prsInPeriodCount
    }
    if (b.totalPrsCount !== a.totalPrsCount) {
      return b.totalPrsCount - a.totalPrsCount
    }
    return a.login.localeCompare(b.login)
  })

  return contributors
}
