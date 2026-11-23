import { MARKETS, type MarketDef } from "../markets";
import { getWatchlist, type WatchItem } from "../watchlist";
import { mapLimit } from "../utils";
import { getDailyHistory } from "./yahoo";
import { makeSnapshot, type Snapshot } from "./snapshot";

export interface LoadStatus {
  /** Äldsta hämtningstid bland de lyckade (ms). */
  fetchedAt: number | null;
  /** Antal symboler som visar gammal (cachad) data p.g.a. fel. */
  staleCount: number;
  /** Symboler som inte gick att hämta alls. */
  failed: string[];
}

export interface MarketRow extends MarketDef {
  snap: Snapshot | null;
}

export interface StockRow extends WatchItem {
  snap: Snapshot | null;
}

async function loadSnapshots<T extends { symbol: string }>(items: T[]) {
  const status: LoadStatus = { fetchedAt: null, staleCount: 0, failed: [] };
  const snaps = await mapLimit(items, 4, async (it) => {
    try {
      const res = await getDailyHistory(it.symbol);
      if (res.stale) status.staleCount++;
      status.fetchedAt = status.fetchedAt == null ? res.fetchedAt : Math.min(status.fetchedAt, res.fetchedAt);
      return makeSnapshot(res.data);
    } catch {
      status.failed.push(it.symbol);
      return null;
    }
  });
  return { snaps, status };
}

export async function getMarketRows(): Promise<{ rows: MarketRow[]; status: LoadStatus }> {
  const { snaps, status } = await loadSnapshots(MARKETS);
  return { rows: MARKETS.map((m, i) => ({ ...m, snap: snaps[i] })), status };
}

export async function getStockRows(): Promise<{ rows: StockRow[]; status: LoadStatus }> {
  const list = getWatchlist();
  const { snaps, status } = await loadSnapshots(list.map((w) => ({ ...w, symbol: w.ticker })));
  return { rows: list.map((w, i) => ({ ...w, snap: snaps[i] })), status };
}
