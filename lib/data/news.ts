import Parser from "rss-parser";
import { cached } from "../cache";
import { mapLimit } from "../utils";
import { loadLexicon, loadThemes, scoreHeadline, themesFor } from "../analysis/sentiment";
import type { WatchItem } from "../watchlist";
import { newsQuery } from "../links";

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  /** ms */
  published: number;
  /** −1 … +1 (grov uppskattning från ordlista) */
  sentiment: number;
  hits: string[];
  themes: string[];
}

const parser = new Parser({ timeout: 15000 });
const UA = { "User-Agent": "Mozilla/5.0 (Terminalen; lokal app)" };

interface RawItem { title: string; link: string; source: string; published: number }

async function fetchWithRetry(url: string, source: string, tries = 3): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: UA, cache: "no-store" });
      if (res.ok) return res;
      last = new Error(`${source} svarade ${res.status}`);
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 1200 * (i + 1))); // vänta lite längre för varje försök
  }
  throw last instanceof Error ? last : new Error(String(last));
}

async function fetchFeed(url: string, fallbackSource: string): Promise<RawItem[]> {
  const res = await fetchWithRetry(url, fallbackSource);
  const feed = await parser.parseString(await res.text());
  return (feed.items ?? [])
    .filter((i) => i.title && i.link)
    .map((i) => {
      let title = i.title!.trim();
      let source = fallbackSource;
      // Google News: "Rubrik - Källa"
      const cut = title.lastIndexOf(" - ");
      if (url.includes("news.google.com") && cut > 10 && title.length - cut < 60) {
        source = title.slice(cut + 3).trim();
        title = title.slice(0, cut).trim();
      }
      const published = Date.parse(i.isoDate ?? i.pubDate ?? "") || Date.now();
      return { title, link: i.link!, source, published };
    });
}

function enrich(items: RawItem[]): NewsItem[] {
  const lex = loadLexicon();
  const themes = loadThemes();
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const it of items.sort((a, b) => b.published - a.published)) {
    const key = it.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    const s = scoreHeadline(it.title, lex);
    out.push({
      id: key,
      ...it,
      sentiment: s.score,
      hits: s.hits.map((h) => h.term),
      themes: themesFor(it.title, themes),
    });
  }
  return out;
}

function googleNewsRss(query: string, lang: "sv" | "en") {
  const q = encodeURIComponent(`${query} when:14d`);
  return lang === "sv"
    ? `https://news.google.com/rss/search?q=${q}&hl=sv&gl=SE&ceid=SE:sv`
    : `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

/** Bolagsnyheter senaste 14 dagarna via Google News RSS. Cachas 30 min. */
export function getCompanyNews(w: Pick<WatchItem, "ticker" | "searchName" | "country">) {
  return cached(`news:${w.ticker}`, 30 * 60 * 1000, async () => {
    const lang = w.country === "SE" ? "sv" : "en";
    const raw = await fetchFeed(googleNewsRss(newsQuery(w.searchName), lang), "Google News");
    return enrich(raw).slice(0, 60);
  });
}

/** Källor för världsnyheter (alla gratis RSS utan konto). */
export const WORLD_FEEDS: { url: string; source: string }[] = [
  { url: "https://www.svt.se/nyheter/ekonomi/rss.xml", source: "SVT Ekonomi" },
  { url: "https://www.svt.se/nyheter/utrikes/rss.xml", source: "SVT Utrikes" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC Business" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", source: "New York Times" },
  { url: googleNewsRss("börsen OR aktiemarknaden OR Stockholmsbörsen", "sv"), source: "Google News" },
  { url: googleNewsRss("stock market OR Wall Street", "en"), source: "Google News" },
];

export interface WorldNews {
  items: NewsItem[];
  failedSources: string[];
}

/** Världs- och makronyheter senaste veckan. Cachas 15 min. */
export function getWorldNews() {
  return cached("news:world", 15 * 60 * 1000, async (): Promise<WorldNews> => {
    const failed: string[] = [];
    const lists = await mapLimit(WORLD_FEEDS, 4, async (f) => {
      try {
        return await fetchFeed(f.url, f.source);
      } catch {
        failed.push(f.source);
        return [];
      }
    });
    if (failed.length === WORLD_FEEDS.length) throw new Error("Inga nyhetskällor svarade");
    const weekAgo = Date.now() - 7 * 864e5;
    return { items: enrich(lists.flat().filter((i) => i.published >= weekAgo)).slice(0, 400), failedSources: [...new Set(failed)] };
  });
}
