import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * En enda SQLite-fil i ./data. Skapas automatiskt första gången.
 * Instansen sparas på globalThis så att Next.js hot-reload inte öppnar nya anslutningar.
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
    CREATE TABLE IF NOT EXISTS watchlist (
      ticker      TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      search_name TEXT NOT NULL,
      sector      TEXT NOT NULL,
      country     TEXT NOT NULL,
      added_at    INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    -- En rad per bolag och dag: används för poänghistorik och utvärdering.
    CREATE TABLE IF NOT EXISTS score_history (
      date     TEXT NOT NULL,
      ticker   TEXT NOT NULL,
      total    REAL NOT NULL,
      subs     TEXT NOT NULL,
      price    REAL,
      PRIMARY KEY (date, ticker)
    );
    -- Prognoser ("utsikter") sparas så att träffsäkerheten kan mätas i efterhand.
    CREATE TABLE IF NOT EXISTS predictions (
      date       TEXT NOT NULL,
      ticker     TEXT NOT NULL,
      outlook    INTEGER NOT NULL, -- +1 positiv, 0 neutral, -1 negativ
      confidence TEXT NOT NULL,
      price      REAL,
      reason     TEXT NOT NULL,
      PRIMARY KEY (date, ticker)
    );
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__terminalenDb) globalThis.__terminalenDb = open();
  return globalThis.__terminalenDb;
}

export function todayStockholm(d = new Date()): string {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
}
