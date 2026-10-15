// lib/db.ts
import { createClient, Client } from '@libsql/client';

const globalForDb = global as unknown as { _db?: Client };

export function getDb(): Client {
  if (!globalForDb._db) {
    const url = process.env.TURSO_DATABASE_URL ?? 'file:local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    globalForDb._db = createClient({ url, authToken });
  }
  return globalForDb._db;
}