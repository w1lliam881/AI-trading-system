import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, ShoppingCart, Newspaper, CalendarDays, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import { getDailyHistory } from "@/lib/data/yahoo";
import { analyzeTicker, scoreHistory } from "@/lib/engine";
import { toScoreView } from "@/lib/view-models";
import { MARKETS } from "@/lib/markets";
import { avanzaUrl, yahooUrl, googleNewsUrl, newsQuery } from "@/lib/links";
import { FUND_LABELS, type FundKey } from "@/lib/analysis/fundamental";
import { SUB_ORDER } from "@/lib/analysis/types";
import { fmtAgo } from "@/lib/briefing";
import { PriceChart, type ChartMarker } from "@/components/charts/price-chart";
import { ScoreHistoryChart } from "@/components/charts/score-history";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Change } from "@/components/ui/change";
import { EmptyState, Notice } from "@/components/ui/notice";
import { ScoreBadge } from "@/components/score/score-badge";
import { DirectionBadge, LevelBadge, OutlookPill, SentimentDot } from "@/components/score/badges";
import { fmtScore, scoreColor } from "@/components/score/score-utils";
import { LiveChange, LiveChangeAbs, LivePrice } from "@/components/live/live";
import { WatchButton } from "@/components/watch-button";
import { fmtCompact, fmtNumber, fmtPct, fmtPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const market = MARKETS.find((m) => m.symbol === ticker);
  const isStock = !market;
  const { analysis: a } = isStock ? await analyzeTicker(ticker, h) : { analysis: null };
  const s = a?.snap;
  const name = a?.item.name ?? market?.label ?? h.name;
  const volRatio = s?.volume && s?.avgVolume20 ? s.volume / s.avgVolume20 : null;
  const history = isStock ? scoreHistory(ticker) : [];

  const markers: ChartMarker[] = a
    ? [
        ...a.news.filter((n) => Math.abs(n.sentiment) >= 0.33).map((n) => ({ t: Math.floor(n.published / 1000), kind: "news" as const, text: n.title, tone: n.sentiment })),
        ...a.events.filter((e) => !e.future && e.kind !== "gap").map((e) => ({ t: Math.floor(e.date / 1000), kind: e.kind as "report" | "dividend", text: e.title })),
      ]
    : [];

  return (
    <div className="space-y-5">
      {res.stale && <Notice kind="offline" title="Visar cachad kursdata">Den senaste hämtningen misslyckades ({res.error}). Datan nedan är från senaste lyckade hämtning.</Notice>}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          {a && <ScoreBadge view={toScoreView(a)} size="lg" showLink={false} />}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="num">{ticker}</span><span>·</span><span>{h.exchange}</span>
              {a && <><span>·</span><Badge>{a.item.sector}</Badge></>}
              {a && <DirectionBadge d={a.comp.direction} />}
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{name}</h1>
            <div className="mt-2 flex items-baseline gap-3">
              <LivePrice symbol={ticker} initial={h.price} rate={market?.isRate} className="text-3xl font-medium" />
              <span className="text-sm text-muted">{h.currency}</span>
              <LiveChange symbol={ticker} initial={s?.changePct ?? null} pill className="text-sm" />
              <LiveChangeAbs symbol={ticker} initial={s?.change ?? null} className="text-sm text-muted" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {isStock && (
            <Button asChild variant="primary">
              <a href={avanzaUrl(a?.item.name ?? h.name)} target="_blank" rel="noreferrer">Öppna på Avanza <ExternalLink className="h-3.5 w-3.5" /></a>
            </Button>
          )}
          {isStock && <Button disabled title="Kommer i fas 6 (Min portfölj)"><ShoppingCart className="h-4 w-4" /> Låtsasköp</Button>}
          {a && <WatchButton item={a.item} watching={a.inWatchlist} />}
          <Button asChild variant="ghost"><a href={yahooUrl(ticker)} target="_blank" rel="noreferrer">Yahoo <ExternalLink className="h-3.5 w-3.5" /></a></Button>
        </div>
      </div>

      <Card className="pt-4">
        <PriceChart symbol={ticker} currency={h.currency} gmtoffset={h.gmtoffset} daily={h.bars} fetchedAt={res.fetchedAt} stale={res.stale} markers={markers} />
      </Card>

      {a && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Poängkort */}
          <Card className="lg:row-span-2">
            <CardHeader title="Poängkort" subtitle="Klicka på en delpoäng för detaljer" />
            <CardBody>
              <div className="mb-4 flex flex-wrap gap-1.5">
                <Badge tone="outline">Horisont: {a.comp.horizon}</Badge>
                <LevelBadge kind="risk" level={a.comp.risk} />
                <LevelBadge kind="data" level={a.comp.confidence} />
              </div>
              <ul className="space-y-2">
                {SUB_ORDER.map((k) => {
                  const sub = a.comp.subs[k];
                  return (
                    <li key={k}>
                      <details className="group rounded-lg border border-border bg-panel-2/40 open:bg-panel-2/70">
                        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5">
                          <span className="num grid h-8 w-9 shrink-0 place-items-center rounded-md text-sm font-semibold" style={{ color: scoreColor(sub.score), background: `color-mix(in oklab, ${scoreColor(sub.score)} 15%, transparent)` }}>{fmtScore(sub.score)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{sub.label}</span>
                            <span className={cn("block text-[11.5px] leading-snug text-muted", sub.insufficient && "text-accent")}>
                              {sub.insufficient && <AlertCircle className="mr-1 inline h-3 w-3" />}{sub.reason}
                            </span>
                          </span>
                          <span className="text-xs text-muted transition-transform group-open:rotate-90">›</span>
                        </summary>
                        {sub.metrics.length > 0 && (
                          <dl className="border-t border-border px-3 py-2">
                            {sub.metrics.map((m) => (
                              <div key={m.label} className="flex justify-between gap-3 py-1 text-[12px]"><dt className="text-muted">{m.label}</dt><dd className="num text-right text-text-2">{m.value}</dd></div>
                            ))}
                          </dl>
                        )}
                      </details>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] text-muted">{a.comp.riskReason} {a.comp.confidenceReason}</p>
            </CardBody>
          </Card>

          {/* Prognos */}
          <Card>
            <CardHeader title="Prognos 1–4 veckor" subtitle="Regelbaserad utsikt från nyheter och momentum" right={<OutlookPill dir={a.outlook.dir} label={a.outlook.label} />} />
            <CardBody>
              <p className="text-[13.5px] leading-relaxed text-text-2">{a.outlook.summary}</p>
              <p className="mt-2 text-[11px] text-muted">Säkerhet: <b className="font-medium text-text-2">{a.outlook.confidence}</b>. Träffsäkerheten följs upp på sidan Läget idag.</p>
              {a.outlook.keyHeadline && (
                <a href={a.outlook.keyHeadline.link} target="_blank" rel="noreferrer" className="mt-3 flex gap-2 rounded-lg border border-border p-2.5 text-[12.5px] hover:border-border-strong">
                  <SentimentDot s={a.outlook.keyHeadline.sentiment} />
                  <span><span className="text-text">{a.outlook.keyHeadline.title}</span> <span className="text-muted">· {a.outlook.keyHeadline.source}</span></span>
                </a>
              )}
            </CardBody>
          </Card>

          {/* För / emot */}
          <Card>
            <CardHeader title="Talar för / emot" subtitle="Genererat från delpoängen" />
            <CardBody className="space-y-3">
              <ProCon items={a.comp.pros} good />
              <ProCon items={a.comp.cons} />
            </CardBody>
          </Card>

          {/* Nyckeltal */}
          <Card className="lg:col-span-2">
            <CardHeader title="Nyckeltal" subtitle={`Jämfört med snittet (median) för ${a.item.sector.toLowerCase()} i din bevakningslista`} />
            <CardBody>
              {!a.fund ? <EmptyState title="Nyckeltal saknas">Yahoo svarade inte med nyckeltal för det här bolaget.</EmptyState> : (
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] text-muted uppercase"><tr><th className="pb-2 font-medium">Nyckeltal</th><th className="pb-2 text-right font-medium">Bolaget</th><th className="pb-2 text-right font-medium">Sektorsnitt</th><th className="pb-2 text-right font-medium">Bedömning</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {(["pe", "ps", "debtToEquity", "netMargin", "revenueGrowth", "dividendYield"] as FundKey[]).map((k) => {
                      const v = a.fund![k]; const avg = a.sectorAvg[k];
                      const lowerBetter = k === "pe" || k === "ps" || k === "debtToEquity";
                      const better = v != null && avg != null ? (lowerBetter ? v < avg : v > avg) : null;
                      const fmt = (x: number | null | undefined) => x == null ? "–" : k === "pe" || k === "ps" || k === "debtToEquity" ? fmtNumber(x, 1) : k === "revenueGrowth" ? fmtPct(x, 1) : `${fmtNumber(x, 1)} %`;
                      return (
                        <tr key={k}>
                          <td className="py-2 text-text-2">{FUND_LABELS[k]}</td>
                          <td className="num py-2 text-right">{fmt(v)}</td>
                          <td className="num py-2 text-right text-muted">{fmt(avg)}</td>
                          <td className={cn("py-2 text-right text-xs", better === true ? "text-up" : better === false ? "text-down" : "text-muted")}>{better == null ? "–" : better ? "Bättre" : "Sämre"}</td>
                        </tr>
                      );
                    })}
                    <tr><td className="py-2 text-text-2">Börsvärde</td><td className="num py-2 text-right">{fmtCompact(a.fund.marketCap)} {a.fund.currency ?? ""}</td><td /><td /></tr>
                  </tbody>
                </table>
              )}
              <p className="mt-2 text-[11px] text-muted">Källa: Yahoo Finance (senaste 12 månader). Sektorsnitt kräver minst två andra bolag i samma sektor.</p>
            </CardBody>
          </Card>

          {/* Nyheter */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Nyheter"
              subtitle={a.newsStats ? `${a.newsStats.count14d} rubriker senaste 14 dagarna · ${a.newsStats.positives} positiva · ${a.newsStats.negatives} negativa (grov uppskattning)` : undefined}
              right={<a className="flex items-center gap-1 text-xs text-accent hover:underline" href={googleNewsUrl(newsQuery(a.item.searchName))} target="_blank" rel="noreferrer">Google Nyheter <ExternalLink className="h-3 w-3" /></a>}
            />
            <CardBody>
              {a.news.length === 0 ? <EmptyState icon={Newspaper} title="Inga nyheter hittades">Inga rubriker senaste 14 dagarna, eller så svarade inte nyhetskällan.</EmptyState> : (
                <ul className="max-h-[420px] space-y-2.5 overflow-y-auto pr-2">
                  {a.news.slice(0, 30).map((n) => (
                    <li key={n.id} className="flex gap-2.5">
                      <SentimentDot s={n.sentiment} />
                      <div className="min-w-0">
                        <a href={n.link} target="_blank" rel="noreferrer" className="text-[13px] leading-snug text-text hover:underline">{n.title}</a>
                        <p className="text-[11px] text-muted">{n.source} · {fmtAgo(n.published)}{n.hits.length > 0 && <> · <span className={n.sentiment > 0 ? "text-up" : n.sentiment < 0 ? "text-down" : ""}>{n.hits.slice(0, 3).join(", ")}</span></>}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Händelser */}
          <Card>
            <CardHeader title="Bolagshändelser" subtitle="Rapporter, utdelningar och stora kursrörelser" />
            <CardBody>
              {a.events.length === 0 ? <EmptyState icon={CalendarDays} title="Inga händelser">Inga stora kursrörelser eller kända datum.</EmptyState> : (
                <ul className="space-y-2">
                  {[...a.events].reverse().slice(0, 12).map((e, i) => (
                    <li key={i} className="flex items-start gap-3 text-[12.5px]">
                      <span className={cn("num w-20 shrink-0", e.future ? "text-accent" : "text-muted")}>{new Date(e.date).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "2-digit" })}</span>
                      <span className={cn("text-text-2", e.kind === "gap" && (e.move! > 0 ? "text-up" : "text-down"))}>
                        {e.title}{e.estimated && <span className="text-muted"> (uppskattat)</span>}{e.future && <Badge tone="accent" className="ml-1.5">kommande</Badge>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-muted">Rapportdatum uppskattas från senaste kvartalsslut (Yahoo kräver inloggning för exakta datum).</p>
            </CardBody>
          </Card>

          {/* Poänghistorik */}
          <Card className="lg:col-span-2">
            <CardHeader title="Poänghistorik" subtitle="Totalpoäng per dag" />
            <CardBody><ScoreHistoryChart data={history.map((x) => ({ date: x.date, total: x.total }))} /></CardBody>
          </Card>
        </div>
      )}

      {/* Kursstatistik */}
      {s && (
        <Card>
          <CardHeader title="Kursstatistik" subtitle="Beräknat från daglig kurshistorik" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Öppning" value={fmtPrice(s.open)} />
              <Stat label="Dagens högsta" value={fmtPrice(s.dayHigh)} />
              <Stat label="Dagens lägsta" value={fmtPrice(s.dayLow)} />
              <Stat label="Volym mot snitt" value={volRatio ? `${fmtNumber(volRatio, 2)}×` : "–"} />
              <Stat label="52 v högsta" value={fmtPrice(s.high52)} />
              <Stat label="52 v lägsta" value={fmtPrice(s.low52)} />
              <Stat label="Från 52 v högsta" value={fmtPct(s.fromHigh52Pct, 1)} />
              <Stat label="Volatilitet (år)" value={a?.tech?.volatility != null ? `${fmtNumber(a.tech.volatility, 0)} %` : "–"} />
              <Stat label="1 månad" value={<Change value={s.ret1m} decimals={1} />} />
              <Stat label="3 månader" value={<Change value={s.ret3m} decimals={1} />} />
              <Stat label="6 månader" value={<Change value={s.ret6m} decimals={1} />} />
              <Stat label="1 år" value={<Change value={s.ret1y} decimals={1} />} />
            </dl>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function ProCon({ items, good }: { items: string[]; good?: boolean }) {
  const Icon = good ? ThumbsUp : ThumbsDown;
  return (
    <div>
      <p className={cn("mb-1.5 flex items-center gap-1.5 text-xs font-semibold", good ? "text-up" : "text-down")}><Icon className="h-3.5 w-3.5" /> {good ? "Talar för" : "Talar emot"}</p>
      {items.length === 0 ? <p className="text-[12px] text-muted">Inget tydligt.</p> : (
        <ul className="space-y-1">
          {items.slice(0, 5).map((t) => <li key={t} className="flex gap-2 text-[12.5px] leading-snug text-text-2"><span className={good ? "text-up" : "text-down"}>•</span>{t}</li>)}
        </ul>
      )}
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
