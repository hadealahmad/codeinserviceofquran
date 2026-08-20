import type { ContributorItem } from "@/lib/github/types"

/**
 * Escapes a field according to standard CSV (RFC 4180) formatting.
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '""'
  const str = String(value)
  // If string contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

/**
 * Generates a clean, UTF-8 formatted CSV string from a list of contributors.
 * Includes UTF-8 BOM (\uFEFF) for optimal Excel and Google Sheets compatibility with Arabic characters.
 */
export function generateContributorsCsv(
  contributors: ContributorItem[],
  lang: "ar" | "en" = "ar"
): string {
  const isAr = lang === "ar"

  const headers = isAr
    ? [
        "الاسم",
        "اسم المستخدم",
        "رابط GitHub",
        "البريد الإلكتروني",
        "الموقع الإلكتروني",
        "لينكد إن (LinkedIn)",
        "تويتر / إكس (Twitter / X)",
        "حسابات تواصل أخرى",
        "طلبات السحب في الفترة",
        "الطلبات المقبولة في الفترة",
        "إجمالي طلبات السحب",
        "المشاريع المساهم بها",
      ]
    : [
        "Name",
        "GitHub Username",
        "GitHub Profile",
        "Email",
        "Website",
        "LinkedIn",
        "Twitter / X",
        "Other Social Media",
        "PRs in Period",
        "Accepted PRs in Period",
        "Total PRs",
        "Contributed Projects",
      ]

  const rows: string[] = []

  // Add header row
  rows.push(headers.map(escapeCsvField).join(","))

  for (const c of contributors) {
    const name = c.name || c.login
    const username = c.login
    const githubUrl = c.htmlUrl || `https://github.com/${c.login}`
    const email = c.email || ""
    const website = c.website || ""
    const linkedin = c.linkedin || ""
    const twitter = c.twitter || ""

    const otherSocialsStr = (c.otherSocials || [])
      .map((s) => {
        const providerName = s.provider && s.provider !== "other" ? `${s.provider}: ` : ""
        return `${providerName}${s.url}`
      })
      .join(" | ")

    const prsInPeriod = c.prsInPeriodCount
    const acceptedPrsInPeriod = c.acceptedPrsInPeriodCount
    const totalPrs = c.totalPrsCount

    const projectsStr = (c.prsByProject || [])
      .map((p) => `${p.project.repo} (${p.prs.length})`)
      .join("; ")

    const row = [
      name,
      username,
      githubUrl,
      email,
      website,
      linkedin,
      twitter,
      otherSocialsStr,
      prsInPeriod,
      acceptedPrsInPeriod,
      totalPrs,
      projectsStr,
    ]

    rows.push(row.map(escapeCsvField).join(","))
  }

  // Prepend UTF-8 BOM so Excel and spreadsheet tools handle Arabic text flawlessly
  return "\uFEFF" + rows.join("\r\n")
}

/**
 * Triggers a browser download of the contributors CSV file.
 */
export function downloadContributorsCsv(
  contributors: ContributorItem[],
  options: {
    lang?: "ar" | "en"
    filename?: string
  } = {}
): void {
  if (typeof window === "undefined") return

  const lang = options.lang || "ar"
  const today = new Date().toISOString().split("T")[0]
  const defaultFilename = `quran-code-contributors-${today}.csv`
  const filename = options.filename || defaultFilename

  const csvContent = generateContributorsCsv(contributors, lang)
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
