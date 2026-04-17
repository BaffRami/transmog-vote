import Database from 'better-sqlite3';
import path from 'path';

const globalForDb = global as unknown as { _db?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb._db) {
    const dbPath = process.env.NODE_ENV === 'production'
      ? '/app/data/transmog.db'
      : path.join(process.cwd(), 'transmog.db');

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(`
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
    `);

    // Migration: add revote_count to existing votes table
    try {
      db.exec('ALTER TABLE users ADD COLUMN revotes_remaining INTEGER NOT NULL DEFAULT 3');
    } catch {
      // Column already exists, ignore
    }

    // Migration: add signup_attempts table if missing
    db.exec(`
      CREATE TABLE IF NOT EXISTS signup_attempts (
        ip TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    globalForDb._db = db;
  }
  return globalForDb._db;
}