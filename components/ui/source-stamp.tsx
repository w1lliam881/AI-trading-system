import { fmtDateTime } from "@/lib/format";

/** Källa + tidsstämpel som visas i hörnet på grafer och tabeller. */
export function SourceStamp({ source, at, stale }: { source: string; at?: number | null; stale?: boolean }) {
  return (
    <span className="text-[10.5px] text-muted">
      Källa: {source}
      {at ? ` · ${fmtDateTime(at)}` : ""}
      {stale ? " · cachad" : ""}
    </span>
  );
}
