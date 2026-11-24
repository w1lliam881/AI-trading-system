import { getDb, todayStockholm } from "./db";
import { mapLimit } from "./utils";
import { getWatchlist, findWatchItem, guessCountry, type WatchItem } from "./watchlist";
import { getWeights } from "./settings";
import { MARKETS } from "./markets";
import { getDailyHistory, type History } from "./data/yahoo";
import { getFundamentals } from "./data/fundamentals";
import { getCompanyNews, getWorldNews, type NewsItem } from "./data/news";
import { makeSnapshot, type Snapshot } from "./data/snapshot";
import { loadThemes } from "./analysis/sentiment";
import { computeTechnicals, scoreTechnical, type TechMetrics } from "./analysis/technical";
import { scoreFundamental, sectorAverages, type FundInput, type SectorAverages } from "./analysis/fundamental";
import { newsStats, scoreNews, type NewsStats } from "./analysis/news-score";
import { dividendYield, findEvents, scoreEvents, type CorporateEvent } from "./analysis/events";
import { buildMarketContext, scoreMacro, type MarketContext } from "./analysis/macro";
import { compose, type Composite } from "./analysis/scoring";
import { buildOutlook, type Outlook } from "./analysis/outlook";

export interface StockAnalysis {
  item: WatchItem;
  inWatchlist: boolean;
  snap: Snapshot | null;
  tech: TechMetrics | null;
  fund: FundInput | null;
  sectorAvg: SectorAverages;
  news: NewsItem[];
  newsStats: NewsStats | null;
  events: CorporateEvent[];
  comp: Composite;
  outlook: Outlook;
}

export interface Analysis {
  generatedAt: number;
  stocks: StockAnalysis[];
  market: MarketContext;
  marketSnaps: Record<string, Snapshot | null>;
  world: { items: NewsItem[]; failedSources: string[]; fetchedAt: number | null };
  status: { failed: string[]; stale: string[]; newsFailed: string[]; fundFailed: string[] };
}

const ANALYSIS_TTL = 60_000;
declare global {
  var __terminalenAnalysis: { at: number; p: Promise<Analysis> } | undefined;
}

async function safeHistory(symbol: string, status: Analysis["status"]): Promise<History | null> {
  try {
    const r = await getDailyHistory(symbol);
    if (r.stale) status.stale.push(symbol);
    return r.data;
  } catch {
    status.failed.push(symbol);
    return null;
  }
}

async function buildFundInput(item: WatchItem, hist: History | null, status: Analysis["status"]): Promise<FundInput | null> {
  try {
    const f = (await getFundamentals(item.ticker)).data;
    const price = hist?.price ?? hist?.bars.at(-1)?.c ?? 0;
    return { ...f, dividendYield: hist?.dividends?.length ? dividendYield(hist.dividends, price) : null };
  } catch {
    status.fundFailed.push(item.ticker);
    return null;
  }
}

function analyzeStock(
  item: WatchItem,
  inWatchlist: boolean,
  hist: History | null,
  fund: FundInput | null,
  peers: FundInput[],
  news: NewsItem[] | null,
  market: MarketContext,
): StockAnalysis {
  const weights = getWeights();
  const bars = hist?.bars ?? [];
  const snap = hist && bars.length ? makeSnapshot(hist) : null;
  const tech = bars.length ? computeTechnicals(bars, hist?.price) : null;
  const avg = sectorAverages(peers);
  const st = news ? newsStats(news) : null;
  const events = bars.length ? findEvents({ bars, dividends: hist?.dividends ?? [], lastQuarterEnd: fund?.lastQuarterEnd ?? null, country: item.country }) : [];
  const subs = [
    tech ? scoreTechnical(tech, bars.length) : scoreTechnical({} as TechMetrics, 0),
    scoreFundamental(fund, avg, item.sector),
    scoreNews(news),
    scoreMacro(market, item.sector),
    scoreEvents(events, bars.length),
  ];
  const comp = compose(subs, weights, tech?.volatility ?? null, fund?.debtToEquity ?? null, item.sector);
  const outlook = tech
    ? buildOutlook(news, st, tech, market, item.sector)
    : { dir: 0 as const, label: "Neutral" as const, strength: 0, confidence: "Låg" as const, summary: "Ingen kursdata.", drivers: [], keyHeadline: null };
  return { item, inWatchlist, snap, tech, fund, sectorAvg: avg, news: news ?? [], newsStats: st, events, comp, outlook };
}

function persist(stocks: StockAnalysis[]) {
  const db = getDb();
  const date = todayStockholm();
  const sh = db.prepare("INSERT OR REPLACE INTO score_history (date, ticker, total, subs, price) VALUES (?, ?, ?, ?, ?)");
  const pr = db.prepare("INSERT OR REPLACE INTO predictions (date, ticker, outlook, confidence, price, reason) VALUES (?, ?, ?, ?, ?, ?)");
  db.transaction(() => {
    for (const s of stocks) {
      if (!s.snap) continue;
      const subs = Object.fromEntries(Object.entries(s.comp.subs).map(([k, v]) => [k, v.score]));
      sh.run(date, s.item.ticker, s.comp.total, JSON.stringify(subs), s.snap.price);
      pr.run(date, s.item.ticker, s.outlook.dir, s.outlook.confidence, s.snap.price, s.outlook.summary);
    }
  })();
}

async function runAnalysis(): Promise<Analysis> {
  const status: Analysis["status"] = { failed: [], stale: [], newsFailed: [], fundFailed: [] };
  const list = getWatchlist();
  const marketSyms = MARKETS.map((m) => m.symbol);

  const [hists, mhists, worldRes] = await Promise.all([
    mapLimit(list, 4, (w) => safeHistory(w.ticker, status)),
    mapLimit(marketSyms, 4, (s) => safeHistory(s, status)),
    getWorldNews().catch(() => null),
  ]);
  const [funds, newsLists] = await Promise.all([
    mapLimit(list, 4, (w, i) => buildFundInput(w, hists[i], status)),
    mapLimit(list, 3, async (w) => {
      try {
        return (await getCompanyNews(w)).data;
      } catch {
        status.newsFailed.push(w.ticker);
        return null;
      }
    }),
  ]);

  const index: Record<string, History["bars"]> = {};
  marketSyms.forEach((s, i) => { if (mhists[i]) index[s] = mhists[i]!.bars; });
  const world = worldRes?.data.items ?? [];
  const market = buildMarketContext({
    index,
    stocks: list.map((w, i) => ({ sector: w.sector, country: w.country, closes: hists[i]?.bars.map((b) => b.c) ?? [] })),
    worldNews: world,
    themes: loadThemes(),
  });

  const stocks = list.map((w, i) => {
    const peers = list.map((p, j) => (j !== i && p.sector === w.sector ? funds[j] : null)).filter((f): f is FundInput => !!f);
    return analyzeStock(w, true, hists[i], funds[i], peers, newsLists[i], market);
  });
  try {
    persist(stocks);
  } catch {
    /* att spara historik får aldrig krascha sidan */
  }
  const marketSnaps: Record<string, Snapshot | null> = {};
  marketSyms.forEach((s, i) => (marketSnaps[s] = mhists[i] && mhists[i]!.bars.length ? makeSnapshot(mhists[i]!) : null));
  return {
    generatedAt: Date.now(),
    stocks,
    market,
    marketSnaps,
    world: { items: world, failedSources: worldRes?.data.failedSources ?? ["alla nyhetskällor"], fetchedAt: worldRes?.fetchedAt ?? null },
    status,
  };
}

/** Analys av hela bevakningslistan. Återanvänds i 60 sekunder (underliggande data cachas längre). */
export function analyzeAll(): Promise<Analysis> {
  const c = globalThis.__terminalenAnalysis;
  if (c && Date.now() - c.at < ANALYSIS_TTL) return c.p;
  const p = runAnalysis();
  globalThis.__terminalenAnalysis = { at: Date.now(), p };
  p.catch(() => (globalThis.__terminalenAnalysis = undefined));
  return p;
}

export function invalidateAnalysis() {
  globalThis.__terminalenAnalysis = undefined;
}

/** Analys för en enskild aktie (även utanför bevakningslistan). */
export async function analyzeTicker(ticker: string, hist: History): Promise<{ analysis: StockAnalysis; all: Analysis }> {
  const all = await analyzeAll();
  const hit = all.stocks.find((s) => s.item.ticker === ticker);
  if (hit) return { analysis: hit, all };
  const item: WatchItem = findWatchItem(ticker) ?? {
    ticker,
    name: hist.name,
    searchName: hist.name.replace(/\s*\(publ\)|,?\s+(Inc\.?|Corporation|Corp\.?|Ltd\.?|plc|AB)$/gi, "").trim(),
    sector: "Okänd",
    country: guessCountry(ticker),
  };
  const status: Analysis["status"] = { failed: [], stale: [], newsFailed: [], fundFailed: [] };
  const [fund, news] = await Promise.all([
    buildFundInput(item, hist, status),
    getCompanyNews(item).then((r) => r.data).catch(() => null),
  ]);
  const peers = all.stocks.filter((s) => s.item.sector === item.sector && s.fund).map((s) => s.fund!);
  return { analysis: analyzeStock(item, false, hist, fund, peers, news, all.market), all };
}

/** Poänghistorik för ett bolag (sparas en gång per dag när analysen körs). */
export function scoreHistory(ticker: string): { date: string; total: number; subs: Record<string, number>; price: number | null }[] {
  const rows = getDb().prepare("SELECT date, total, subs, price FROM score_history WHERE ticker = ? ORDER BY date").all(ticker) as { date: string; total: number; subs: string; price: number | null }[];
  return rows.map((r) => ({ date: r.date, total: r.total, subs: JSON.parse(r.subs), price: r.price }));
}
