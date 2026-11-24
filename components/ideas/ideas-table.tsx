"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, SlidersHorizontal, X } from "lucide-react";
import type { IdeaRow } from "@/lib/view-models";
import { Sparkline } from "@/components/charts/sparkline";
import { Change } from "@/components/ui/change";
import { StockLinks } from "@/components/stock-links";
import { ScoreBadge, SubScoreBars } from "@/components/score/score-badge";
import { DirectionBadge, OutlookPill } from "@/components/score/badges";
import { LiveChange, LivePrice } from "@/components/live/live";
import { cn } from "@/lib/utils";

type SortKey = "score" | "name" | "sector" | "country" | "price" | "changePct" | "ret1m" | "ret3m" | "risk" | "outlook" | "technical" | "fundamental" | "news" | "macro" | "events";

const COUNTRY_LABEL: Record<string, string> = { SE: "Sverige", US: "USA", DE: "Tyskland", FI: "Finland", DK: "Danmark", NO: "Norge", Övrigt: "Övrigt" };
const LEVEL_N: Record<string, number> = { Låg: 0, Medel: 1, Hög: 2 };

function val(r: IdeaRow, k: SortKey): string | number | null {
  switch (k) {
    case "score": return r.score.total;
    case "name": return r.name;
    case "sector": return r.sector;
    case "country": return r.country;
    case "price": return r.price;
    case "changePct": return r.changePct;
    case "ret1m": return r.ret1m;
    case "ret3m": return r.ret3m;
    case "risk": return LEVEL_N[r.score.risk];
    case "outlook": return r.outlook.dir;
    default: return r.score.subs.find((s) => s.key === k)?.score ?? null;
  }
}

export function IdeasTable({ rows }: { rows: IdeaRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "score", dir: -1 });
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(1);
  const [direction, setDirection] = useState("alla");
  const [risk, setRisk] = useState("alla");
  const [horizon, setHorizon] = useState("alla");
  const [sector, setSector] = useState("alla");
  const [country, setCountry] = useState("alla");
  const [confidence, setConfidence] = useState("alla");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const sectors = useMemo(() => [...new Set(rows.map((r) => r.sector))].sort(), [rows]);
  const countries = useMemo(() => [...new Set(rows.map((r) => r.country))].sort(), [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const lo = minPrice ? Number(minPrice.replace(",", ".")) : -Infinity;
    const hi = maxPrice ? Number(maxPrice.replace(",", ".")) : Infinity;
    return rows
      .filter((r) => !qq || r.name.toLowerCase().includes(qq) || r.ticker.toLowerCase().includes(qq))
      .filter((r) => r.score.total >= minScore)
      .filter((r) => direction === "alla" || r.score.direction === direction)
      .filter((r) => risk === "alla" || r.score.risk === risk)
      .filter((r) => horizon === "alla" || r.score.horizon === horizon)
      .filter((r) => sector === "alla" || r.sector === sector)
      .filter((r) => country === "alla" || r.country === country)
      .filter((r) => confidence === "alla" || r.score.confidence === confidence)
      .filter((r) => (r.price != null ? r.price >= lo && r.price <= hi : lo === -Infinity && hi === Infinity))
      .sort((a, b) => {
        const va = val(a, sort.key), vb = val(b, sort.key);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return (typeof va === "string" ? va.localeCompare(String(vb), "sv") : (va as number) - (vb as number)) * sort.dir;
      });
  }, [rows, q, minScore, direction, risk, horizon, sector, country, confidence, minPrice, maxPrice, sort]);

  const active = q || minScore > 1 || [direction, risk, horizon, sector, country, confidence].some((x) => x !== "alla") || minPrice || maxPrice;
  const reset = () => { setQ(""); setMinScore(1); setDirection("alla"); setRisk("alla"); setHorizon("alla"); setSector("alla"); setCountry("alla"); setConfidence("alla"); setMinPrice(""); setMaxPrice(""); };

  function Th({ k, children, className, title }: { k: SortKey; children: React.ReactNode; className?: string; title?: string }) {
    const on = sort.key === k;
    const right = className?.includes("text-right");
    return (
      <th className={cn("px-3 py-2.5 font-medium", className)} aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"} title={title}>
        <button
          onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : ["name", "sector", "country", "risk"].includes(k) ? 1 : -1 }))}
          className={cn("inline-flex items-center gap-1 uppercase hover:text-text", on && "text-text", right && "flex-row-reverse")}
        >
          {children}
          {on ? sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
        </button>
      </th>
    );
  }

  const input = "h-8 rounded-md border border-border bg-panel-2 px-2.5 text-xs text-text placeholder:text-muted focus:border-border-strong focus:outline-none";
  const Select = ({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: [string, string][] }) => (
    <select className={input} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="alla">{label}: alla</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-panel p-3">
        <SlidersHorizontal className="mx-1 h-4 w-4 text-muted" />
        <input className={cn(input, "w-40")} placeholder="Namn/ticker" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-2 rounded-md border border-border bg-panel-2 px-2.5 py-1 text-xs text-text-2">
          Minst
          <input type="range" min={1} max={10} step={0.5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-24 accent-[var(--accent)]" aria-label="Minsta poäng" />
          <span className="num w-7 text-text">{minScore.toLocaleString("sv-SE")}</span>
        </label>
        <Select value={direction} onChange={setDirection} label="Riktning" options={[["Köpintresse", "Köpintresse"], ["Bevaka", "Bevaka"], ["Undvik", "Undvik"]]} />
        <Select value={risk} onChange={setRisk} label="Risk" options={[["Låg", "Låg"], ["Medel", "Medel"], ["Hög", "Hög"]]} />
        <Select value={horizon} onChange={setHorizon} label="Horisont" options={[["Kort (veckor)", "Kort (veckor)"], ["Medel (månader)", "Medel (månader)"], ["Lång (år)", "Lång (år)"]]} />
        <Select value={sector} onChange={setSector} label="Sektor" options={sectors.map((s) => [s, s])} />
        <Select value={country} onChange={setCountry} label="Land" options={countries.map((c) => [c, COUNTRY_LABEL[c] ?? c])} />
        <Select value={confidence} onChange={setConfidence} label="Datasäkerhet" options={[["Hög", "Hög"], ["Medel", "Medel"], ["Låg", "Låg"]]} />
        <span className="flex items-center gap-1 text-xs text-muted">
          Pris
          <input className={cn(input, "num w-16")} inputMode="decimal" placeholder="från" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />–
          <input className={cn(input, "num w-16")} inputMode="decimal" placeholder="till" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </span>
        {active && <button onClick={reset} className="ml-1 flex items-center gap-1 text-xs text-muted hover:text-text"><X className="h-3 w-3" /> Rensa</button>}
        <span className="ml-auto text-xs text-muted">{filtered.length} av {rows.length} bolag</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-panel">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="border-b border-border text-left text-[11px] tracking-wide text-muted">
            <tr>
              <Th k="score" className="pl-4" title="Totalpoäng 1–10. Klicka på en poäng i tabellen för motivering.">Poäng</Th>
              <th className="px-2 py-2.5 font-medium uppercase" title="Teknik · Fundamenta · Nyheter · Makro · Händelser">Delpoäng</th>
              <Th k="name">Bolag</Th>
              <th className="px-3 py-2.5 font-medium uppercase">Riktning</th>
              <Th k="outlook" title="Regelbaserad utsikt 1–4 veckor">Prognos</Th>
              <Th k="risk">Risk</Th>
              <Th k="price" className="text-right">Pris</Th>
              <Th k="changePct" className="text-right">Idag</Th>
              <Th k="ret3m" className="text-right">3 mån</Th>
              <th className="px-3 py-2.5 font-medium uppercase">Graf</th>
              <th className="px-3 py-2.5 font-medium uppercase">Länkar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.ticker} className="transition-colors hover:bg-hover/60">
                <td className="py-2 pl-4"><ScoreBadge view={r.score} /></td>
                <td className="px-2 py-2"><SubScoreBars view={r.score} /></td>
                <td className="px-3 py-2">
                  <Link href={`/aktie/${encodeURIComponent(r.ticker)}`} className="group block">
                    <span className="block font-medium group-hover:text-accent">{r.name}</span>
                    <span className="text-[11px] text-muted"><span className="num">{r.ticker}</span> · {r.sector} · {COUNTRY_LABEL[r.country] ?? r.country}</span>
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <DirectionBadge d={r.score.direction} />
                  <div className="mt-0.5 text-[10.5px] text-muted">{r.score.horizon}</div>
                </td>
                <td className="px-3 py-2"><OutlookPill dir={r.outlook.dir} label={r.outlook.label} size="sm" /></td>
                <td className="px-3 py-2 text-xs text-text-2">
                  {r.score.risk}
                  {r.score.confidence !== "Hög" && <div className="text-[10.5px] text-accent">Data: {r.score.confidence.toLowerCase()}</div>}
                </td>
                <td className="px-3 py-2 text-right">{r.price != null ? <><LivePrice symbol={r.ticker} initial={r.price} /> <span className="text-[10px] text-muted">{r.currency}</span></> : "–"}</td>
                <td className="px-3 py-2 text-right"><LiveChange symbol={r.ticker} initial={r.changePct} className="text-xs" /></td>
                <td className="px-3 py-2 text-right"><Change value={r.ret3m} className="text-xs" decimals={1} /></td>
                <td className="px-3 py-2">{r.spark.length ? <Sparkline data={r.spark} width={92} height={26} /> : <span className="text-xs text-muted">Ingen data</span>}</td>
                <td className="px-2 py-2"><StockLinks item={r} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-muted">Inga bolag matchar filtren. <button onClick={reset} className="text-accent hover:underline">Rensa filtren</button></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted">Delpoängens staplar: teknik · fundamenta · nyheter · makro · händelser. Grå stapel = otillräcklig data (räknas som 5). Klicka på en poäng för att se motiveringen.</p>
    </div>
  );
}
