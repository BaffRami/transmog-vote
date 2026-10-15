import { createClient, Client } from '@libsql/client';

const globalForDb = global as unknown as { _db?: Client };

export function getDb(): Client {
  if (!globalForDb._db) {
    // 1. Configure the connection target
    const isProd = process.env.NODE_ENV === 'production';
    const url = isProd ? process.env.TURSO_DATABASE_URL! : 'file:local.db';
    const authToken = isProd ? process.env.TURSO_AUTH_TOKEN : undefined;

    if (isProd && !url) {
      throw new Error("Missing TURSO_DATABASE_URL environment variable in production.");
    }

    // 2. Initialize the LibSQL Client
    const db = createClient({ url, authToken });

    // 3. Execute setup schema and migrations asynchronously 
    db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        char_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        voting_enabled INTEGER NOT NULL DEFAULT 0,
        revotes_remaining INTEGER NOT NULL DEFAULT 3,
        reset_requested INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS voting_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contestant_id INTEGER NOT NULL REFERENCES users(id),
        is_open INTEGER NOT NULL DEFAULT 1,
        opened_at TEXT NOT NULL DEFAULT (datetime('now')),
        closed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voter_id INTEGER NOT NULL REFERENCES users(id),
        session_id INTEGER NOT NULL REFERENCES voting_sessions(id),
        score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 10),
        revote_count INTEGER NOT NULL DEFAULT 0,
        voted_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(voter_id, session_id)
      );
      CREATE TABLE IF NOT EXISTS signup_attempts (
        ip TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `).then(async () => {
      // Async migrations for safety
      try {
        const voteCols = await db.execute(`PRAGMA table_info('votes')`);
        if (!voteCols.rows.some(r => r.name === 'revote_count')) {
          await db.execute(`ALTER TABLE votes ADD COLUMN revote_count INTEGER NOT NULL DEFAULT 0`);
        }
        const userCols = await db.execute(`PRAGMA table_info('users')`);
        if (!userCols.rows.some(r => r.name === 'revotes_remaining')) {
          await db.execute(`ALTER TABLE users ADD COLUMN revotes_remaining INTEGER NOT NULL DEFAULT 3`);
        }
      } catch (err) {
        console.error("Migration check completed or skipped:", err);
      }
    }).catch(err => console.error("Database schema setup failed:", err));

    globalForDb._db = db;
  }
  return globalForDb._db!;
}
