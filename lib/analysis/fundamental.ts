import type { Fundamentals } from "../data/fundamentals";
import { median } from "./indicators";
import { clamp, insufficientScore, n1, pct, toScore, type SubScore } from "./types";

export type FundKey = "pe" | "ps" | "debtToEquity" | "netMargin" | "revenueGrowth" | "dividendYield";

export interface FundInput extends Fundamentals {
  /** Direktavkastning i % (utdelningar senaste 12 mån / kurs). */
  dividendYield: number | null;
}

export type SectorAverages = Partial<Record<FundKey, number>>;

/** Sektorsnitt (median) för bevakningslistans bolag i samma sektor, exklusive bolaget självt. Kräver minst 2 jämförelsebolag. */
export function sectorAverages(peers: FundInput[]): SectorAverages {
  const out: SectorAverages = {};
  const keys: FundKey[] = ["pe", "ps", "debtToEquity", "netMargin", "revenueGrowth", "dividendYield"];
  for (const k of keys) {
    const vals = peers.map((p) => p[k]).filter((v): v is number => v != null && Number.isFinite(v));
    if (vals.length >= 2) out[k] = median(vals)!;
  }
  return out;
}

export const FUND_LABELS: Record<FundKey, string> = {
  pe: "P/E",
  ps: "P/S",
  debtToEquity: "Skuld / eget kapital",
  netMargin: "Nettomarginal",
  revenueGrowth: "Omsättningstillväxt",
  dividendYield: "Direktavkastning",
};

/**
 * Delpoäng för värdering, lönsamhet, tillväxt, skuldsättning och utdelning.
 * Jämför mot sektorsnittet när det finns, annars mot fasta tumregler.
 */
export function scoreFundamental(f: FundInput | null, avg: SectorAverages, sector: string): SubScore {
  if (!f) return insufficientScore("fundamental", "nyckeltal kunde inte hämtas.");
  const parts: { v: number; w: number }[] = [];
  const pros: string[] = [];
  const cons: string[] = [];
  const isFin = sector === "Finans";

  // Värdering: lägre är bättre
  if (f.pe != null) {
    let v: number;
    if (avg.pe) v = clamp((1 - f.pe / avg.pe) * 1.5, -1, 1);
    else v = f.pe < 12 ? 0.7 : f.pe < 20 ? 0.2 : f.pe < 30 ? -0.2 : -0.7;
    parts.push({ v, w: 1.2 });
    if (v > 0.35) pros.push(`Lågt P/E (${n1(f.pe)}${avg.pe ? ` mot sektorsnitt ${n1(avg.pe)}` : ""}).`);
    if (v < -0.35) cons.push(`Högt P/E (${n1(f.pe)}${avg.pe ? ` mot sektorsnitt ${n1(avg.pe)}` : ""}).`);
  }
  if (f.ps != null) {
    const v = avg.ps ? clamp((1 - f.ps / avg.ps) * 1.2, -1, 1) : f.ps < 1.5 ? 0.5 : f.ps < 4 ? 0.1 : f.ps < 8 ? -0.3 : -0.7;
    parts.push({ v, w: 0.8 });
  }
  // Skuldsättning (gäller inte banker/investmentbolag på samma sätt)
  if (f.debtToEquity != null && !isFin) {
    const v = f.debtToEquity < 0.5 ? 0.6 : f.debtToEquity < 1 ? 0.2 : f.debtToEquity < 2 ? -0.3 : -0.8;
    parts.push({ v, w: 0.8 });
    if (f.debtToEquity < 0.3) pros.push("Låg skuldsättning.");
    if (f.debtToEquity > 2) cons.push(`Hög skuldsättning (skulder ${n1(f.debtToEquity)}× eget kapital).`);
  }
  if (f.netMargin != null) {
    let v = f.netMargin > 20 ? 0.8 : f.netMargin > 10 ? 0.4 : f.netMargin > 5 ? 0 : f.netMargin > 0 ? -0.4 : -1;
    if (avg.netMargin != null) v = clamp(v * 0.5 + clamp((f.netMargin - avg.netMargin) / 15, -1, 1) * 0.5, -1, 1);
    parts.push({ v, w: 1 });
    if (f.netMargin > 15) pros.push(`Hög lönsamhet (nettomarginal ${n1(f.netMargin)} %).`);
    if (f.netMargin < 0) cons.push("Bolaget går med förlust.");
  }
  if (f.revenueGrowth != null) {
    const g = clamp(f.revenueGrowth, -50, 50);
    const v = g > 15 ? 0.8 : g > 5 ? 0.4 : g > 0 ? 0 : g > -10 ? -0.4 : -0.8;
    parts.push({ v, w: 1 });
    if (g > 10) pros.push(`Växande omsättning (${pct(g, 0)} mot året innan).`);
    if (g < -3) cons.push(`Minskande omsättning (${pct(g, 0)} mot året innan).`);
  }
  if (f.dividendYield != null) {
    const v = f.dividendYield > 4 ? 0.5 : f.dividendYield > 2 ? 0.3 : 0;
    parts.push({ v, w: 0.5 });
    if (f.dividendYield > 3.5) pros.push(`Hög direktavkastning (${n1(f.dividendYield)} %).`);
  }

  if (parts.length < 3) return insufficientScore("fundamental", `bara ${parts.length} av 6 nyckeltal tillgängliga.`);

  const wsum = parts.reduce((s, p) => s + p.w, 0);
  const avgV = parts.reduce((s, p) => s + p.v * p.w, 0) / wsum;
  const score = toScore(5.5 + avgV * 4.5);

  const reasonBits: string[] = [];
  if (f.pe != null) reasonBits.push(`P/E ${n1(f.pe)}${avg.pe ? ` (sektorsnitt ${n1(avg.pe)})` : ""}`);
  if (f.netMargin != null) reasonBits.push(`nettomarginal ${n1(f.netMargin)} %`);
  if (f.revenueGrowth != null) reasonBits.push(`omsättningen ${pct(clamp(f.revenueGrowth, -99, 999), 0)} mot året innan`);
  const reason = reasonBits.length ? `${reasonBits.slice(0, -1).join(", ")}${reasonBits.length > 1 ? " och " : ""}${reasonBits.at(-1)}.` : "Få nyckeltal.";

  const fmt = (k: FundKey, v: number | null) =>
    v == null ? "–" : k === "pe" || k === "ps" || k === "debtToEquity" ? n1(v) : k === "revenueGrowth" ? pct(v, 0) : `${n1(v)} %`;
  return {
    key: "fundamental",
    label: "Fundamenta",
    score,
    reason: reason.charAt(0).toUpperCase() + reason.slice(1),
    insufficient: false,
    pros,
    cons,
    metrics: (["pe", "ps", "debtToEquity", "netMargin", "revenueGrowth", "dividendYield"] as FundKey[]).map((k) => ({
      label: FUND_LABELS[k],
      value: `${fmt(k, f[k])}${avg[k] != null ? `  (sektor ${fmt(k, avg[k]!)})` : ""}`,
    })),
  };
}
