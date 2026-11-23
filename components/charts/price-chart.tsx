"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  AreaSeries,
  type IChartApi,
  type UTCTimestamp,
  type Time,
  type SeriesMarker,
  CrosshairMode,
} from "lightweight-charts";
import { Loader2 } from "lucide-react";
import { sma } from "@/lib/analysis/indicators";
import { fmtCompact, fmtPrice, fmtPct, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Bar } from "@/lib/data/yahoo";

export type ChartRange = "1D" | "1V" | "1M" | "6M" | "1Å" | "5Å";
const RANGES: ChartRange[] = ["1D", "1V", "1M", "6M", "1Å", "5Å"];
const DAILY_BARS: Record<string, number> = { "1M": 22, "6M": 126, "1Å": 252, "5Å": 1260 };

/** Markör på grafen: nyhet, rapportdatum eller Bottens köp/sälj (fylls i senare faser). */
export interface ChartMarker {
  /** unix-sekunder */
  t: number;
  kind: "news" | "report" | "buy" | "sell" | "dividend";
  text: string;
}

interface Props {
  symbol: string;
  currency: string;
  gmtoffset: number;
  daily: Bar[];
  fetchedAt: number;
  stale?: boolean;
  markers?: ChartMarker[];
  height?: number;
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function dayString(t: number, off: number) {
  return new Date((t + off) * 1000).toISOString().slice(0, 10);
}

interface Hover { o: number; h: number; l: number; c: number; v: number; time: string; chg: number | null }

export function PriceChart({ symbol, currency, gmtoffset, daily, fetchedAt, stale, markers = [], height = 440 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [range, setRange] = useState<ChartRange>("6M");
  const [style, setStyle] = useState<"candle" | "line">("candle");
  const [showMA, setShowMA] = useState({ ma50: true, ma200: true, vol: true });
  const [intraday, setIntraday] = useState<{ bars: Bar[]; off: number; fetchedAt: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const isIntraday = range === "1D" || range === "1V";

  // Hämta intradagsdata vid 1D/1V.
  useEffect(() => {
    if (!isIntraday) { setError(null); return; }
    let cancel = false;
    setLoading(true); setError(null);
    fetch(`/api/chart?ticker=${encodeURIComponent(symbol)}&range=${range === "1D" ? "1d" : "5d"}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Okänt fel");
        if (!cancel) setIntraday({ bars: j.history.bars, off: j.history.gmtoffset, fetchedAt: j.fetchedAt });
      })
      .catch((e) => !cancel && setError(e.message))
      .finally(() => !cancel && setLoading(false));
    return () => { cancel = true; };
  }, [isIntraday, range, symbol]);

  const data = useMemo(() => {
    if (isIntraday) {
      const bars = intraday?.bars ?? [];
      const off = intraday?.off ?? gmtoffset;
      return { bars, times: bars.map((b) => (b.t + off) as UTCTimestamp as Time), ma50: [], ma200: [] };
    }
    const closes = daily.map((b) => b.c);
    return {
      bars: daily,
      times: daily.map((b) => dayString(b.t, gmtoffset) as Time),
      ma50: sma(closes, 50),
      ma200: sma(closes, 200),
    };
  }, [isIntraday, intraday, daily, gmtoffset]);

  useEffect(() => {
    if (!box.current) return;
    const text = cssVar("--muted");
    const grid = cssVar("--chart-grid");
    const border = cssVar("--border");
    const up = cssVar("--up");
    const down = cssVar("--down");
    const accent = cssVar("--accent");

    const chart = createChart(box.current, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: text, fontFamily: "JetBrains Mono Variable, monospace", fontSize: 11, attributionLogo: true },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: border, scaleMargins: { top: 0.08, bottom: showMA.vol ? 0.22 : 0.05 } },
      timeScale: { borderColor: border, timeVisible: isIntraday, secondsVisible: false, rightOffset: 3 },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { locale: "sv-SE", priceFormatter: (p: number) => fmtPrice(p) },
    });
    chartRef.current = chart;
    const { bars, times } = data;

    const main =
      style === "candle"
        ? chart.addSeries(CandlestickSeries, { upColor: up, downColor: down, borderVisible: false, wickUpColor: up, wickDownColor: down })
        : chart.addSeries(AreaSeries, { lineColor: accent, topColor: `${accent}33`, bottomColor: `${accent}00`, lineWidth: 2 });

    if (style === "candle") main.setData(bars.map((b, i) => ({ time: times[i], open: b.o, high: b.h, low: b.l, close: b.c })) as never);
    else main.setData(bars.map((b, i) => ({ time: times[i], value: b.c })) as never);

    if (!isIntraday) {
      const addMA = (vals: (number | null)[], color: string) => {
        const s = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        s.setData(vals.map((v, i) => (v == null ? null : { time: times[i], value: v })).filter(Boolean) as never);
      };
      if (showMA.ma50) addMA(data.ma50, "#6ea8fe");
      if (showMA.ma200) addMA(data.ma200, "#c38bff");
    }

    if (showMA.vol) {
      const vol = chart.addSeries(HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
      vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      vol.setData(bars.map((b, i) => ({ time: times[i], value: b.v, color: b.c >= b.o ? `${up}55` : `${down}55` })) as never);
    }

    // Markörer (nyheter, rapporter, Bottens affärer) – endast på dagsgraf.
    if (!isIntraday && markers.length) {
      const colors = { news: accent, report: "#6ea8fe", buy: up, sell: down, dividend: "#c38bff" } as const;
      const ms: SeriesMarker<Time>[] = markers
        .map((m) => ({
          time: dayString(m.t, gmtoffset) as Time,
          position: m.kind === "sell" ? "aboveBar" : m.kind === "buy" ? "belowBar" : "aboveBar",
          shape: m.kind === "buy" ? "arrowUp" : m.kind === "sell" ? "arrowDown" : "circle",
          color: colors[m.kind],
          text: m.kind === "buy" ? "K" : m.kind === "sell" ? "S" : m.kind === "report" ? "R" : m.kind === "dividend" ? "U" : "",
        }) as SeriesMarker<Time>)
        .sort((a, b) => String(a.time).localeCompare(String(b.time)));
      createSeriesMarkers(main, ms);
    }

    // Visa valt intervall men låt användaren scrolla bakåt.
    if (!isIntraday && bars.length) {
      const n = DAILY_BARS[range] ?? 126;
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, bars.length - n), to: bars.length + 2 });
    } else chart.timeScale().fitContent();

    // Tooltip/legend vid hovring.
    const idx = new Map<string, number>(times.map((t, i) => [String(t), i]));
    chart.subscribeCrosshairMove((p) => {
      if (!p.time) { setHover(null); return; }
      const i = idx.get(String(p.time));
      if (i == null) { setHover(null); return; }
      const b = bars[i];
      const prev = i > 0 ? bars[i - 1].c : null;
      setHover({
        ...b,
        // Visa börsens lokala tid (samma som tidsaxeln).
        time: new Date((b.t + (isIntraday ? (intraday?.off ?? gmtoffset) : gmtoffset)) * 1000).toLocaleString("sv-SE", isIntraday
          ? { timeZone: "UTC", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
          : { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }),
        chg: prev ? (b.c / prev - 1) * 100 : null,
      });
    });

    return () => { chart.remove(); chartRef.current = null; };
  }, [data, style, showMA, range, isIntraday, markers, gmtoffset, intraday?.off]);

  const last = data.bars.at(-1);
  const shown: Hover | null = hover ?? (last ? { ...last, time: "Senast", chg: data.bars.length > 1 ? (last.c / data.bars[data.bars.length - 2].c - 1) * 100 : null } : null);
  const stampAt = isIntraday ? intraday?.fetchedAt : fetchedAt;

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-panel-2 p-0.5" role="tablist" aria-label="Tidsintervall">
          {RANGES.map((r) => (
            <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)}
              className={cn("num h-7 rounded-md px-2.5 text-xs transition-colors", range === r ? "bg-hover text-text shadow-sm" : "text-muted hover:text-text")}>
              {r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Toggle on={style === "candle"} onClick={() => setStyle(style === "candle" ? "line" : "candle")}>{style === "candle" ? "Ljus" : "Linje"}</Toggle>
          {!isIntraday && <Toggle on={showMA.ma50} onClick={() => setShowMA((s) => ({ ...s, ma50: !s.ma50 }))} dot="#6ea8fe">MA50</Toggle>}
          {!isIntraday && <Toggle on={showMA.ma200} onClick={() => setShowMA((s) => ({ ...s, ma200: !s.ma200 }))} dot="#c38bff">MA200</Toggle>}
          <Toggle on={showMA.vol} onClick={() => setShowMA((s) => ({ ...s, vol: !s.vol }))}>Volym</Toggle>
        </div>
      </div>

      <div className="relative" style={{ height }}>
        {shown && (
          <div className="num pointer-events-none absolute top-2 left-5 z-10 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
            <span className="text-text-2">{shown.time}</span>
            <span>Ö <b className="font-normal text-text">{fmtPrice(shown.o)}</b></span>
            <span>H <b className="font-normal text-text">{fmtPrice(shown.h)}</b></span>
            <span>L <b className="font-normal text-text">{fmtPrice(shown.l)}</b></span>
            <span>S <b className="font-normal text-text">{fmtPrice(shown.c)}</b></span>
            {shown.chg != null && <span className={shown.chg >= 0 ? "text-up" : "text-down"}>{fmtPct(shown.chg)}</span>}
            <span>Vol <b className="font-normal text-text">{fmtCompact(shown.v)}</b></span>
          </div>
        )}
        <div ref={box} className="absolute inset-0 px-2" />
        {loading && <div className="absolute inset-0 grid place-items-center bg-panel/50"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>}
        {error && !loading && (
          <div className="absolute inset-0 grid place-items-center bg-panel/80 px-6 text-center text-sm text-text-2">
            Kunde inte hämta intradagsdata just nu. Välj 1M eller längre för daglig historik.<br /><span className="text-xs text-muted">{error}</span>
          </div>
        )}
        {isIntraday && !loading && !error && data.bars.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted">Ingen intradagsdata (börsen kan vara stängd).</div>
        )}
      </div>
      <div className="flex items-center justify-between px-5 pt-2 text-[10.5px] text-muted">
        <span>Valuta: {currency}{isIntraday ? " · Tider i börsens lokala tid" : " · MA = glidande medelvärde (dagar)"}</span>
        <span>Källa: Yahoo Finance{stampAt ? ` · ${fmtDateTime(stampAt)}` : ""}{stale ? " · cachad" : ""}</span>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children, dot }: { on: boolean; onClick: () => void; children: React.ReactNode; dot?: string }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={cn("flex h-7 items-center gap-1.5 rounded-md border px-2.5 transition-colors", on ? "border-border-strong bg-panel-2 text-text" : "border-border text-muted hover:text-text")}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot, opacity: on ? 1 : 0.4 }} />}
      {children}
    </button>
  );
}
