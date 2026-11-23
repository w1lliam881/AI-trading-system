import type { WatchItem } from "./watchlist";

/**
 * Avanza saknar öppet API. Vi loggar ALDRIG in och handlar aldrig – vi länkar
 * bara till Avanzas publika sökning för bolaget, där du själv klickar vidare.
 */
export function avanzaUrl(nameOrTicker: string): string {
  const q = nameOrTicker
    .replace(/\.ST$/i, "")
    .replace(/\s*\(publ\)/gi, "")
    .replace(/,?\s+(Inc\.?|Corporation|Corp\.?|Ltd\.?|plc|AB)$/gi, "")
    .replace(/-/g, " ")
    .trim();
  return `https://www.avanza.se/sok.html?query=${encodeURIComponent(q)}`;
}

export function yahooUrl(ticker: string): string {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
}

export function googleNewsUrl(query: string): string {
  return `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=sv&gl=SE&ceid=SE:sv`;
}

export function stockPath(ticker: string): string {
  return `/aktie/${encodeURIComponent(ticker)}`;
}

export function linksFor(item: Pick<WatchItem, "ticker" | "name" | "searchName">) {
  return {
    avanza: avanzaUrl(item.name),
    yahoo: yahooUrl(item.ticker),
    news: googleNewsUrl(`"${item.searchName}"`),
    chart: stockPath(item.ticker),
  };
}
