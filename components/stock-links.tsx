import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { linksFor } from "@/lib/links";
import type { WatchItem } from "@/lib/watchlist";

/** [Avanza] [Graf] [Nyheter] [Yahoo] – små direktlänkar. */
export function StockLinks({ item }: { item: Pick<WatchItem, "ticker" | "name" | "searchName"> }) {
  const l = linksFor(item);
  const cls = "rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-text transition-colors";
  return (
    <span className="flex items-center gap-0.5">
      <a className={cls} href={l.avanza} target="_blank" rel="noreferrer" title="Öppna sökning på Avanza (ny flik)">Avanza</a>
      <Link className={cls} href={l.chart}>Graf</Link>
      <a className={cls} href={l.news} target="_blank" rel="noreferrer" title="Google Nyheter">Nyheter</a>
      <a className={`${cls} inline-flex items-center gap-0.5`} href={l.yahoo} target="_blank" rel="noreferrer">Yahoo<ExternalLink className="h-2.5 w-2.5" /></a>
    </span>
  );
}
