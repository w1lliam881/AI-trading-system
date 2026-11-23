import { getDb } from "./db";

export const FIFTEEN_MIN = 15 * 60 * 1000;

export interface Cached<T> {
  data: T;
  /** När datan faktiskt hämtades (ms sedan 1970). */
  fetchedAt: number;
  /** true = hämtningen misslyckades och vi visar äldre cachad data. */
  stale: boolean;
  error?: string;
}

const inflight = new Map<string, Promise<Cached<unknown>>>();

/**
 * Hämta via cache. Regler:
 *  1. Finns data yngre än ttl → använd den (ingen nätverksförfrågan).
 *  2. Annars hämta nytt och spara med tidsstämpel.
 *  3. Misslyckas hämtningen → returnera gammal data med stale=true.
 *  4. Finns ingen data alls → kasta felet (anroparen visar ett snyggt felmeddelande).
 */
export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<Cached<T>> {
  const db = getDb();
  const row = db.prepare("SELECT value, fetched_at FROM cache WHERE key = ?").get(key) as
    | { value: string; fetched_at: number }
    | undefined;

  if (row && Date.now() - row.fetched_at < ttlMs) {
    return { data: JSON.parse(row.value) as T, fetchedAt: row.fetched_at, stale: false };
  }

  const existing = inflight.get(key);
  if (existing) return existing as Promise<Cached<T>>;

  const p = (async (): Promise<Cached<T>> => {
    try {
      const data = await fetcher();
      const now = Date.now();
      db.prepare(
        "INSERT INTO cache (key, value, fetched_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, fetched_at = excluded.fetched_at",
      ).run(key, JSON.stringify(data), now);
      return { data, fetchedAt: now, stale: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (row) return { data: JSON.parse(row.value) as T, fetchedAt: row.fetched_at, stale: true, error: message };
      throw new Error(message);
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p as Promise<Cached<unknown>>);
  return p;
}

/** Som cached(), men returnerar null i stället för att kasta när inget finns. */
export async function cachedOrNull<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<Cached<T> | null> {
  try {
    return await cached(key, ttlMs, fetcher);
  } catch {
    return null;
  }
}
