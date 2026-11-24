import type { Weights } from "../settings";
import { round1, SUB_ORDER, type SubKey, type SubScore } from "./types";

export type Direction = "Köpintresse" | "Bevaka" | "Undvik";
export type Level = "Låg" | "Medel" | "Hög";
export type Horizon = "Kort (veckor)" | "Medel (månader)" | "Lång (år)";

export interface Composite {
  total: number;
  direction: Direction;
  horizon: Horizon;
  risk: Level;
  riskReason: string;
  confidence: Level;
  confidenceReason: string;
  subs: Record<SubKey, SubScore>;
  pros: string[];
  cons: string[];
}

export function directionFor(total: number): Direction {
  return total >= 7 ? "Köpintresse" : total <= 4 ? "Undvik" : "Bevaka";
}

/** Viktat snitt av delpoängen + riktning, horisont, risk och datasäkerhet. */
export function compose(subsIn: SubScore[], weights: Weights, volatility: number | null, debtToEquity: number | null, sector: string): Composite {
  const subs = Object.fromEntries(subsIn.map((s) => [s.key, s.insufficient ? { ...s, score: 5 } : s])) as Record<SubKey, SubScore>;
  const wsum = SUB_ORDER.reduce((s, k) => s + weights[k], 0) || 1;
  const total = round1(SUB_ORDER.reduce((s, k) => s + subs[k].score * weights[k], 0) / wsum);

  // Horisont: vilken del driver poängen mest?
  let best: SubKey = "technical";
  let bestDev = -1;
  for (const k of SUB_ORDER) {
    const dev = Math.abs(subs[k].score - 5) * weights[k];
    if (dev > bestDev) { bestDev = dev; best = k; }
  }
  const horizon: Horizon = best === "fundamental" ? "Lång (år)" : best === "macro" ? "Medel (månader)" : "Kort (veckor)";

  // Risk: volatilitet + skuldsättning
  let riskLvl = volatility == null ? 1 : volatility < 25 ? 0 : volatility < 40 ? 1 : 2;
  const highDebt = debtToEquity != null && debtToEquity > 1.5 && sector !== "Finans";
  if (highDebt) riskLvl = Math.min(2, riskLvl + 1);
  const risk: Level = (["Låg", "Medel", "Hög"] as const)[riskLvl];
  const riskReason = `${volatility != null ? `Årlig volatilitet ${Math.round(volatility)} %` : "Volatilitet okänd"}${highDebt ? " och hög skuldsättning" : ""}.`;

  const missing = SUB_ORDER.filter((k) => subs[k].insufficient);
  const confidence: Level = missing.length === 0 ? "Hög" : missing.length === 1 ? "Medel" : "Låg";
  const confidenceReason = missing.length ? `Otillräcklig data för: ${missing.map((k) => subs[k].label.toLowerCase()).join(", ")}.` : "Data finns för alla delpoäng.";

  const pros = SUB_ORDER.flatMap((k) => subs[k].pros.map((p) => ({ p, w: (subs[k].score - 5) * weights[k] })))
    .sort((a, b) => b.w - a.w).map((x) => x.p);
  const cons = SUB_ORDER.flatMap((k) => subs[k].cons.map((p) => ({ p, w: (subs[k].score - 5) * weights[k] })))
    .sort((a, b) => a.w - b.w).map((x) => x.p);

  return { total, direction: directionFor(total), horizon, risk, riskReason, confidence, confidenceReason, subs, pros, cons };
}
