import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import type { Regime } from "@/lib/analysis/macro";
import { cn } from "@/lib/utils";

/** Mätare för marknadsläget + vilka regler som slog till. */
export function RegimeGauge({ regime, score, rules }: { regime: Regime; score: number; rules: { label: string; effect: number; detail: string }[] }) {
  const pos = ((score + 1) / 2) * 100;
  return (
    <div className="rounded-xl border border-border bg-panel-2/50 p-4">
      <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Marknadsläge</p>
      <p className={cn("mt-1 text-xl font-semibold", regime === "Risk-on" ? "text-up" : regime === "Risk-off" ? "text-down" : "text-text")}>{regime}</p>
      <div className="relative mt-3 h-2 rounded-full" style={{ background: "linear-gradient(90deg, var(--down), var(--flat), var(--up))" }}>
        <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg)] bg-text shadow" style={{ left: `${pos}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted"><span>Risk-off</span><span>Neutral</span><span>Risk-on</span></div>
      <ul className="mt-3 space-y-1.5">
        {rules.map((r) => {
          const Icon = r.effect > 0 ? CheckCircle2 : r.effect < 0 ? XCircle : MinusCircle;
          return (
            <li key={r.label} className="flex gap-2 text-[11.5px] leading-snug text-text-2" title={r.label}>
              <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", r.effect > 0 ? "text-up" : r.effect < 0 ? "text-down" : "text-muted")} />
              <span>{r.detail}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
