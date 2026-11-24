import type { Bar } from "../data/yahoo";
import { rsi, sma, volatility, returnOver } from "./indicators";
import { clamp, insufficientScore, n0, pct, toScore, type SubScore } from "./types";

export interface TechMetrics {
  price: number;
  ma50: number | null;
  ma200: number | null;
  rsi14: number | null;
  mom1m: number | null;
  mom3m: number | null;
  mom6m: number | null;
  /** Dagens volym / snitt 20 dagar */
  volRatio: number | null;
  fromHigh52: number | null;
  fromLow52: number | null;
  /** Årlig volatilitet i % */
  volatility: number | null;
  dayChange: number | null;
}

export function computeTechnicals(bars: Bar[], livePrice?: number): TechMetrics {
  const closes = bars.map((b) => b.c);
  const price = livePrice ?? closes.at(-1) ?? NaN;
  const ma50 = sma(closes, 50).at(-1) ?? null;
  const ma200 = sma(closes, 200).at(-1) ?? null;
  const year = bars.slice(-252);
  const hi = year.length ? Math.max(...year.map((b) => b.h)) : null;
  const lo = year.length ? Math.min(...year.map((b) => b.l)) : null;
  const vols = bars.slice(-21, -1).map((b) => b.v).filter((v) => v > 0);
  const avgVol = vols.length ? vols.reduce((s, v) => s + v, 0) / vols.length : null;
  const lastVol = bars.at(-1)?.v ?? null;
  const prev = closes.length >= 2 ? closes[closes.length - 2] : null;
  return {
    price,
    ma50,
    ma200,
    rsi14: rsi(closes.slice(-300)),
    mom1m: returnOver(closes, 21),
    mom3m: returnOver(closes, 63),
    mom6m: returnOver(closes, 126),
    volRatio: avgVol && lastVol ? lastVol / avgVol : null,
    fromHigh52: hi ? (price / hi - 1) * 100 : null,
    fromLow52: lo ? (price / lo - 1) * 100 : null,
    volatility: volatility(closes),
    dayChange: prev ? (price / prev - 1) * 100 : null,
  };
}

/** Delpoäng för trend, momentum, RSI och volym. */
export function scoreTechnical(m: TechMetrics, barCount: number): SubScore {
  if (barCount < 60 || !Number.isFinite(m.price)) return insufficientScore("technical", "för kort kurshistorik (under 60 handelsdagar).");
  let s = 5;
  const pros: string[] = [];
  const cons: string[] = [];

  const d200 = m.ma200 ? (m.price / m.ma200 - 1) * 100 : null;
  if (d200 != null) {
    s += clamp(d200 / 5, -2, 2);
    if (d200 > 0) pros.push(`Kursen ligger ${n0(d200)} % över 200-dagars medelvärdet (upptrend).`);
    else cons.push(`Kursen ligger ${n0(-d200)} % under 200-dagars medelvärdet (nedtrend).`);
  }
  if (m.ma50 && m.ma200) {
    if (m.ma50 > m.ma200) s += 0.5;
    else s -= 0.5;
  }
  if (m.mom3m != null) {
    s += clamp(m.mom3m / 10, -1.5, 1.5);
    if (m.mom3m > 8) pros.push(`Starkt momentum: ${pct(m.mom3m)} på 3 månader.`);
    if (m.mom3m < -8) cons.push(`Svagt momentum: ${pct(m.mom3m)} på 3 månader.`);
  }
  if (m.mom6m != null) s += clamp(m.mom6m / 20, -1, 1);
  if (m.rsi14 != null) {
    if (m.rsi14 > 75) { s -= 1; cons.push(`RSI ${n0(m.rsi14)} – överköpt, risk för rekyl.`); }
    else if (m.rsi14 > 70) s -= 0.5;
    else if (m.rsi14 < 25) { s += 0.5; pros.push(`RSI ${n0(m.rsi14)} – översåld, studs möjlig.`); }
    else if (m.rsi14 < 30) s += 0.25;
  }
  if (m.volRatio != null && m.volRatio > 1.5 && m.dayChange != null) {
    if (m.dayChange > 0) { s += 0.5; pros.push(`Uppgång på hög volym (${m.volRatio.toFixed(1).replace(".", ",")}× normalt).`); }
    else { s -= 0.5; cons.push(`Nedgång på hög volym (${m.volRatio.toFixed(1).replace(".", ",")}× normalt).`); }
  }
  if (m.fromHigh52 != null && m.fromHigh52 > -3) { s += 0.3; pros.push("Handlas nära 52-veckorshögsta."); }

  const parts: string[] = [];
  if (d200 != null) parts.push(`Kursen ligger ${n0(Math.abs(d200))} % ${d200 >= 0 ? "över" : "under"} 200-dagars medelvärdet`);
  if (m.rsi14 != null) parts.push(`RSI är ${n0(m.rsi14)}`);
  if (m.mom3m != null) parts.push(`3-månadersavkastningen är ${pct(m.mom3m)}`);
  const reason = parts.length ? `${parts.slice(0, -1).join(", ")}${parts.length > 1 ? " och " : ""}${parts.at(-1)}.` : "Begränsad teknisk data.";

  return {
    key: "technical",
    label: "Momentum/teknik",
    score: toScore(s),
    reason: reason.charAt(0).toUpperCase() + reason.slice(1),
    insufficient: false,
    pros,
    cons,
    metrics: [
      { label: "Pris mot MA200", value: d200 != null ? pct(d200) : "–" },
      { label: "Pris mot MA50", value: m.ma50 ? pct((m.price / m.ma50 - 1) * 100) : "–" },
      { label: "RSI(14)", value: m.rsi14 != null ? n0(m.rsi14) : "–" },
      { label: "Momentum 1/3/6 mån", value: [m.mom1m, m.mom3m, m.mom6m].map((v) => (v != null ? pct(v, 0) : "–")).join(" / ") },
      { label: "Volym mot 20 d snitt", value: m.volRatio != null ? `${m.volRatio.toFixed(2).replace(".", ",")}×` : "–" },
      { label: "Från 52 v högsta / lägsta", value: `${m.fromHigh52 != null ? pct(m.fromHigh52, 0) : "–"} / ${m.fromLow52 != null ? pct(m.fromLow52, 0) : "–"}` },
      { label: "Volatilitet (år)", value: m.volatility != null ? `${n0(m.volatility)} %` : "–" },
    ],
  };
}
