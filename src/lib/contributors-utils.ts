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

export type ParsedContributorSocials = {
  website: string | null
  twitter: string | null
  linkedin: string | null
  otherSocials: import("@/lib/github/types").GhSocialAccount[]
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }
  return `https://${trimmed}`
}

function normalizeTwitterUrl(handleOrUrl: string): string {
  const trimmed = handleOrUrl.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace("http://", "https://")
  }
  const cleanHandle = trimmed.replace(/^@/, "").replace(/^[a-zA-Z0-9_.]+\/(?:twitter\.com|x\.com)\//, "")
  return `https://x.com/${cleanHandle}`
}

function normalizeLinkedinUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace("http://", "https://")
  }
  return `https://${trimmed}`
}

const SOCIAL_DOMAINS = [
  "linkedin.com",
  "twitter.com",
  "x.com",
  "github.com",
  "youtube.com",
  "youtu.be",
  "t.me",
  "telegram.me",
  "facebook.com",
  "instagram.com",
  "discord.gg",
  "discord.com",
  "medium.com",
  "reddit.com",
  "tiktok.com",
  "mastodon.",
]

function isSocialDomain(url: string): boolean {
  const lower = url.toLowerCase()
  return SOCIAL_DOMAINS.some((domain) => lower.includes(domain))
}

export function parseContributorSocials(
  profile?: import("@/lib/github/types").GhUserProfile | null
): ParsedContributorSocials {
  let website: string | null = null
  let twitter: string | null = null
  let linkedin: string | null = null
  const otherSocials: import("@/lib/github/types").GhSocialAccount[] = []
  const seenUrls = new Set<string>()

  if (!profile) {
    return { website, twitter, linkedin, otherSocials }
  }

  // 1. Process explicit social accounts from GitHub API
  if (profile.social_accounts && Array.isArray(profile.social_accounts)) {
    for (const acc of profile.social_accounts) {
      if (!acc || !acc.url) continue
      const url = normalizeUrl(acc.url)
      if (!url) continue

      const lowerUrl = url.toLowerCase()
      const lowerProvider = (acc.provider || "").toLowerCase()

      if (
        lowerProvider === "twitter" ||
        lowerUrl.includes("twitter.com") ||
        lowerUrl.includes("x.com")
      ) {
        if (!twitter) twitter = normalizeTwitterUrl(url)
      } else if (
        lowerProvider === "linkedin" ||
        lowerUrl.includes("linkedin.com")
      ) {
        if (!linkedin) linkedin = normalizeLinkedinUrl(url)
      } else {
        const providerName =
          acc.provider && acc.provider !== "generic"
            ? acc.provider
            : lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")
            ? "youtube"
            : lowerUrl.includes("t.me") || lowerUrl.includes("telegram")
            ? "telegram"
            : lowerUrl.includes("facebook.com")
            ? "facebook"
            : lowerUrl.includes("instagram.com")
            ? "instagram"
            : lowerUrl.includes("discord.gg") || lowerUrl.includes("discord.com")
            ? "discord"
            : lowerUrl.includes("medium.com")
            ? "medium"
            : lowerUrl.includes("reddit.com")
            ? "reddit"
            : "other"

        if (!seenUrls.has(lowerUrl)) {
          seenUrls.add(lowerUrl)
          otherSocials.push({ provider: providerName, url })
        }
      }
    }
  }

  // 2. Process explicit twitter_username field on GitHub profile
  if (profile.twitter_username && profile.twitter_username.trim()) {
    if (!twitter) {
      twitter = normalizeTwitterUrl(profile.twitter_username)
    }
  }

  // 3. Process blog field (can be website, LinkedIn, Twitter, etc.)
  if (profile.blog && profile.blog.trim()) {
    const rawBlog = profile.blog.trim()
    const blogUrl = normalizeUrl(rawBlog)

    if (blogUrl) {
      const lowerBlog = blogUrl.toLowerCase()

      if (lowerBlog.includes("linkedin.com")) {
        if (!linkedin) linkedin = normalizeLinkedinUrl(blogUrl)
      } else if (lowerBlog.includes("twitter.com") || lowerBlog.includes("x.com")) {
        if (!twitter) twitter = normalizeTwitterUrl(blogUrl)
      } else if (
        lowerBlog.includes("youtube.com") ||
        lowerBlog.includes("youtu.be") ||
        lowerBlog.includes("t.me") ||
        lowerBlog.includes("instagram.com") ||
        lowerBlog.includes("facebook.com")
      ) {
        if (!seenUrls.has(lowerBlog)) {
          seenUrls.add(lowerBlog)
          otherSocials.push({ provider: "other", url: blogUrl })
        }
      } else if (!lowerBlog.includes("github.com/")) {
        // Not a social network link or github link: standard personal website/blog
        website = blogUrl
      }
    }
  }

  // 4. Scan bio for mentioned social links if not already discovered
  if (profile.bio && profile.bio.trim()) {
    const bioText = profile.bio

    if (!linkedin) {
      const match = bioText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-%]+/i)
      if (match) linkedin = normalizeLinkedinUrl(match[0])
    }

    if (!twitter) {
      const matchUrl = bioText.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+/i)
      if (matchUrl) {
        twitter = normalizeTwitterUrl(matchUrl[0])
      } else {
        const matchHandle = bioText.match(/(?:^|\s)(?:twitter|x):\s*@?([a-zA-Z0-9_]{1,30})\b/i)
        if (matchHandle && matchHandle[1]) {
          twitter = `https://x.com/${matchHandle[1]}`
        }
      }
    }

    // Scan for Telegram in bio
    const tgMatch = bioText.match(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[a-zA-Z0-9_]+/i)
    if (tgMatch) {
      const tgUrl = normalizeUrl(tgMatch[0])
      if (tgUrl && !seenUrls.has(tgUrl.toLowerCase())) {
        seenUrls.add(tgUrl.toLowerCase())
        otherSocials.push({ provider: "telegram", url: tgUrl })
      }
    }

    // Scan for personal URL in bio if website is not yet set
    if (!website) {
      const urlMatch = bioText.match(/https?:\/\/[^\s,]+/i)
      if (urlMatch) {
        const candidate = normalizeUrl(urlMatch[0])
        if (candidate && !isSocialDomain(candidate)) {
          website = candidate
        }
      }
    }
  }

  return {
    website,
    twitter,
    linkedin,
    otherSocials,
  }
}

