import Link from "next/link";
import { Globe2, Newspaper, Bot, ArrowRight } from "lucide-react";
import { getMarketRows, getStockRows } from "@/lib/data/market-data";
import { PageTitle, DataNotice } from "@/components/page-title";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/notice";
import { Sparkline } from "@/components/charts/sparkline";
import { Change } from "@/components/ui/change";
import { SourceStamp } from "@/components/ui/source-stamp";
import { fmtNumber, fmtPrice } from "@/lib/format";
import { stockPath } from "@/lib/links";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [markets, stocks] = await Promise.all([getMarketRows(), getStockRows()]);
  const indexRows = markets.rows.filter((m) => m.group === "Index");
  const movers = stocks.rows
    .filter((r) => r.snap?.changePct != null)
    .sort((a, b) => Math.abs(b.snap!.changePct!) - Math.abs(a.snap!.changePct!))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageTitle title="Översikt" subtitle="Marknaden just nu, dina bästa idéer och hur Botten går." />
      <DataNotice status={[markets.status, stocks.status]} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {indexRows.map((m) => (
          <Link key={m.symbol} href={stockPath(m.symbol)} className="group rounded-xl border border-border bg-panel p-4 transition-colors hover:border-border-strong animate-fade-up">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-2">{m.label}</span>
              <span className="text-[10px] text-muted">{m.region}</span>
            </div>
            {m.snap ? (
              <>
                <div className="num mt-2 text-xl font-medium tracking-tight">{fmtNumber(m.snap.price, m.snap.price > 1000 ? 0 : 2)}</div>
                <div className="mt-1 flex items-end justify-between">
                  <Change value={m.snap.changePct} className="text-xs" />
                  <Sparkline data={m.snap.spark} width={72} height={24} />
                </div>
              </>
            ) : <p className="mt-3 text-xs text-muted">Ingen data</p>}
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Topp 5 idéer"
            subtitle="Tillfälligt: dagens största rörelser i bevakningslistan. Poängsystemet (1–10) kopplas in i fas 2."
            right={<Link href="/ideer" className="flex items-center gap-1 text-xs text-accent hover:underline">Alla idéer <ArrowRight className="h-3 w-3" /></Link>}
          />
          <CardBody className="px-2 pb-3">
            {movers.length === 0 ? (
              <EmptyState title="Ingen kursdata ännu">Kursdata kunde inte hämtas. Kontrollera internetanslutningen och ladda om sidan.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {movers.map((r) => (
                  <li key={r.ticker}>
                    <Link href={stockPath(r.ticker)} className="flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-hover">
                      <span className="grid h-8 w-8 place-items-center rounded-md border border-border bg-panel-2 text-[10px] text-muted" title="Poäng kommer i fas 2">–</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.name}</span>
                        <span className="num block text-[11px] text-muted">{r.ticker} · {r.sector}</span>
                      </span>
                      <Sparkline data={r.snap!.spark} width={110} height={30} />
                      <span className="w-24 text-right">
                        <span className="num block text-sm">{fmtPrice(r.snap!.price)}</span>
                        <Change value={r.snap!.changePct} className="text-[11px]" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-3 pt-2 text-right"><SourceStamp source="Yahoo Finance" at={stocks.status.fetchedAt} /></div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Världsläget" subtitle="Risk-on / Neutral / Risk-off" />
          <CardBody>
            <EmptyState icon={Globe2} title="Aktiveras i fas 4">
              Här visas en regelbaserad mätare av marknadsläget (index mot 200-dagars medelvärde, VIX, räntor och kronan) samt trendande teman i världsnyheterna.
            </EmptyState>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Senaste nyheter" subtitle="Nyheter med ovanligt stor volym eller starkt sentiment" />
          <CardBody>
            <EmptyState icon={Newspaper} title="Aktiveras i fas 3">
              Rubriker från Google News RSS och pressmeddelanden, med en grov sentimentpoäng från en redigerbar ordlista.
            </EmptyState>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Botten i korthet" subtitle="Autonom låtsashandlare · 10 000 kr" />
          <CardBody>
            <EmptyState icon={Bot} title="Aktiveras i fas 5">
              Värde idag, utveckling sedan start och jämförelse mot OMXS30.
            </EmptyState>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
