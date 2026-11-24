import { cached } from "../cache";

/**
 * Nyckeltal från Yahoos öppna "fundamentals-timeseries"-tjänst (ingen nyckel eller
 * inloggningskaka). Allt som saknas blir null och markeras som otillräcklig data.
 */
export interface Fundamentals {
  pe: number | null;
  ps: number | null;
  pb: number | null;
  marketCap: number | null;
  /** Total skuld / eget kapital (gånger). */
  debtToEquity: number | null;
  /** Nettomarginal senaste 12 mån (%). */
  netMargin: number | null;
  /** Omsättningstillväxt senaste kvartalet mot samma kvartal året innan (%). */
  revenueGrowth: number | null;
  /** Senaste kvartalets slutdatum (ms) – används för att uppskatta nästa rapport. */
  lastQuarterEnd: number | null;
  currency: string | null;
}

const TYPES = [
  "trailingPeRatio",
  "trailingPsRatio",
  "trailingPbRatio",
  "trailingMarketCap",
  "annualTotalDebt",
  "annualStockholdersEquity",
  "trailingNetIncome",
  "trailingTotalRevenue",
  "quarterlyTotalRevenue",
];

type Point = { asOfDate: string; currencyCode?: string; reportedValue: { raw: number } } | null;

async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  const now = Math.floor(Date.now() / 1000);
  const url = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=${TYPES.join(",")}&period1=${now - 4 * 365 * 86400}&period2=${now + 86400}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Terminalen; lokal app)" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo nyckeltal svarade ${res.status}`);
  const json = (await res.json()) as { timeseries?: { result?: Array<Record<string, unknown> & { meta: { type: string[] } }> } };
  const series: Record<string, { date: string; v: number; cur?: string }[]> = {};
  for (const r of json.timeseries?.result ?? []) {
    const t = r.meta.type[0];
    const pts = ((r[t] as Point[] | undefined) ?? []).filter((p): p is NonNullable<Point> => !!p && Number.isFinite(p.reportedValue?.raw));
    series[t] = pts.map((p) => ({ date: p.asOfDate, v: p.reportedValue.raw, cur: p.currencyCode })).sort((a, b) => a.date.localeCompare(b.date));
  }
  const last = (t: string) => series[t]?.at(-1)?.v ?? null;
  const debt = last("annualTotalDebt");
  const equity = last("annualStockholdersEquity");
  const ni = last("trailingNetIncome");
  const rev = last("trailingTotalRevenue");
  const q = series["quarterlyTotalRevenue"] ?? [];
  let growth: number | null = null;
  if (q.length >= 5) {
    const a = q[q.length - 5].v;
    const b = q[q.length - 1].v;
    if (a > 0) growth = (b / a - 1) * 100;
  }
  const pe = last("trailingPeRatio");
  return {
    pe: pe != null && pe > 0 ? pe : null, // negativt P/E (förlust) behandlas som saknat P/E
    ps: last("trailingPsRatio"),
    pb: last("trailingPbRatio"),
    marketCap: last("trailingMarketCap"),
    debtToEquity: debt != null && equity != null && equity > 0 ? debt / equity : null,
    netMargin: ni != null && rev ? (ni / rev) * 100 : null,
    revenueGrowth: growth,
    lastQuarterEnd: q.length ? Date.parse(q[q.length - 1].date) : null,
    currency: q.at(-1)?.cur ?? series["annualTotalDebt"]?.at(-1)?.cur ?? null,
  };
}

/** Nyckeltal ändras sällan: cacha i 12 timmar. */
export function getFundamentals(symbol: string) {
  return cached(`fund:${symbol}`, 12 * 60 * 60 * 1000, () => fetchFundamentals(symbol));
}
