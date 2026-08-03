import { cached } from "@/lib/cache"
import { RateLimitError } from "./errors"
import type {
  GhComment,
  GhIssue,
  GhPull,
  GhRepo,
  GhSearchResult,
  GhUser,
} from "./types"

const BASE = "https://api.github.com"

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
  comments: 30 * 60 * 1000,
  search: 30 * 60 * 1000,
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

export function getIssues(
  owner: string,
  repo: string,
  state: "open" | "closed",
  force?: boolean
): Promise<GhIssue[]> {
  return ghFetch(
    `/repos/${owner}/${repo}/issues?state=${state}&per_page=100&sort=created&direction=desc`,
    TTL.issues,
    force
  )
}

export function getPulls(
  owner: string,
  repo: string,
  force?: boolean
): Promise<GhPull[]> {
  return ghFetch(
    `/repos/${owner}/${repo}/pulls?state=all&per_page=100&sort=updated&direction=desc`,
    TTL.pulls,
    force
  )
}

export function getComments(
  owner: string,
  repo: string,
  issueNumber: number,
  force?: boolean
): Promise<GhComment[]> {
  return ghFetch(
    `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`,
    TTL.comments,
    force
  )
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
