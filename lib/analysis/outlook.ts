import type { NewsItem } from "../data/news";
import type { MarketContext } from "./macro";
import type { NewsStats } from "./news-score";
import type { TechMetrics } from "./technical";
import type { Level } from "./scoring";
import { clamp, n1 } from "./types";

/**
 * "Prognos" = en regelbaserad utsikt för de närmaste 1–4 veckorna, främst utifrån
 * nyheter (bolagets egna + världsnyheter för sektorn) och kortsiktigt momentum.
 * Det är INTE en säker förutsägelse – träffsäkerheten mäts och visas i efterhand.
 */
export interface Outlook {
  /** +1 positiv, 0 neutral, −1 negativ */
  dir: 1 | 0 | -1;
  label: "Positiv" | "Neutral" | "Negativ";
  /** −1 … +1 */
  strength: number;
  confidence: Level;
  /** Kort förklaring i klartext. */
  summary: string;
  drivers: string[];
  keyHeadline: NewsItem | null;
}

export function buildOutlook(news: NewsItem[] | null, st: NewsStats | null, tech: TechMetrics, ctx: MarketContext, sector: string): Outlook {
  const drivers: string[] = [];
  const up: string[] = [];
  const down: string[] = [];
  // 1) Bolagets nyheter (vikt 50 %)
  let newsSig = 0;
  if (st && st.count14d >= 3) {
    newsSig = clamp(st.sentiment * 0.6 + st.recentSentiment * 0.4, -1, 1);
    const amp = st.volumeRatio != null && st.volumeRatio > 1.5 ? 1.2 : 1;
    newsSig = clamp(newsSig * amp, -1, 1);
    const counts = `${st.positives} positiva och ${st.negatives} negativa rubriker på 14 dagar`;
    const mixed = (newsSig > 0 && st.negatives > st.positives) || (newsSig < 0 && st.positives > st.negatives);
    if (newsSig > 0.1) up.push(mixed ? `de senaste nyheterna är positiva (nyare rubriker väger tyngst; ${counts})` : `positiva bolagsnyheter (${counts})`);
    if (newsSig < -0.1) down.push(mixed ? `de senaste nyheterna är negativa (nyare rubriker väger tyngst; ${counts})` : `negativa bolagsnyheter (${counts})`);
  }
  // 2) Världsnyheter för sektorn (vikt 25 %)
  const worldSig = ctx.sectorNewsImpact[sector] ?? 0;
  if (worldSig > 0.15) up.push(`världsnyheterna lutar positivt för ${sector.toLowerCase()}`);
  if (worldSig < -0.15) down.push(`världsnyheterna lutar negativt för ${sector.toLowerCase()}`);
  // 3) Kortsiktigt momentum (vikt 25 %)
  let momSig = 0;
  if (tech.ma50 && tech.mom1m != null) {
    momSig = clamp(((tech.price / tech.ma50 - 1) * 100) / 8 + tech.mom1m / 15, -1, 1) * 0.8;
    if (momSig > 0.3) up.push("kursen har positivt kortsiktigt momentum");
    if (momSig < -0.3) down.push("kursen har negativt kortsiktigt momentum");
  }
  const strength = clamp(newsSig * 0.5 + worldSig * 0.25 + momSig * 0.25 + ctx.regimeScore * 0.1, -1, 1);
  const dir: 1 | 0 | -1 = strength > 0.12 ? 1 : strength < -0.12 ? -1 : 0;
  const label = dir === 1 ? "Positiv" : dir === -1 ? "Negativ" : "Neutral";

  // Säkerhet: hur mycket data och hur eniga signalerna är
  const signs = [newsSig, worldSig, momSig].filter((v) => Math.abs(v) > 0.1).map(Math.sign);
  const agree = signs.length >= 2 && signs.every((s) => s === signs[0]);
  const enoughNews = (st?.count14d ?? 0) >= 8;
  const confidence: Level = Math.abs(strength) > 0.35 && agree && enoughNews ? "Hög" : Math.abs(strength) > 0.18 && (agree || enoughNews) ? "Medel" : "Låg";

  const opinionated = (news ?? []).filter((n) => Math.abs(n.sentiment) > 0.15 && Date.now() - n.published < 7 * 864e5);
  const keyHeadline = opinionated.sort((a, b) => (dir >= 0 ? b.sentiment - a.sentiment : a.sentiment - b.sentiment))[0] ?? (news?.[0] ?? null);

  drivers.push(...up, ...down);
  const join = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} och ${xs.at(-1)}`);
  const forDir = dir === 1 ? up : down;
  const against = dir === 1 ? down : up;
  let summary: string;
  if (dir === 0) {
    summary = up.length || down.length
      ? `Blandade signaler${up.length ? `: för talar ${join(up)}` : ""}${down.length ? `${up.length ? ", emot talar " : ": emot talar "}${join(down)}` : ""}.`
      : "Inga tydliga signaler från nyheter eller kursrörelser.";
  } else {
    summary = `${label} utsikt eftersom ${join(forDir) || "signalerna lutar svagt åt det hållet"}${against.length ? `, trots ${join(against)}` : ""}.`;
  }
  return { dir, label, strength, confidence, summary: summary.charAt(0).toUpperCase() + summary.slice(1), drivers, keyHeadline };
}

export const outlookStrengthText = (s: number) => `${s >= 0 ? "+" : ""}${n1(s)}`;
