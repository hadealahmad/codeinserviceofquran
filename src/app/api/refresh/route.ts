import { NextResponse } from "next/server"
import { syncAllProjects } from "@/lib/github/store"

export const dynamic = "force-dynamic"

export async function GET() {
  const result = await syncAllProjects({ force: true })
  return NextResponse.json(result)
}

export async function POST() {
  const result = await syncAllProjects({ force: true })
  return NextResponse.json(result)
}
