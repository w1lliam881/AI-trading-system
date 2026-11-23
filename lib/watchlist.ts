import { z } from "zod";

export const WatchItemSchema = z.object({
  ticker: z.string().min(1),
  name: z.string().min(1),
  /** Kort namn som används i nyhetssök och Avanza-länk. */
  searchName: z.string().min(1),
  sector: z.string().default("Okänd"),
  country: z.enum(["SE", "US", "DE", "FI", "DK", "NO", "Övrigt"]).default("Övrigt"),
});
export type WatchItem = z.infer<typeof WatchItemSchema>;

/**
 * Förvald bevakningslista: 10 stora svenska + 5 stora amerikanska bolag.
 * (I fas 2 flyttas listan in i databasen och kan redigeras i Inställningar.)
 */
export const DEFAULT_WATCHLIST: WatchItem[] = [
  { ticker: "VOLV-B.ST", name: "Volvo B", searchName: "Volvo", sector: "Industri", country: "SE" },
  { ticker: "ATCO-A.ST", name: "Atlas Copco A", searchName: "Atlas Copco", sector: "Industri", country: "SE" },
  { ticker: "SAND.ST", name: "Sandvik", searchName: "Sandvik", sector: "Industri", country: "SE" },
  { ticker: "ASSA-B.ST", name: "Assa Abloy B", searchName: "Assa Abloy", sector: "Industri", country: "SE" },
  { ticker: "ABB.ST", name: "ABB", searchName: "ABB", sector: "Industri", country: "SE" },
  { ticker: "INVE-B.ST", name: "Investor B", searchName: "Investor AB", sector: "Finans", country: "SE" },
  { ticker: "SEB-A.ST", name: "SEB A", searchName: "SEB", sector: "Finans", country: "SE" },
  { ticker: "ERIC-B.ST", name: "Ericsson B", searchName: "Ericsson", sector: "Teknik", country: "SE" },
  { ticker: "HM-B.ST", name: "H&M B", searchName: "H&M", sector: "Konsument", country: "SE" },
  { ticker: "EVO.ST", name: "Evolution", searchName: "Evolution Gaming", sector: "Konsument", country: "SE" },
  { ticker: "AZN.ST", name: "AstraZeneca", searchName: "AstraZeneca", sector: "Hälsovård", country: "SE" },
  { ticker: "AAPL", name: "Apple", searchName: "Apple", sector: "Teknik", country: "US" },
  { ticker: "MSFT", name: "Microsoft", searchName: "Microsoft", sector: "Teknik", country: "US" },
  { ticker: "NVDA", name: "Nvidia", searchName: "Nvidia", sector: "Teknik", country: "US" },
  { ticker: "AMZN", name: "Amazon", searchName: "Amazon", sector: "Konsument", country: "US" },
  { ticker: "GOOGL", name: "Alphabet A", searchName: "Alphabet Google", sector: "Kommunikation", country: "US" },
];

export function getWatchlist(): WatchItem[] {
  return DEFAULT_WATCHLIST;
}

export function findWatchItem(ticker: string): WatchItem | undefined {
  const t = ticker.toUpperCase();
  return getWatchlist().find((w) => w.ticker.toUpperCase() === t);
}
