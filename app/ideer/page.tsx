import type { Metadata } from "next";
import { getStockRows } from "@/lib/data/market-data";
import { IdeasTable } from "@/components/ideas/ideas-table";
import { PageTitle, DataNotice } from "@/components/page-title";
import { SourceStamp } from "@/components/ui/source-stamp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Idéer" };

export default async function IdeasPage() {
  const { rows, status } = await getStockRows();
  return (
    <div className="space-y-5">
      <PageTitle
        title="Idéer"
        subtitle="Alla bolag i bevakningslistan. Klicka på en kolumnrubrik för att sortera."
        right={<SourceStamp source="Yahoo Finance" at={status.fetchedAt} />}
      />
      <DataNotice status={[status]} />
      <IdeasTable rows={rows} />
    </div>
  );
}
