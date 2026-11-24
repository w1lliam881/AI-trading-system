"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Weights } from "@/lib/settings";

const LABELS: [keyof Weights, string, string][] = [
  ["technical", "Momentum/teknik", "Trend, RSI, momentum, volym"],
  ["fundamental", "Fundamenta", "P/E, P/S, skulder, marginal, tillväxt, utdelning"],
  ["news", "Nyhetsflöde", "Ton och volym i bolagets nyheter"],
  ["macro", "Makro/sektor", "Marknadsläge, sektorstyrka, världsnyheter"],
  ["events", "Bolagshändelser", "Stora kursrörelser, rapporter, utdelningar"],
];

export function WeightsEditor({ initial, defaults }: { initial: Weights; defaults: Weights }) {
  const router = useRouter();
  const [w, setW] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [, start] = useTransition();
  const sum = Object.values(w).reduce((s, v) => s + v, 0);

  async function save(next = w) {
    setSaving(true); setMsg(null);
    const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weights: next }) });
    const j = await r.json();
    setSaving(false);
    setMsg(r.ok ? { ok: true, text: "Sparat! Poängen räknas om." } : { ok: false, text: j.error ?? "Kunde inte spara." });
    if (r.ok) start(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {LABELS.map(([k, label, help]) => (
        <div key={k}>
          <div className="flex items-baseline justify-between">
            <label htmlFor={`w-${k}`} className="text-sm font-medium">{label}</label>
            <span className="num text-sm">{w[k]} <span className="text-xs text-muted">({sum ? Math.round((w[k] / sum) * 100) : 0} % av totalen)</span></span>
          </div>
          <p className="text-[11px] text-muted">{help}</p>
          <input id={`w-${k}`} type="range" min={0} max={50} step={1} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} className="mt-1 w-full accent-[var(--accent)]" />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button onClick={() => save()} disabled={saving || sum === 0} className="flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-[#14100a] hover:brightness-110 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Spara vikter
        </button>
        <button onClick={() => { setW(defaults); void save(defaults); }} className="text-xs text-muted hover:text-text">Återställ förval (20/25/20/20/15)</button>
        {msg && <span className={msg.ok ? "text-xs text-up" : "text-xs text-down"}>{msg.text}</span>}
      </div>
      <p className="text-[11px] text-muted">Vikterna behöver inte bli 100 – de räknas om till andelar automatiskt.</p>
    </div>
  );
}
