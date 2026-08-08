export type Project = {
  owner: string
  repo: string
  tag?: string
}

export const PROJECTS: Project[] = [
  { owner: "ibo2001", repo: "MushafImad", tag: "Swift" },
  { owner: "Itqan-community", repo: "Munajjam", tag: "Python والذكاء الاصطناعي" },
  { owner: "adelpro", repo: "open-mushaf-native", tag: "React Native" },
  { owner: "Itqan-community", repo: "RATQ", tag: "البيانات المفتوحة والبنية التحتية" },
  { owner: "adelpro", repo: "open-tarteel", tag: "TypeScript / Web" },
  { owner: "adelpro", repo: "quran-search-engine", tag: "TypeScript / Web" },
  { owner: "Itqan-community", repo: "cms-backend", tag: "البيانات المفتوحة والبنية التحتية" },
  { owner: "Itqan-community", repo: "cms-frontend", tag: "البيانات المفتوحة والبنية التحتية" },
  { owner: "Itqan-community", repo: "quran-apps-directory", tag: "TypeScript / Web" },
]

// Order of clusters (owners). Sections are sorted by this order but clusters
// are never shown in the UI.
const OWNER_ORDER = ["adelpro", "Itqan-community", "ibo2001", "YahiaRagae"]

const OWNER_RANK = new Map<string, number>()
OWNER_ORDER.forEach((owner, index) => OWNER_RANK.set(owner, index))

export function sortedProjects(): Project[] {
  const clusters = new Map<string, Project[]>()
  for (const project of PROJECTS) {
    const list = clusters.get(project.owner) ?? []
    list.push(project)
    clusters.set(project.owner, list)
  }

  const owners = [...clusters.keys()].sort((a, b) => {
    const rankA = OWNER_RANK.get(a) ?? Number.MAX_SAFE_INTEGER
    const rankB = OWNER_RANK.get(b) ?? Number.MAX_SAFE_INTEGER
    if (rankA !== rankB) return rankA - rankB
    return a.localeCompare(b)
  })

  const result: Project[] = []
  for (const owner of owners) {
    const list = [...(clusters.get(owner) ?? [])].sort((a, b) =>
      a.repo.localeCompare(b.repo)
    )
    result.push(...list)
  }
  return result
}
