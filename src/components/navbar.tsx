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
  UserX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshButton } from "@/components/refresh-button"
import { useLanguage } from "@/lib/language-context"
import { cn } from "@/lib/utils"

export type NavbarProps = {
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-2.5 md:px-6">
        {/* Top Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Brand & Nav links */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-foreground transition-opacity hover:opacity-90"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BookOpen className="size-4" />
              </div>
              <span className="text-sm font-bold tracking-tight sm:text-base">
                {t("خدمةً للقرآن", "Code in Service of Quran")}
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

          {/* Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {isHome && (
              <>
                {/* Filter: No Comments */}
                {onToggleNoComments && (
                  <Button
                    variant={filterNoComments ? "default" : "outline"}
                    size="sm"
                    onClick={onToggleNoComments}
                    title={t("بدون تعليقات", "No Comments")}
                    className="h-8 px-2 sm:px-2.5"
                  >
                    <MessageSquareOff className="size-3.5" />
                    <span className="hidden sm:inline">
                      {t("بدون تعليقات", "No Comments")}
                    </span>
                  </Button>
                )}

                {/* Filter: Unassigned */}
                {onToggleUnassigned && (
                  <Button
                    variant={filterUnassigned ? "default" : "outline"}
                    size="sm"
                    onClick={onToggleUnassigned}
                    title={t("غير مسند", "Unassigned")}
                    className="h-8 px-2 sm:px-2.5"
                  >
                    <UserX className="size-3.5" />
                    <span className="hidden sm:inline">
                      {t("غير مسند", "Unassigned")}
                    </span>
                  </Button>
                )}

                {/* Collapse/Expand All Button */}
                {onToggleCollapseAll && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleCollapseAll}
                    title={allCollapsed ? t("توسيع الكل", "Expand All") : t("طَي الكل", "Collapse All")}
                    className="h-8 px-2 sm:px-2.5"
                  >
                    <ChevronsUpDown className="size-3.5" />
                    <span className="hidden sm:inline">
                      {allCollapsed ? t("توسيع الكل", "Expand All") : t("طَي الكل", "Collapse All")}
                    </span>
                  </Button>
                )}

                {/* Project Select Dropdown (Desktop) */}
                {projects && onSelectProject && (
                  <div className="hidden sm:block">
                    <Select
                      value={selectedProject}
                      onValueChange={(val) => onSelectProject(val ?? "all")}
                    >
                      <SelectTrigger className="h-8 w-44 md:w-52 text-xs">
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

                {/* Refresh Button */}
                <RefreshButton />
              </>
            )}

            {/* Language Switcher */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              title={lang === "ar" ? "Switch to English" : "التحويل إلى العربية"}
              className="h-8 px-2 text-xs font-semibold gap-1"
            >
              <Globe className="size-3.5" />
              <span>{lang === "ar" ? "EN" : "عربي"}</span>
            </Button>
          </div>
        </div>

        {/* Mobile Row: Separate row for Project Select dropdown */}
        {isHome && projects && onSelectProject && (
          <div className="mt-2 block border-t border-border/60 pt-2 sm:hidden">
            <Select
              value={selectedProject}
              onValueChange={(val) => onSelectProject(val ?? "all")}
            >
              <SelectTrigger className="h-8 w-full text-xs">
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
      </div>
    </header>
  )
}
