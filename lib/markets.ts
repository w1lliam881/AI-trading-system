export type MarketGroup = "Index" | "Valuta" | "Råvara" | "Ränta" | "Volatilitet";

export interface MarketDef {
  symbol: string;
  label: string;
  group: MarketGroup;
  region?: "Sverige" | "USA" | "Europa" | "Asien";
  /** Räntor visas i procentenheter i stället för procent förändring. */
  isRate?: boolean;
}

/** Marknader i tickerbandet (alla gratis via Yahoo Finance). */
export const MARKETS: MarketDef[] = [
  { symbol: "^OMX", label: "OMXS30", group: "Index", region: "Sverige" },
  { symbol: "^GSPC", label: "S&P 500", group: "Index", region: "USA" },
  { symbol: "^IXIC", label: "Nasdaq", group: "Index", region: "USA" },
  { symbol: "^GDAXI", label: "DAX", group: "Index", region: "Europa" },
  { symbol: "^N225", label: "Nikkei 225", group: "Index", region: "Asien" },
  { symbol: "GC=F", label: "Guld", group: "Råvara" },
  { symbol: "BZ=F", label: "Brent", group: "Råvara" },
  { symbol: "SEK=X", label: "USD/SEK", group: "Valuta" },
  { symbol: "EURSEK=X", label: "EUR/SEK", group: "Valuta" },
  { symbol: "^VIX", label: "VIX", group: "Volatilitet" },
  { symbol: "^TNX", label: "US 10Å", group: "Ränta", isRate: true },
];
