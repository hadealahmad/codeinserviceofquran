export type Project = {
  owner: string
  repo: string
}

export const PROJECTS: Project[] = [
  { owner: "Itqan-community", repo: "mushaf-imad-flutter" },
  { owner: "adelpro", repo: "mushaf-imad-expo" },
  { owner: "ibo2001", repo: "MushafImad" },
  { owner: "YahiaRagae", repo: "mushaf-imad-android" },
  { owner: "Itqan-community", repo: "Munajjam" },
  { owner: "adelpro", repo: "open-mushaf-native" },
  { owner: "Itqan-community", repo: "RATQ" },
  { owner: "adelpro", repo: "open-tarteel" },
  { owner: "adelpro", repo: "quran-search-engine" },
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
