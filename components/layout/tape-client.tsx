"use client";
import Link from "next/link";
import { LiveChange, LivePrice } from "@/components/live/live";

export interface TapeCell { symbol: string; label: string; price: number; changePct: number | null; change: number | null; isRate: boolean }

export function TapeClient({ cells }: { cells: TapeCell[] }) {
  const render = (hidden: boolean) => (
    <div className="flex items-center divide-x divide-border" aria-hidden={hidden || undefined}>
      {cells.map((c) => (
        <Link key={c.symbol} tabIndex={hidden ? -1 : undefined} href={`/aktie/${encodeURIComponent(c.symbol)}`} className="flex shrink-0 items-center gap-2 px-4 text-xs hover:bg-hover">
          <span className="font-medium text-text-2">{c.label}</span>
          <LivePrice symbol={c.symbol} initial={c.price} rate={c.isRate} className="text-text" />
          <LiveChange symbol={c.symbol} initial={c.changePct} initialAbs={c.change} rate={c.isRate} arrow={false} />
        </Link>
      ))}
    </div>
  );
  return (
    <div className="tape-mask group relative flex h-9 items-center overflow-hidden border-b border-border bg-bg-elev">
      <div className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused]">
        {render(false)}
        {render(true)}
      </div>
    </div>
  );
}
