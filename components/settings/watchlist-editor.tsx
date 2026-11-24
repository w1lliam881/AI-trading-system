"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Loader2, Search } from "lucide-react";
import type { WatchItem } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

interface Hit { symbol: string; name: string; exchange: string; type: string; sector?: string }

const SECTOR_MAP: Record<string, string> = { Industrials: "Industri", "Financial Services": "Finans", Technology: "Teknik", "Consumer Cyclical": "Konsument", "Consumer Defensive": "Dagligvaror", Healthcare: "Hälsovård", "Communication Services": "Kommunikation", Energy: "Energi", "Basic Materials": "Material", "Real Estate": "Fastigheter", Utilities: "Kraft" };
const SECTORS = ["Industri", "Finans", "Teknik", "Konsument", "Dagligvaror", "Hälsovård", "Kommunikation", "Energi", "Material", "Fastigheter", "Kraft", "Okänd"];

function country(t: string): WatchItem["country"] {
  if (t.endsWith(".ST")) return "SE";
  if (t.endsWith(".DE")) return "DE";
  if (t.endsWith(".HE")) return "FI";
  if (t.endsWith(".CO")) return "DK";
  if (t.endsWith(".OL")) return "NO";
  return t.includes(".") ? "Övrigt" : "US";
}
const cleanName = (n: string) => n.replace(/\s*\(publ\)/gi, "").replace(/,?\s+(Inc\.?|Corporation|Corp\.?|Ltd\.?|plc|AB|Aktiebolag)$/gi, "").trim();

export function WatchlistEditor({ items }: { items: WatchItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pick, setPick] = useState<Hit | null>(null);
  const [sector, setSector] = useState("Okänd");
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setHits([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        setHits((j.hits ?? []).filter((h: Hit) => h.type === "EQUITY"));
      } finally { setLoading(false); }
    }, 300);
  }, [q]);

  async function add() {
    if (!pick) return;
    setBusy(pick.symbol);
    const name = cleanName(pick.name);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: pick.symbol, name, searchName: name, sector, country: country(pick.symbol) }),
    });
    setBusy(null);
    if (!res.ok) { setMsg("Kunde inte lägga till bolaget."); return; }
    setMsg(`${name} lades till.`);
    setPick(null); setQ(""); setHits([]);
    start(() => router.refresh());
  }

  async function remove(t: string) {
    setBusy(t);
    await fetch("/api/watchlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticker: t }) });
    setBusy(null);
    start(() => router.refresh());
  }

  const input = "h-9 rounded-lg border border-border bg-panel-2 px-3 text-sm text-text placeholder:text-muted focus:border-border-strong focus:outline-none";
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel-2/40 p-3">
        <p className="mb-2 text-xs font-medium text-text-2">Lägg till bolag</p>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className={cn(input, "w-full pl-9")} placeholder="Sök t.ex. Saab, Tesla, Novo…" value={q} onChange={(e) => { setQ(e.target.value); setPick(null); }} />
          {loading && <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />}
        </div>
        {hits.length > 0 && !pick && (
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border">
            {hits.map((h) => (
              <li key={h.symbol}>
                <button onClick={() => { setPick(h); setSector((h.sector && SECTOR_MAP[h.sector]) || "Okänd"); }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-hover">
                  <span><span className="num font-medium">{h.symbol}</span> <span className="text-xs text-muted">{h.name}</span></span>
                  <span className="text-[11px] text-muted">{h.exchange}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {pick && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm"><span className="num font-medium">{pick.symbol}</span> · {cleanName(pick.name)}</span>
            <select className={cn(input, "h-8 text-xs")} value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sektor">
              {SECTORS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button onClick={add} disabled={!!busy} className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-medium text-[#14100a] hover:brightness-110 disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Lägg till
            </button>
            <button onClick={() => setPick(null)} className="text-xs text-muted hover:text-text">Avbryt</button>
          </div>
        )}
        {msg && <p className="mt-2 text-xs text-up">{msg}</p>}
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {items.map((w) => (
          <li key={w.ticker} className="flex items-center gap-3 px-3 py-2 text-sm">
            <Link href={`/aktie/${encodeURIComponent(w.ticker)}`} className="min-w-0 flex-1 hover:text-accent">
              <span className="font-medium">{w.name}</span> <span className="num text-xs text-muted">{w.ticker}</span>
            </Link>
            <span className="hidden text-xs text-muted sm:inline">{w.sector} · {w.country}</span>
            <button onClick={() => remove(w.ticker)} disabled={busy === w.ticker || pending} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-down-soft hover:text-down" aria-label={`Ta bort ${w.name}`} title="Ta bort">
              {busy === w.ticker ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Bevakningslistan är tom. Sök och lägg till ett bolag ovan.</li>}
      </ul>
    </div>
  );
}
