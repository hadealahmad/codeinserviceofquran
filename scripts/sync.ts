#!/usr/bin/env node
/**
 * Standalone CLI sync script for Code in Service of Quran.
 * Can be executed directly via `npm run sync` or in a Cranl Cron Job / Docker container.
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

// Load .env.local or .env if DATABASE_URL or GITHUB_TOKEN is not already in process.env
function loadEnv() {
  const envFiles = [".env.local", ".env"]
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file)
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf-8")
      for (const line of content.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eqIdx = trimmed.indexOf("=")
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim()
          const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
          if (!process.env[key]) {
            process.env[key] = value
          }
        }
      }
    }
  }
}

loadEnv()

async function run() {
  const startTime = Date.now()
  // Default to a cached sync so cron jobs don't exhaust the GitHub rate
  // limit; pass --force for a full refetch.
  const force = process.argv.includes("--force")
  console.log("==================================================")
  console.log(`[Sync CLI] Starting synchronization at ${new Date().toISOString()}`)
  console.log(`[Sync CLI] Mode: ${force ? "forced (full refetch)" : "cached (respect TTLs)"}`)
  console.log(`[Sync CLI] Database URL: ${process.env.DATABASE_URL ? "Configured" : "None (Memory/Disk only)"}`)
  console.log(`[Sync CLI] GitHub Token: ${process.env.GITHUB_TOKEN ? "Configured" : "None"}`)
  console.log("==================================================")

  try {
    const { syncAllProjects } = await import("@/lib/github/store")
    const result = await syncAllProjects({ force })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log("--------------------------------------------------")
    console.log(`[Sync CLI] Sync Finished in ${duration}s`)
    console.log(`[Sync CLI] Success: ${result.success}`)
    console.log(`[Sync CLI] Projects Synced: ${result.synced}`)

    if (result.errors.length > 0) {
      console.warn(`[Sync CLI] Warnings/Errors (${result.errors.length}):`)
      result.errors.forEach((err) => console.warn(`  - ${err}`))
    }
    console.log("==================================================")

    process.exit(result.success ? 0 : 1)
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error(`[Sync CLI] Fatal Error after ${duration}s:`, error)
    process.exit(1)
  }
}

run()
