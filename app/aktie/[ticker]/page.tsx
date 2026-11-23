import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, ShoppingCart, Star, Gauge, ThumbsUp, Newspaper } from "lucide-react";
import { getDailyHistory } from "@/lib/data/yahoo";
import { makeSnapshot } from "@/lib/data/snapshot";
import { findWatchItem } from "@/lib/watchlist";
import { MARKETS } from "@/lib/markets";
import { avanzaUrl, yahooUrl, googleNewsUrl } from "@/lib/links";
import { PriceChart } from "@/components/charts/price-chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Change } from "@/components/ui/change";
import { EmptyState, Notice } from "@/components/ui/notice";
import { fmtCompact, fmtNumber, fmtPct, fmtPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ ticker: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ticker } = await params;
  return { title: decodeURIComponent(ticker).toUpperCase() };
}

export default async function StockPage({ params }: Params) {
  const ticker = decodeURIComponent((await params).ticker).toUpperCase();
  if (!/^[\^A-Z0-9.\-=]{1,25}$/.test(ticker)) notFound();

  let res;
  try {
    res = await getDailyHistory(ticker);
  } catch (e) {
    return (
      <div className="mx-auto max-w-xl pt-16">
        <EmptyState title={`Kunde inte hämta ${ticker}`}>
          Yahoo Finance svarade inte eller tickern finns inte. Svenska aktier slutar på <span className="num">.ST</span> (t.ex. VOLV-B.ST).
          <br /><span className="text-[11px] opacity-70">{(e as Error).message}</span>
        </EmptyState>
      </div>
    );
  }
  const h = res.data;
  if (!h.bars.length) notFound();
  const s = makeSnapshot(h);
  const watch = findWatchItem(ticker);
  const market = MARKETS.find((m) => m.symbol === ticker);
  const name = watch?.name ?? market?.label ?? h.name;
  const isStock = !market;
  const volRatio = s.volume && s.avgVolume20 ? s.volume / s.avgVolume20 : null;

  return (
    <div className="space-y-5">
      {res.stale && (
        <Notice kind="offline" title="Visar cachad kursdata">Den senaste hämtningen misslyckades ({res.error}). Datan nedan är från senaste lyckade hämtning.</Notice>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="num">{ticker}</span><span>·</span><span>{h.exchange}</span>
            {watch && <><span>·</span><Badge>{watch.sector}</Badge></>}
            {!watch && isStock && <Badge tone="outline">Ej i bevakningslistan</Badge>}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{name}</h1>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="num text-3xl font-medium">{fmtPrice(s.price)}</span>
            <span className="text-sm text-muted">{h.currency}</span>
            <Change value={s.changePct} pill className="text-sm" />
            {s.change != null && <span className="num text-sm text-muted">{s.change > 0 ? "+" : ""}{fmtNumber(s.change, 2)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStock && (
            <Button asChild variant="primary">
              <a href={avanzaUrl(watch?.name ?? h.name)} target="_blank" rel="noreferrer">Öppna på Avanza <ExternalLink className="h-3.5 w-3.5" /></a>
            </Button>
          )}
          <Button disabled title="Kommer i fas 6 (Min portfölj)"><ShoppingCart className="h-4 w-4" /> Låtsasköp</Button>
          {isStock && <Button disabled title="Redigerbar bevakningslista kommer i fas 2"><Star className="h-4 w-4" /> {watch ? "Bevakas" : "Lägg till i bevakning"}</Button>}
          <Button asChild variant="ghost"><a href={yahooUrl(ticker)} target="_blank" rel="noreferrer">Yahoo <ExternalLink className="h-3.5 w-3.5" /></a></Button>
        </div>
      </div>

      <Card className="pt-4">
        <PriceChart symbol={ticker} currency={h.currency} gmtoffset={h.gmtoffset} daily={h.bars} fetchedAt={res.fetchedAt} stale={res.stale} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Kursstatistik" subtitle="Beräknat från daglig kurshistorik" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-0 sm:grid-cols-3">
              <Stat label="Öppning" value={fmtPrice(s.open)} />
              <Stat label="Dagens högsta" value={fmtPrice(s.dayHigh)} />
              <Stat label="Dagens lägsta" value={fmtPrice(s.dayLow)} />
              <Stat label="52 v högsta" value={fmtPrice(s.high52)} />
              <Stat label="52 v lägsta" value={fmtPrice(s.low52)} />
              <Stat label="Från 52 v högsta" value={fmtPct(s.fromHigh52Pct, 1)} />
              <Stat label="Volym" value={fmtCompact(s.volume)} />
              <Stat label="Snittvolym 20 d" value={fmtCompact(s.avgVolume20)} />
              <Stat label="Volym mot snitt" value={volRatio ? `${volRatio.toLocaleString("sv-SE", { maximumFractionDigits: 2 })}×` : "–"} />
              <Stat label="1 månad" value={<Change value={s.ret1m} decimals={1} />} />
              <Stat label="3 månader" value={<Change value={s.ret3m} decimals={1} />} />
              <Stat label="6 månader" value={<Change value={s.ret6m} decimals={1} />} />
              <Stat label="1 år" value={<Change value={s.ret1y} decimals={1} />} />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Poängkort" subtitle="Delpoäng 1–10 med motivering" />
          <CardBody>
            <EmptyState icon={Gauge} title="Aktiveras i fas 2">
              Teknik, fundamenta, nyheter, makro och bolagshändelser poängsätts här – varje poäng får en kodgenererad motivering.
            </EmptyState>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Talar för / emot" />
          <CardBody>
            <EmptyState icon={ThumbsUp} title="Aktiveras i fas 2">Genereras automatiskt från delpoängen.</EmptyState>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Nyheter"
            right={<a className="flex items-center gap-1 text-xs text-accent hover:underline" href={googleNewsUrl(`"${watch?.searchName ?? h.name}"`)} target="_blank" rel="noreferrer">Google Nyheter <ExternalLink className="h-3 w-3" /></a>}
          />
          <CardBody>
            <EmptyState icon={Newspaper} title="Aktiveras i fas 3">Rubriker med sentimentfärg och länk till källan.</EmptyState>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="num text-text">{value}</dd>
    </div>
  );
}
