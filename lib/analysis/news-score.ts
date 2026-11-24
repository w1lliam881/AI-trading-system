import type { NewsItem } from "../data/news";
import { clamp, insufficientScore, n1, toScore, type SubScore } from "./types";

export interface NewsStats {
  count14d: number;
  count3d: number;
  /** Nyhetsvolym senaste 3 dagarna jämfört med normal nivå (14 dagar). */
  volumeRatio: number | null;
  /** Viktat snittsentiment, −1 … +1 (nyare rubriker väger tyngre). */
  sentiment: number;
  /** Snittsentiment senaste 3 dagarna. */
  recentSentiment: number;
  positives: number;
  negatives: number;
}

export function newsStats(items: NewsItem[], now = Date.now()): NewsStats {
  const d14 = items.filter((i) => now - i.published <= 14 * 864e5);
  const d3 = d14.filter((i) => now - i.published <= 3 * 864e5);
  const baseline = d14.length / 14;
  let wsum = 0, ssum = 0;
  for (const i of d14) {
    if (i.sentiment === 0) continue;
    const ageDays = (now - i.published) / 864e5;
    const w = Math.pow(0.5, ageDays / 3); // halveringstid 3 dagar
    wsum += w;
    ssum += i.sentiment * w;
  }
  const nonzero3 = d3.filter((i) => i.sentiment !== 0);
  return {
    count14d: d14.length,
    count3d: d3.length,
    volumeRatio: baseline > 0 ? d3.length / 3 / baseline : null,
    sentiment: wsum ? ssum / wsum : 0,
    recentSentiment: nonzero3.length ? nonzero3.reduce((s, i) => s + i.sentiment, 0) / nonzero3.length : 0,
    positives: d14.filter((i) => i.sentiment > 0.15).length,
    negatives: d14.filter((i) => i.sentiment < -0.15).length,
  };
}

/** Delpoäng för nyhetsflöde: sentiment från ordlista + ovanligt hög nyhetsvolym. */
export function scoreNews(items: NewsItem[] | null): SubScore {
  if (!items) return insufficientScore("news", "nyheter kunde inte hämtas.");
  const st = newsStats(items);
  if (st.count14d < 3) return insufficientScore("news", `bara ${st.count14d} rubriker senaste 14 dagarna.`);
  const opinionated = st.positives + st.negatives;
  // Ju fler rubriker med tydlig ton, desto mer litar vi på snittet.
  const coverage = clamp(opinionated / 6, 0.3, 1);
  let dev = st.sentiment * 5 * coverage;
  if (st.volumeRatio != null && st.volumeRatio > 1.5) dev *= 1.25;
  const score = toScore(5 + dev);
  const tone = st.sentiment > 0.1 ? "övervägande positiva" : st.sentiment < -0.1 ? "övervägande negativa" : "blandade/neutrala";
  const vol = st.volumeRatio != null ? ` (${n1(st.volumeRatio)}× normal volym)` : "";
  const pros: string[] = [];
  const cons: string[] = [];
  if (st.sentiment > 0.15) pros.push(`Positivt nyhetsflöde: ${st.positives} positiva mot ${st.negatives} negativa rubriker.`);
  if (st.sentiment < -0.15) cons.push(`Negativt nyhetsflöde: ${st.negatives} negativa mot ${st.positives} positiva rubriker.`);
  if (st.volumeRatio != null && st.volumeRatio > 2) (st.sentiment >= 0 ? pros : cons).push(`Ovanligt mycket nyheter just nu (${n1(st.volumeRatio)}× normalt).`);
  return {
    key: "news",
    label: "Nyhetsflöde",
    score,
    reason: `${st.count3d} rubriker senaste 3 dagarna${vol}, ${tone} (sentiment ${st.sentiment >= 0 ? "+" : ""}${n1(st.sentiment)}).`,
    insufficient: false,
    pros,
    cons,
    metrics: [
      { label: "Rubriker 14 d / 3 d", value: `${st.count14d} / ${st.count3d}` },
      { label: "Volym mot normalt", value: st.volumeRatio != null ? `${n1(st.volumeRatio)}×` : "–" },
      { label: "Positiva / negativa", value: `${st.positives} / ${st.negatives}` },
      { label: "Viktat sentiment (−1…+1)", value: `${st.sentiment >= 0 ? "+" : ""}${n1(st.sentiment)}` },
    ],
  };
}
