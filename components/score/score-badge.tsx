"use client";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import type { ScoreView } from "@/lib/view-models";
import { cn } from "@/lib/utils";
import { fmtScore, scoreBg, scoreColor } from "./score-utils";
import { DirectionBadge, LevelBadge } from "./badges";

/** Färgad poängbricka. Klicka för att se alla delpoäng med motivering. */
export function ScoreBadge({ view, size = "md", showLink = true }: { view: ScoreView; size?: "sm" | "md" | "lg"; showLink?: boolean }) {
  const dims = size === "lg" ? "h-14 w-14 text-xl" : size === "sm" ? "h-7 w-9 text-xs" : "h-8 w-10 text-sm";
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label={`Poäng ${fmtScore(view.total)} av 10 – klicka för motivering`}
          className={cn("num grid shrink-0 cursor-pointer place-items-center rounded-lg border font-semibold transition-transform hover:scale-105 focus-visible:scale-105", dims)}
          style={{ color: scoreColor(view.total), background: scoreBg(view.total), borderColor: `color-mix(in oklab, ${scoreColor(view.total)} 35%, transparent)` }}
        >
          {fmtScore(view.total)}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} align="start" collisionPadding={12}
          className="z-50 w-[380px] max-w-[calc(100vw-24px)] rounded-xl border border-border-strong bg-panel p-4 text-sm shadow-2xl animate-fade-up">
          <ScoreBreakdown view={view} />
          {showLink && (
            <Link href={`/aktie/${encodeURIComponent(view.ticker)}`} className="mt-3 flex items-center justify-end gap-1 text-xs text-accent hover:underline">
              Hela analysen för {view.name} <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          <Popover.Arrow className="fill-[var(--border-strong)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function ScoreBreakdown({ view }: { view: ScoreView }) {
  const wsum = view.subs.reduce((s, x) => s + x.weight, 0) || 1;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">Totalpoäng (viktat snitt)</p>
          <p className="num text-2xl font-semibold" style={{ color: scoreColor(view.total) }}>{fmtScore(view.total)}<span className="text-sm text-muted"> / 10</span></p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <DirectionBadge d={view.direction} />
          <LevelBadge kind="risk" level={view.risk} />
          <LevelBadge kind="data" level={view.confidence} />
        </div>
      </div>
      <ul className="mt-3 space-y-2.5">
        {view.subs.map((s) => (
          <li key={s.key}>
            <div className="flex items-center gap-2">
              <span className="w-32 shrink-0 text-xs text-text-2">{s.label}</span>
              <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2">
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${s.score * 10}%`, background: scoreColor(s.score) }} />
              </span>
              <span className="num w-7 text-right text-xs font-medium" style={{ color: scoreColor(s.score) }}>{fmtScore(s.score)}</span>
              <span className="num w-9 text-right text-[10px] text-muted" title="Vikt i totalpoängen">{Math.round((s.weight / wsum) * 100)} %</span>
            </div>
            <p className={cn("mt-0.5 text-[11.5px] leading-snug text-muted", s.insufficient && "text-accent")}>
              {s.insufficient && <AlertCircle className="mr-1 inline h-3 w-3" />}
              {s.reason}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-border pt-2 text-[10.5px] text-muted">Horisont: {view.horizon}. Regelbaserad bedömning – ej råd. Vikterna ändras i Inställningar.</p>
    </div>
  );
}

/** Fem små staplar – en per delpoäng. */
export function SubScoreBars({ view }: { view: ScoreView }) {
  return (
    <span className="flex items-end gap-[3px]" aria-label="Delpoäng">
      {view.subs.map((s) => (
        <span key={s.key} title={`${s.label}: ${fmtScore(s.score)}${s.insufficient ? " (otillräcklig data)" : ""}`} className="relative h-6 w-1.5 overflow-hidden rounded-sm bg-panel-2">
          <span className="absolute inset-x-0 bottom-0 rounded-sm" style={{ height: `${s.score * 10}%`, background: s.insufficient ? "var(--border-strong)" : scoreColor(s.score) }} />
        </span>
      ))}
    </span>
  );
}
