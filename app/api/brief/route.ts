import { NextResponse } from "next/server";
import { pickLast } from "@/lib/bitget-parse";
import { deltaPct } from "@/lib/delta";
import { readCache, writeCache } from "@/lib/equity-cache";
import {
  computeGaps,
  lastCompletedSession,
} from "@/lib/gaps";
import { fetchEquityRows } from "@/lib/mcp-page";
import { fetchNasdaqRows } from "@/lib/nasdaq-fetch";
import { marketState } from "@/lib/market-state";
import { deskRead } from "@/lib/qwen";
import { UNDERLYING_BY_RTOKEN } from "@/lib/symbols";

export const dynamic = "force-dynamic";

const TICKERS_URL = "https://api.bitget.com/api/v2/spot/market/tickers";
const FETCH_TIMEOUT_MS = 15000;
const FEED_ERROR =
  "The data feed failed to respond. Check your connection and try again.";

const DAY_MS = 86_400_000;
const YEARS = 5;

/* Request dates are YYYY-MM-DD in UTC */
function isoDaysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString().slice(0, 10);
}

/* Every fetch runs with a hard timeout and retries once on failure
   before the error surfaces */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`Feed status ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/* Bitget public spot ticker, no key needed */
async function fetchTokenLast(symbol: string): Promise<number> {
  const response = await fetchWithRetry(
    `${TICKERS_URL}?symbol=${symbol}`,
    { cache: "no-store" },
  );
  const body = (await response.json()) as unknown;
  return pickLast(body);
}

/* Five-year window with resilience: MCP first, then the Nasdaq keyless
   fallback, then the last cached window. Live rows are sorted ascending
   and cached. The Nasdaq path only covers weekdays, which is exactly
   what weekend gaps measure, so no session is invented. */
async function fetchCandles(
  underlying: string,
  now: Date,
): Promise<{ rows: import("@/lib/gaps").CandleRow[]; source: import("@/lib/types").HistorySource }> {
  const startDate = isoDaysAgo(now, YEARS * 365);
  /* The window ends yesterday UTC, so the final row of the feed is
     always a completed session, never today's mid-session snapshot
     with its partial close */
  const endDate = isoDaysAgo(now, 1);
  try {
    const mcpRows = (await fetchEquityRows(underlying, startDate, endDate)).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    if (mcpRows.length > 0) {
      writeCache(underlying, mcpRows, "mcp");
      return { rows: mcpRows, source: "mcp" };
    }
  } catch {
    /* Fall through to Nasdaq */
  }
  try {
    const nasdaqRows = (await fetchNasdaqRows(underlying, startDate, endDate)).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    if (nasdaqRows.length > 0) {
      writeCache(underlying, nasdaqRows, "nasdaq");
      return { rows: nasdaqRows, source: "nasdaq" };
    }
  } catch {
    /* Fall through to cache */
  }
  const cached = readCache(underlying);
  if (cached && cached.rows.length > 0) {
    const rows = [...cached.rows].sort((a, b) => a.date.localeCompare(b.date));
    return { rows, source: "cache" };
  }
  throw new Error("Equity feed failed on every source");
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const ticker = (params.get("ticker") ?? "").trim().toUpperCase();
  const underlying = UNDERLYING_BY_RTOKEN[ticker];
  if (!underlying) {
    return NextResponse.json(
      {
        error:
          "Pick one of the four tokens on the sheet: RNVDAUSDT, RTSLAUSDT, RSPYUSDT or RMSTRUSDT.",
      },
      { status: 400 },
    );
  }
  const position = Number(params.get("position"));
  if (!Number.isFinite(position) || position <= 0) {
    return NextResponse.json(
      { error: "Enter a position size as a number greater than zero." },
      { status: 400 },
    );
  }

  try {
    const now = new Date();
    const tokenLast = await fetchTokenLast(ticker);
    const equityStart = Date.now();
    const { rows, source } = await fetchCandles(underlying, now);
    const equityMs = Date.now() - equityStart;
    if (rows.length < 2) {
      throw new Error("Not enough candles to compute a brief");
    }

    /* The rToken trades 7x24, so the live price is always compared
       against the most recent completed session close, never against a
       mid-session snapshot */
    const closed = lastCompletedSession(rows, now);
    if (!closed) {
      throw new Error("Feed carries no completed session");
    }
    const lastClose = closed.close;
    const sessionCloseDate = closed.date.slice(0, 10);
    const gaps = computeGaps(rows, YEARS, now);
    const delta = deltaPct(tokenLast, lastClose);

    /* The read never fails the brief: when Qwen is unavailable the
       fixed fallback string ships with readSource "fallback" and the
       response still returns 200 */
    const qwenStart = Date.now();
    const read = await deskRead({
      ticker,
      underlying,
      last: tokenLast,
      lastClose,
      sessionCloseDate,
      deltaPct: delta,
      gaps,
    });
    console.log(`timing equity=${equityMs}ms qwen=${Date.now() - qwenStart}ms`);

    return NextResponse.json({
      ticker,
      underlying,
      price: {
        last: tokenLast,
        lastClose,
        deltaPct: delta,
      },
      sessionCloseDate,
      gaps,
      read: read.read,
      readSource: read.readSource,
      marketState: marketState(new Date()),
      generatedAt: new Date().toISOString(),
      source,
      historyAsOf: rows[rows.length - 1].date.slice(0, 10),
    });
  } catch {
    return NextResponse.json({ error: FEED_ERROR }, { status: 502 });
  }
}