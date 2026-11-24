import fs from "node:fs";
import path from "node:path";

/**
 * Grov sentimentanalys med ordlista (ingen AI). Varje rubrik får ett värde
 * mellan −1 (mycket negativ) och +1 (mycket positiv). Detta är en uppskattning!
 */
export interface Lexicon {
  words: Record<string, number>;
  negations: string[];
}

export interface Theme {
  id: string;
  label: string;
  keywords: string[];
  sectors: string[];
}

const LEXICON_PATH = path.join(process.cwd(), "config", "sentiment-lexicon.json");
const THEMES_PATH = path.join(process.cwd(), "config", "themes.json");

function readJson<T>(p: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function loadLexicon(): Lexicon {
  const raw = readJson<Partial<Lexicon>>(LEXICON_PATH, {});
  return { words: raw.words ?? {}, negations: raw.negations ?? [] };
}

export function saveLexicon(lex: Lexicon) {
  const current = readJson<Record<string, unknown>>(LEXICON_PATH, {});
  fs.writeFileSync(LEXICON_PATH, JSON.stringify({ ...current, words: lex.words, negations: lex.negations }, null, 2) + "\n");
}

export function loadThemes(): Theme[] {
  return readJson<{ themes?: Theme[] }>(THEMES_PATH, {}).themes ?? [];
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Bygger regex som matchar termen från början av ett ord. */
const reCache = new Map<string, RegExp>();
function termRe(term: string): RegExp {
  let re = reCache.get(term);
  if (!re) {
    // Korta termer (t.ex. "ai", "fed") måste vara hela ord, annars träffar "ai" även "aircraft".
    const tail = term.length <= 3 ? "(?![\\p{L}\\p{N}])" : "";
    re = new RegExp(`(^|[^\\p{L}\\p{N}])${escape(term.toLowerCase())}${tail}`, "u");
    reCache.set(term, re);
  }
  return re;
}

export function matchesTerm(text: string, term: string): boolean {
  return termRe(term).test(text);
}

export interface SentimentResult {
  /** −1 … +1 */
  score: number;
  hits: { term: string; weight: number }[];
}

export function scoreHeadline(title: string, lex: Lexicon): SentimentResult {
  const text = ` ${title.toLowerCase()} `;
  const hits: { term: string; weight: number }[] = [];
  // Längre fraser först så att "sänker riktkurs" vinner över "riktkurs".
  const terms = Object.keys(lex.words).sort((a, b) => b.length - a.length);
  const used: [number, number][] = [];
  for (const term of terms) {
    const m = termRe(term).exec(text);
    if (!m) continue;
    const start = m.index + m[1].length;
    const end = start + term.length;
    if (used.some(([a, b]) => start < b && end > a)) continue; // överlapp
    used.push([start, end]);
    let w = lex.words[term];
    // Enkel negationshantering: "inte" / "not" strax före ordet vänder tecknet.
    const before = text.slice(Math.max(0, start - 16), start);
    if (lex.negations.some((n) => matchesTerm(before, n))) w = -w * 0.7;
    hits.push({ term, weight: w });
  }
  const sum = hits.reduce((s, h) => s + h.weight, 0);
  // Mjuk normalisering till −1 … +1
  const score = Math.max(-1, Math.min(1, sum / 3));
  return { score, hits };
}

export function themesFor(title: string, themes: Theme[]): string[] {
  const text = ` ${title.toLowerCase()} `;
  return themes.filter((t) => t.keywords.some((k) => matchesTerm(text, k))).map((t) => t.id);
}
