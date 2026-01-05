import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import fs from 'fs'
import path from 'path'

let db: any = null
let initPromise: Promise<any> | null = null

export async function initializeSQLite() {
  // If already initializing, wait for it to complete
  if (initPromise) {
    return initPromise
  }

  // If already initialized, return existing connection
  if (db) {
    return db
  }

  console.log('🚀 Initializing SQLite database...')
  
  initPromise = (async () => {
    try {
      // Create database directory if it doesn't exist
      const dbDir = path.join(process.cwd(), 'database')
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      // Open SQLite database with WAL mode for better concurrency
      db = await open({
        filename: path.join(dbDir, 'e_patient_connect.db'),
        driver: sqlite3.Database
      })

      // Enable WAL mode for better concurrent access
      await db.exec('PRAGMA journal_mode = WAL;')
      await db.exec('PRAGMA synchronous = NORMAL;')
      await db.exec('PRAGMA cache_size = 1000;')
      await db.exec('PRAGMA temp_store = memory;')
      await db.exec('PRAGMA busy_timeout = 30000;') // 30 second timeout

      console.log('✅ SQLite database connected')

      // Check if tables already exist
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'")
      
      if (tables.length === 0) {
        // Read the clean SQLite schema
        const schemaPath = path.join(process.cwd(), 'database', 'sqlite-schema.sql')
        const schemaSql = fs.readFileSync(schemaPath, 'utf8')
        
        // Execute schema
        console.log('📋 Creating SQLite tables...')
        await db.exec(schemaSql)
        
        // Verify tables were created
        const newTables = await db.all("SELECT name FROM sqlite_master WHERE type='table'")
        console.log('📊 Created tables:', newTables.map(t => t.name).join(', '))
        console.log('✅ SQLite schema created successfully')
      } else {
        console.log('📊 Using existing tables:', tables.map(t => t.name).join(', '))
        console.log('✅ SQLite database ready')
      }

      return db
    } catch (error) {
      console.error('❌ SQLite initialization failed:', error)
      db = null
      initPromise = null
      throw error
    }
  })()

  return initPromise
}

export async function getSQLiteConnection() {
  if (!db) {
    await initializeSQLite()
  }
  return db
}

// Simple query execution for SQLite with retry logic
export async function executeSQLiteQuery(query: string, params: any[] = []) {
  const maxRetries = 3
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!db) {
        await initializeSQLite()
      }
      
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        return await db.all(query, params)
      } else {
        return await db.run(query, params)
      }
    } catch (error: any) {
      lastError = error
      
      // If database is locked, wait and retry
      if (error.code === 'SQLITE_BUSY' && attempt < maxRetries) {
        console.log(`⏳ Database busy, retrying attempt ${attempt + 1}/${maxRetries}...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
        continue
      }
      
      console.error('SQLite query error:', error)
      throw error
    }
  }

  throw lastError
}