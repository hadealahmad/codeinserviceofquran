import type { Project } from "@/lib/projects"
import { STATS_PERIOD } from "@/lib/stats"
import {
  getAssignees,
  getComments,
  getIssues,
  getLanguages,
  getPulls,
  getRepo,
  searchClosedIssuesInPeriod,
  searchMaintainerComments,
  searchPrsInPeriod,
} from "./api"
import { buildRelatedPrs, toLanguages } from "./process"
import type { CommentStatus, ProcessedIssue, ProjectData } from "./types"

type LoadOptions = {
  state?: "open" | "closed"
  force?: boolean
}

const settle = <T>(promise: Promise<T>): Promise<T | null> =>
  promise.catch(() => null)

export async function loadProject(
  project: Project,
  options: LoadOptions = {}
): Promise<ProjectData> {
  const { state = "open", force = false } = options
  const { owner, repo } = project

  // repo info and issues are required; everything else degrades gracefully.
  const [repoInfo, issues] = await Promise.all([
    getRepo(owner, repo, force),
    getIssues(owner, repo, state, force),
  ])

  const [languageBytes, assignableUsers, pulls] = await Promise.all([
    settle(getLanguages(owner, repo, force)),
    settle(getAssignees(owner, repo, force)),
    settle(getPulls(owner, repo, force)),
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

  // People who can be assigned = collaborators with write access, i.e. the
  // people whose replies count as "maintainer replies".
  const maintainers = new Set<string>([
    repoInfo.owner.login,
    ...(assignableUsers ?? []).map((user) => user.login),
  ])

  const maintainerCommented = await detectMaintainerComments({
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
    if (count > 0) {
      status = maintainerCommented.has(issue.number)
        ? "maintainer"
        : "awaiting"
    }

    processed.push({
      number: issue.number,
      title: issue.title,
      htmlUrl: issue.html_url,
      state: issue.state,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      labels: issue.labels.map((label) => ({
        name: label.name,
        color: label.color,
      })),
      assignees: issue.assignees.map((user) => ({
        login: user.login,
        avatarUrl: user.avatar_url,
        htmlUrl: user.html_url,
      })),
      comments: { count, status },
      relatedPRs: relatedPrMap.get(issue.number) ?? [],
    })
  }

  processed.sort((a, b) => b.number - a.number)

  return {
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
  issues: { number: number; comments: number; pull_request?: unknown }[]
  force: boolean
}): Promise<Set<number>> {
  const commented = new Set<number>()

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
      for (const item of result.value.items) commented.add(item.number)
    }
  }

  if (!anySearchSucceeded) {
    for (const issue of issues) {
      if (issue.pull_request || issue.comments === 0) continue
      const authors = await settle(
        getComments(owner, repo, issue.number, force)
      )
      if (!authors) continue
      const logins = new Set(
        [...maintainers].map((login) => login.toLowerCase())
      )
      if (
        authors.some(
          (comment) =>
            comment.user?.login &&
            logins.has(comment.user.login.toLowerCase())
        )
      ) {
        commented.add(issue.number)
      }
    }
  }

  return commented
}
