export type SubKey = "technical" | "fundamental" | "news" | "macro" | "events";

export const SUB_LABELS: Record<SubKey, string> = {
  technical: "Momentum/teknik",
  fundamental: "Fundamenta",
  news: "Nyhetsflöde",
  macro: "Makro/sektor",
  events: "Bolagshändelser",
};

export const SUB_ORDER: SubKey[] = ["technical", "fundamental", "news", "macro", "events"];

export interface Metric {
  label: string;
  value: string;
}

/** En delpoäng 1–10 med kodgenererad motivering. */
export interface SubScore {
  key: SubKey;
  label: string;
  /** 1–10, en decimal */
  score: number;
  /** En mening som förklarar poängen. */
  reason: string;
  /** true = för lite data; poängen är då satt till 5. */
  insufficient: boolean;
  pros: string[];
  cons: string[];
  metrics: Metric[];
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const round1 = (v: number) => Math.round(v * 10) / 10;
export const toScore = (raw: number) => round1(clamp(raw, 1, 10));

export function insufficientScore(key: SubKey, why: string): SubScore {
  return { key, label: SUB_LABELS[key], score: 5, reason: `Otillräcklig data: ${why}`, insufficient: true, pros: [], cons: [], metrics: [] };
}

const nf = (d: number) => new Intl.NumberFormat("sv-SE", { minimumFractionDigits: d, maximumFractionDigits: d });
export const n0 = (v: number) => nf(0).format(v);
export const n1 = (v: number) => nf(1).format(v);
export const n2 = (v: number) => nf(2).format(v);
export const pct = (v: number, d = 1) => `${v > 0 ? "+" : ""}${nf(d).format(v)} %`;
