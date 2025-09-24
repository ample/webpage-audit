import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Global connection instance for serverless environment
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!db) {
    const sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql);
  }

  return db;
}

// Export the schema for convenience
export { schema };
export * from './schema';