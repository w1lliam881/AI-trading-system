import { getMarketRows } from "@/lib/data/market-data";
import { TapeClient, type TapeCell } from "./tape-client";

/** Tickerband: startvärden från servern, sedan livekurser i webbläsaren. */
export async function TickerTape() {
  const { rows } = await getMarketRows();
  const cells: TapeCell[] = rows
    .filter((r) => r.snap)
    .map((r) => ({ symbol: r.symbol, label: r.label, price: r.snap!.price, changePct: r.snap!.changePct, change: r.snap!.change, isRate: !!r.isRate }));
  if (!cells.length) {
    return <div className="flex h-9 items-center border-b border-border px-5 text-xs text-muted">Marknadsdata kunde inte hämtas just nu – försöker igen vid nästa sidladdning.</div>;
  }
  return <TapeClient cells={cells} />;
}

export function TickerTapeSkeleton() {
  return (
    <div className="flex h-9 items-center gap-6 overflow-hidden border-b border-border bg-bg-elev px-5">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-3 w-28 shrink-0" />)}
    </div>
  );
}
