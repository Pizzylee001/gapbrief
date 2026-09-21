import { NextResponse } from "next/server";
import { pickLast } from "@/lib/bitget-parse";
import { deltaPct } from "@/lib/delta";
import {
  computeGaps,
  lastCompletedSession,
} from "@/lib/gaps";
import { fetchEquityRows } from "@/lib/mcp-page";
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

/* Five-year window through the paged equity feed. One call walks every
   page in response order, so the last close and the gap counts see the
   full window, never page one only. */
async function fetchCandles(
  underlying: string,
  now: Date,
): Promise<import("@/lib/gaps").CandleRow[]> {
  const startDate = isoDaysAgo(now, YEARS * 365);
  /* The window ends yesterday UTC, so the final row of the feed is
     always a completed session, never today's mid-session snapshot
     with its partial close */
  const endDate = isoDaysAgo(now, 1);
  return fetchEquityRows(underlying, startDate, endDate);
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
    const rows = (await fetchCandles(underlying, now)).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
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
    const read = await deskRead({
      ticker,
      underlying,
      last: tokenLast,
      lastClose,
      sessionCloseDate,
      deltaPct: delta,
      gaps,
    });

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
    });
  } catch {
    return NextResponse.json({ error: FEED_ERROR }, { status: 502 });
  }
}