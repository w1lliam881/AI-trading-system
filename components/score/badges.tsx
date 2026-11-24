import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Direction, Level } from "@/lib/analysis/scoring";
import { cn } from "@/lib/utils";

export function DirectionBadge({ d, className }: { d: Direction; className?: string }) {
  const cls = d === "Köpintresse" ? "bg-up-soft text-up" : d === "Undvik" ? "bg-down-soft text-down" : "bg-panel-2 text-text-2";
  return <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", cls, className)}>{d}</span>;
}

export function LevelBadge({ kind, level }: { kind: "risk" | "data"; level: Level }) {
  const label = kind === "risk" ? `Risk: ${level}` : `Data: ${level}`;
  const bad = kind === "risk" ? level === "Hög" : level === "Låg";
  const good = kind === "risk" ? level === "Låg" : level === "Hög";
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] whitespace-nowrap", bad ? "border-accent/40 text-accent" : good ? "border-border text-text-2" : "border-border text-muted")}>
      {label}
    </span>
  );
}

/** Pil + text för prognos/utsikt. */
export function OutlookPill({ dir, label, size = "md" }: { dir: number; label: string; size?: "sm" | "md" }) {
  const Icon = dir > 0 ? ArrowUpRight : dir < 0 ? ArrowDownRight : ArrowRight;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md font-medium whitespace-nowrap",
      size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
      dir > 0 ? "bg-up-soft text-up" : dir < 0 ? "bg-down-soft text-down" : "bg-panel-2 text-text-2",
    )}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );
}

/** Färgad prick för nyhetssentiment. */
export function SentimentDot({ s }: { s: number }) {
  const tone = s > 0.15 ? "up" : s < -0.15 ? "down" : "flat";
  return <span title={`Sentiment ${s >= 0 ? "+" : ""}${s.toFixed(2).replace(".", ",")} (grov uppskattning)`} className={cn("mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full", tone === "up" ? "bg-up" : tone === "down" ? "bg-down" : "bg-border-strong")} />;
}
