import type { CandleRow } from "./gaps";
import { extractText, lastMessagePayload, parseRows } from "./mcp-parse";

const MCP_URL = "https://agent.bitget.com/mcp";
const FETCH_TIMEOUT_MS = 15000;
const MAX_PAGES = 8;

/* Reads has_more and next_time from the decoded text envelope. The feed
   carries them on the last result row (next_time in ms, plus
   next_cursor), with data level checked first, so both spots are read. */
export function parseEquityPage(text: string): {
  rows: CandleRow[];
  hasMore: boolean;
  nextTime: number | null;
} {
  const rows = parseRows(text);
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { rows, hasMore: false, nextTime: null };
  }
  const root = parsed as {
    data?: {
      has_more?: unknown;
      hasMore?: unknown;
      next_time?: unknown;
      nextTime?: unknown;
      results?: unknown;
    };
    has_more?: unknown;
    next_time?: unknown;
    metadata?: { has_more?: unknown; next_time?: unknown };
  };
  const data = root?.data ?? {};
  /* New probe 2026-09-22: next_time and has_more live on the last
     result row (next_time in ms), not on data. Data level is still
     checked first, then the last row carrying either field wins. */
  const dataHasMore =
    (data as { has_more?: unknown }).has_more ??
    (data as { hasMore?: unknown }).hasMore;
  const dataNext =
    (data as { next_time?: unknown }).next_time ??
    (data as { nextTime?: unknown }).nextTime;
  const rootHasMore =
    root?.has_more ?? (root?.metadata as { has_more?: unknown })?.has_more;
  const rootNext =
    root?.next_time ??
    (root?.metadata as { next_time?: unknown })?.next_time;
  const results = Array.isArray(data.results) ? data.results : [];
  let rowHasMore: unknown = null;
  let rowNext: unknown = null;
  for (let i = results.length - 1; i >= 0; i -= 1) {
    const entry = results[i] as {
      has_more?: unknown;
      next_time?: unknown;
      nextTime?: unknown;
    };
    if (rowHasMore === null && entry?.has_more !== undefined) {
      rowHasMore = entry.has_more;
    }
    if (rowNext === null || rowNext === undefined) {
      const candidate = entry?.next_time ?? entry?.nextTime;
      if (candidate !== null && candidate !== undefined) {
        rowNext = candidate;
      }
    }
    if (rowHasMore !== null && rowNext !== null && rowNext !== undefined) {
      break;
    }
  }
  const rawHasMore = dataHasMore ?? rootHasMore ?? rowHasMore ?? false;
  const hasMore = rawHasMore === true;
  const rawNext: unknown = dataNext ?? rootNext ?? rowNext ?? null;
  const num = typeof rawNext === "number" ? rawNext : Number(rawNext);
  const nextTime =
    rawNext === null ||
    rawNext === undefined ||
    rawNext === "" ||
    !Number.isFinite(num)
      ? null
      : Math.trunc(num);
  return {
    rows,
    hasMore,
    nextTime: nextTime !== null && nextTime > 0 ? nextTime : null,
  };
}

async function postWithRetry(
  fetchImpl: typeof fetch,
  body: unknown,
  sessionId: string,
): Promise<Response> {
  let lastError: unknown = new Error("feed failed");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(MCP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...(sessionId ? { "mcp-session-id": sessionId } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        body: JSON.stringify(body),
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

/* Fetches the full window for one symbol by walking forward pages. The
   initialize dance runs once, then each do_query keeps the same end_date
   and pages with start_time set to the prior page next_time. Rows keep
   response order, first occurrence wins on duplicate calendar dates. */
export async function fetchEquityRows(
  symbol: string,
  startDate: string,
  endDate: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CandleRow[]> {
  const initResponse = await postWithRetry(
    fetchImpl,
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "gapbrief", version: "0.2.0" },
      },
    },
    "",
  );
  const sessionId = initResponse.headers.get("mcp-session-id") ?? "";
  await initResponse.text();
  await postWithRetry(
    fetchImpl,
    { jsonrpc: "2.0", method: "notifications/initialized" },
    sessionId,
  );
  const collected: CandleRow[] = [];
  const seen = new Set<string>();
  const pushRows = (rows: CandleRow[]) => {
    for (const row of rows) {
      const day = row.date.slice(0, 10);
      if (seen.has(day)) {
        continue;
      }
      seen.add(day);
      collected.push({ date: day, open: row.open, close: row.close });
    }
  };
  let startTime: number | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const callResponse = await postWithRetry(
      fetchImpl,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "do_query",
          arguments: {
            entry_id: "equity_price_historical",
            params: {
              symbol,
              start_date: startDate,
              end_date: endDate,
              ...(startTime !== null ? { start_time: startTime } : {}),
            },
          },
        },
      },
      sessionId,
    );
    const body = await callResponse.text();
    const payload = lastMessagePayload(body);
    if (!payload) {
      throw new Error("MCP response carried no payload");
    }
    const parsed = parseEquityPage(extractText(payload));
    pushRows(parsed.rows);
    if (!parsed.hasMore || parsed.nextTime === null) {
      break;
    }
    startTime = parsed.nextTime;
  }
  return collected;
}
