import { changeTone, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Procentförändring i grönt/rött/grått med pil. */
export function Change({ value, className, decimals = 2, pill = false }: { value: number | null | undefined; className?: string; decimals?: number; pill?: boolean }) {
  const tone = changeTone(value);
  return (
    <span
      className={cn(
        "num whitespace-nowrap",
        tone === "up" && "text-up",
        tone === "down" && "text-down",
        tone === "flat" && "text-flat",
        pill && "rounded-md px-1.5 py-0.5",
        pill && tone === "up" && "bg-up-soft",
        pill && tone === "down" && "bg-down-soft",
        pill && tone === "flat" && "bg-panel-2",
        className,
      )}
    >
      {tone === "up" ? "▲ " : tone === "down" ? "▼ " : ""}
      {fmtPct(value == null ? value : Math.abs(value), decimals, false)}
    </span>
  );
}
