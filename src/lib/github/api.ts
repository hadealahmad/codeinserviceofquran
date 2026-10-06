import { cached } from "@/lib/cache"
import { RateLimitError } from "./errors"
import type {
  GhComment,
  GhIssue,
  GhPull,
  GhRepo,
  GhSearchResult,
  GhSocialAccount,
  GhUser,
  GhUserProfile,
} from "./types"

const BASE = "https://api.github.com"
const GRAPHQL_URL = "https://api.github.com/graphql"

const TOKEN = process.env.GITHUB_TOKEN

const HEADERS: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "itqan-issues-tracker",
}

if (TOKEN) HEADERS.Authorization = `Bearer ${TOKEN}`

const TTL = {
  repo: 60 * 60 * 1000,
  languages: 60 * 60 * 1000,
  assignees: 60 * 60 * 1000,
  issues: 5 * 60 * 1000,
  pulls: 10 * 60 * 1000,
  search: 30 * 60 * 1000,
  user: 24 * 60 * 60 * 1000,
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function ghFetch<T>(
  path: string,
  ttl: number,
  force = false
): Promise<T> {
  return cached<T>({
    key: path,
    ttl,
    force,
    fetch: async () => {
      let attempts = 0
      while (true) {
        const res = await fetch(BASE + path, {
          headers: HEADERS,
          cache: "no-store",
        })

        if (res.status === 403) {
          // Secondary rate limit: retry once after the requested delay.
          const retryAfter = res.headers.get("retry-after")
          if (attempts < 1 && retryAfter && Number(retryAfter) <= 10) {
            attempts += 1
            await sleep(Number(retryAfter) * 1000)
            continue
          }
          if (res.headers.get("x-ratelimit-remaining") === "0") {
            throw new RateLimitError()
          }
          throw new Error(`GitHub API 403 for ${path}`)
        }

        if (!res.ok) {
          throw new Error(`GitHub API ${res.status} for ${path}`)
        }
        return res.json() as Promise<T>
      }
    },
  })
}

type GraphQLResponse<T> = {
  data?: T
  errors?: { message: string; type?: string }[]
}

/**
 * Minimal GitHub GraphQL client. GraphQL uses a separate rate-limit bucket
 * (points per hour) from the REST API, and lets us fetch a repository's issues
 * together with their comments in a handful of requests instead of one per
 * issue.
 */
async function ghGraphQL<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  })

  if (res.status === 403 || res.status === 429) {
    if (res.headers.get("x-ratelimit-remaining") === "0") {
      throw new RateLimitError()
    }
    const retryAfter = res.headers.get("retry-after")
    if (retryAfter) {
      throw new Error(
        `GitHub GraphQL secondary rate limit; retry after ${retryAfter}s`
      )
    }
    throw new Error("GitHub GraphQL request forbidden")
  }

  if (!res.ok) {
    throw new Error(`GitHub GraphQL ${res.status}`)
  }

  const json = (await res.json()) as GraphQLResponse<T>
  if (json.errors?.length) {
    if (json.errors.some((error) => error.type === "RATE_LIMITED")) {
      throw new RateLimitError()
    }
    const message = json.errors.map((error) => error.message).join("; ")
    throw new Error(`GitHub GraphQL error: ${message}`)
  }
  if (!json.data) {
    throw new Error("GitHub GraphQL returned no data")
  }
  return json.data
}

type GqlAuthor = {
  __typename: string
  login: string
  avatarUrl: string
  url: string
}

type GqlIssueFields = {
  number: number
  title: string
  url: string
  state: "OPEN" | "CLOSED"
  createdAt: string
  updatedAt: string
  closedAt: string | null
  labels: { nodes: { name: string; color: string }[] }
  assignees: { nodes: GqlAuthor[] }
}

type GqlIssue = GqlIssueFields & {
  comments: {
    totalCount: number
    nodes: { createdAt: string; author: GqlAuthor | null }[]
  }
}

type GqlIssuesData = {
  repository: {
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: GqlIssue[]
    } | null
  } | null
}

type GqlClosedIssuesData = {
  repository: {
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: GqlIssueFields[]
    } | null
  } | null
}

function toGhIssue(node: GqlIssueFields, comments = 0): GhIssue {
  return {
    number: node.number,
    title: node.title,
    html_url: node.url,
    state: node.state === "OPEN" ? "open" : "closed",
    created_at: node.createdAt,
    updated_at: node.updatedAt,
    closed_at: node.closedAt,
    comments,
    labels: node.labels.nodes.map((label) => ({
      name: label.name,
      color: label.color,
    })),
    assignees: node.assignees.nodes.map(toGqlUser),
  }
}

export type IssuesWithComments = {
  issues: GhIssue[]
  commentsByNumber: Record<number, GhComment[]>
}

const ISSUES_WITH_COMMENTS_QUERY = `
  query IssuesWithComments(
    $owner: String!
    $name: String!
    $states: [IssueState!]
    $cursor: String
  ) {
    repository(owner: $owner, name: $name) {
      issues(
        first: 100
        states: $states
        after: $cursor
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          url
          state
          createdAt
          updatedAt
          closedAt
          comments(last: 100) {
            totalCount
            nodes {
              createdAt
              author {
                __typename
                login
                avatarUrl
                url
              }
            }
          }
          labels(first: 100) { nodes { name color } }
          assignees(first: 20) {
            nodes {
              __typename
              login
              avatarUrl
              url
            }
          }
        }
      }
    }
  }
`

const MAX_GRAPHQL_PAGES = 10

function toGqlUser(author: GqlAuthor): GhUser {
  return {
    login: author.login,
    id: 0,
    avatar_url: author.avatarUrl,
    html_url: author.url,
    type:
      author.__typename === "Bot"
        ? "Bot"
        : author.__typename === "Organization"
          ? "Organization"
          : "User",
  }
}

/**
 * Fetch issues for a repository (exclusive of pull requests) together with
 * each issue's most recent comments, in bulk. This replaces the previous
 * one-request-per-issue comment fetching that exhausted the REST rate limit.
 */
export function getIssuesWithComments(
  owner: string,
  repo: string,
  state: "open" | "closed",
  force?: boolean
): Promise<IssuesWithComments> {
  return cached<IssuesWithComments>({
    key: `graphql:issues:${owner}/${repo}:${state}`,
    ttl: TTL.issues,
    force,
    fetch: async () => {
      const issues: GhIssue[] = []
      const commentsByNumber: Record<number, GhComment[]> = {}
      let cursor: string | null = null

      for (let page = 0; page < MAX_GRAPHQL_PAGES; page++) {
        const data: GqlIssuesData = await ghGraphQL<GqlIssuesData>(
          ISSUES_WITH_COMMENTS_QUERY,
          {
            owner,
            name: repo,
            states: [state === "open" ? "OPEN" : "CLOSED"],
            cursor,
          }
        )

        const connection = data.repository?.issues
        if (!connection) break

        for (const node of connection.nodes) {
          issues.push(toGhIssue(node, node.comments.totalCount))

          if (node.comments.nodes.length > 0) {
            commentsByNumber[node.number] = node.comments.nodes.map(
              (comment) => ({
                user: comment.author ? toGqlUser(comment.author) : null,
                created_at: comment.createdAt,
              })
            )
          }
        }

        if (!connection.pageInfo.hasNextPage) break
        cursor = connection.pageInfo.endCursor
      }

      return { issues, commentsByNumber }
    },
  })
}

const CLOSED_ISSUES_QUERY = `
  query ClosedIssues($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      issues(
        first: 100
        states: [CLOSED]
        after: $cursor
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          url
          state
          createdAt
          updatedAt
          closedAt
          labels(first: 100) { nodes { name color } }
          assignees(first: 20) {
            nodes {
              __typename
              login
              avatarUrl
              url
            }
          }
        }
      }
    }
  }
`

/**
 * Fetch issues closed since a given date, paginated. Unlike the REST issues
 * endpoint this excludes pull requests (so PRs never crowd out issues within a
 * page limit) and is not capped at 100. Because closing an issue updates it,
 * issues are ordered by `updatedAt` desc and pagination stops once it passes
 * the cutoff.
 */
export function getClosedIssues(
  owner: string,
  repo: string,
  since: string,
  force?: boolean
): Promise<GhIssue[]> {
  return cached<GhIssue[]>({
    key: `graphql:closed-issues:${owner}/${repo}:${since}`,
    ttl: TTL.issues,
    force,
    fetch: async () => {
      const sinceMs = new Date(`${since}T00:00:00Z`).getTime()
      const cutoffIso = new Date(sinceMs).toISOString()
      const issues: GhIssue[] = []
      let cursor: string | null = null

      for (let page = 0; page < MAX_GRAPHQL_PAGES; page++) {
        const data: GqlClosedIssuesData = await ghGraphQL<GqlClosedIssuesData>(
          CLOSED_ISSUES_QUERY,
          { owner, name: repo, cursor }
        )

        const connection = data.repository?.issues
        if (!connection) break

        let reachedCutoff = false
        for (const node of connection.nodes) {
          if (node.updatedAt < cutoffIso) {
            reachedCutoff = true
            break
          }
          if (node.closedAt && node.closedAt >= cutoffIso) {
            issues.push(toGhIssue(node))
          }
        }

        if (reachedCutoff || !connection.pageInfo.hasNextPage) break
        cursor = connection.pageInfo.endCursor
      }

      return issues
    },
  })
}

export function getRepo(
  owner: string,
  repo: string,
  force?: boolean
): Promise<GhRepo> {
  return ghFetch(`/repos/${owner}/${repo}`, TTL.repo, force)
}

export function getLanguages(
  owner: string,
  repo: string,
  force?: boolean
): Promise<Record<string, number>> {
  return ghFetch(`/repos/${owner}/${repo}/languages`, TTL.languages, force)
}

export function getAssignees(
  owner: string,
  repo: string,
  force?: boolean
): Promise<GhUser[]> {
  return ghFetch(
    `/repos/${owner}/${repo}/assignees?per_page=100`,
    TTL.assignees,
    force
  )
}

type GqlPull = {
  number: number
  title: string
  url: string
  state: "OPEN" | "CLOSED" | "MERGED"
  createdAt: string
  updatedAt: string
  closedAt: string | null
  mergedAt: string | null
  body: string | null
  author: GqlAuthor | null
  closingIssuesReferences: {
    nodes: { number: number; state: "OPEN" | "CLOSED"; closedAt: string | null }[]
  }
}

type GqlPullsData = {
  repository: {
    pullRequests: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: GqlPull[]
    } | null
  } | null
}

const PULLS_QUERY = `
  query Pulls($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequests(
        first: 100
        states: [OPEN, CLOSED, MERGED]
        after: $cursor
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          title
          url
          state
          createdAt
          updatedAt
          closedAt
          mergedAt
          body
          author { __typename login avatarUrl url }
          closingIssuesReferences(first: 50) {
            nodes { number state closedAt }
          }
        }
      }
    }
  }
`

/**
 * Fetch all pull requests for a repository in bulk, including the issues each
 * one actually closes. Paginated, so no PRs are dropped (the REST endpoint was
 * capped at the 100 most recently updated).
 */
export function getPulls(
  owner: string,
  repo: string,
  force?: boolean
): Promise<GhPull[]> {
  return cached<GhPull[]>({
    key: `graphql:pulls:v2:${owner}/${repo}`,
    ttl: TTL.pulls,
    force,
    fetch: async () => {
      const pulls: GhPull[] = []
      let cursor: string | null = null

      for (let page = 0; page < MAX_GRAPHQL_PAGES; page++) {
        const data: GqlPullsData = await ghGraphQL<GqlPullsData>(PULLS_QUERY, {
          owner,
          name: repo,
          cursor,
        })

        const connection = data.repository?.pullRequests
        if (!connection) break

        for (const node of connection.nodes) {
          pulls.push({
            number: node.number,
            title: node.title,
            html_url: node.url,
            state: node.state === "OPEN" ? "open" : "closed",
            created_at: node.createdAt,
            updated_at: node.updatedAt,
            closed_at: node.closedAt,
            merged_at: node.mergedAt,
            body: node.body,
            user: node.author ? toGqlUser(node.author) : null,
            // Only issues that are actually closed count toward the "closed
            // issues" metric; closing keywords can also point at open issues.
            closing_issues: node.closingIssuesReferences.nodes
              .filter((issue) => issue.state === "CLOSED")
              .map((issue) => issue.number),
          })
        }

        if (!connection.pageInfo.hasNextPage) break
        cursor = connection.pageInfo.endCursor
      }

      return pulls
    },
  })
}

export function searchMaintainerComments(
  owner: string,
  repo: string,
  login: string,
  force?: boolean
): Promise<GhSearchResult> {
  const query = `repo:${owner}/${repo} is:issue commenter:${login}`
  return ghFetch(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=100`,
    TTL.search,
    force
  )
}

export function searchPrsInPeriod(
  owner: string,
  repo: string,
  start: string,
  end: string,
  force?: boolean
): Promise<GhSearchResult> {
  const query = `repo:${owner}/${repo} is:pr created:${start}..${end}`
  return ghFetch(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=1`,
    TTL.search,
    force
  )
}

export function searchClosedIssuesInPeriod(
  owner: string,
  repo: string,
  start: string,
  end: string,
  force?: boolean
): Promise<GhSearchResult> {
  const query = `repo:${owner}/${repo} is:issue is:closed closed:${start}..${end}`
  return ghFetch(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=1`,
    TTL.search,
    force
  )
}

export function getRepoEvents(
  owner: string,
  repo: string,
  force?: boolean
): Promise<import("./types").GhEvent[]> {
  return ghFetch(
    `/repos/${owner}/${repo}/issues/events?per_page=100`,
    TTL.issues,
    force
  )
}

export async function getUserProfile(
  username: string,
  force?: boolean
): Promise<GhUserProfile> {
  const [profileResult, socialsResult] = await Promise.allSettled([
    ghFetch<GhUserProfile>(`/users/${username}`, TTL.user, force),
    ghFetch<GhSocialAccount[]>(
      `/users/${username}/social_accounts`,
      TTL.user,
      force
    ),
  ])

  if (profileResult.status === "rejected") {
    throw profileResult.reason
  }

  const profile = profileResult.value
  if (socialsResult.status === "fulfilled" && Array.isArray(socialsResult.value)) {
    profile.social_accounts = socialsResult.value
  } else if (!profile.social_accounts) {
    profile.social_accounts = []
  }

  return profile
}


