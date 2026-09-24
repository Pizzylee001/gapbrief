import type { CandleRow } from "./gaps";
import { parseNasdaqRows } from "./nasdaq";

/* Keyless Nasdaq historical fallback. Symbols map directly: our four
   underlyings are Nasdaq tickers as is. SPY is an ETF asset class,
   the rest are stocks. 15s timeout with one retry. */

const NASDAQ_URL = "https://api.nasdaq.com/api/quote";
const FETCH_TIMEOUT_MS = 15000;

const ASSET_CLASS: Record<string, string> = {
  NVDA: "stocks",
  TSLA: "stocks",
  SPY: "etf",
  MSTR: "stocks",
};

export function assetClassFor(symbol: string): string {
  return ASSET_CLASS[symbol] ?? "stocks";
}

export function nasdaqUrl(symbol: string, startDate: string, endDate: string): string {
  const params = new URLSearchParams({
    assetclass: assetClassFor(symbol),
    fromdate: startDate,
    todate: endDate,
    limit: "9999",
  });
  return `${NASDAQ_URL}/${encodeURIComponent(symbol)}/historical?${params.toString()}`;
}

export async function fetchNasdaqRows(
  symbol: string,
  startDate: string,
  endDate: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CandleRow[]> {
  let lastError: unknown = new Error("Nasdaq feed failed");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(nasdaqUrl(symbol, startDate, endDate), {
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Nasdaq status ${response.status}`);
      }
      return parseNasdaqRows(await response.json());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
