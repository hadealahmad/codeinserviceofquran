import mysql from "mysql2/promise"
import type { ProjectData } from "@/lib/github/types"

const DATABASE_URL = process.env.DATABASE_URL

let pool: mysql.Pool | null = null

function getPool(): mysql.Pool | null {
  if (!DATABASE_URL) return null
  if (!pool) {
    pool = mysql.createPool({
      uri: DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    })
  }
  return pool
}

let tableInitialized = false

export async function initDb(): Promise<boolean> {
  const p = getPool()
  if (!p) return false
  if (tableInitialized) return true

  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS project_cache (
        id VARCHAR(255) PRIMARY KEY,
        data JSON NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)
    tableInitialized = true
    return true
  } catch (err) {
    console.error("[DB] Failed to initialize table project_cache:", err)
    return false
  }
}

export async function getProjectFromDb(id: string): Promise<ProjectData | null> {
  const p = getPool()
  if (!p) return null

  try {
    await initDb()
    const [rows] = await p.query<mysql.RowDataPacket[]>(
      "SELECT data FROM project_cache WHERE id = ?",
      [id]
    )
    if (rows.length === 0) return null
    const row = rows[0]
    if (typeof row.data === "string") {
      return JSON.parse(row.data) as ProjectData
    }
    return row.data as ProjectData
  } catch (err) {
    console.error(`[DB] Error reading project ${id} from database:`, err)
    return null
  }
}

export async function saveProjectToDb(
  id: string,
  data: ProjectData
): Promise<boolean> {
  const p = getPool()
  if (!p) return false

  try {
    await initDb()
    const jsonStr = JSON.stringify(data)
    await p.query(
      `INSERT INTO project_cache (id, data, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()`,
      [id, jsonStr]
    )
    return true
  } catch (err) {
    console.error(`[DB] Error saving project ${id} to database:`, err)
    return false
  }
}
