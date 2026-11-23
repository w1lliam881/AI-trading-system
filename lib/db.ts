import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * En enda SQLite-fil i ./data. Skapas automatiskt första gången.
 * Vi sparar instansen på globalThis så att Next.js hot-reload inte öppnar
 * nya anslutningar hela tiden.
 */
const DB_PATH = process.env.TERMINALEN_DB ?? path.join(process.cwd(), "data", "terminalen.db");

declare global {
  var __terminalenDb: Database.Database | undefined;
}

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__terminalenDb) globalThis.__terminalenDb = open();
  return globalThis.__terminalenDb;
}
