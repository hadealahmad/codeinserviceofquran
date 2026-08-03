import type { GhPull, LanguageInfo, RelatedPr } from "./types"

export const LANGUAGE_COLORS: Record<string, string> = {
  Assembly: "#6E4C13",
  C: "#555555",
  "C#": "#178600",
  "C++": "#F34B7D",
  CSS: "#663399",
  CMake: "#DA3434",
  CoffeeScript: "#244776",
  Crystal: "#000100",
  Dart: "#00B4AB",
  Dockerfile: "#384D54",
  Elixir: "#6E4A7E",
  Go: "#00ADD8",
  Groovy: "#4298B8",
  HTML: "#E34C26",
  Haskell: "#5e5086",
  Java: "#B07219",
  JavaScript: "#F1E05A",
  JSON: "#292929",
  "Jupyter Notebook": "#DA5B0B",
  Kotlin: "#A97BFF",
  Lua: "#000080",
  Makefile: "#427819",
  Markdown: "#083fa1",
  "Objective-C": "#438EFF",
  PHP: "#4F5D95",
  Perl: "#0298C3",
  Python: "#3572A5",
  R: "#198CE7",
  Ruby: "#701516",
  Rust: "#DEA584",
  SCSS: "#C6538C",
  Shell: "#89E051",
  Solidity: "#AA6746",
  Swift: "#F05138",
  TeX: "#3D6117",
  TypeScript: "#3178C6",
  Vue: "#41B883",
  Zig: "#ec915c",
}

const DEFAULT_LANGUAGE_COLOR = "#8b949e"

export function toLanguages(bytes: Record<string, number>): LanguageInfo[] {
  const entries = Object.entries(bytes)
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1
  return entries
    .map(([name, value]) => ({
      name,
      bytes: value,
      percent: (value / total) * 100,
      color: LANGUAGE_COLORS[name] ?? DEFAULT_LANGUAGE_COLOR,
    }))
    .sort((a, b) => b.bytes - a.bytes)
}

export function extractIssueReferences(
  text: string | null | undefined
): Set<number> {
  const refs = new Set<number>()
  if (!text) return refs
  const re = /#(\d+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    refs.add(parseInt(match[1], 10))
  }
  return refs
}

export function buildRelatedPrs(pulls: GhPull[]): Map<number, RelatedPr[]> {
  const map = new Map<number, RelatedPr[]>()
  for (const pull of pulls) {
    const refs = extractIssueReferences(`${pull.title}\n${pull.body ?? ""}`)
    for (const issueNumber of refs) {
      const list = map.get(issueNumber) ?? []
      list.push({
        number: pull.number,
        title: pull.title,
        htmlUrl: pull.html_url,
        state: pull.merged_at ? "merged" : pull.state,
      })
      map.set(issueNumber, list)
    }
  }
  return map
}
