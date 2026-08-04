"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  ChevronsUpDown,
  FileText,
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
                خدمةً للقرآن
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
                <span>المشاريع</span>
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
                <span>قواعد المشاريع</span>
              </Link>
            </nav>
          </div>

          {/* Controls on main page */}
          {isHome && (
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Filter: No Comments */}
              {onToggleNoComments && (
                <Button
                  variant={filterNoComments ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleNoComments}
                  title="بدون تعليقات"
                  className="h-8 px-2 sm:px-2.5"
                >
                  <MessageSquareOff className="size-3.5" />
                  <span className="hidden sm:inline">بدون تعليقات</span>
                </Button>
              )}

              {/* Filter: Unassigned */}
              {onToggleUnassigned && (
                <Button
                  variant={filterUnassigned ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleUnassigned}
                  title="غير مسند"
                  className="h-8 px-2 sm:px-2.5"
                >
                  <UserX className="size-3.5" />
                  <span className="hidden sm:inline">غير مسند</span>
                </Button>
              )}

              {/* Collapse/Expand All Button */}
              {onToggleCollapseAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleCollapseAll}
                  title={allCollapsed ? "توسيع الكل" : "طَي الكل"}
                  className="h-8 px-2 sm:px-2.5"
                >
                  <ChevronsUpDown className="size-3.5" />
                  <span className="hidden sm:inline">
                    {allCollapsed ? "توسيع الكل" : "طَي الكل"}
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
                      <SelectValue placeholder="اختر المشروع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        كل المشاريع ({projects.length})
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
            </div>
          )}
        </div>

        {/* Mobile Row: Separate row for Project Select dropdown */}
        {isHome && projects && onSelectProject && (
          <div className="mt-2 block border-t border-border/60 pt-2 sm:hidden">
            <Select
              value={selectedProject}
              onValueChange={(val) => onSelectProject(val ?? "all")}
            >
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="اختر المشروع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  كل المشاريع ({projects.length})
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
