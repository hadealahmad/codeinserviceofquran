"use client"

import { useMemo, useState, useEffect } from "react"
import {
  ArrowUpDown,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FolderGit2,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  Globe,
  Mail,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Navbar } from "@/components/navbar"
import { useLanguage } from "@/lib/language-context"
import { STATS_PERIOD_LABEL, STATS_PERIOD_LABEL_EN } from "@/lib/stats"
import { getCategoryBadgeClass } from "@/lib/tag-styles"
import { cn } from "@/lib/utils"
import { downloadContributorsCsv } from "@/lib/export-csv"
import type { ContributorItem } from "@/lib/github/types"

type SortField =
  | "prsInPeriod"
  | "acceptedPrs"
  | "closedIssues"
  | "outsidePeriod"
  | "name"
  | "login"
type SortOrder = "asc" | "desc"

export function ContributorsView({
  contributors,
}: {
  contributors: ContributorItem[]
}) {
  const { t, lang } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  // View contributors in period only by default
  const [filterPeriodOnly, setFilterPeriodOnly] = useState(true)
  const [sortField, setSortField] = useState<SortField>("prsInPeriod")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [selectedContributor, setSelectedContributor] = useState<ContributorItem | null>(null)

  // Overall metric calculations
  const totalContributorsCount = contributors.length
  const contributorsInPeriodCount = useMemo(
    () => contributors.filter((c) => c.prsInPeriodCount > 0).length,
    [contributors]
  )
  const totalPrsInPeriodCount = useMemo(
    () => contributors.reduce((acc, c) => acc + c.prsInPeriodCount, 0),
    [contributors]
  )
  const totalAcceptedPrsInPeriodCount = useMemo(
    () => contributors.reduce((acc, c) => acc + c.acceptedPrsInPeriodCount, 0),
    [contributors]
  )
  const totalClosedIssuesInPeriodCount = useMemo(
    () =>
      contributors.reduce(
        (acc, c) => acc + c.relatedClosedIssuesInPeriodCount,
        0
      ),
    [contributors]
  )
  const totalPrsOutsidePeriodCount = useMemo(
    () =>
      contributors.reduce(
        (acc, c) => acc + Math.max(0, c.totalPrsCount - c.prsInPeriodCount),
        0
      ),
    [contributors]
  )

  // Filter and sort contributors
  const filteredAndSorted = useMemo(() => {
    let result = [...contributors]

    if (filterPeriodOnly) {
      result = result.filter((c) => c.prsInPeriodCount > 0)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((c) => {
        const matchLogin = c.login.toLowerCase().includes(q)
        const matchName = c.name?.toLowerCase().includes(q) ?? false
        const matchEmail = c.email?.toLowerCase().includes(q) ?? false
        const matchWebsite = c.website?.toLowerCase().includes(q) ?? false
        const matchProject = c.prsByProject.some(
          (p) =>
            p.project.repo.toLowerCase().includes(q) ||
            p.project.owner.toLowerCase().includes(q)
        )
        return matchLogin || matchName || matchEmail || matchWebsite || matchProject
      })
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortField === "prsInPeriod") {
        cmp = a.prsInPeriodCount - b.prsInPeriodCount
        if (cmp === 0) cmp = a.totalPrsCount - b.totalPrsCount
      } else if (sortField === "acceptedPrs") {
        const valA = filterPeriodOnly ? a.acceptedPrsInPeriodCount : a.acceptedPrsTotalCount
        const valB = filterPeriodOnly ? b.acceptedPrsInPeriodCount : b.acceptedPrsTotalCount
        cmp = valA - valB
        if (cmp === 0) cmp = a.prsInPeriodCount - b.prsInPeriodCount
      } else if (sortField === "closedIssues") {
        const valA = filterPeriodOnly
          ? a.relatedClosedIssuesInPeriodCount
          : a.relatedClosedIssuesTotalCount
        const valB = filterPeriodOnly
          ? b.relatedClosedIssuesInPeriodCount
          : b.relatedClosedIssuesTotalCount
        cmp = valA - valB
        if (cmp === 0) cmp = a.prsInPeriodCount - b.prsInPeriodCount
      } else if (sortField === "outsidePeriod") {
        const outA = Math.max(0, a.totalPrsCount - a.prsInPeriodCount)
        const outB = Math.max(0, b.totalPrsCount - b.prsInPeriodCount)
        cmp = outA - outB
        if (cmp === 0) cmp = a.prsInPeriodCount - b.prsInPeriodCount
      } else if (sortField === "name") {
        const nameA = a.name ?? a.login
        const nameB = b.name ?? b.login
        cmp = nameA.localeCompare(nameB)
      } else if (sortField === "login") {
        cmp = a.login.localeCompare(b.login)
      }

      return sortOrder === "desc" ? -cmp : cmp
    })

    return result
  }, [contributors, filterPeriodOnly, searchQuery, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder(field === "name" || field === "login" ? "asc" : "desc")
    }
  }

  const periodLabel = t(STATS_PERIOD_LABEL, STATS_PERIOD_LABEL_EN)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
        {/* Header Section */}
        <div className="mb-8 space-y-3 border-b border-border pb-6">
          <div className="flex items-center gap-2 text-primary font-medium text-sm">
            <Users className="size-4" />
            <span>{t("مجتمع المساهمين", "Contributors Community")}</span>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {t("لوحة المساهمين في المشاريع", "Project Contributors")}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1 max-w-3xl">
                {t(
                  "المساهمون الذين قدموا طلبات سحب (PRs) على المشاريع القرآنية خلال الفترة المحددة، تقديراً لجهودهم وتسهيلاً لمتابعة إسهاماتهم.",
                  "Contributors who submitted pull requests (PRs) to Quranic projects during the period, highlighting their valued efforts."
                )}
              </p>
            </div>
            <Badge variant="outline" className="w-fit gap-1.5 py-1 px-3 text-xs border-primary/30 bg-primary/5 text-primary">
              <Calendar className="size-3.5" />
              <span>{periodLabel}</span>
            </Badge>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card className="border-border/80 border-s-4 border-s-teal-500 bg-card shadow-xs">
            <CardContent className="flex flex-col gap-1 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium line-clamp-1">
                  {t("المساهمون في الفترة", "Contributors in Period")}
                </span>
                <div className="flex size-6 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Users className="size-3.5" />
                </div>
              </div>
              <span className="text-2xl font-bold tabular-nums text-teal-600 dark:text-teal-400">
                {contributorsInPeriodCount}
              </span>
              <span className="text-[10px] text-muted-foreground/80">{periodLabel}</span>
            </CardContent>
          </Card>

          <Card className="border-border/80 border-s-4 border-s-indigo-500 bg-card shadow-xs">
            <CardContent className="flex flex-col gap-1 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium line-clamp-1">
                  {t("برات في الفترة", "PRs in Period")}
                </span>
                <div className="flex size-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <GitPullRequest className="size-3.5" />
                </div>
              </div>
              <span className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                {totalPrsInPeriodCount}
              </span>
              <span className="text-[10px] text-muted-foreground/80">{t("من المساهمين", "From contributors")}</span>
            </CardContent>
          </Card>

          <Card className="border-border/80 border-s-4 border-s-purple-500 bg-card shadow-xs">
            <CardContent className="flex flex-col gap-1 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium line-clamp-1">
                  {t("البرات المقبولة في الفترة", "Accepted PRs in Period")}
                </span>
                <div className="flex size-6 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <GitMerge className="size-3.5" />
                </div>
              </div>
              <span className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
                {totalAcceptedPrsInPeriodCount}
              </span>
              <span className="text-[10px] text-muted-foreground/80">{t("طلبات مدمجة", "Merged PRs")}</span>
            </CardContent>
          </Card>

          <Card className="border-border/80 border-s-4 border-s-rose-500 bg-card shadow-xs">
            <CardContent className="flex flex-col gap-1 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium line-clamp-1">
                  {t("قضايا مغلقة في الفترة", "Closed Issues in Period")}
                </span>
                <div className="flex size-6 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <GitPullRequestClosed className="size-3.5" />
                </div>
              </div>
              <span className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {totalClosedIssuesInPeriodCount}
              </span>
              <span className="text-[10px] text-muted-foreground/80">{t("مرتبطة ببرات المساهمين", "Linked to contributor PRs")}</span>
            </CardContent>
          </Card>

          <Card className="border-border/80 border-s-4 border-s-blue-500 bg-card shadow-xs">
            <CardContent className="flex flex-col gap-1 p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium line-clamp-1">
                  {t("إجمالي المساهمين", "Total Contributors")}
                </span>
                <div className="flex size-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <UserCheck className="size-3.5" />
                </div>
              </div>
              <span className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {totalContributorsCount}
              </span>
              <span className="text-[10px] text-muted-foreground/80">{t("كل الأوقات", "All time")}</span>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar: Search and Filter Controls */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder={t(
                "بحث باسم المساهم أو حسابه أو بريده أو مشروعه...",
                "Search by contributor name, handle, email, project..."
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 text-xs sm:text-sm h-9 bg-card"
            />
          </div>

          {/* Filters and Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filterPeriodOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPeriodOnly(!filterPeriodOnly)}
              className="h-9 text-xs gap-1.5 font-medium cursor-pointer"
            >
              <Calendar className="size-3.5" />
              <span>
                {filterPeriodOnly
                  ? t("عرض مساهمي الفترة فقط", "In-Period Only")
                  : t("كل المساهمين", "All Contributors")}
              </span>
              <Badge variant="secondary" className="ms-1 px-1.5 py-0 text-[10px]">
                {filterPeriodOnly ? contributorsInPeriodCount : totalContributorsCount}
              </Badge>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadContributorsCsv(filteredAndSorted, {
                  lang: (lang as "ar" | "en") || "ar",
                  filename: `quran-contributors-${filterPeriodOnly ? "period" : "all"}-${new Date().toISOString().split("T")[0]}.csv`,
                })
              }
              disabled={filteredAndSorted.length === 0}
              className="h-9 text-xs gap-1.5 font-medium border-border/80 bg-card hover:bg-muted hover:text-primary transition-colors cursor-pointer"
              title={t("تنزيل جدول المساهمين كملف CSV", "Download contributors table as CSV")}
            >
              <Download className="size-3.5" />
              <span>{t("تنزيل CSV", "Download CSV")}</span>
            </Button>
          </div>
        </div>

        {/* Contributors Table Card */}
        <Card className="border-border/80 shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                {/* Contributor Column */}
                <TableHead className="min-w-[190px]">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1.5 font-semibold text-xs text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <span>{t("المساهم", "Contributor")}</span>
                    {sortField === "name" ? (
                      sortOrder === "asc" ? <ChevronUp className="size-3.5 text-primary" /> : <ChevronDown className="size-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground opacity-60" />
                    )}
                  </button>
                </TableHead>

                {/* Email Column (Compact Icon) */}
                <TableHead className="w-[45px] text-center px-1">
                  <span className="font-semibold text-xs text-foreground">
                    {t("البريد", "Email")}
                  </span>
                </TableHead>

                {/* Website Column (Compact Icon) */}
                <TableHead className="w-[45px] text-center px-1">
                  <span className="font-semibold text-xs text-foreground">
                    {t("الموقع", "Web")}
                  </span>
                </TableHead>

                {/* GitHub Profile (Compact Icon) */}
                <TableHead className="w-[45px] text-center px-1">
                  <span className="font-semibold text-xs text-foreground">
                    GitHub
                  </span>
                </TableHead>

                {/* PRs in Period */}
                <TableHead className="w-[90px] text-center px-1">
                  <button
                    type="button"
                    onClick={() => handleSort("prsInPeriod")}
                    className="inline-flex items-center gap-1 font-semibold text-xs text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <span>{t("برات الفترة", "Period PRs")}</span>
                    {sortField === "prsInPeriod" ? (
                      sortOrder === "asc" ? <ChevronUp className="size-3.5 text-primary" /> : <ChevronDown className="size-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground opacity-60" />
                    )}
                  </button>
                </TableHead>

                {/* Accepted PRs */}
                <TableHead className="w-[95px] text-center px-1">
                  <button
                    type="button"
                    onClick={() => handleSort("acceptedPrs")}
                    title={t("البرات المقبولة (المدمجة)", "Accepted (Merged) PRs")}
                    className="inline-flex items-center gap-1 font-semibold text-xs text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="line-clamp-1">{t("البرات المقبولة", "Accepted PRs")}</span>
                    {sortField === "acceptedPrs" ? (
                      sortOrder === "asc" ? <ChevronUp className="size-3.5 text-primary" /> : <ChevronDown className="size-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground opacity-60 shrink-0" />
                    )}
                  </button>
                </TableHead>

                {/* Related Closed Issues */}
                <TableHead className="w-[110px] text-center px-1">
                  <button
                    type="button"
                    onClick={() => handleSort("closedIssues")}
                    title={t("عدد القضايا المغلقة المرتبطة بهذه البرات", "Number of related closed issues to those PRs")}
                    className="inline-flex items-center gap-1 font-semibold text-xs text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="line-clamp-1">{t("قضايا مغلقة مرتبطة", "Closed Issues")}</span>
                    {sortField === "closedIssues" ? (
                      sortOrder === "asc" ? <ChevronUp className="size-3.5 text-primary" /> : <ChevronDown className="size-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground opacity-60 shrink-0" />
                    )}
                  </button>
                </TableHead>

                {/* Contributions Outside Campaign Period */}
                <TableHead className="w-[150px] text-center px-1">
                  <button
                    type="button"
                    onClick={() => handleSort("outsidePeriod")}
                    title={t(
                      "المساهمات في المشاريع خارج فترة الحملة",
                      "Contributions to projects outside campaign period"
                    )}
                    className="inline-flex items-center gap-1 font-semibold text-xs text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="line-clamp-1">
                      {t(
                        "خارج فترة الحملة",
                        "Outside Campaign"
                      )}
                    </span>
                    {sortField === "outsidePeriod" ? (
                      sortOrder === "asc" ? <ChevronUp className="size-3.5 text-primary" /> : <ChevronDown className="size-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground opacity-60 shrink-0" />
                    )}
                  </button>
                </TableHead>

                {/* Projects Contributed To */}
                <TableHead className="min-w-[150px]">
                  <span className="font-semibold text-xs text-foreground">
                    {t("المشاريع المساهم بها", "Contributed Projects")}
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="size-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium">
                        {t("لم يتم العثور على مساهمين يطابقون البحث", "No contributors match your criteria")}
                      </p>
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="text-xs text-primary"
                        >
                          {t("مسح البحث", "Clear search")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((contributor) => {
                  const fallbackInitials = (contributor.name || contributor.login)
                    .slice(0, 2)
                    .toUpperCase()
                  const outsidePeriodCount = Math.max(
                    0,
                    contributor.totalPrsCount - contributor.prsInPeriodCount
                  )
                  const acceptedCount = filterPeriodOnly
                    ? contributor.acceptedPrsInPeriodCount
                    : contributor.acceptedPrsTotalCount
                  const closedIssuesCount = filterPeriodOnly
                    ? contributor.relatedClosedIssuesInPeriodCount
                    : contributor.relatedClosedIssuesTotalCount

                  return (
                    <TableRow
                      key={contributor.login}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      {/* Contributor (Avatar + Name + Login) */}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedContributor(contributor)}
                            className="relative shrink-0 rounded-full focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            title={t("عرض تفاصيل المساهمات", "View PR breakdown")}
                          >
                            <Avatar className="size-8 border border-border shadow-2xs group-hover:border-primary/40 transition-colors">
                              <AvatarImage
                                src={contributor.avatarUrl}
                                alt={contributor.name || contributor.login}
                              />
                              <AvatarFallback className="text-xs font-semibold">
                                {fallbackInitials}
                              </AvatarFallback>
                            </Avatar>
                          </button>

                          <div className="flex flex-col min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedContributor(contributor)}
                              className="text-start font-semibold text-xs sm:text-sm text-foreground hover:text-primary hover:underline transition-colors line-clamp-1 cursor-pointer"
                            >
                              {contributor.name || contributor.login}
                            </button>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              @{contributor.login}
                            </span>
                            {contributor.bio && (
                              <span className="text-[10px] text-muted-foreground/80 line-clamp-1 italic mt-0.5 max-w-[180px]">
                                {contributor.bio}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Email (Compact Copy Button) */}
                      <TableCell className="text-center px-1">
                        <CopyEmailButton email={contributor.email} />
                      </TableCell>

                      {/* Website (Compact Open Button) */}
                      <TableCell className="text-center px-1">
                        <WebsiteButton website={contributor.website} />
                      </TableCell>

                      {/* GitHub Profile (Compact GitHub Button) */}
                      <TableCell className="text-center px-1">
                        <GithubButton
                          url={contributor.htmlUrl}
                          login={contributor.login}
                        />
                      </TableCell>

                      {/* PRs in Period */}
                      <TableCell className="text-center px-1">
                        {contributor.prsInPeriodCount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold tabular-nums text-xs px-2 py-0.5 border border-teal-500/20"
                          >
                            {contributor.prsInPeriodCount}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground tabular-nums">0</span>
                        )}
                      </TableCell>

                      {/* Accepted PRs */}
                      <TableCell className="text-center px-1">
                        {acceptedCount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold tabular-nums text-xs px-2 py-0.5 border border-purple-500/20"
                          >
                            {acceptedCount}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground tabular-nums">0</span>
                        )}
                      </TableCell>

                      {/* Related Closed Issues */}
                      <TableCell className="text-center px-1">
                        {closedIssuesCount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold tabular-nums text-xs px-2 py-0.5 border border-emerald-500/20"
                          >
                            {closedIssuesCount}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground tabular-nums">0</span>
                        )}
                      </TableCell>

                      {/* Contributions Outside Campaign Period */}
                      <TableCell className="text-center px-1">
                        {outsidePeriodCount > 0 ? (
                          <Badge
                            variant="outline"
                            className="font-medium tabular-nums text-xs px-1.5 py-0.5 bg-muted/30"
                          >
                            {outsidePeriodCount}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground tabular-nums">0</span>
                        )}
                      </TableCell>

                      {/* Contributed Projects */}
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {contributor.prsByProject.map((group) => {
                            const repoName = group.project.repo
                            const badgeStyle = getCategoryBadgeClass(group.meta?.tag)
                            return (
                              <Badge
                                key={repoName}
                                variant="outline"
                                className={cn("text-[10px] px-1.5 py-0 font-normal", badgeStyle)}
                                title={`${repoName} (${group.prs.length} PRs)`}
                              >
                                {repoName}
                                <span className="ms-1 font-semibold opacity-80">
                                  ({group.prs.length})
                                </span>
                              </Badge>
                            )
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      {/* Contributor PR Breakdown Modal */}
      {selectedContributor && (
        <ContributorPrModal
          contributor={selectedContributor}
          onClose={() => setSelectedContributor(null)}
        />
      )}
    </div>
  )
}

/**
 * Compact button to copy contributor email with feedback.
 */
function CopyEmailButton({ email }: { email: string | null }) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  if (!email) {
    return <span className="text-xs text-muted-foreground/40">—</span>
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard write failure
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? t("تم نسخ البريد!", "Email copied!") : `${t("نسخ البريد:", "Copy email:")} ${email}`}
      aria-label={t("نسخ البريد الإلكتروني", "Copy email address")}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md border transition-all cursor-pointer",
        copied
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 scale-105"
          : "border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border"
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}

/**
 * Compact button to open contributor website in a new tab.
 */
function WebsiteButton({ website }: { website: string | null }) {
  const { t } = useLanguage()

  if (!website) {
    return <span className="text-xs text-muted-foreground/40">—</span>
  }

  return (
    <a
      href={website}
      target="_blank"
      rel="noopener noreferrer"
      title={`${t("زيارة الموقع:", "Visit website:")} ${website}`}
      aria-label={t("زيارة الموقع الإلكتروني", "Visit website")}
      className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-primary hover:border-primary/40 transition-colors"
    >
      <Globe className="size-3.5" />
    </a>
  )
}

/**
 * Compact button to open GitHub profile in a new tab.
 */
function GithubButton({ url, login }: { url: string; login: string }) {
  const { t } = useLanguage()

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${t("الملف الشخصي على GitHub:", "GitHub profile:")} @${login}`}
      aria-label={`GitHub @${login}`}
      className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border transition-colors"
    >
      <GithubIcon className="size-3.5" />
    </a>
  )
}

/**
 * Clean standard GitHub SVG icon.
 */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

/**
 * Clean LinkedIn SVG icon.
 */
function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

/**
 * Clean X (formerly Twitter) SVG icon.
 */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

/**
 * Modal to display PRs made by a contributor, broken down by project.
 */
function ContributorPrModal({
  contributor,
  onClose,
}: {
  contributor: ContributorItem
  onClose: () => void
}) {
  const { t } = useLanguage()

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [onClose])

  const fallbackInitials = (contributor.name || contributor.login)
    .slice(0, 2)
    .toUpperCase()
  const outsidePeriodCount = Math.max(
    0,
    contributor.totalPrsCount - contributor.prsInPeriodCount
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contributor-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-border p-4 sm:p-5 bg-muted/20">
          <div className="flex items-center gap-3.5">
            <Avatar className="size-12 border-2 border-border shadow-xs">
              <AvatarImage
                src={contributor.avatarUrl}
                alt={contributor.name || contributor.login}
              />
              <AvatarFallback className="text-sm font-bold">
                {fallbackInitials}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="contributor-modal-title"
                  className="text-lg sm:text-xl font-bold text-foreground"
                >
                  {contributor.name || contributor.login}
                </h2>
                <span className="text-xs text-muted-foreground font-mono">
                  @{contributor.login}
                </span>
              </div>

              {/* Links row */}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <a
                  href={contributor.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <GithubIcon className="size-3.5" />
                  <span>GitHub</span>
                </a>

                {contributor.email && (
                  <a
                    href={`mailto:${contributor.email}`}
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Mail className="size-3" />
                    <span>{contributor.email}</span>
                  </a>
                )}

                {contributor.website && (
                  <a
                    href={contributor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <Globe className="size-3" />
                    <span>
                      {contributor.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </span>
                    <ExternalLink className="size-2.5" />
                  </a>
                )}

                {contributor.linkedin && (
                  <a
                    href={contributor.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#0A66C2] hover:underline transition-colors"
                    title={contributor.linkedin}
                  >
                    <LinkedinIcon className="size-3.5" />
                    <span>LinkedIn</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                )}

                {contributor.twitter && (
                  <a
                    href={contributor.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                    title={contributor.twitter}
                  >
                    <XIcon className="size-3.5" />
                    <span>X</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                )}

                {contributor.otherSocials &&
                  contributor.otherSocials.map((social, idx) => (
                    <a
                      key={idx}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-primary transition-colors capitalize"
                      title={social.url}
                    >
                      <Globe className="size-3" />
                      <span>{social.provider || "Link"}</span>
                      <ExternalLink className="size-2.5" />
                    </a>
                  ))}
              </div>
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="size-8 p-0 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label={t("إغلاق", "Close")}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Quick Stats Bar */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-muted-foreground">
              {t("برات في الفترة:", "PRs in Period:")}{" "}
              <strong className="text-teal-600 dark:text-teal-400 font-bold">
                {contributor.prsInPeriodCount}
              </strong>
            </span>
            <span className="text-muted-foreground">
              {t("مقبولة (مدمجة):", "Accepted (Merged):")}{" "}
              <strong className="text-purple-600 dark:text-purple-400 font-bold">
                {contributor.acceptedPrsInPeriodCount}
              </strong>
            </span>
            <span className="text-muted-foreground">
              {t("قضايا مغلقة مرتبطة:", "Related Closed Issues:")}{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                {contributor.relatedClosedIssuesInPeriodCount}
              </strong>
            </span>
            <span className="text-muted-foreground">
              {t("خارج فترة الحملة:", "Outside Campaign:")}{" "}
              <strong className="text-foreground font-semibold">
                {outsidePeriodCount}
              </strong>
            </span>
            <span className="text-muted-foreground">
              {t("المشاريع:", "Projects:")}{" "}
              <strong className="text-foreground font-semibold">
                {contributor.projectsCount}
              </strong>
            </span>
          </div>
        </div>

        {/* Modal Body: PRs broken down by Project */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {contributor.prsByProject.map((group) => {
            const repoFullName = `${group.project.owner}/${group.project.repo}`
            const repoUrl = `https://github.com/${repoFullName}`
            const badgeClass = getCategoryBadgeClass(group.meta?.tag)

            return (
              <div
                key={repoFullName}
                className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs"
              >
                {/* Project Header */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3.5 py-2.5 sm:px-4">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <FolderGit2 className="size-4 text-primary" />
                      <span>{repoFullName}</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                    {group.meta?.tag && (
                      <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 font-normal", badgeClass)}>
                        {group.meta.tag}
                      </Badge>
                    )}
                  </div>

                  <Badge variant="secondary" className="text-xs font-semibold px-2">
                    {group.prs.length} {t("طلب سحب", "PRs")}
                  </Badge>
                </div>

                {/* PR List in this project */}
                <div className="divide-y divide-border/40">
                  {group.prs.map((pr) => {
                    return (
                      <div
                        key={pr.number}
                        className="flex flex-col gap-1.5 p-3 sm:p-3.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            {/* PR State Badge */}
                            <PrStateBadge state={pr.state} />

                            {/* PR Title & Link */}
                            <div className="flex-1 min-w-0">
                              <a
                                href={pr.htmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-xs sm:text-sm text-foreground hover:text-primary hover:underline transition-colors flex items-start gap-1 leading-snug"
                              >
                                <span>{pr.title}</span>
                                <ExternalLink className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                              </a>
                            </div>
                          </div>

                          <span className="text-xs font-mono font-medium text-muted-foreground shrink-0">
                            #{pr.number}
                          </span>
                        </div>

                        {/* PR Metadata Row */}
                        <div className="flex items-center gap-3 ps-6 text-[11px] text-muted-foreground flex-wrap">
                          {pr.createdAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              <span>{formatDate(pr.createdAt)}</span>
                            </span>
                          )}

                          {pr.inPeriod && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 font-medium"
                            >
                              {t("في الفترة", "In Period")}
                            </Badge>
                          )}

                          {pr.relatedClosedIssues && pr.relatedClosedIssues.length > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-medium"
                            >
                              <CheckCircle2 className="size-3" />
                              <span>
                                {t("يغلق", "Closes")}{" "}
                                {pr.relatedClosedIssues.map((n) => `#${n}`).join(", ")}
                              </span>
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-border p-3 sm:p-4 bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 px-4 text-xs font-medium">
            {t("إغلاق", "Close")}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * State badge for PR (Merged, Open, Closed).
 */
function PrStateBadge({ state }: { state: "open" | "closed" | "merged" }) {
  const { t } = useLanguage()

  if (state === "merged") {
    return (
      <Badge
        variant="secondary"
        className="shrink-0 bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] py-0 px-1.5 gap-1 font-semibold"
      >
        <GitMerge className="size-3" />
        <span>{t("مدمج", "Merged")}</span>
      </Badge>
    )
  }

  if (state === "open") {
    return (
      <Badge
        variant="secondary"
        className="shrink-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] py-0 px-1.5 gap-1 font-semibold"
      >
        <GitPullRequest className="size-3" />
        <span>{t("مفتوح", "Open")}</span>
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className="shrink-0 bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px] py-0 px-1.5 gap-1 font-semibold"
    >
      <GitPullRequestClosed className="size-3" />
      <span>{t("مغلق", "Closed")}</span>
    </Badge>
  )
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}
