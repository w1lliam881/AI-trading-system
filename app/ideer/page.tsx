import type { Metadata } from "next";
import { analyzeAll } from "@/lib/engine";
import { toIdeaRow } from "@/lib/view-models";
import { getWeights } from "@/lib/settings";
import { IdeasTable } from "@/components/ideas/ideas-table";
import { PageTitle } from "@/components/page-title";
import { Notice } from "@/components/ui/notice";
import { SourceStamp } from "@/components/ui/source-stamp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Idéer" };

export default async function IdeasPage() {
  const a = await analyzeAll();
  const w = getWeights();
  const rows = a.stocks.map((s) => toIdeaRow(s, w));
  return (
    <div className="space-y-5">
      <PageTitle
        title="Idéer"
        subtitle="Alla bolag i bevakningslistan med poäng 1–10. Klicka på en poäng för motivering, eller på en kolumnrubrik för att sortera."
        right={<SourceStamp source="Yahoo Finance, Google News" at={a.generatedAt} />}
      />
      {a.status.failed.length > 0 && <Notice kind="offline" title="Viss kursdata saknas">Kunde inte hämta: {a.status.failed.join(", ")}. Visar resten.</Notice>}
      <IdeasTable rows={rows} />
    </div>
  );
}
