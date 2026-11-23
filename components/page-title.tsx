import type { LoadStatus } from "@/lib/data/market-data";
import { Notice } from "@/components/ui/notice";

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function DataNotice({ status }: { status: LoadStatus[] }) {
  const failed = status.flatMap((s) => s.failed);
  const stale = status.reduce((n, s) => n + s.staleCount, 0);
  if (!failed.length && !stale) return null;
  return (
    <Notice kind="offline" title={failed.length ? "Viss data kunde inte hämtas" : "Visar cachad data"}>
      {stale > 0 && <>Hämtningen från Yahoo misslyckades för {stale} symbol(er); vi visar senast sparade data. </>}
      {failed.length > 0 && <>Saknas helt: {failed.join(", ")}. </>}
      Appen försöker igen automatiskt vid nästa sidladdning.
    </Notice>
  );
}
