import type { StockAnalysis } from "./engine";
import type { Direction, Horizon, Level } from "./analysis/scoring";
import { SUB_ORDER, type SubKey } from "./analysis/types";
import { getWeights, type Weights } from "./settings";

/** Serialiserbar sammanfattning av en poäng (skickas till klientkomponenter). */
export interface ScoreView {
  ticker: string;
  name: string;
  total: number;
  direction: Direction;
  horizon: Horizon;
  risk: Level;
  confidence: Level;
  subs: { key: SubKey; label: string; score: number; reason: string; insufficient: boolean; weight: number }[];
}

export function toScoreView(a: StockAnalysis, weights: Weights = getWeights()): ScoreView {
  return {
    ticker: a.item.ticker,
    name: a.item.name,
    total: a.comp.total,
    direction: a.comp.direction,
    horizon: a.comp.horizon,
    risk: a.comp.risk,
    confidence: a.comp.confidence,
    subs: SUB_ORDER.map((k) => {
      const s = a.comp.subs[k];
      return { key: k, label: s.label, score: s.score, reason: s.reason, insufficient: s.insufficient, weight: weights[k] };
    }),
  };
}

export interface IdeaRow {
  ticker: string;
  name: string;
  searchName: string;
  sector: string;
  country: string;
  currency: string;
  price: number | null;
  changePct: number | null;
  ret1m: number | null;
  ret3m: number | null;
  spark: number[];
  score: ScoreView;
  outlook: { label: string; dir: number; confidence: string };
}

export function toIdeaRow(a: StockAnalysis, weights?: Weights): IdeaRow {
  return {
    ticker: a.item.ticker,
    name: a.item.name,
    searchName: a.item.searchName,
    sector: a.item.sector,
    country: a.item.country,
    currency: a.snap?.currency ?? "",
    price: a.snap?.price ?? null,
    changePct: a.snap?.changePct ?? null,
    ret1m: a.snap?.ret1m ?? null,
    ret3m: a.snap?.ret3m ?? null,
    spark: a.snap?.spark ?? [],
    score: toScoreView(a, weights),
    outlook: { label: a.outlook.label, dir: a.outlook.dir, confidence: a.outlook.confidence },
  };
}
