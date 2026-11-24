"use client";
import { useEffect, useRef, useState } from "react";
import { useLiveMeta, useLiveQuote } from "@/lib/live-client";
import { changeTone, fmtNumber, fmtPrice, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Blinkar grönt/rött en kort stund när värdet ändras. */
function useFlash(value: number | null | undefined) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (value == null || prev.current == null || value === prev.current) { prev.current = value; return; }
    setFlash(value > prev.current ? "up" : "down");
    prev.current = value;
    const id = setTimeout(() => setFlash(null), 1100);
    return () => clearTimeout(id);
  }, [value]);
  return flash;
}

export function LivePrice({ symbol, initial, className, rate = false }: { symbol: string; initial: number | null | undefined; className?: string; rate?: boolean }) {
  const q = useLiveQuote(symbol);
  const v = q?.price ?? initial;
  const flash = useFlash(v);
  return (
    <span className={cn("num rounded-sm transition-colors duration-700", flash === "up" && "bg-up-soft text-up", flash === "down" && "bg-down-soft text-down", className)}>
      {rate ? `${fmtNumber(v, 2)} %` : fmtPrice(v)}
    </span>
  );
}

/** Dagens förändring. För räntor visas förändring i %-enheter. */
export function LiveChange({ symbol, initial, initialAbs, className, rate = false, pill = false, arrow = true }: { symbol: string; initial: number | null | undefined; initialAbs?: number | null; className?: string; rate?: boolean; pill?: boolean; arrow?: boolean }) {
  const q = useLiveQuote(symbol);
  const v = rate ? (q?.change ?? initialAbs ?? null) : (q?.changePct ?? initial);
  const tone = changeTone(v);
  return (
    <span className={cn(
      "num whitespace-nowrap",
      tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-flat",
      pill && "rounded-md px-1.5 py-0.5",
      pill && (tone === "up" ? "bg-up-soft" : tone === "down" ? "bg-down-soft" : "bg-panel-2"),
      className,
    )}>
      {arrow && (tone === "up" ? "▲ " : tone === "down" ? "▼ " : "")}
      {v == null ? "–" : `${!arrow && v > 0 ? "+" : ""}${fmtNumber(arrow ? Math.abs(v) : v, 2)}${rate ? "" : " %"}`}
    </span>
  );
}

export function LiveChangeAbs({ symbol, initial, className }: { symbol: string; initial: number | null | undefined; className?: string }) {
  const q = useLiveQuote(symbol);
  const v = q?.change ?? initial;
  return <span className={cn("num", className)}>{v == null ? "" : `${v > 0 ? "+" : ""}${fmtNumber(v, 2)}`}</span>;
}

/** Liten indikator: LIVE + senaste uppdatering. */
export function LiveStatus() {
  const m = useLiveMeta();
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 5000); return () => clearInterval(id); }, []);
  const age = m.lastUpdate ? Date.now() - m.lastUpdate : null;
  const ok = !m.error && age != null && age < 90_000;
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted" title="Kurserna uppdateras automatiskt var 20:e sekund när fliken är öppen. Yahoo kan ha upp till 15 min fördröjning på vissa börser.">
      <span className={cn("relative flex h-2 w-2")}>
        {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-60" />}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", ok ? "bg-up" : m.error ? "bg-down" : "bg-muted")} />
      </span>
      <span className={cn("font-semibold tracking-wider", ok ? "text-up" : "text-muted")}>LIVE</span>
      {m.lastUpdate ? <span className="num">{fmtTime(m.lastUpdate)}:{String(new Date(m.lastUpdate).getSeconds()).padStart(2, "0")}</span> : <span>ansluter…</span>}
      {m.error && <span className="text-down">· fel, försöker igen</span>}
    </span>
  );
}
