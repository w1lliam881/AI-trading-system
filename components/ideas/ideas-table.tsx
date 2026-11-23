"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, SlidersHorizontal, X } from "lucide-react";
import type { StockRow } from "@/lib/data/market-data";
import { Sparkline } from "@/components/charts/sparkline";
import { Change } from "@/components/ui/change";
import { StockLinks } from "@/components/stock-links";
import { fmtPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "name" | "sector" | "country" | "price" | "changePct" | "ret1m" | "ret3m" | "fromHigh52Pct";

const COUNTRY_LABEL: Record<string, string> = { SE: "Sverige", US: "USA", DE: "Tyskland", FI: "Finland", DK: "Danmark", NO: "Norge", Övrigt: "Övrigt" };

function val(r: StockRow, k: SortKey): string | number | null {
  switch (k) {
    case "name": return r.name;
    case "sector": return r.sector;
    case "country": return r.country;
    default: return r.snap ? (r.snap[k] as number | null) : null;
  }
}

export function IdeasTable({ rows }: { rows: StockRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "changePct", dir: -1 });
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("alla");
  const [country, setCountry] = useState("alla");
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
      .filter((r) => sector === "alla" || r.sector === sector)
      .filter((r) => country === "alla" || r.country === country)
      .filter((r) => (r.snap ? r.snap.price >= lo && r.snap.price <= hi : lo === -Infinity && hi === Infinity))
      .sort((a, b) => {
        const va = val(a, sort.key), vb = val(b, sort.key);
        if (va == null && vb == null) return 0;
        if (va == null) return 1; // saknade värden alltid sist
        if (vb == null) return -1;
        return (typeof va === "string" ? va.localeCompare(String(vb), "sv") : (va as number) - (vb as number)) * sort.dir;
      });
  }, [rows, q, sector, country, minPrice, maxPrice, sort]);

  const active = q || sector !== "alla" || country !== "alla" || minPrice || maxPrice;

  function Th({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) {
    const on = sort.key === k;
    return (
      <th className={cn("px-3 py-2.5 font-medium", className)} aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button
          onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : (["name", "sector", "country"].includes(k) ? 1 : -1) }))}
          className={cn("inline-flex items-center gap-1 hover:text-text", on && "text-text", className?.includes("text-right") && "flex-row-reverse")}
        >
          {children}
          {on ? sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
        </button>
      </th>
    );
  }

  const input = "h-8 rounded-md border border-border bg-panel-2 px-2.5 text-xs text-text placeholder:text-muted focus:border-border-strong focus:outline-none";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-panel p-3">
        <SlidersHorizontal className="mx-1 h-4 w-4 text-muted" />
        <input className={cn(input, "w-48")} placeholder="Filtrera på namn/ticker" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={input} value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sektor">
          <option value="alla">Alla sektorer</option>
          {sectors.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={input} value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Land">
          <option value="alla">Alla länder</option>
          {countries.map((c) => <option key={c} value={c}>{COUNTRY_LABEL[c] ?? c}</option>)}
        </select>
        <span className="flex items-center gap-1 text-xs text-muted">
          Pris
          <input className={cn(input, "num w-20")} inputMode="decimal" placeholder="från" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          –
          <input className={cn(input, "num w-20")} inputMode="decimal" placeholder="till" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </span>
        {active && (
          <button onClick={() => { setQ(""); setSector("alla"); setCountry("alla"); setMinPrice(""); setMaxPrice(""); }} className="ml-1 flex items-center gap-1 text-xs text-muted hover:text-text">
            <X className="h-3 w-3" /> Rensa
          </button>
        )}
        <span className="ml-auto text-xs text-muted">{filtered.length} av {rows.length} bolag</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-panel">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="border-b border-border text-left text-[11px] tracking-wide text-muted uppercase">
            <tr>
              <th className="py-2.5 pr-1 pl-4 font-medium" title="Totalpoäng 1–10 (fas 2)">Poäng</th>
              <Th k="name">Bolag</Th>
              <Th k="sector">Sektor</Th>
              <Th k="country">Land</Th>
              <Th k="price" className="text-right">Pris</Th>
              <Th k="changePct" className="text-right">Idag</Th>
              <Th k="ret1m" className="text-right">1 mån</Th>
              <Th k="ret3m" className="text-right">3 mån</Th>
              <Th k="fromHigh52Pct" className="text-right">Från 52v-högsta</Th>
              <th className="px-3 py-2.5 font-medium">3 mån graf</th>
              <th className="px-3 py-2.5 font-medium">Länkar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.ticker} className="transition-colors hover:bg-hover/60">
                <td className="py-2 pr-1 pl-4">
                  <span className="grid h-7 w-7 place-items-center rounded-md border border-border bg-panel-2 text-[10px] text-muted" title="Poängsystemet kopplas in i fas 2">–</span>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/aktie/${encodeURIComponent(r.ticker)}`} className="group block">
                    <span className="block font-medium group-hover:text-accent">{r.name}</span>
                    <span className="num text-[11px] text-muted">{r.ticker}</span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs text-text-2">{r.sector}</td>
                <td className="px-3 py-2 text-xs text-text-2">{COUNTRY_LABEL[r.country] ?? r.country}</td>
                <td className="num px-3 py-2 text-right">{r.snap ? <>{fmtPrice(r.snap.price)} <span className="text-[10px] text-muted">{r.snap.currency}</span></> : "–"}</td>
                <td className="px-3 py-2 text-right"><Change value={r.snap?.changePct} className="text-xs" /></td>
                <td className="px-3 py-2 text-right"><Change value={r.snap?.ret1m} className="text-xs" decimals={1} /></td>
                <td className="px-3 py-2 text-right"><Change value={r.snap?.ret3m} className="text-xs" decimals={1} /></td>
                <td className="num px-3 py-2 text-right text-xs text-text-2">{r.snap?.fromHigh52Pct != null ? `${r.snap.fromHigh52Pct.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} %` : "–"}</td>
                <td className="px-3 py-2">{r.snap ? <Sparkline data={r.snap.spark} width={100} height={26} /> : <span className="text-xs text-muted">Ingen data</span>}</td>
                <td className="px-2 py-2"><StockLinks item={r} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-muted">Inga bolag matchar filtren. Prova att rensa dem.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
