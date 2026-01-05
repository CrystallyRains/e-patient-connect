import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initializeDatabase() {
  console.log('🚀 Initializing E-Patient Connect Database...')

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'e_patient_connect',
    multipleStatements: true
  }

  try {
    // Connect to MySQL server with database specified
    const connection = await mysql.createConnection(config)
    console.log('✅ Connected to MySQL server')

    // Read and execute schema SQL
    const schemaPath = path.join(__dirname, 'schema.sql')
    let schemaSql = fs.readFileSync(schemaPath, 'utf8')
    
    // Remove CREATE DATABASE and USE statements since we're already connected to the database
    schemaSql = schemaSql
      .replace(/CREATE DATABASE.*?;/gi, '')
      .replace(/USE.*?;/gi, '')
    
    console.log('📋 Creating tables...')
    await connection.execute(schemaSql)
    console.log('✅ Database schema created successfully')

    await connection.end()
    console.log('✅ Database initialization completed!')
    
    return true
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}

// Run initialization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('\n🎉 Database is ready!')
      console.log('Next steps:')
      console.log('1. Run: npm run db:seed')
      console.log('2. Run: npm run dev')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Initialization failed:', error)
      process.exit(1)
    })
}

export { initializeDatabase }