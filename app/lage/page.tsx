import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Globe2, ListChecks, TrendingUp, ThumbsUp, ThumbsDown, ExternalLink, Target, Info } from "lucide-react";
import { analyzeAll } from "@/lib/engine";
import { evaluatePredictions } from "@/lib/evaluation";
import { buildBriefing, fmtAgo } from "@/lib/briefing";
import { toScoreView } from "@/lib/view-models";
import { getWeights } from "@/lib/settings";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/notice";
import { ScoreBadge } from "@/components/score/score-badge";
import { OutlookPill, SentimentDot } from "@/components/score/badges";
import { LiveChange, LivePrice } from "@/components/live/live";
import { RichText } from "@/components/rich-text";
import { PageTitle } from "@/components/page-title";
import { fmtDateTime, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RegimeGauge } from "@/components/regime-gauge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Läget idag" };

const ICONS = { market: BarChart3, news: Globe2, list: ListChecks, outlook: TrendingUp } as const;

export default async function LagePage() {
  const a = await analyzeAll();
  const b = buildBriefing(a);
  const ev = await evaluatePredictions().catch(() => null);
  const weights = getWeights();
  const sectorsInList = new Set(a.stocks.map((s) => s.item.sector));
  const date = new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Stockholm" });

  return (
    <div className="space-y-6">
      <PageTitle
        title="Läget idag"
        subtitle={`${date.charAt(0).toUpperCase() + date.slice(1)} · Vad ser bra och dåligt ut – och vad säger nyheterna?`}
        right={<span className="text-[11px] text-muted">Analys {fmtDateTime(a.generatedAt)} · Källor: Yahoo Finance, Google News, SVT, BBC, NYT</span>}
      />
      {(a.status.failed.length > 0 || a.world.failedSources.length > 0) && (
        <Notice kind="offline" title="Viss data saknas">
          {a.status.failed.length > 0 && <>Kurser saknas för {a.status.failed.join(", ")}. </>}
          {a.world.failedSources.length > 0 && <>Nyhetskällor som inte svarade: {a.world.failedSources.join(", ")}. </>}
          Resten av analysen bygger på den data som finns.
        </Notice>
      )}

      {/* Sammanfattning */}
      <Card className={cn("overflow-hidden border-l-4", b.tone === "good" ? "border-l-[var(--up)]" : b.tone === "bad" ? "border-l-[var(--down)]" : "border-l-[var(--accent)]")}>
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_340px]">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">Dagens sammanfattning</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{b.headline}</h2>
            <ul className="mt-4 space-y-3">
              {b.bullets.map((x, i) => {
                const Icon = ICONS[x.icon];
                return (
                  <li key={i} className="flex gap-3 text-[14.5px] leading-relaxed text-text-2">
                    <Icon className="mt-1 h-4 w-4 shrink-0 text-accent" />
                    <span><RichText text={x.text} /></span>
                  </li>
                );
              })}
            </ul>
          </div>
          <RegimeGauge regime={a.market.regime} score={a.market.regimeScore} rules={a.market.rules} />
        </div>
      </Card>

      {/* Bra / dåligt */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2 text-up"><ThumbsUp className="h-4 w-4" /> Ser bra ut</span>} subtitle="Högst totalpoäng i din bevakningslista (5,5 eller mer)" />
          <CardBody className="px-2 pb-3">
            {b.strong.length === 0 ? <EmptyState title="Inget bolag når 5,5 just nu">Det betyder att signalerna är blandade – ett gott skäl att vänta.</EmptyState> : (
              <ul className="divide-y divide-border">
                {b.strong.map((s) => <GoodBadRow key={s.item.ticker} s={s} why={s.comp.pros[0] ?? s.comp.subs.technical.reason} good weights={weights} />)}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2 text-down"><ThumbsDown className="h-4 w-4" /> Ser svagt ut</span>} subtitle="Lägst totalpoäng (under 5)" />
          <CardBody className="px-2 pb-3">
            {b.weak.length === 0 ? <EmptyState title="Inga svaga bolag just nu">Alla bolag i listan har poäng 5 eller högre.</EmptyState> : (
              <ul className="divide-y divide-border">
                {b.weak.map((s) => <GoodBadRow key={s.item.ticker} s={s} why={s.comp.cons[0] ?? s.comp.subs.technical.reason} weights={weights} />)}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Prognoser */}
      <Card>
        <CardHeader
          title="Prognos – närmaste 1–4 veckorna"
          subtitle="Regelbaserad utsikt: 50 % bolagets nyheter, 25 % världsnyheter för sektorn, 25 % kortsiktigt momentum. Sorterad från mest positiv till mest negativ."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-y border-border text-left text-[11px] tracking-wide text-muted uppercase">
              <tr>
                <th className="py-2 pl-5 font-medium">Bolag</th>
                <th className="px-3 py-2 font-medium">Utsikt</th>
                <th className="px-3 py-2 font-medium">Säkerhet</th>
                <th className="px-3 py-2 font-medium">Varför</th>
                <th className="px-3 py-2 font-medium">Viktigaste rubriken</th>
                <th className="py-2 pr-5 text-right font-medium">Idag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {b.outlooks.map((s) => (
                <tr key={s.item.ticker} className="align-top hover:bg-hover/50">
                  <td className="py-3 pl-5">
                    <Link href={`/aktie/${encodeURIComponent(s.item.ticker)}`} className="font-medium hover:text-accent">{s.item.name}</Link>
                    <div className="num text-[11px] text-muted">{s.item.ticker}</div>
                  </td>
                  <td className="px-3 py-3"><OutlookPill dir={s.outlook.dir} label={s.outlook.label} /></td>
                  <td className="px-3 py-3"><Confidence level={s.outlook.confidence} /></td>
                  <td className="max-w-[340px] px-3 py-3 text-[12.5px] leading-snug text-text-2">{s.outlook.summary}</td>
                  <td className="max-w-[300px] px-3 py-3 text-[12.5px] leading-snug">
                    {s.outlook.keyHeadline ? (
                      <a href={s.outlook.keyHeadline.link} target="_blank" rel="noreferrer" className="group flex gap-2">
                        <SentimentDot s={s.outlook.keyHeadline.sentiment} />
                        <span><span className="text-text-2 group-hover:text-text group-hover:underline">{s.outlook.keyHeadline.title}</span> <span className="text-[11px] text-muted">· {s.outlook.keyHeadline.source}, {fmtAgo(s.outlook.keyHeadline.published)}</span></span>
                      </a>
                    ) : <span className="text-muted">Inga rubriker</span>}
                  </td>
                  <td className="py-3 pr-5 text-right">
                    {s.snap && <><LivePrice symbol={s.item.ticker} initial={s.snap.price} className="block" /><LiveChange symbol={s.item.ticker} initial={s.snap.changePct} className="text-xs" /></>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Världsteman */}
      <section>
        <div className="mb-3">
          <h2 className="text-[13px] font-semibold tracking-wide uppercase">Världsnyheter – vad kan de betyda?</h2>
          <p className="mt-0.5 text-xs text-muted">Mest omskrivna teman senaste veckan, deras ton och vilka sektorer i din lista som kan påverkas.</p>
        </div>
        {b.themes.length === 0 ? <EmptyState title="Inga världsnyheter just nu">Nyhetskällorna svarade inte. Försök igen om en stund.</EmptyState> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {b.themes.slice(0, 6).map((t) => {
              const affected = t.sectors.filter((s) => sectorsInList.has(s));
              const stocks = a.stocks.filter((s) => affected.includes(s.item.sector)).slice(0, 6);
              const tone = t.tone > 0.08 ? 1 : t.tone < -0.08 ? -1 : 0;
              return (
                <Card key={t.id} className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{t.label}</p>
                      <p className="text-[11px] text-muted">{t.count} rubriker senaste veckan</p>
                    </div>
                    <OutlookPill dir={tone} label={tone > 0 ? "Positiv ton" : tone < 0 ? "Negativ ton" : "Neutral ton"} size="sm" />
                  </div>
                  <p className="mt-3 text-[12.5px] text-text-2">
                    {affected.length
                      ? <>Kan påverka <b className="font-medium text-text">{affected.join(", ").toLowerCase()}</b>{tone !== 0 ? <> – {tone > 0 ? "medvind" : "motvind"}.</> : "."}</>
                      : <>Påverkar inga sektorer i din lista direkt.</>}
                  </p>
                  {stocks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {stocks.map((s) => <Link key={s.item.ticker} href={`/aktie/${encodeURIComponent(s.item.ticker)}`} className="rounded border border-border px-1.5 py-0.5 text-[11px] text-text-2 hover:border-border-strong hover:text-text">{s.item.name}</Link>)}
                    </div>
                  )}
                  <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                    {t.top.slice(0, 3).map((n) => (
                      <li key={n.id}>
                        <a href={n.link} target="_blank" rel="noreferrer" className="group flex gap-2 text-[12px] leading-snug">
                          <SentimentDot s={n.sentiment} />
                          <span className="text-text-2 group-hover:text-text group-hover:underline">{n.title} <span className="text-muted">· {n.source}</span></span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Rubriker att hålla koll på" subtitle="Bolagsnyheter senaste 3 dagarna med tydligast ton" />
          <CardBody>
            {b.hotHeadlines.length === 0 ? <EmptyState title="Inga starka rubriker just nu">Inga bolagsnyheter med tydligt positiv eller negativ ton senaste 3 dagarna.</EmptyState> : (
              <ul className="space-y-3">
                {b.hotHeadlines.map(({ item, stock }) => (
                  <li key={item.id + stock.item.ticker} className="flex gap-3">
                    <SentimentDot s={item.sentiment} />
                    <div className="min-w-0">
                      <a href={item.link} target="_blank" rel="noreferrer" className="text-[13.5px] leading-snug text-text hover:underline">{item.title} <ExternalLink className="inline h-3 w-3 text-muted" /></a>
                      <p className="mt-0.5 text-[11px] text-muted">
                        <Link href={`/aktie/${encodeURIComponent(stock.item.ticker)}`} className="text-text-2 hover:text-accent">{stock.item.name}</Link> · {item.source} · {fmtAgo(item.published)}
                        {item.hits.length > 0 && <> · ord: {item.hits.slice(0, 3).join(", ")}</>}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[11px] text-muted">Tonen (grön/röd prick) räknas fram med en ordlista – en grov uppskattning som kan missa ironi och sammanhang.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> Hur träffsäkra är prognoserna?</span>} subtitle="Mäts automatiskt 5 handelsdagar efter varje prognos" />
          <CardBody>
            {!ev || ev.evaluated === 0 ? (
              <div className="space-y-3 text-[13px] leading-relaxed text-text-2">
                <p>Prognoserna sparas varje dag{ev?.firstDate ? ` sedan ${ev.firstDate}` : " från och med idag"}. När 5 handelsdagar har gått börjar appen jämföra prognos mot verklig kursutveckling.</p>
                <p className="text-muted">Väntar på utfall: <span className="num text-text">{ev?.pending ?? 0}</span> prognoser.</p>
                <Notice kind="info" title="Varför vänta?">Utan facit går det inte att veta om prognoserna är bättre än slumpen. Det här är det ärliga sättet att ta reda på det.</Notice>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="num text-3xl font-semibold">{fmtNumber(ev.hitRate, 0)} %</p>
                  <p className="text-xs text-muted">träffsäkerhet på {ev.evaluated} utvärderade prognoser ({ev.pending} väntar). Slumpen ger ungefär 50 %.</p>
                </div>
                <table className="w-full text-[12.5px]">
                  <thead className="text-left text-[10.5px] text-muted uppercase"><tr><th className="pb-1 font-medium">Utsikt</th><th className="pb-1 text-right font-medium">Antal</th><th className="pb-1 text-right font-medium">Snittavk. 5 d</th><th className="pb-1 text-right font-medium">Träff</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {ev.byDir.map((d) => (
                      <tr key={d.dir}><td className="py-1.5"><OutlookPill dir={d.dir} label={d.label} size="sm" /></td><td className="num text-right">{d.n}</td><td className={cn("num text-right", (d.avgReturn ?? 0) > 0 ? "text-up" : (d.avgReturn ?? 0) < 0 ? "text-down" : "")}>{d.avgReturn == null ? "–" : `${d.avgReturn > 0 ? "+" : ""}${fmtNumber(d.avgReturn, 2)} %`}</td><td className="num text-right">{d.hitRate == null ? "–" : `${fmtNumber(d.hitRate, 0)} %`}</td></tr>
                    ))}
                  </tbody>
                </table>
                {ev.evaluated < 60 && <p className="text-[11px] text-accent">Under ca 60 utvärderade prognoser är resultatet till stor del slump.</p>}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="flex gap-3 rounded-xl border border-border bg-panel-2/50 p-4 text-[12px] leading-relaxed text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <b className="text-text-2">Så fungerar det:</b> allt räknas fram med fasta regler i koden – inga AI-tjänster. Poängen (1–10) väger ihop teknik, fundamenta, nyheter, makro och bolagshändelser.
          Prognosen är en grov utsikt för de närmaste veckorna och kan ofta vara fel. Det här är inte finansiell rådgivning.
        </p>
      </div>
    </div>
  );
}

function GoodBadRow({ s, why, good, weights }: { s: import("@/lib/engine").StockAnalysis; why: string; good?: boolean; weights: ReturnType<typeof getWeights> }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <ScoreBadge view={toScoreView(s, weights)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/aktie/${encodeURIComponent(s.item.ticker)}`} className="truncate text-sm font-medium hover:text-accent">{s.item.name}</Link>
          <OutlookPill dir={s.outlook.dir} label={s.outlook.label} size="sm" />
        </div>
        <p className={cn("mt-0.5 line-clamp-2 text-[12px] leading-snug", good ? "text-text-2" : "text-text-2")}>{why}</p>
      </div>
      {s.snap && (
        <div className="w-24 shrink-0 text-right">
          <LivePrice symbol={s.item.ticker} initial={s.snap.price} className="block text-sm" />
          <LiveChange symbol={s.item.ticker} initial={s.snap.changePct} className="text-[11px]" />
        </div>
      )}
    </li>
  );
}

function Confidence({ level }: { level: string }) {
  const n = level === "Hög" ? 3 : level === "Medel" ? 2 : 1;
  return (
    <span className="flex items-center gap-1.5 text-xs text-text-2" title="Hur mycket data och hur eniga signalerna är">
      <span className="flex gap-0.5">{[1, 2, 3].map((i) => <span key={i} className={cn("h-2.5 w-1.5 rounded-sm", i <= n ? "bg-accent" : "bg-panel-2")} />)}</span>
      {level}
    </span>
  );
}
