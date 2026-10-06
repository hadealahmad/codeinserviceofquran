import { getProjectFromDb, saveProjectToDb } from "@/lib/db"
import { isBotUser } from "@/lib/contributors-utils"
import type { Project } from "@/lib/projects"
import { STATS_PERIOD, isInPeriod } from "@/lib/stats"
import {
  getAssignees,
  getClosedIssues,
  getIssuesWithComments,
  getLanguages,
  getPulls,
  getRepo,
  getRepoEvents,
} from "./api"
import { buildRelatedPrs, extractIssueReferences, toLanguages } from "./process"
import type {
  CommentStatus,
  GhComment,
  GhPull,
  ProcessedIssue,
  ProjectData,
} from "./types"

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
  const [repoInfo, issuesWithComments] = await Promise.all([
    getRepo(owner, repo, force),
    getIssuesWithComments(owner, repo, state, force),
  ])
  const { issues, commentsByNumber } = issuesWithComments

  const [languageBytes, assignableUsers, pulls, repoEvents, closedSince] = await Promise.all([
    settle(getLanguages(owner, repo, force)),
    settle(getAssignees(owner, repo, force)),
    settle(getPulls(owner, repo, force)),
    settle(getRepoEvents(owner, repo, force)),
    settle(getClosedIssues(owner, repo, STATS_PERIOD.start, force)),
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

  const { commentedSet, repliedAtMap, lastCommentMap } = detectMaintainerComments({
    maintainers,
    commentsByNumber,
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

  const openIssueNumbers = new Set(
    issues.filter((i) => !i.pull_request).map((i) => i.number)
  )
  const closedIssueNumbers = new Set(
    (closedSince ?? []).filter((i) => !i.pull_request).map((i) => i.number)
  )

  // Issue number -> authors whose PR links it via GitHub's closing keywords.
  // Used so the post-hoc attribution below does not re-credit a contributor
  // who already linked the issue, while still allowing a contributor to be
  // credited when a maintainer's PR was the one that linked it.
  const linkedByAuthor = new Map<number, Set<string>>()
  for (const pull of pulls ?? []) {
    const login = pull.user?.login?.toLowerCase()
    if (!login) continue
    for (const num of pull.closing_issues ?? []) {
      const set = linkedByAuthor.get(num) ?? new Set<string>()
      set.add(login)
      linkedByAuthor.set(num, set)
    }
  }

  // Closed issues (with title, assignees and both timestamps) for attribution.
  const closedIssueInfo = new Map<
    number,
    {
      title: string
      createdAt: string | null
      closedAt: string | null
      assignees: Set<string>
    }
  >()
  for (const issue of closedSince ?? []) {
    if (issue.pull_request) continue
    closedIssueInfo.set(issue.number, {
      title: issue.title,
      createdAt: issue.created_at,
      closedAt: issue.closed_at ?? null,
      assignees: new Set(issue.assignees.map((user) => user.login.toLowerCase())),
    })
  }

  const heuristicClosedByPull = computeHeuristicClosedByPull(
    pulls ?? [],
    closedIssueInfo,
    linkedByAuthor
  )

  const processedPulls: import("./types").ProcessedPull[] = (pulls ?? []).map((pull) => {
    const relatedClosed = attributeClosedIssues(
      pull,
      heuristicClosedByPull.get(pull.number) ?? [],
      { closedIssueNumbers, openIssueNumbers }
    )

    return {
      number: pull.number,
      title: pull.title,
      htmlUrl: pull.html_url,
      state: pull.merged_at ? "merged" : (pull.state === "closed" ? "closed" : "open"),
      createdAt: pull.created_at ?? "",
      closedAt: pull.closed_at,
      mergedAt: pull.merged_at,
      relatedClosedIssues: relatedClosed,
      user: {
        login: pull.user?.login ?? "ghost",
        avatarUrl: pull.user?.avatar_url ?? "",
        htmlUrl: pull.user?.html_url ?? `https://github.com/${pull.user?.login ?? "ghost"}`,
      },
    }
  })

  // Contributor-only period stats: pull requests authored by non-maintainers,
  // and issues closed in the period credited to one of those PRs.
  const maintainerLogins = new Set(
    [...maintainers].map((login) => login.toLowerCase())
  )
  const isContributor = (login?: string) =>
    !!login && !isBotUser(login) && !maintainerLogins.has(login.toLowerCase())

  const contributorPeriodPulls = new Set(
    (pulls ?? [])
      .filter((pull) => isContributor(pull.user?.login) && isInPeriod(pull.created_at))
      .map((pull) => pull.number)
  )

  const prsInPeriodCount = contributorPeriodPulls.size

  const closedInPeriodNumbers = new Set<number>()
  for (const pull of processedPulls) {
    if (!contributorPeriodPulls.has(pull.number)) continue
    for (const num of pull.relatedClosedIssues ?? []) {
      const info = closedIssueInfo.get(num)
      if (info?.closedAt && isInPeriod(info.closedAt)) closedInPeriodNumbers.add(num)
    }
  }
  const closedInPeriodCount = closedInPeriodNumbers.size

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
    pulls: processedPulls,
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
 * Determine which issues have at least one comment from a repo maintainer, and
 * track exact comment timestamps. Comments are supplied in bulk by the GraphQL
 * issues query, so no per-issue requests are needed.
 */
function detectMaintainerComments({
  maintainers,
  commentsByNumber,
}: {
  maintainers: Set<string>
  commentsByNumber: Record<number, GhComment[]>
}): {
  commentedSet: Set<number>
  repliedAtMap: Map<number, string>
  lastCommentMap: Map<number, string>
} {
  const commentedSet = new Set<number>()
  const repliedAtMap = new Map<number, string>()
  const lastCommentMap = new Map<number, string>()

  const logins = new Set([...maintainers].map((login) => login.toLowerCase()))

  for (const [key, comments] of Object.entries(commentsByNumber)) {
    if (!comments?.length) continue
    const issueNumber = Number(key)

    const lastComment = comments[comments.length - 1]
    if (lastComment?.created_at) {
      lastCommentMap.set(issueNumber, lastComment.created_at)
    }

    const maintainerComments = comments.filter(
      (comment) => comment.user?.login && logins.has(comment.user.login.toLowerCase())
    )

    if (maintainerComments.length > 0) {
      commentedSet.add(issueNumber)
      const latest = maintainerComments[maintainerComments.length - 1]
      if (latest?.created_at) {
        repliedAtMap.set(issueNumber, latest.created_at)
      }
    }
  }

  return { commentedSet, repliedAtMap, lastCommentMap }
}

/**
 * Token overlap between two titles, in [0, 1]. Used only to choose, among an
 * assignee's merged PRs, the one most likely to have implemented the issue.
 */
function titleOverlap(a: string, b: string): number {
  const tokenize = (value: string) =>
    new Set(
      value
        .toLowerCase()
        .replace(/\[[^\]]*\]/g, " ")
        .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2)
    )
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let intersection = 0
  for (const word of ta) if (tb.has(word)) intersection++
  return intersection / Math.min(ta.size, tb.size)
}

/**
 * Post-hoc, stats-only recovery of issues a contributor delivered but was never
 * credited for.
 *
 * GitHub normally links an issue to the PR that closes it via closing keywords,
 * but that link is missing in several common cases: fork PRs (a bare `#N`
 * resolves to the fork's numbering), descriptions that reference the issue
 * without an English keyword (e.g. the Arabic "يعالج #N"), or issues a
 * maintainer later closed manually or via a follow-up PR.
 *
 * For every closed issue assigned to a contributor who did not link it, the
 * assignee's merged PR whose merge falls within the issue's open window
 * (`createdAt` .. `closedAt`) is credited with closing it. When several
 * qualify, the one whose title is most similar to the issue wins. This
 * deliberately errs toward over-attribution so real contributions are missed
 * as rarely as possible.
 */
function computeHeuristicClosedByPull(
  pulls: GhPull[],
  closedIssueInfo: Map<
    number,
    {
      title: string
      createdAt: string | null
      closedAt: string | null
      assignees: Set<string>
    }
  >,
  linkedByAuthor: Map<number, Set<string>>
): Map<number, number[]> {
  const byPull = new Map<number, number[]>()

  for (const [num, info] of closedIssueInfo) {
    if (!info.closedAt) continue
    const alreadyLinked = linkedByAuthor.get(num) ?? new Set<string>()
    const candidates = [...info.assignees].filter(
      (login) => !alreadyLinked.has(login)
    )
    if (candidates.length === 0) continue

    const openFrom = info.createdAt ? new Date(info.createdAt).getTime() : 0
    const closedMs = new Date(info.closedAt).getTime()

    let best: { number: number; score: number; diff: number } | null = null
    for (const pull of pulls) {
      const author = pull.user?.login?.toLowerCase()
      if (!pull.merged_at || !author || !candidates.includes(author)) continue
      const mergedMs = new Date(pull.merged_at).getTime()
      if (mergedMs < openFrom || mergedMs > closedMs) continue
      const score = titleOverlap(info.title, pull.title)
      const diff = closedMs - mergedMs
      if (
        !best ||
        score > best.score ||
        (score === best.score && diff < best.diff)
      ) {
        best = { number: pull.number, score, diff }
      }
    }

    if (best) {
      const list = byPull.get(best.number) ?? []
      list.push(num)
      byPull.set(best.number, list)
    }
  }

  return byPull
}

/**
 * The closed issues a PR should be credited with: GitHub's closing references
 * (or the legacy title/body fallback for stale cached payloads) plus any
 * recovered by {@link computeHeuristicClosedByPull}.
 */
function attributeClosedIssues(
  pull: GhPull,
  heuristicClosed: number[],
  {
    closedIssueNumbers,
    openIssueNumbers,
  }: {
    closedIssueNumbers: Set<number>
    openIssueNumbers: Set<number>
  }
): number[] {
  const result = new Set(
    pull.closing_issues
      ? pull.closing_issues
      : [...extractIssueReferences(`${pull.title}\n${pull.body ?? ""}`)].filter(
          (num) =>
            closedIssueNumbers.has(num) ||
            (!openIssueNumbers.has(num) && pull.merged_at)
        )
  )

  for (const num of heuristicClosed) result.add(num)

  return [...result]
}

