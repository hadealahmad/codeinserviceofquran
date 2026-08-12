import { getProjectFromDb, saveProjectToDb } from "@/lib/db"
import type { Project } from "@/lib/projects"
import { STATS_PERIOD, isInPeriod } from "@/lib/stats"
import {
  getAssignees,
  getComments,
  getIssues,
  getLanguages,
  getPulls,
  getRepo,
  getRepoEvents,
  searchClosedIssuesInPeriod,
  searchMaintainerComments,
  searchPrsInPeriod,
} from "./api"
import { buildRelatedPrs, toLanguages } from "./process"
import type { CommentStatus, ProcessedIssue, ProjectData } from "./types"

type LoadOptions = {
  state?: "open" | "closed"
  force?: boolean
  skipDb?: boolean
}

const settle = <T>(promise: Promise<T>): Promise<T | null> =>
  promise.catch(() => null)

export async function loadProject(
  project: Project,
  options: LoadOptions = {}
): Promise<ProjectData> {
  const { state = "open", force = false, skipDb = false } = options
  const { owner, repo } = project
  const id = `${owner}/${repo}`

  if (!force && !skipDb && state === "open") {
    const cachedDb = await getProjectFromDb(id)
    if (cachedDb) return cachedDb
  }

  // repo info and issues are required; everything else degrades gracefully.
  const [repoInfo, issues] = await Promise.all([
    getRepo(owner, repo, force),
    getIssues(owner, repo, state, force),
  ])

  const [languageBytes, assignableUsers, pulls, repoEvents] = await Promise.all([
    settle(getLanguages(owner, repo, force)),
    settle(getAssignees(owner, repo, force)),
    settle(getPulls(owner, repo, force)),
    settle(getRepoEvents(owner, repo, force)),
  ])

  const [prsInPeriod, closedInPeriod] = await Promise.all([
    settle(
      searchPrsInPeriod(
        owner,
        repo,
        STATS_PERIOD.start,
        STATS_PERIOD.end,
        force
      )
    ),
    settle(
      searchClosedIssuesInPeriod(
        owner,
        repo,
        STATS_PERIOD.start,
        STATS_PERIOD.end,
        force
      )
    ),
  ])

  // Map issue numbers to assignedAt timestamp from issue events
  const assignedAtMap = new Map<number, string>()
  if (repoEvents) {
    for (const event of repoEvents) {
      if (event.event === "assigned" && event.issue?.number && event.created_at) {
        const num = event.issue.number
        const existing = assignedAtMap.get(num)
        if (!existing || new Date(event.created_at) > new Date(existing)) {
          assignedAtMap.set(num, event.created_at)
        }
      }
    }
  }

  // People who can be assigned = collaborators with write access, i.e. the
  // people whose replies count as "maintainer replies".
  const maintainers = new Set<string>([
    repoInfo.owner.login,
    ...(assignableUsers ?? []).map((user) => user.login),
  ])

  const { commentedSet, repliedAtMap } = await detectMaintainerComments({
    owner,
    repo,
    maintainers,
    issues,
    force,
  })

  const relatedPrMap = buildRelatedPrs(pulls ?? [])

  const processed: ProcessedIssue[] = []
  for (const issue of issues) {
    if (issue.pull_request) continue

    const count = issue.comments
    let status: CommentStatus = "none"
    let maintainerRepliedAt: string | null = null

    if (count > 0 && commentedSet.has(issue.number)) {
      status = "maintainer"
      maintainerRepliedAt = repliedAtMap.get(issue.number) ?? (isInPeriod(issue.created_at) ? issue.created_at : null)
    } else if (count > 0) {
      status = "awaiting"
    }

    const assignedAt = issue.assignees.length > 0
      ? (assignedAtMap.get(issue.number) ?? (isInPeriod(issue.created_at) ? issue.created_at : null))
      : null

    processed.push({
      number: issue.number,
      title: issue.title,
      htmlUrl: issue.html_url,
      state: issue.state,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      assignedAt,
      maintainerRepliedAt,
      labels: issue.labels.map((label) => ({
        name: label.name,
        color: label.color,
      })),
      assignees: issue.assignees.map((user) => ({
        login: user.login,
        avatarUrl: user.avatar_url,
        htmlUrl: user.html_url,
      })),
      comments: {
        count,
        status,
        lastCommentAt: count > 0 ? (repliedAtMap.get(issue.number) ?? issue.updated_at) : null,
      },
      relatedPRs: relatedPrMap.get(issue.number) ?? [],
    })
  }

  processed.sort((a, b) => b.number - a.number)

  const projectData: ProjectData = {
    project,
    meta: {
      fullName: repoInfo.full_name,
      htmlUrl: repoInfo.html_url,
      topics: repoInfo.topics ?? [],
      defaultBranch: repoInfo.default_branch,
      stars: repoInfo.stargazers_count,
      forks: repoInfo.forks_count,
      openIssuesCount: repoInfo.open_issues_count,
      owner: {
        login: repoInfo.owner.login,
        avatarUrl: repoInfo.owner.avatar_url,
        htmlUrl: repoInfo.owner.html_url,
      },
    },
    languages: toLanguages(languageBytes ?? {}),
    maintainers: [...maintainers],
    issues: processed,
    stats: {
      prsInPeriod: prsInPeriod?.total_count ?? 0,
      closedInPeriod: closedInPeriod?.total_count ?? 0,
    },
  }

  if (!skipDb && state === "open") {
    saveProjectToDb(id, projectData).catch(() => {})
  }

  return projectData
}

/**
 * Determine which issues have at least one comment from a repo maintainer.
 * Uses one search query per maintainer (separate rate limit bucket). If all
 * searches fail, falls back to fetching comments per issue.
 */
async function detectMaintainerComments({
  owner,
  repo,
  maintainers,
  issues,
  force,
}: {
  owner: string
  repo: string
  maintainers: Set<string>
  issues: { number: number; comments: number; pull_request?: unknown; updated_at?: string }[]
  force: boolean
}): Promise<{ commentedSet: Set<number>; repliedAtMap: Map<number, string> }> {
  const commentedSet = new Set<number>()
  const repliedAtMap = new Map<number, string>()

  const searchResults = await Promise.allSettled(
    [...maintainers].map((login) =>
      searchMaintainerComments(owner, repo, login, force)
    )
  )
  const anySearchSucceeded = searchResults.some(
    (result) => result.status === "fulfilled"
  )

  for (const result of searchResults) {
    if (result.status === "fulfilled") {
      for (const item of result.value.items) {
        commentedSet.add(item.number)
        const date = item.updated_at ?? item.created_at
        if (date) {
          repliedAtMap.set(item.number, date)
        }
      }
    }
  }

  if (!anySearchSucceeded) {
    const logins = new Set(
      [...maintainers].map((login) => login.toLowerCase())
    )
    for (const issue of issues) {
      if (issue.pull_request || issue.comments === 0) continue
      const authors = await settle(
        getComments(owner, repo, issue.number, force)
      )
      if (!authors) continue
      const maintainerComments = authors.filter(
        (comment) =>
          comment.user?.login &&
          logins.has(comment.user.login.toLowerCase())
      )
      if (maintainerComments.length > 0) {
        commentedSet.add(issue.number)
        const latestComment = maintainerComments[maintainerComments.length - 1]
        if (latestComment.created_at) {
          repliedAtMap.set(issue.number, latestComment.created_at)
        }
      }
    }
  }

  return { commentedSet, repliedAtMap }
}
