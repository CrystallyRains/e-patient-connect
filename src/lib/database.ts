import { getSQLiteConnection, executeSQLiteQuery } from '../../database/sqlite'

// Initialize SQLite database on module load
let initializationPromise: Promise<void> | null = null

async function initializeDatabase() {
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    try {
      await getSQLiteConnection()
      console.log('✅ SQLite database initialized')
    } catch (error) {
      console.error('❌ SQLite initialization failed:', error)
      throw error
    }
  })()

  return initializationPromise
}

// Unified database interface (SQLite only)
export const database = {
  async execute(query: string, params: any[] = []) {
    // Ensure database is initialized
    await initializeDatabase()
    
    const result = await executeSQLiteQuery(query, params)
    
    // Format result to match expected format
    if (Array.isArray(result)) {
      return [result, null] // [rows, fields]
    } else {
      return [{ insertId: result.lastID, affectedRows: result.changes }, null]
    }
  },

  async getConnection() {
    // Ensure database is initialized
    await initializeDatabase()
    
    return {
      execute: this.execute.bind(this),
      beginTransaction: async () => {
        await this.execute('BEGIN TRANSACTION')
      },
      commit: async () => {
        await this.execute('COMMIT')
      },
      rollback: async () => {
        await this.execute('ROLLBACK')
      },
      release: () => {} // No-op for SQLite
    }
  }
}

// Database connection test
export async function testConnection() {
  try {
    await initializeDatabase()
    console.log('✅ SQLite database connected successfully')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Execute query helper
export async function executeQuery(query: string, params: any[] = []) {
  try {
    const [results] = await database.execute(query, params)
    return results
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}