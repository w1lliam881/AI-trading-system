import type { Bar } from "../data/yahoo";
import { clamp, insufficientScore, n0, pct, toScore, type SubScore } from "./types";

export interface CorporateEvent {
  kind: "report" | "dividend" | "gap";
  /** ms */
  date: number;
  title: string;
  /** true = datumet är uppskattat, inte bekräftat. */
  estimated?: boolean;
  /** Kursrörelse i % för gap. */
  move?: number;
  future: boolean;
}

export interface EventsInput {
  bars: Bar[];
  dividends: { t: number; amount: number }[];
  lastQuarterEnd: number | null;
  country: string;
  now?: number;
}

const DAY = 864e5;

function addMonths(ms: number, m: number) {
  const d = new Date(ms);
  d.setUTCMonth(d.getUTCMonth() + m);
  return d.getTime();
}

/** Uppskattar rapportdatum: kvartalsslut + typisk fördröjning (Sverige ~3–4 v, USA ~4 v, bokslut längre). */
function reportLag(quarterEnd: number, country: string) {
  const isQ4 = new Date(quarterEnd).getUTCMonth() === 11;
  return (country === "SE" ? 22 : 28) + (isQ4 ? 10 : 0);
}

export function findEvents({ bars, dividends, lastQuarterEnd, country, now = Date.now() }: EventsInput): CorporateEvent[] {
  const ev: CorporateEvent[] = [];
  // Stora kursrörelser (> 5 %) senaste 60 handelsdagarna
  for (let i = Math.max(1, bars.length - 60); i < bars.length; i++) {
    const prev = bars[i - 1].c;
    const gapOpen = (bars[i].o / prev - 1) * 100;
    const move = (bars[i].c / prev - 1) * 100;
    const m = Math.abs(gapOpen) > Math.abs(move) ? gapOpen : move;
    if (Math.abs(m) > 5) ev.push({ kind: "gap", date: bars[i].t * 1000, title: `Kursrörelse ${pct(m)}`, move: m, future: false });
  }
  // Rapporter: senaste (uppskattad) och nästa (uppskattad)
  if (lastQuarterEnd) {
    const last = lastQuarterEnd + reportLag(lastQuarterEnd, country) * DAY;
    ev.push({ kind: "report", date: last, title: "Senaste kvartalsrapport", estimated: true, future: last > now });
    const nextQ = addMonths(lastQuarterEnd, 3);
    const next = nextQ + reportLag(nextQ, country) * DAY;
    ev.push({ kind: "report", date: next, title: "Nästa kvartalsrapport", estimated: true, future: next > now });
  }
  // Utdelningar: historiska x-dagar + uppskattad nästa (samma tid nästa år)
  for (const d of dividends.filter((d) => now - d.t * 1000 < 400 * DAY)) {
    ev.push({ kind: "dividend", date: d.t * 1000, title: `Utdelning ${d.amount.toLocaleString("sv-SE")} per aktie (x-dag)`, future: false });
  }
  const lastDiv = dividends.at(-1);
  if (lastDiv) {
    let nextT = lastDiv.t * 1000;
    while (nextT < now) nextT = addMonths(nextT, 12);
    if (nextT - now < 200 * DAY) ev.push({ kind: "dividend", date: nextT, title: "Nästa utdelning (x-dag)", estimated: true, future: true });
  }
  return ev.sort((a, b) => a.date - b.date);
}

export function dividendYield(dividends: { t: number; amount: number }[], price: number, now = Date.now()): number | null {
  if (!dividends.length || !price) return null;
  const sum = dividends.filter((d) => now - d.t * 1000 <= 365 * DAY).reduce((s, d) => s + d.amount, 0);
  return (sum / price) * 100;
}

const fmtD = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }).replace(/\.$/, "");

/** Delpoäng för bolagshändelser: stora kursrörelser, kommande rapport och utdelning. */
export function scoreEvents(events: CorporateEvent[], barCount: number, now = Date.now()): SubScore {
  if (barCount < 20) return insufficientScore("events", "för kort kurshistorik.");
  let s = 5;
  const pros: string[] = [];
  const cons: string[] = [];
  const recentGaps = events.filter((e) => e.kind === "gap" && now - e.date < 30 * DAY);
  let gapEffect = 0;
  for (const g of recentGaps) {
    const age = (now - g.date) / DAY;
    gapEffect += Math.sign(g.move!) * (age <= 7 ? 1 : 0.5);
  }
  s += clamp(gapEffect, -2.5, 2.5);
  if (recentGaps.length) {
    const g = recentGaps.at(-1)!;
    (g.move! > 0 ? pros : cons).push(`Stor kursrörelse ${pct(g.move!)} den ${fmtD(g.date)}.`);
  }
  const nextReport = events.find((e) => e.kind === "report" && e.future);
  const nextDiv = events.find((e) => e.kind === "dividend" && e.future);
  if (nextDiv && nextDiv.date - now < 30 * DAY) { s += 0.5; pros.push(`Utdelning väntas runt ${fmtD(nextDiv.date)}.`); }
  const daysToReport = nextReport ? Math.round((nextReport.date - now) / DAY) : null;
  if (daysToReport != null && daysToReport <= 7) cons.push(`Rapport om ca ${daysToReport} dagar – större kurssvängningar möjliga.`);

  const bits: string[] = [];
  bits.push(recentGaps.length ? `${recentGaps.length} stor${recentGaps.length > 1 ? "a" : ""} kursrörelse${recentGaps.length > 1 ? "r" : ""} (> 5 %) senaste 30 dagarna` : "Inga stora kursrörelser senaste 30 dagarna");
  if (nextReport) bits.push(`nästa rapport uppskattas till ${fmtD(nextReport.date)}`);
  return {
    key: "events",
    label: "Bolagshändelser",
    score: toScore(s),
    reason: `${bits.join(" och ")}.`,
    insufficient: false,
    pros,
    cons,
    metrics: [
      { label: "Stora rörelser 30 d", value: String(recentGaps.length) },
      { label: "Nästa rapport (uppsk.)", value: nextReport ? `${fmtD(nextReport.date)} (${n0(daysToReport!)} d)` : "–" },
      { label: "Nästa utdelning (uppsk.)", value: nextDiv ? fmtD(nextDiv.date) : "–" },
    ],
  };
}
