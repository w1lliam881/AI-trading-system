"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Hit { symbol: string; name: string; exchange: string; type: string }

/** Söker bolag via /api/search (Yahoo). Tryck "/" var som helst för att fokusera. */
export function SymbolSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); setErr(null); return; }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Sökningen misslyckades");
        setHits(j.hits); setErr(null); setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setErr((e as Error).message);
      } finally { setLoading(false); }
    }, 250);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [q]);

  function go(symbol: string) {
    setOpen(false); setQ(""); inputRef.current?.blur();
    router.push(`/aktie/${encodeURIComponent(symbol)}`);
  }

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Enter" && hits[active]) go(hits[active].symbol);
          if (e.key === "Escape") inputRef.current?.blur();
        }}
        placeholder="Sök bolag eller ticker…"
        aria-label="Sök bolag"
        className="h-9 w-full rounded-lg border border-border bg-panel pr-10 pl-9 text-sm text-text placeholder:text-muted focus:border-border-strong focus:outline-none"
      />
      {loading ? (
        <Loader2 className="absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted" />
      ) : (
        <kbd className="num absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-border px-1.5 text-[10px] text-muted">/</kbd>
      )}
      {open && q.trim().length >= 2 && (
        <div className="absolute top-11 z-50 w-full overflow-hidden rounded-lg border border-border-strong bg-panel shadow-2xl">
          {err && <p className="px-3 py-2.5 text-xs text-down">{err}</p>}
          {!err && !loading && hits.length === 0 && <p className="px-3 py-2.5 text-xs text-muted">Inga träffar för ”{q}”.</p>}
          {hits.map((h, i) => (
            <button
              key={h.symbol}
              onMouseDown={(e) => { e.preventDefault(); go(h.symbol); }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm", i === active && "bg-hover")}
            >
              <span className="min-w-0">
                <span className="num text-[13px] font-medium text-text">{h.symbol}</span>
                <span className="ml-2 truncate text-xs text-muted">{h.name}</span>
              </span>
              <span className="shrink-0 text-[10.5px] text-muted">{h.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
