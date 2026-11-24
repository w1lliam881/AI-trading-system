import type { Analysis, StockAnalysis } from "./engine";
import type { NewsItem } from "./data/news";
import { n0, n1 } from "./analysis/types";

/** Kodgenererad dagsbrief i klartext – inga AI-anrop, bara regler. */
export interface Briefing {
  headline: string;
  tone: "good" | "bad" | "mixed";
  bullets: { icon: "market" | "news" | "list" | "outlook"; text: string }[];
  strong: StockAnalysis[];
  weak: StockAnalysis[];
  outlooks: StockAnalysis[];
  themes: Analysis["market"]["themes"];
  hotHeadlines: { item: NewsItem; stock: StockAnalysis }[];
}

export function buildBriefing(a: Analysis): Briefing {
  const m = a.market;
  const ranked = [...a.stocks].filter((s) => s.snap).sort((x, y) => y.comp.total - x.comp.total);
  const strong = ranked.filter((s) => s.comp.total >= 5.5).slice(0, 5);
  const weak = [...ranked].reverse().filter((s) => s.comp.total < 5).slice(0, 5);
  const pos = a.stocks.filter((s) => s.outlook.dir === 1).length;
  const neg = a.stocks.filter((s) => s.outlook.dir === -1).length;
  const neu = a.stocks.length - pos - neg;

  const goodRules = m.rules.filter((r) => r.effect > 0).map((r) => r.label);
  const badRules = m.rules.filter((r) => r.effect < 0).map((r) => r.label);
  const marketTxt =
    m.regime === "Risk-on"
      ? `Marknaden är i **Risk-on**-läge – de flesta signaler är positiva (${goodRules.join(", ")}).`
      : m.regime === "Risk-off"
        ? `Marknaden är i **Risk-off**-läge – flera varningssignaler (${badRules.join(", ")}).`
        : `Marknaden är **neutral**: ${goodRules.length ? `positivt är ${goodRules.join(", ")}` : "inga tydligt positiva signaler"}${badRules.length ? `, men ${badRules.join(", ")} drar åt andra hållet` : ""}.`;

  const topThemes = m.themes.slice(0, 3);
  const toneWord = (t: number) => (t > 0.1 ? "positiv" : t < -0.1 ? "negativ" : "neutral");
  const newsTxt = topThemes.length
    ? `Världsnyheterna handlar mest om ${topThemes.map((t) => `**${t.label.toLowerCase()}** (${t.count})`).join(", ")}. Tonen senaste dygnet är ${toneWord(m.worldTone)} (${m.worldTone >= 0 ? "+" : ""}${n1(m.worldTone)}).`
    : "Inga världsnyheter kunde hämtas just nu.";

  const listTxt = `I din bevakningslista ser **${strong.length}** bolag starka ut (poäng 5,5+) och **${weak.length}** svaga (under 5).${ranked[0] ? ` Högst just nu: ${ranked[0].item.name} (${n1(ranked[0].comp.total)}).` : ""}`;
  const outlookTxt = `Prognos för de närmaste 1–4 veckorna: **${pos} positiva**, ${neu} neutrala och **${neg} negativa** utsikter, främst utifrån nyheter och kortsiktigt momentum.`;

  const score = m.regimeScore + m.worldTone + (pos - neg) / Math.max(1, a.stocks.length);
  const tone = score > 0.3 ? "good" : score < -0.3 ? "bad" : "mixed";
  const headline =
    tone === "good" ? "Övervägande positivt läge idag" : tone === "bad" ? "Försiktigt läge idag – flera varningssignaler" : "Blandat läge idag – välj noga";

  const hot: { item: NewsItem; stock: StockAnalysis }[] = [];
  for (const s of a.stocks) for (const n of s.news) if (Date.now() - n.published < 3 * 864e5 && Math.abs(n.sentiment) >= 0.33) hot.push({ item: n, stock: s });
  hot.sort((x, y) => Math.abs(y.item.sentiment) - Math.abs(x.item.sentiment) || y.item.published - x.item.published);
  const seen = new Set<string>();
  const hotHeadlines = hot.filter((h) => (seen.has(h.item.id) ? false : (seen.add(h.item.id), true))).slice(0, 10);

  const outlooks = [...a.stocks].filter((s) => s.snap).sort((x, y) => y.outlook.strength - x.outlook.strength);

  return {
    headline,
    tone,
    bullets: [
      { icon: "market", text: marketTxt },
      { icon: "news", text: newsTxt },
      { icon: "list", text: listTxt },
      { icon: "outlook", text: outlookTxt },
    ],
    strong,
    weak,
    outlooks,
    themes: m.themes,
    hotHeadlines,
  };
}

export const fmtAgo = (ms: number) => {
  const h = (Date.now() - ms) / 36e5;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min sedan`;
  if (h < 24) return `${n0(h)} h sedan`;
  return `${n0(h / 24)} d sedan`;
};
