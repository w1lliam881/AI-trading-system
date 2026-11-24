import type { Bar } from "../data/yahoo";
import type { NewsItem } from "../data/news";
import type { Theme } from "./sentiment";
import { returnOver, sma } from "./indicators";
import { clamp, n0, n1, n2, pct, toScore, type SubScore } from "./types";

export type Regime = "Risk-on" | "Neutral" | "Risk-off";

export interface RegimeRule {
  label: string;
  /** +1 talar för risk-on, −1 för risk-off, 0 neutral. */
  effect: number;
  detail: string;
}

export interface ThemeSignal {
  id: string;
  label: string;
  count: number;
  /** Snittsentiment −1 … +1 för rubrikerna i temat. */
  tone: number;
  sectors: string[];
  top: NewsItem[];
}

export interface MarketContext {
  regime: Regime;
  /** −1 … +1 */
  regimeScore: number;
  rules: RegimeRule[];
  /** Sektorns relativa styrka mot index i %-enheter (vägd 1 + 3 mån). */
  sectorStrength: Record<string, { rel: number; ret1m: number | null; ret3m: number | null; members: number }>;
  themes: ThemeSignal[];
  /** Hur världsnyheterna lutar för respektive sektor, −1 … +1. */
  sectorNewsImpact: Record<string, number>;
  /** Snittsentiment för alla världsrubriker senaste dygnet. */
  worldTone: number;
  worldCount: number;
}

export interface MacroInputs {
  index: Record<string, Bar[] | undefined>; // symbol -> bars
  stocks: { sector: string; country: string; closes: number[] }[];
  worldNews: NewsItem[];
  themes: Theme[];
}

function aboveMA200(bars?: Bar[]) {
  if (!bars || bars.length < 200) return null;
  const c = bars.map((b) => b.c);
  const ma = sma(c, 200).at(-1)!;
  return (c.at(-1)! / ma - 1) * 100;
}

export function buildMarketContext(inp: MacroInputs): MarketContext {
  const rules: RegimeRule[] = [];
  for (const [sym, label] of [["^OMX", "OMXS30"], ["^GSPC", "S&P 500"]] as const) {
    const d = aboveMA200(inp.index[sym]);
    if (d != null) rules.push({ label: `${label} mot 200-dagars snitt`, effect: d > 0 ? 1 : -1, detail: `${label} ligger ${n0(Math.abs(d))} % ${d > 0 ? "över" : "under"} sitt 200-dagars medelvärde.` });
  }
  const vix = inp.index["^VIX"]?.at(-1)?.c;
  if (vix != null) rules.push({ label: "VIX (rädsloindex)", effect: vix < 18 ? 1 : vix > 25 ? -1 : 0, detail: `VIX är ${n1(vix)} – ${vix < 18 ? "lugn marknad" : vix > 25 ? "hög oro" : "normal nivå"}.` });
  const tnx = inp.index["^TNX"]?.map((b) => b.c);
  if (tnx && tnx.length > 22) {
    const ch = tnx.at(-1)! - tnx[tnx.length - 22];
    rules.push({ label: "USA:s 10-årsränta (1 mån)", effect: ch > 0.25 ? -1 : ch < -0.25 ? 1 : 0, detail: `Räntan har ${ch >= 0 ? "stigit" : "sjunkit"} ${n0(Math.abs(ch) * 100)} baspunkter (${n2(Math.abs(ch))} %-enheter) på en månad${Math.abs(ch) > 0.25 ? (ch > 0 ? " (stigande räntor pressar aktier)" : " (fallande räntor hjälper aktier)") : ""}.` });
  }
  const usd = inp.index["SEK=X"]?.map((b) => b.c);
  if (usd && usd.length > 22) {
    const ch = returnOver(usd, 21)!;
    rules.push({ label: "USD/SEK (1 mån)", effect: ch > 2 ? -0.5 : ch < -2 ? 0.5 : 0, detail: `Dollarn har ${ch >= 0 ? "stärkts" : "försvagats"} ${n1(Math.abs(ch))} % mot kronan${ch > 2 ? " (stark dollar = ofta oro)" : ""}.` });
  }
  const maxAbs = rules.reduce((s, r) => s + Math.abs(r.effect || 1), 0) || 1;
  const sum = rules.reduce((s, r) => s + r.effect, 0);
  const regimeScore = clamp(sum / Math.max(2, maxAbs * 0.6), -1, 1);
  const regime: Regime = sum >= 2 ? "Risk-on" : sum <= -2 ? "Risk-off" : "Neutral";

  // Sektorstyrka mot respektive lands index
  const bench = (country: string) => inp.index[country === "SE" ? "^OMX" : "^GSPC"]?.map((b) => b.c) ?? [];
  const bySector: Record<string, { rel: number[]; r1: number[]; r3: number[] }> = {};
  for (const s of inp.stocks) {
    const b = bench(s.country);
    const r1 = returnOver(s.closes, 21), r3 = returnOver(s.closes, 63);
    const b1 = returnOver(b, 21), b3 = returnOver(b, 63);
    if (r1 == null || r3 == null || b1 == null || b3 == null) continue;
    const e = (bySector[s.sector] ??= { rel: [], r1: [], r3: [] });
    e.rel.push(0.4 * (r1 - b1) + 0.6 * (r3 - b3));
    e.r1.push(r1);
    e.r3.push(r3);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
  const sectorStrength: MarketContext["sectorStrength"] = {};
  for (const [k, v] of Object.entries(bySector)) sectorStrength[k] = { rel: avg(v.rel)!, ret1m: avg(v.r1), ret3m: avg(v.r3), members: v.rel.length };

  // Teman i världsnyheterna
  const themes: ThemeSignal[] = inp.themes
    .map((t) => {
      const items = inp.worldNews.filter((n) => n.themes.includes(t.id));
      const tone = items.length ? items.reduce((s, n) => s + n.sentiment, 0) / items.length : 0;
      return { id: t.id, label: t.label, count: items.length, tone, sectors: t.sectors, top: items.slice(0, 5) };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  const sectorNewsImpact: Record<string, number> = {};
  for (const t of themes) {
    const weight = Math.min(1, t.count / 10);
    for (const s of t.sectors) sectorNewsImpact[s] = clamp((sectorNewsImpact[s] ?? 0) + t.tone * weight, -1, 1);
  }
  const dayAgo = Date.now() - 864e5;
  const recent = inp.worldNews.filter((n) => n.published >= dayAgo);
  const worldTone = recent.length ? recent.reduce((s, n) => s + n.sentiment, 0) / recent.length : 0;

  return { regime, regimeScore, rules, sectorStrength, themes, sectorNewsImpact, worldTone, worldCount: recent.length };
}

/** Delpoäng för makro/sektor: marknadsläge + sektorns relativa styrka + världsnyheternas lutning för sektorn. */
export function scoreMacro(ctx: MarketContext, sector: string): SubScore {
  const strength = ctx.sectorStrength[sector];
  const impact = ctx.sectorNewsImpact[sector] ?? 0;
  let s = 5 + ctx.regimeScore * 1.5;
  if (strength) s += clamp(strength.rel / 5, -1.5, 1.5);
  s += impact * 1.5;
  const pros: string[] = [];
  const cons: string[] = [];
  if (ctx.regime === "Risk-on") pros.push("Marknadsläget är Risk-on (medvind för aktier).");
  if (ctx.regime === "Risk-off") cons.push("Marknadsläget är Risk-off (motvind för aktier).");
  if (strength && strength.rel > 2) pros.push(`Sektorn ${sector} går ${n1(strength.rel)} %-enheter bättre än index.`);
  if (strength && strength.rel < -2) cons.push(`Sektorn ${sector} går ${n1(-strength.rel)} %-enheter sämre än index.`);
  const themeNames = ctx.themes.filter((t) => t.sectors.includes(sector)).slice(0, 2).map((t) => t.label);
  if (impact > 0.15) pros.push(`Världsnyheterna (${themeNames.join(", ")}) lutar positivt för ${sector}.`);
  if (impact < -0.15) cons.push(`Världsnyheterna (${themeNames.join(", ")}) lutar negativt för ${sector}.`);
  const relTxt = strength ? `sektorn ${sector} går ${n1(Math.abs(strength.rel))} %-enheter ${strength.rel >= 0 ? "bättre" : "sämre"} än index` : `sektorn ${sector} saknar jämförelsedata`;
  const impTxt = Math.abs(impact) > 0.1 ? ` och världsnyheterna lutar ${impact > 0 ? "positivt" : "negativt"} för sektorn` : "";
  return {
    key: "macro",
    label: "Makro/sektor",
    score: toScore(s),
    reason: `Marknadsläget är ${ctx.regime}, ${relTxt}${impTxt}.`,
    insufficient: ctx.rules.length < 2,
    pros,
    cons,
    metrics: [
      { label: "Marknadsläge", value: ctx.regime },
      { label: "Sektor mot index", value: strength ? `${pct(strength.rel)}-enh.` : "–" },
      { label: "Nyhetslutning för sektorn", value: `${impact >= 0 ? "+" : ""}${n1(impact)}` },
    ],
  };
}
