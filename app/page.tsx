import Link from "next/link";
import { Bot, ArrowRight, Newspaper } from "lucide-react";
import { analyzeAll } from "@/lib/engine";
import { buildBriefing, fmtAgo } from "@/lib/briefing";
import { toScoreView } from "@/lib/view-models";
import { getWeights } from "@/lib/settings";
import { MARKETS } from "@/lib/markets";
import { PageTitle } from "@/components/page-title";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/notice";
import { Sparkline } from "@/components/charts/sparkline";
import { SourceStamp } from "@/components/ui/source-stamp";
import { ScoreBadge } from "@/components/score/score-badge";
import { OutlookPill, SentimentDot } from "@/components/score/badges";
import { LiveChange, LivePrice } from "@/components/live/live";
import { RegimeGauge } from "@/components/regime-gauge";
import { RichText } from "@/components/rich-text";
import { stockPath } from "@/lib/links";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const a = await analyzeAll();
  const b = buildBriefing(a);
  const w = getWeights();
  const indexRows = MARKETS.filter((m) => m.group === "Index");
  const top = [...a.stocks].filter((s) => s.snap).sort((x, y) => y.comp.total - x.comp.total).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageTitle title="Översikt" subtitle="Marknaden just nu, dina bästa idéer och vad nyheterna säger." />
      {a.status.failed.length > 0 && <Notice kind="offline" title="Viss data kunde inte hämtas">Saknas: {a.status.failed.join(", ")}. Appen försöker igen automatiskt.</Notice>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {indexRows.map((m) => {
          const s = a.marketSnaps[m.symbol];
          return (
            <Link key={m.symbol} href={stockPath(m.symbol)} className="group rounded-xl border border-border bg-panel p-4 transition-colors hover:border-border-strong animate-fade-up">
              <div className="flex items-center justify-between"><span className="text-xs font-medium text-text-2">{m.label}</span><span className="text-[10px] text-muted">{m.region}</span></div>
              {s ? (
                <>
                  <LivePrice symbol={m.symbol} initial={s.price} className="mt-2 block text-xl font-medium tracking-tight" />
                  <div className="mt-1 flex items-end justify-between"><LiveChange symbol={m.symbol} initial={s.changePct} className="text-xs" /><Sparkline data={s.spark} width={72} height={24} /></div>
                </>
              ) : <p className="mt-3 text-xs text-muted">Ingen data</p>}
            </Link>
          );
        })}
      </section>

      <Link href="/lage" className={cn("group block rounded-xl border border-border border-l-4 bg-panel p-5 transition-colors hover:border-border-strong animate-fade-up", b.tone === "good" ? "border-l-[var(--up)]" : b.tone === "bad" ? "border-l-[var(--down)]" : "border-l-[var(--accent)]")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Läget idag</p>
            <p className="mt-1 text-lg font-semibold">{b.headline}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-text-2"><RichText text={b.bullets[0].text} /> <RichText text={b.bullets[3].text} /></p>
          </div>
          <span className="flex items-center gap-1 text-sm text-accent group-hover:underline">Läs dagens läge <ArrowRight className="h-4 w-4" /></span>
        </div>
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Topp 5 idéer" subtitle="Högst totalpoäng just nu. Klicka på poängen för motivering." right={<Link href="/ideer" className="flex items-center gap-1 text-xs text-accent hover:underline">Alla idéer <ArrowRight className="h-3 w-3" /></Link>} />
          <CardBody className="px-2 pb-3">
            {top.length === 0 ? <EmptyState title="Ingen kursdata ännu">Kursdata kunde inte hämtas. Kontrollera internetanslutningen och ladda om sidan.</EmptyState> : (
              <ul className="divide-y divide-border">
                {top.map((s) => (
                  <li key={s.item.ticker} className="flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-hover/60">
                    <ScoreBadge view={toScoreView(s, w)} />
                    <Link href={stockPath(s.item.ticker)} className="min-w-0 flex-1">
                      <span className="flex items-center gap-2"><span className="truncate text-sm font-medium hover:text-accent">{s.item.name}</span><OutlookPill dir={s.outlook.dir} label={s.outlook.label} size="sm" /></span>
                      <span className="block truncate text-[11.5px] text-muted">{s.comp.pros[0] ?? s.comp.subs.technical.reason}</span>
                    </Link>
                    <Sparkline data={s.snap!.spark} width={100} height={30} />
                    <span className="w-24 text-right">
                      <LivePrice symbol={s.item.ticker} initial={s.snap!.price} className="block text-sm" />
                      <LiveChange symbol={s.item.ticker} initial={s.snap!.changePct} className="text-[11px]" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-3 pt-2 text-right"><SourceStamp source="Yahoo Finance" at={a.generatedAt} /></div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Världsläget" subtitle="Regelbaserat marknadsläge" right={<Link href="/lage" className="text-xs text-accent hover:underline">Mer</Link>} />
          <CardBody className="space-y-4">
            <RegimeGauge regime={a.market.regime} score={a.market.regimeScore} rules={a.market.rules} />
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted uppercase">Trendande teman</p>
              <ul className="space-y-1.5">
                {a.market.themes.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-text-2">{t.label}</span>
                    <span className="flex items-center gap-2"><span className="num text-muted">{t.count}</span><OutlookPill dir={t.tone > 0.08 ? 1 : t.tone < -0.08 ? -1 : 0} label={t.tone > 0.08 ? "Pos" : t.tone < -0.08 ? "Neg" : "Neu"} size="sm" /></span>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Senaste nyheter" subtitle="Bolagsnyheter med tydligast ton senaste 3 dagarna" />
          <CardBody>
            {b.hotHeadlines.length === 0 ? <EmptyState icon={Newspaper} title="Inga starka rubriker just nu" /> : (
              <ul className="space-y-2.5">
                {b.hotHeadlines.slice(0, 6).map(({ item, stock }) => (
                  <li key={item.id + stock.item.ticker} className="flex gap-2.5">
                    <SentimentDot s={item.sentiment} />
                    <div className="min-w-0">
                      <a href={item.link} target="_blank" rel="noreferrer" className="text-[13px] leading-snug hover:underline">{item.title}</a>
                      <p className="text-[11px] text-muted"><Link className="text-text-2 hover:text-accent" href={stockPath(stock.item.ticker)}>{stock.item.name}</Link> · {item.source} · {fmtAgo(item.published)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Botten i korthet" subtitle="Autonom låtsashandlare · 10 000 kr" />
          <CardBody><EmptyState icon={Bot} title="Aktiveras i fas 5">Värde idag, utveckling sedan start och jämförelse mot OMXS30.</EmptyState></CardBody>
        </Card>
      </div>
    </div>
  );
}
