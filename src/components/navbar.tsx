"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  ChevronsUpDown,
  FileText,
  Globe,
  LayoutDashboard,
  MessageSquareOff,
  Moon,
  Search,
  Sun,
  UserX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshButton } from "@/components/refresh-button"
import { useLanguage } from "@/lib/language-context"
import { useTheme } from "@/lib/theme-context"
import { cn } from "@/lib/utils"

export type NavbarProps = {
  searchQuery?: string
  onSearchChange?: (query: string) => void
  filterNoComments?: boolean
  onToggleNoComments?: () => void
  filterUnassigned?: boolean
  onToggleUnassigned?: () => void
  selectedProject?: string
  onSelectProject?: (value: string) => void
  projects?: { id: string; label: string }[]
  allCollapsed?: boolean
  onToggleCollapseAll?: () => void
}

export function Navbar({
  searchQuery = "",
  onSearchChange,
  filterNoComments,
  onToggleNoComments,
  filterUnassigned,
  onToggleUnassigned,
  selectedProject,
  onSelectProject,
  projects,
  allCollapsed,
  onToggleCollapseAll,
}: NavbarProps) {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const { lang, setLang, t } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-2.5 md:px-6 space-y-2.5">
        {/* Main Row (Row 1): Title, Nav links, Search box, Theme & Language Switchers */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand Title & Nav links */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-foreground transition-opacity hover:opacity-90"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                <BookOpen className="size-4" />
              </div>
              <span className="hidden sm:inline text-sm font-bold tracking-tight sm:text-base whitespace-nowrap">
                كود في خدمة القرآن
              </span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors sm:text-sm",
                  isHome
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <LayoutDashboard className="size-3.5 sm:size-4" />
                <span>{t("المشاريع", "Projects")}</span>
              </Link>
              <Link
                href="/rules"
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors sm:text-sm",
                  pathname === "/rules"
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <FileText className="size-3.5 sm:size-4" />
                <span>{t("قواعد المشاريع", "Project Rules")}</span>
              </Link>
            </nav>
          </div>

          {/* Right side: Search Box, Theme & Language Switchers */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 max-w-xs justify-end">
            {/* Search Box */}
            {isHome && (
              <div className="relative w-full max-w-[140px] sm:max-w-[200px]">
                <Search className="absolute inset-y-0 start-2.5 my-auto size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder={t("بحث...", "Search...")}
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="h-8 ps-8 text-xs bg-muted/40"
                />
              </div>
            )}

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              title={theme === "dark" ? t("النمط الفاتح", "Light mode") : t("النمط الداكن", "Dark mode")}
              className="h-8 px-2 text-xs font-semibold shrink-0"
            >
              {theme === "dark" ? (
                <Sun className="size-3.5 text-amber-400" />
              ) : (
                <Moon className="size-3.5 text-foreground" />
              )}
            </Button>

            {/* Language Switcher */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              title={lang === "ar" ? "Switch to English" : "التحويل إلى العربية"}
              className="h-8 px-2 text-xs font-semibold gap-1 shrink-0"
            >
              <Globe className="size-3.5" />
              <span>{lang === "ar" ? "EN" : "عربي"}</span>
            </Button>
          </div>
        </div>

        {/* Second Row (Row 2): Project Select Dropdown & Filters */}
        {isHome && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
            {/* Dropdown */}
            {projects && onSelectProject && (
              <div className="w-full sm:w-auto flex-1 sm:flex-initial min-w-[200px]">
                <Select
                  value={selectedProject}
                  onValueChange={(val) => onSelectProject(val ?? "all")}
                >
                  <SelectTrigger className="h-8 w-full sm:w-56 text-xs">
                    <SelectValue placeholder={t("اختر المشروع", "Select Project")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("كل المشاريع", "All Projects")} ({projects.length})
                    </SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filters and Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {onToggleNoComments && (
                <Button
                  variant={filterNoComments ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleNoComments}
                  title={t("بدون تعليقات", "No Comments")}
                  className="h-8 px-2 sm:px-2.5 text-xs"
                >
                  <MessageSquareOff className="size-3.5" />
                  <span className="hidden sm:inline">
                    {t("بدون تعليقات", "No Comments")}
                  </span>
                </Button>
              )}

              {onToggleUnassigned && (
                <Button
                  variant={filterUnassigned ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleUnassigned}
                  title={t("غير مسند", "Unassigned")}
                  className="h-8 px-2 sm:px-2.5 text-xs"
                >
                  <UserX className="size-3.5" />
                  <span className="hidden sm:inline">
                    {t("غير مسند", "Unassigned")}
                  </span>
                </Button>
              )}

              {onToggleCollapseAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleCollapseAll}
                  title={allCollapsed ? t("توسيع الكل", "Expand All") : t("طَي الكل", "Collapse All")}
                  className="h-8 px-2 sm:px-2.5 text-xs"
                >
                  <ChevronsUpDown className="size-3.5" />
                  <span className="hidden sm:inline">
                    {allCollapsed ? t("توسيع الكل", "Expand All") : t("طَي الكل", "Collapse All")}
                  </span>
                </Button>
              )}

              <RefreshButton />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
