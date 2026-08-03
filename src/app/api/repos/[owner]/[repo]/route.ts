import { NextResponse } from "next/server"
import { loadProject } from "@/lib/github/loader"
import { RateLimitError } from "@/lib/github/errors"

export async function GET(
  _request: Request,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await context.params

  try {
    const data = await loadProject({ owner, repo }, { state: "closed" })
    return NextResponse.json({
      issues: data.issues,
      maintainers: data.maintainers,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "rate_limit" },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { error: "GitHub API request failed" },
      { status: 502 }
    )
  }
}
