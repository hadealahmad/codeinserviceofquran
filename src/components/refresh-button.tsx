"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function RefreshButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        const url = new URL(window.location.href)
        url.searchParams.set("refresh", String(Date.now()))
        router.replace(url.pathname + url.search)
      }}
    >
      <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
      تحديث
    </Button>
  )
}
