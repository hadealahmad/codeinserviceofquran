export function getCategoryBadgeClass(tag?: string): string {
  if (!tag) return "border-border/80 bg-muted text-muted-foreground"

  switch (tag) {
    case "Flutter":
      return "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 dark:border-sky-500/30"
    case "React Native":
      return "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 dark:border-blue-500/30"
    case "TypeScript / Web":
      return "border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 dark:border-indigo-500/30"
    case "Swift":
      return "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300 dark:border-orange-500/30"
    case "Kotlin":
      return "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300 dark:border-purple-500/30"
    case "Python والذكاء الاصطناعي":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:border-emerald-500/30"
    case "البيانات المفتوحة والبنية التحتية":
      return "border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300 dark:border-teal-500/30"
    case "PHP / Flarum":
      return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:border-rose-500/30"
    case "Rust / معالجة النصوص":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:border-amber-500/30"
    default:
      return "border-primary/40 bg-primary/10 text-primary dark:border-primary/30"
  }
}
