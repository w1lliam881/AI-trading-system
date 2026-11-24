/** Färg för poäng: rött (1) → grått (5) → grönt (10). Följer temat via CSS-variabler. */
export function scoreColor(score: number): string {
  if (score >= 5) {
    const t = Math.min(1, (score - 5) / 4);
    return `color-mix(in oklab, var(--up) ${Math.round(t * 100)}%, var(--flat))`;
  }
  const t = Math.min(1, (5 - score) / 3.5);
  return `color-mix(in oklab, var(--down) ${Math.round(t * 100)}%, var(--flat))`;
}

export function scoreBg(score: number): string {
  return `color-mix(in oklab, ${scoreColor(score)} 16%, transparent)`;
}

export function fmtScore(s: number) {
  return s.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
