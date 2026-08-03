import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="mt-6 space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl bg-card p-6 ring-1 ring-foreground/10"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="mt-4 h-1.5 w-full" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 4 }).map((_, row) => (
                <Skeleton key={row} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
