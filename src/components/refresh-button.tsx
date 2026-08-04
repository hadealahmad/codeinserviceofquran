"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { cn } from "@/lib/utils"

export function RefreshButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const { t } = useLanguage()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      title={busy ? t("جاري التحديث...", "Refreshing...") : t("تحديث", "Refresh")}
      onClick={() => {
        setBusy(true)
        const url = new URL(window.location.href)
        url.searchParams.set("refresh", String(Date.now()))
        router.replace(url.pathname + url.search)
      }}
    >
      <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
      <span>{busy ? t("جاري التحديث...", "Refreshing...") : t("تحديث", "Refresh")}</span>
    </Button>
  )
}
