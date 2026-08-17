import mysql from "mysql2/promise"
import type { GhUserProfile, ProjectData } from "@/lib/github/types"

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
      keepAliveInitialDelay: 10000,
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
        data LONGTEXT NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS user_cache (
        login VARCHAR(255) PRIMARY KEY,
        data LONGTEXT NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    tableInitialized = true
    return true
  } catch (err) {
    tableInitialized = false
    console.error("[DB] Failed to initialize database tables:", err)
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

export async function getUserFromDb(login: string): Promise<GhUserProfile | null> {
  const p = getPool()
  if (!p) return null

  try {
    await initDb()
    const [rows] = await p.query<mysql.RowDataPacket[]>(
      "SELECT data FROM user_cache WHERE login = ?",
      [login.toLowerCase()]
    )
    if (rows.length === 0) return null
    const row = rows[0]
    if (typeof row.data === "string") {
      return JSON.parse(row.data) as GhUserProfile
    }
    return row.data as GhUserProfile
  } catch (err) {
    console.error(`[DB] Error reading user ${login} from database:`, err)
    return null
  }
}

export async function getUsersFromDb(logins: string[]): Promise<Map<string, GhUserProfile>> {
  const map = new Map<string, GhUserProfile>()
  const p = getPool()
  if (!p || logins.length === 0) return map

  try {
    await initDb()
    const normalizedLogins = logins.map((l) => l.toLowerCase())
    const placeholders = normalizedLogins.map(() => "?").join(",")
    const [rows] = await p.query<mysql.RowDataPacket[]>(
      `SELECT login, data FROM user_cache WHERE login IN (${placeholders})`,
      normalizedLogins
    )

    for (const row of rows) {
      const user =
        typeof row.data === "string"
          ? (JSON.parse(row.data) as GhUserProfile)
          : (row.data as GhUserProfile)
      map.set(row.login.toLowerCase(), user)
    }
  } catch (err) {
    console.error("[DB] Error reading users from database:", err)
  }

  return map
}

export async function saveUserToDb(
  login: string,
  data: GhUserProfile
): Promise<boolean> {
  const p = getPool()
  if (!p) return false

  try {
    await initDb()
    const jsonStr = JSON.stringify(data)
    await p.query(
      `INSERT INTO user_cache (login, data, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()`,
      [login.toLowerCase(), jsonStr]
    )
    return true
  } catch (err) {
    console.error(`[DB] Error saving user ${login} to database:`, err)
    return false
  }
}

export async function saveUsersToDb(users: GhUserProfile[]): Promise<boolean> {
  const p = getPool()
  if (!p || users.length === 0) return false

  try {
    await initDb()
    for (const user of users) {
      const jsonStr = JSON.stringify(user)
      await p.query(
        `INSERT INTO user_cache (login, data, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = NOW()`,
        [user.login.toLowerCase(), jsonStr]
      )
    }
    return true
  } catch (err) {
    console.error("[DB] Error saving users batch to database:", err)
    return false
  }
}
