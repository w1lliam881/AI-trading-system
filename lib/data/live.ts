import { cached } from "../cache";

/**
 * Livekurser via Yahoos "spark"-tjänst: många symboler i ett enda anrop och
 * ingen inloggningskaka behövs. Cachas i 15 sekunder så att flera flikar inte
 * hamrar på Yahoo. (Yahoo kan ha upp till 15 min fördröjning på vissa börser.)
 */
export interface LiveQuote {
  symbol: string;
  price: number;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  currency: string;
  /** Tidpunkt för senaste kurs (ms). */
  time: number;
}

export const LIVE_TTL = 15_000;
const UA = { "User-Agent": "Mozilla/5.0 (Terminalen; lokal app)" };

async function fetchSpark(symbols: string[]): Promise<LiveQuote[]> {
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols.map(encodeURIComponent).join(",")}&range=1d&interval=5m`;
  const res = await fetch(url, { headers: UA, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo spark svarade ${res.status}`);
  const json = (await res.json()) as { spark?: { result?: Array<{ symbol: string; response?: Array<{ meta?: Record<string, unknown> }> }> } };
  const out: LiveQuote[] = [];
  for (const r of json.spark?.result ?? []) {
    const m = r.response?.[0]?.meta;
    if (!m || typeof m.regularMarketPrice !== "number") continue;
    const price = m.regularMarketPrice as number;
    const prev = (typeof m.previousClose === "number" ? m.previousClose : typeof m.chartPreviousClose === "number" ? m.chartPreviousClose : null) as number | null;
    out.push({
      symbol: r.symbol,
      price,
      prevClose: prev,
      change: prev != null ? price - prev : null,
      changePct: typeof m.regularMarketChangePercent === "number" ? (m.regularMarketChangePercent as number) : prev ? (price / prev - 1) * 100 : null,
      dayHigh: (m.regularMarketDayHigh as number) ?? null,
      dayLow: (m.regularMarketDayLow as number) ?? null,
      volume: (m.regularMarketVolume as number) ?? null,
      currency: String(m.currency ?? ""),
      time: typeof m.regularMarketTime === "number" ? (m.regularMarketTime as number) * 1000 : Date.now(),
    });
  }
  return out;
}

/** Hämtar livekurser för valfritt antal symboler (i grupper om 20). */
export async function getLiveQuotes(symbols: string[]): Promise<{ quotes: Record<string, LiveQuote>; fetchedAt: number; stale: boolean }> {
  const uniq = [...new Set(symbols.map((s) => s.toUpperCase()))].sort();
  const chunks: string[][] = [];
  for (let i = 0; i < uniq.length; i += 20) chunks.push(uniq.slice(i, i + 20));
  const quotes: Record<string, LiveQuote> = {};
  let fetchedAt = Date.now();
  let stale = false;
  await Promise.all(
    chunks.map(async (c) => {
      try {
        const r = await cached(`live:${c.join(",")}`, LIVE_TTL, () => fetchSpark(c));
        r.data.forEach((q) => (quotes[q.symbol.toUpperCase()] = q));
        fetchedAt = Math.min(fetchedAt, r.fetchedAt);
        stale ||= r.stale;
      } catch {
        stale = true;
      }
    }),
  );
  return { quotes, fetchedAt, stale };
}
