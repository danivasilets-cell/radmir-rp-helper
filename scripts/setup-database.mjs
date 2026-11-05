import pg from 'pg'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Client } = pg
const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('Set DATABASE_URL before running database setup')
const here = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(here, '../drizzle/source-migrations')
const names = (await readdir(migrationsDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query(`CREATE TABLE IF NOT EXISTS _radmir_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`)
  for (const name of names) {
    const already = await client.query('SELECT 1 FROM _radmir_migrations WHERE name = $1', [name])
    if (already.rowCount) {
      console.log(`skip ${name}`)
      continue
    }
    const sql = await readFile(path.join(migrationsDir, name, 'migration.sql'), 'utf8')
    console.log(`apply ${name}`)
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query('INSERT INTO _radmir_migrations (name) VALUES ($1)', [name])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw new Error(`Migration ${name} failed: ${error.message}`, { cause: error })
    }
  }
  console.log('Database schema and starter content are ready.')
} finally {
  await client.end()
}
