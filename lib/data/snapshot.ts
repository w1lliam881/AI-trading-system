import type { History } from "./yahoo";

/** Sammanfattning av en kursserie: det mesta som visas i listor och tickerband. */
export interface Snapshot {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  price: number;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  /** Avkastning i % över ungefär 1/3/6/12 månader (21/63/126/252 handelsdagar). */
  ret1m: number | null;
  ret3m: number | null;
  ret6m: number | null;
  ret1y: number | null;
  high52: number | null;
  low52: number | null;
  /** % under 52-veckorshögsta (negativt tal). */
  fromHigh52Pct: number | null;
  volume: number | null;
  avgVolume20: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  open: number | null;
  /** Senaste ~3 månaders stängningskurser för sparklines. */
  spark: number[];
  /** Tid för senaste stapel (ms). */
  lastBarAt: number | null;
}

function retOver(closes: number[], n: number): number | null {
  if (closes.length <= n) return null;
  const a = closes[closes.length - 1 - n];
  const b = closes[closes.length - 1];
  return a > 0 ? (b / a - 1) * 100 : null;
}

export function makeSnapshot(h: History): Snapshot {
  const bars = h.bars;
  const closes = bars.map((b) => b.c);
  const last = bars.at(-1);
  // Yahoo uppdaterar regularMarketPrice löpande; använd det som "pris" men
  // jämför med föregående dags stängning från historiken.
  const price = Number.isFinite(h.price) ? h.price : (last?.c ?? NaN);
  const prev = bars.length >= 2 ? bars[bars.length - 2].c : null;
  const change = prev != null ? price - prev : null;
  const year = bars.slice(-252);
  const high52 = year.length ? Math.max(...year.map((b) => b.h)) : null;
  const low52 = year.length ? Math.min(...year.map((b) => b.l)) : null;
  const vols = bars.slice(-21, -1).map((b) => b.v).filter((v) => v > 0);
  return {
    symbol: h.symbol,
    name: h.name,
    currency: h.currency,
    exchange: h.exchange,
    price,
    prevClose: prev,
    change,
    changePct: prev ? (change! / prev) * 100 : null,
    ret1m: retOver(closes, 21),
    ret3m: retOver(closes, 63),
    ret6m: retOver(closes, 126),
    ret1y: retOver(closes, 252),
    high52,
    low52,
    fromHigh52Pct: high52 ? (price / high52 - 1) * 100 : null,
    volume: last?.v ?? null,
    avgVolume20: vols.length ? vols.reduce((s, v) => s + v, 0) / vols.length : null,
    dayHigh: last?.h ?? null,
    dayLow: last?.l ?? null,
    open: last?.o ?? null,
    spark: closes.slice(-63),
    lastBarAt: last ? last.t * 1000 : null,
  };
}
