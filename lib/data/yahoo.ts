import YahooFinance from "yahoo-finance2";
import { cached, FIFTEEN_MIN, type Cached } from "../cache";

/**
 * All kursdata kommer från Yahoo Finance via det öppna npm-paketet yahoo-finance2.
 * Gratis, ingen nyckel. Vi cachar allt i SQLite i minst 15 minuter.
 */
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** En dags (eller en intradagsstapels) OHLCV. t = unix-sekunder (UTC). */
export interface Bar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface History {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  timezone: string;
  /** Sekunder att lägga på UTC för att få börsens lokala tid. */
  gmtoffset: number;
  price: number;
  bars: Bar[];
  /** Utdelningar (t = unix-sekunder för x-dag, amount = per aktie). Endast dagsdata. */
  dividends?: { t: number; amount: number }[];
}

type RawQuote = { date: Date; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null };

function toBars(quotes: RawQuote[]): Bar[] {
  const out: Bar[] = [];
  for (const q of quotes) {
    if (q.close == null || !Number.isFinite(q.close)) continue;
    out.push({
      t: Math.floor(new Date(q.date).getTime() / 1000),
      o: q.open ?? q.close,
      h: q.high ?? q.close,
      l: q.low ?? q.close,
      c: q.close,
      v: q.volume ?? 0,
    });
  }
  return out;
}

async function fetchChart(symbol: string, period1: Date, interval: "1d" | "5m" | "30m"): Promise<History> {
  const res = await yf.chart(symbol, { period1, interval, includePrePost: false, ...(interval === "1d" ? { events: "div" } : {}) });
  const m = res.meta;
  const divs = (res.events?.dividends ?? []).map((d) => ({ t: Math.floor(new Date(d.date).getTime() / 1000), amount: d.amount }));
  return {
    symbol: m.symbol,
    name: m.longName ?? m.shortName ?? m.symbol,
    currency: m.currency ?? "",
    exchange: m.fullExchangeName ?? m.exchangeName ?? "",
    timezone: m.exchangeTimezoneName ?? "UTC",
    gmtoffset: m.gmtoffset ?? 0,
    price: m.regularMarketPrice,
    bars: toBars(res.quotes as RawQuote[]),
    dividends: divs.sort((a, b) => a.t - b.t),
  };
}

/** Daglig historik ~6 år bakåt (räcker för 5Å-graf + 200-dagars medelvärde). */
export function getDailyHistory(symbol: string): Promise<Cached<History>> {
  return cached(`daily2:${symbol}`, FIFTEEN_MIN, () => {
    const from = new Date();
    from.setFullYear(from.getFullYear() - 6);
    return fetchChart(symbol, from, "1d");
  });
}

export type IntradayRange = "1d" | "5d";

/** Intradag: 5-minutersstaplar för 1D, 30-minuters för 1V. */
export function getIntraday(symbol: string, range: IntradayRange): Promise<Cached<History>> {
  return cached(`intraday:${range}:${symbol}`, FIFTEEN_MIN, async () => {
    const days = range === "1d" ? 4 : 9; // lite marginal för helger
    const h = await fetchChart(symbol, new Date(Date.now() - days * 864e5), range === "1d" ? "5m" : "30m");
    // Behåll bara senaste handelsdagen (1D) resp. senaste 5 handelsdagarna (1V).
    const dayKey = (t: number) => Math.floor((t + h.gmtoffset) / 86400);
    const days_ = [...new Set(h.bars.map((b) => dayKey(b.t)))];
    const keep = new Set(days_.slice(range === "1d" ? -1 : -5));
    return { ...h, bars: h.bars.filter((b) => keep.has(dayKey(b.t))) };
  });
}

export interface SearchHit {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  /** Yahoos engelska sektornamn, om det finns. */
  sector?: string;
}

export function searchSymbols(query: string): Promise<Cached<SearchHit[]>> {
  const q = query.trim().toLowerCase();
  return cached(`search2:${q}`, 24 * 60 * 60 * 1000, async () => {
    const res = await yf.search(q, { quotesCount: 10, newsCount: 0 });
    return (res.quotes as Array<Record<string, unknown>>)
      .filter((x) => typeof x.symbol === "string" && (x.quoteType === "EQUITY" || x.quoteType === "ETF" || x.quoteType === "INDEX"))
      .map((x) => ({
        symbol: String(x.symbol),
        name: String(x.longname ?? x.shortname ?? x.symbol),
        exchange: String(x.exchDisp ?? x.exchange ?? ""),
        type: String(x.quoteType ?? ""),
        sector: typeof x.sector === "string" ? x.sector : undefined,
      }))
      // Stockholm först, sedan amerikanska huvudlistor (ticker utan punkt), sedan resten.
      .map((h, i) => ({ h, rank: (h.symbol.endsWith(".ST") ? 0 : !h.symbol.includes(".") && !/OTC/i.test(h.exchange) ? 1 : 2) * 100 + i }))
      .sort((a, b) => a.rank - b.rank)
      .map(({ h }) => h);
  });
}
