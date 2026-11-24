import { getDb } from "./db";
import { getDailyHistory } from "./data/yahoo";
import { mapLimit } from "./utils";

/**
 * Ärlig uppföljning av prognoserna: hur gick kursen 5 handelsdagar efter
 * att en positiv/neutral/negativ utsikt gavs?
 */
export interface PredictionEval {
  evaluated: number;
  hits: number;
  hitRate: number | null;
  byDir: { dir: number; label: string; n: number; avgReturn: number | null; hitRate: number | null }[];
  firstDate: string | null;
  pending: number;
}

const HORIZON = 5;

export async function evaluatePredictions(): Promise<PredictionEval> {
  const rows = getDb().prepare("SELECT date, ticker, outlook FROM predictions ORDER BY date").all() as { date: string; ticker: string; outlook: number }[];
  const tickers = [...new Set(rows.map((r) => r.ticker))];
  const closesBy: Record<string, { day: string; c: number }[]> = {};
  await mapLimit(tickers, 4, async (t) => {
    try {
      const h = (await getDailyHistory(t)).data;
      closesBy[t] = h.bars.map((b) => ({ day: new Date((b.t + h.gmtoffset) * 1000).toISOString().slice(0, 10), c: b.c }));
    } catch {
      closesBy[t] = [];
    }
  });
  const results: { dir: number; ret: number; hit: boolean }[] = [];
  let pending = 0;
  for (const r of rows) {
    const bars = closesBy[r.ticker] ?? [];
    const i = bars.findIndex((b) => b.day >= r.date);
    if (i < 0 || i + HORIZON >= bars.length) { pending++; continue; }
    const ret = (bars[i + HORIZON].c / bars[i].c - 1) * 100;
    const hit = r.outlook === 1 ? ret > 0 : r.outlook === -1 ? ret < 0 : Math.abs(ret) < 2;
    results.push({ dir: r.outlook, ret, hit });
  }
  const byDir = [1, 0, -1].map((d) => {
    const xs = results.filter((x) => x.dir === d);
    return {
      dir: d,
      label: d === 1 ? "Positiv" : d === 0 ? "Neutral" : "Negativ",
      n: xs.length,
      avgReturn: xs.length ? xs.reduce((s, x) => s + x.ret, 0) / xs.length : null,
      hitRate: xs.length ? (xs.filter((x) => x.hit).length / xs.length) * 100 : null,
    };
  });
  const hits = results.filter((x) => x.hit).length;
  return { evaluated: results.length, hits, hitRate: results.length ? (hits / results.length) * 100 : null, byDir, firstDate: rows[0]?.date ?? null, pending };
}
