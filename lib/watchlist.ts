import { z } from "zod";
import { getDb } from "./db";

export const COUNTRIES = ["SE", "US", "DE", "FI", "DK", "NO", "Övrigt"] as const;
export const SECTORS = ["Industri", "Finans", "Teknik", "Konsument", "Hälsovård", "Kommunikation", "Energi", "Material", "Fastigheter", "Dagligvaror", "Kraft", "Okänd"] as const;

export const WatchItemSchema = z.object({
  ticker: z.string().trim().min(1).max(25).transform((s) => s.toUpperCase()),
  name: z.string().trim().min(1).max(80),
  /** Kort namn som används i nyhetssök och Avanza-länk. */
  searchName: z.string().trim().min(1).max(80),
  sector: z.string().trim().min(1).max(40).default("Okänd"),
  country: z.enum(COUNTRIES).default("Övrigt"),
});
export type WatchItem = z.infer<typeof WatchItemSchema>;

/** Förvald bevakningslista: stora svenska + stora amerikanska bolag. */
export const DEFAULT_WATCHLIST: WatchItem[] = [
  { ticker: "VOLV-B.ST", name: "Volvo B", searchName: "Volvo", sector: "Industri", country: "SE" },
  { ticker: "ATCO-A.ST", name: "Atlas Copco A", searchName: "Atlas Copco", sector: "Industri", country: "SE" },
  { ticker: "SAND.ST", name: "Sandvik", searchName: "Sandvik", sector: "Industri", country: "SE" },
  { ticker: "ASSA-B.ST", name: "Assa Abloy B", searchName: "Assa Abloy", sector: "Industri", country: "SE" },
  { ticker: "ABB.ST", name: "ABB", searchName: "ABB", sector: "Industri", country: "SE" },
  { ticker: "INVE-B.ST", name: "Investor B", searchName: "Investor AB", sector: "Finans", country: "SE" },
  { ticker: "SEB-A.ST", name: "SEB A", searchName: '"SEB" (bank OR aktie OR banken OR storbank)', sector: "Finans", country: "SE" },
  { ticker: "ERIC-B.ST", name: "Ericsson B", searchName: "Ericsson", sector: "Teknik", country: "SE" },
  { ticker: "HM-B.ST", name: "H&M B", searchName: "H&M", sector: "Konsument", country: "SE" },
  { ticker: "EVO.ST", name: "Evolution", searchName: '"Evolution AB" OR "Evolution Gaming" OR "Evolution-aktien"', sector: "Konsument", country: "SE" },
  { ticker: "AZN.ST", name: "AstraZeneca", searchName: "AstraZeneca", sector: "Hälsovård", country: "SE" },
  { ticker: "AAPL", name: "Apple", searchName: "Apple", sector: "Teknik", country: "US" },
  { ticker: "MSFT", name: "Microsoft", searchName: "Microsoft", sector: "Teknik", country: "US" },
  { ticker: "NVDA", name: "Nvidia", searchName: "Nvidia", sector: "Teknik", country: "US" },
  { ticker: "AMZN", name: "Amazon", searchName: "Amazon", sector: "Konsument", country: "US" },
  { ticker: "GOOGL", name: "Alphabet A", searchName: '"Alphabet" OR "Google"', sector: "Kommunikation", country: "US" },
];

type Row = { ticker: string; name: string; search_name: string; sector: string; country: string };

function seedIfEmpty() {
  const db = getDb();
  const n = (db.prepare("SELECT COUNT(*) AS n FROM watchlist").get() as { n: number }).n;
  const seeded = db.prepare("SELECT value FROM settings WHERE key = 'watchlist_seeded'").get();
  if (n === 0 && !seeded) {
    const ins = db.prepare("INSERT INTO watchlist (ticker, name, search_name, sector, country, added_at) VALUES (?, ?, ?, ?, ?, ?)");
    const now = Date.now();
    db.transaction(() => {
      DEFAULT_WATCHLIST.forEach((w, i) => ins.run(w.ticker, w.name, w.searchName, w.sector, w.country, now + i));
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('watchlist_seeded', '1')").run();
    })();
  }
}

export function getWatchlist(): WatchItem[] {
  seedIfEmpty();
  const rows = getDb().prepare("SELECT ticker, name, search_name, sector, country FROM watchlist ORDER BY added_at").all() as Row[];
  return rows.map((r) => ({ ticker: r.ticker, name: r.name, searchName: r.search_name, sector: r.sector, country: r.country as WatchItem["country"] }));
}

export function findWatchItem(ticker: string): WatchItem | undefined {
  const t = ticker.toUpperCase();
  return getWatchlist().find((w) => w.ticker === t);
}

export function addToWatchlist(item: WatchItem) {
  const w = WatchItemSchema.parse(item);
  getDb()
    .prepare("INSERT OR REPLACE INTO watchlist (ticker, name, search_name, sector, country, added_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(w.ticker, w.name, w.searchName, w.sector, w.country, Date.now());
}

export function removeFromWatchlist(ticker: string) {
  getDb().prepare("DELETE FROM watchlist WHERE ticker = ?").run(ticker.toUpperCase());
}

/** Gissa land och svenskt sektornamn utifrån ticker och Yahoos engelska sektor. */
export function guessCountry(ticker: string): WatchItem["country"] {
  if (ticker.endsWith(".ST")) return "SE";
  if (ticker.endsWith(".DE")) return "DE";
  if (ticker.endsWith(".HE")) return "FI";
  if (ticker.endsWith(".CO")) return "DK";
  if (ticker.endsWith(".OL")) return "NO";
  if (!ticker.includes(".")) return "US";
  return "Övrigt";
}

const SECTOR_MAP: Record<string, string> = {
  Industrials: "Industri",
  "Financial Services": "Finans",
  Technology: "Teknik",
  "Consumer Cyclical": "Konsument",
  "Consumer Defensive": "Dagligvaror",
  Healthcare: "Hälsovård",
  "Communication Services": "Kommunikation",
  Energy: "Energi",
  "Basic Materials": "Material",
  "Real Estate": "Fastigheter",
  Utilities: "Kraft",
};
export function translateSector(s?: string | null): string {
  return (s && SECTOR_MAP[s]) || "Okänd";
}
