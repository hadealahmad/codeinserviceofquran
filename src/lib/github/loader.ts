import { getProjectFromDb, saveProjectToDb } from "@/lib/db"
import type { Project } from "@/lib/projects"
import { STATS_PERIOD, isInPeriod } from "@/lib/stats"
import {
  getAssignees,
  getClosedIssuesSince,
  getComments,
  getIssues,
  getLanguages,
  getPulls,
  getRepo,
  getRepoEvents,
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
  const dbKey = state === "open" ? `${owner}/${repo}` : `${owner}/${repo}:closed`

  if (!force && !skipDb) {
    const cachedDb = await getProjectFromDb(dbKey)
    if (cachedDb) return cachedDb
  }

  // repo info and issues are required; everything else degrades gracefully.
  const [repoInfo, issues] = await Promise.all([
    getRepo(owner, repo, force),
    getIssues(owner, repo, state, force),
  ])

  const [languageBytes, assignableUsers, pulls, repoEvents, closedSince] = await Promise.all([
    settle(getLanguages(owner, repo, force)),
    settle(getAssignees(owner, repo, force)),
    settle(getPulls(owner, repo, force)),
    settle(getRepoEvents(owner, repo, force)),
    settle(getClosedIssuesSince(owner, repo, STATS_PERIOD.start, force)),
  ])

  // Count PRs created in the period directly from pulls
  const prsInPeriodCount = (pulls ?? []).filter((pr) =>
    isInPeriod(pr.created_at)
  ).length

  // Count issues closed in the period directly from closed issues since start
  const closedInPeriodCount = (closedSince ?? []).filter(
    (issue) => !issue.pull_request && isInPeriod(issue.closed_at)
  ).length

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

  const { commentedSet, repliedAtMap, lastCommentMap } = await detectMaintainerComments({
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
      maintainerRepliedAt =
        repliedAtMap.get(issue.number) ??
        (isInPeriod(issue.created_at) ? issue.created_at : (isInPeriod(issue.updated_at) ? issue.updated_at : null))
    } else if (count > 0) {
      status = "awaiting"
    }

    const assignedAt = issue.assignees.length > 0
      ? (assignedAtMap.get(issue.number) ??
         (isInPeriod(issue.created_at) ? issue.created_at : (isInPeriod(issue.updated_at) ? issue.updated_at : null)))
      : null

    const lastCommentAt =
      count > 0
        ? (lastCommentMap.get(issue.number) ??
           repliedAtMap.get(issue.number) ??
           (isInPeriod(issue.updated_at) ? issue.updated_at : issue.created_at))
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
        lastCommentAt,
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
      prsInPeriod: prsInPeriodCount,
      closedInPeriod: closedInPeriodCount,
    },
  }

  if (!skipDb) {
    saveProjectToDb(dbKey, projectData).catch(() => {})
  }

  return projectData
}

/**
 * Determine which issues have at least one comment from a repo maintainer,
 * and track exact comment timestamps via Core API.
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
}): Promise<{
  commentedSet: Set<number>
  repliedAtMap: Map<number, string>
  lastCommentMap: Map<number, string>
}> {
  const commentedSet = new Set<number>()
  const repliedAtMap = new Map<number, string>()
  const lastCommentMap = new Map<number, string>()

  const issuesWithComments = issues.filter(
    (issue) => !issue.pull_request && issue.comments > 0
  )

  if (issuesWithComments.length === 0) {
    return { commentedSet, repliedAtMap, lastCommentMap }
  }

  const logins = new Set([...maintainers].map((login) => login.toLowerCase()))

  const results = await Promise.allSettled(
    issuesWithComments.map(async (issue) => {
      const comments = await getComments(owner, repo, issue.number, force)
      return { issueNumber: issue.number, comments }
    })
  )

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.comments?.length) {
      const { issueNumber, comments } = result.value
      const lastComment = comments[comments.length - 1]
      if (lastComment?.created_at) {
        lastCommentMap.set(issueNumber, lastComment.created_at)
      }

      const maintainerComments = comments.filter(
        (c) => c.user?.login && logins.has(c.user.login.toLowerCase())
      )

      if (maintainerComments.length > 0) {
        commentedSet.add(issueNumber)
        const latest = maintainerComments[maintainerComments.length - 1]
        if (latest?.created_at) {
          repliedAtMap.set(issueNumber, latest.created_at)
        }
      }
    }
  }

  return { commentedSet, repliedAtMap, lastCommentMap }
}

