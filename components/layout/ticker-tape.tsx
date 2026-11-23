import Link from "next/link";
import { getMarketRows } from "@/lib/data/market-data";
import { fmtNumber, fmtPrice, changeTone } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Tickerband med index, valutor, råvaror, VIX och ränta. Server-komponent. */
export async function TickerTape() {
  const { rows } = await getMarketRows();
  const items = rows.filter((r) => r.snap);
  if (!items.length) {
    return <div className="flex h-9 items-center border-b border-border px-5 text-xs text-muted">Marknadsdata kunde inte hämtas just nu – försöker igen vid nästa sidladdning.</div>;
  }
  const cells = items.map((r) => {
    const s = r.snap!;
    // Räntor: visa förändring i procentenheter (t.ex. +0,05) i stället för %.
    const delta = r.isRate ? s.change : s.changePct;
    const tone = changeTone(delta);
    return (
      <Link
        key={r.symbol}
        href={`/aktie/${encodeURIComponent(r.symbol)}`}
        className="flex shrink-0 items-center gap-2 px-4 text-xs hover:bg-hover"
      >
        <span className="font-medium text-text-2">{r.label}</span>
        <span className="num text-text">{r.isRate ? `${fmtNumber(s.price, 2)} %` : fmtPrice(s.price)}</span>
        <span className={cn("num", tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-muted")}>
          {delta == null ? "–" : `${delta > 0 ? "+" : ""}${fmtNumber(delta, 2)}${r.isRate ? "" : " %"}`}
        </span>
      </Link>
    );
  });
  return (
    <div className="tape-mask group relative flex h-9 items-center overflow-hidden border-b border-border bg-bg-elev">
      <div className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused]">
        <div className="flex items-center divide-x divide-border">{cells}</div>
        <div className="flex items-center divide-x divide-border" aria-hidden>{cells}</div>
      </div>
    </div>
  );
}

export function TickerTapeSkeleton() {
  return (
    <div className="flex h-9 items-center gap-6 overflow-hidden border-b border-border bg-bg-elev px-5">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-3 w-28 shrink-0" />)}
    </div>
  );
}
