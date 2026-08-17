import type { Project } from "@/lib/projects"

export type GhUser = {
  login: string
  id: number
  avatar_url: string
  html_url: string
  type: "User" | "Organization" | "Bot"
}

export type GhRepo = {
  full_name: string
  name: string
  html_url: string
  default_branch: string
  topics: string[]
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language: string | null
  owner: GhUser
}

export type GhLabel = {
  name: string
  color: string
}

export type GhIssue = {
  number: number
  title: string
  html_url: string
  state: "open" | "closed"
  created_at: string
  updated_at: string
  closed_at?: string | null
  comments: number
  assignees: GhUser[]
  labels: GhLabel[]
  pull_request?: { url: string } | null
}

export type GhComment = {
  user: GhUser | null
  created_at?: string
}

export type GhEvent = {
  id: number
  event: string
  created_at: string
  issue?: { number: number }
  assignee?: GhUser
}

export type GhPull = {
  number: number
  title: string
  html_url: string
  state: "open" | "closed"
  created_at?: string
  updated_at?: string
  closed_at?: string | null
  merged_at: string | null
  body: string | null
  user?: GhUser | null
}

export type GhUserProfile = {
  login: string
  id: number
  avatar_url: string
  html_url: string
  name: string | null
  email: string | null
  blog: string | null
  bio?: string | null
  location?: string | null
  company?: string | null
}

export type ProcessedPull = {
  number: number
  title: string
  htmlUrl: string
  state: "open" | "closed" | "merged"
  createdAt: string
  closedAt?: string | null
  mergedAt?: string | null
  relatedClosedIssues?: number[]
  user: {
    login: string
    avatarUrl: string
    htmlUrl: string
  }
}

export type GhSearchResult = {
  total_count: number
  items: { number: number; title: string; updated_at?: string; created_at?: string }[]
}

export type LanguageInfo = {
  name: string
  bytes: number
  percent: number
  color: string
}

export type Assignee = {
  login: string
  avatarUrl: string
  htmlUrl: string
}

export type IssueLabel = {
  name: string
  color: string
}

export type RelatedPr = {
  number: number
  title: string
  htmlUrl: string
  state: "open" | "closed" | "merged"
}

export type CommentStatus = "none" | "awaiting" | "maintainer"

export type ProcessedIssue = {
  number: number
  title: string
  htmlUrl: string
  state: "open" | "closed"
  createdAt: string
  updatedAt: string
  assignedAt?: string | null
  maintainerRepliedAt?: string | null
  labels: IssueLabel[]
  assignees: Assignee[]
  comments: {
    count: number
    status: CommentStatus
    lastCommentAt?: string | null
  }
  relatedPRs: RelatedPr[]
}

export type ProjectMeta = {
  fullName: string
  htmlUrl: string
  topics: string[]
  defaultBranch: string
  stars: number
  forks: number
  openIssuesCount: number
  owner: {
    login: string
    avatarUrl: string
    htmlUrl: string
  }
}

export type ProjectStats = {
  prsInPeriod: number
  closedInPeriod: number
}

export type ProjectData = {
  project: Project
  meta: ProjectMeta
  languages: LanguageInfo[]
  maintainers: string[]
  issues: ProcessedIssue[]
  pulls?: ProcessedPull[]
  stats: ProjectStats
}

export type ContributorPr = {
  number: number
  title: string
  htmlUrl: string
  state: "open" | "closed" | "merged"
  createdAt: string
  closedAt?: string | null
  mergedAt?: string | null
  relatedClosedIssues?: number[]
  inPeriod: boolean
}

export type ContributorProjectGroup = {
  project: Project
  meta?: {
    fullName: string
    tag?: string
  }
  prs: ContributorPr[]
}

export type ContributorItem = {
  login: string
  name: string | null
  avatarUrl: string
  htmlUrl: string
  email: string | null
  website: string | null
  bio: string | null
  prsInPeriodCount: number
  acceptedPrsInPeriodCount: number
  acceptedPrsTotalCount: number
  relatedClosedIssuesInPeriodCount: number
  relatedClosedIssuesTotalCount: number
  totalPrsCount: number
  projectsCount: number
  prsByProject: ContributorProjectGroup[]
}
