import { cn } from "@/lib/utils";

/** Lätt SVG-sparkline. Färg: grön om senaste > första, annars röd. */
export function Sparkline({ data, width = 96, height = 28, className, fill = true }: { data: number[]; width?: number; height?: number; className?: string; fill?: boolean }) {
  if (!data || data.length < 2) return <div style={{ width, height }} className={cn("rounded bg-panel-2/60", className)} aria-hidden />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 2;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const up = data[data.length - 1] >= data[0];
  const color = up ? "var(--up)" : "var(--down)";
  const id = `sg-${Math.round(data[0] * 1000)}-${data.length}-${up ? 1 : 0}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d}L${width},${height}L0,${height}Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
