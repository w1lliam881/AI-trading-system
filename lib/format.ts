const LOCALE = "sv-SE";

export function fmtNumber(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return "–";
  return v.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Pris med lagom antal decimaler beroende på storlek. */
export function fmtPrice(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "–";
  const d = Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 10 ? 2 : 3;
  return fmtNumber(v, d);
}

export function fmtPct(v: number | null | undefined, decimals = 2, withSign = true): string {
  if (v == null || !Number.isFinite(v)) return "–";
  const s = fmtNumber(v, decimals);
  return `${withSign && v > 0 ? "+" : ""}${s} %`;
}

export function fmtCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "–";
  return new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

export function fmtMoney(v: number | null | undefined, currency = "SEK", decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return "–";
  return `${fmtNumber(v, decimals)} ${currency === "SEK" ? "kr" : currency}`;
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString(LOCALE, { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" });
}

export function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString(LOCALE, {
    timeZone: "Europe/Stockholm",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(LOCALE, { timeZone: "Europe/Stockholm", day: "numeric", month: "short", year: "numeric" });
}

export function changeTone(v: number | null | undefined): "up" | "down" | "flat" {
  if (v == null || !Number.isFinite(v) || Math.abs(v) < 1e-9) return "flat";
  return v > 0 ? "up" : "down";
}
