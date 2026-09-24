import type { CandleRow } from "./gaps";

/* Small in-memory cache for the equity window. Keyed by underlying
   symbol, holds the last successful rows with their source and the
   fetch time. Entries live 6 hours. The store lives in module state
   of the importing route module, one copy per server instance. */

export type EquitySource = "mcp" | "nasdaq" | "cache";

export type EquityCacheEntry = {
  rows: CandleRow[];
  source: EquitySource;
  fetchedAt: number;
};

const CACHE_TTL_MS = 6 * 3600 * 1000;
const store = new Map<string, EquityCacheEntry>();

export function writeCache(
  symbol: string,
  rows: CandleRow[],
  source: EquitySource,
  now: number = Date.now(),
): void {
  store.set(symbol, { rows, source, fetchedAt: now });
}

export function readCache(
  symbol: string,
  now: number = Date.now(),
): EquityCacheEntry | null {
  const entry = store.get(symbol);
  if (!entry) {
    return null;
  }
  if (now - entry.fetchedAt > CACHE_TTL_MS) {
    store.delete(symbol);
    return null;
  }
  return entry;
}

export function clearEquityCache(): void {
  store.clear();
}
