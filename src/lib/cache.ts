import { promises as fs } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

const CACHE_DIR = path.join(process.cwd(), ".cache", "github")

type StoredEntry = {
  storedAt: number
  ttl: number
  data: unknown
}

const memory = new Map<string, { expiresAt: number; data: unknown }>()

function hashKey(key: string): string {
  return crypto.createHash("sha1").update(key).digest("hex")
}

async function readFileCache(key: string): Promise<StoredEntry | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${hashKey(key)}.json`)
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw) as StoredEntry
  } catch {
    return null
  }
}

async function writeFileCache(key: string, entry: StoredEntry): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    const filePath = path.join(CACHE_DIR, `${hashKey(key)}.json`)
    await fs.writeFile(filePath, JSON.stringify(entry))
  } catch {
    // Ignore write errors; the in-memory cache still works.
  }
}

type CacheOptions<T> = {
  key: string
  ttl?: number
  force?: boolean
  fetch: () => Promise<T>
}

/**
 * Small time-based cache with an in-memory layer and a filesystem layer that
 * survives restarts. When the fetcher fails (e.g. GitHub rate limit), stale
 * data is served when available.
 */
export async function cached<T>({
  key,
  ttl = 10 * 60 * 1000,
  force = false,
  fetch,
}: CacheOptions<T>): Promise<T> {
  const now = Date.now()

  const mem = memory.get(key)
  if (!force && mem && mem.expiresAt > now) return mem.data as T

  if (!force) {
    const file = await readFileCache(key)
    if (file && now - file.storedAt < file.ttl) {
      memory.set(key, { expiresAt: now + file.ttl, data: file.data })
      return file.data as T
    }
  }

  try {
    const data = await fetch()
    memory.set(key, { expiresAt: now + ttl, data })
    await writeFileCache(key, { storedAt: now, ttl, data })
    return data
  } catch (error) {
    const stale = await readFileCache(key)
    if (stale) {
      memory.set(key, {
        expiresAt: now + Math.min(ttl, 60 * 1000),
        data: stale.data,
      })
      return stale.data as T
    }
    throw error
  }
}
