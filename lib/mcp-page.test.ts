import { describe, expect, it, vi } from "vitest";
import { fetchEquityRows } from "./mcp-page";
import type { CandleRow } from "./gaps";

/* Builds an SSE body carrying one tools/call envelope with the given inner text */
function sseBody(inner: unknown): string {
  const envelope = {
    jsonrpc: "2.0",
    id: 2,
    result: { content: [{ type: "text", text: JSON.stringify(inner) }] },
  };
  return `data: ${JSON.stringify(envelope)}\n\n`;
}

function row(
  date: string,
  open: number,
  close: number,
  extra: Record<string, unknown> = {},
) {
  return { date, open, close, high: close, low: open, volume: 1000, ...extra };
}

/* Last row carries the paging stamp, like the live feed */
function lastRow(date: string, open: number, close: number, extra: Record<string, unknown> = {}) {
  return row(date, open, close, extra);
}

/* Minimal fetch-like stub. Counts initialize calls and records do_query params. */
function makeFake(pages: unknown[]) {
  let initCalls = 0;
  const queryParams: unknown[] = [];
  const fake = vi.fn(async (_url: unknown, init: unknown) => {
    const body = JSON.parse((init as { body: string }).body) as {
      method?: string;
      params?: unknown;
    };
    if (body.method === "initialize") {
      initCalls += 1;
      return {
        ok: true,
        headers: { get: () => "sess-1" },
        text: async () => "",
      };
    }
    if (body.method === "notifications/initialized") {
      return {
        ok: true,
        headers: { get: () => "" },
        text: async () => "",
      };
    }
    const idx = queryParams.length;
    const params = (
      body.params as {
        arguments?: { params?: unknown };
      }
    )?.arguments?.params;
    queryParams.push(params);
    const inner = pages[Math.min(idx, pages.length - 1)];
    return {
      ok: true,
      headers: { get: () => "" },
      text: async () => sseBody(inner),
    };
  });
  return { fake, initCalls: () => initCalls, queryParams };
}

const T2 = 1630600000;

describe("fetchEquityRows pagination", () => {
  it("collects two pages in order with one initialize and start_time paging", async () => {
    const pageOne = {
      data: {
        results: [
          row("2021-09-01", 10, 11),
          row("2021-09-02", 11, 12),
          lastRow("2021-09-03", 12, 13, { has_more: true, next_time: T2 * 1000 }),
        ],
      },
    };
    const pageTwo = {
      data: {
        results: [
          row("2021-09-07", 13, 14),
          lastRow("2021-09-08", 14, 15, { has_more: false }),
        ],
      },
    };
    const { fake, initCalls, queryParams } = makeFake([pageOne, pageTwo]);
    const rows = await fetchEquityRows(
      "NVDA",
      "2021-09-01",
      "2026-09-20",
      fake as unknown as typeof fetch,
    );
    expect(rows.map((r: CandleRow) => r.date)).toEqual([
      "2021-09-01",
      "2021-09-02",
      "2021-09-03",
      "2021-09-07",
      "2021-09-08",
    ]);
    expect(rows).toHaveLength(5);
    expect(initCalls()).toBe(1);
    expect(queryParams).toHaveLength(2);
    expect(queryParams[1] as Record<string, unknown>).toMatchObject({
      end_date: "2026-09-20",
      start_time: T2 * 1000,
    });
  });

  it("stops when has_more is true but next_time is missing", async () => {
    const pageOne = {
      data: {
        results: [
          row("2021-09-01", 10, 11),
          lastRow("2021-09-02", 11, 12, { has_more: true }),
        ],
      },
    };
    const { fake, queryParams } = makeFake([pageOne]);
    const rows = await fetchEquityRows(
      "NVDA",
      "2021-09-01",
      "2026-09-20",
      fake as unknown as typeof fetch,
    );
    expect(rows.map((r: CandleRow) => r.date)).toEqual(["2021-09-01", "2021-09-02"]);
    expect(queryParams).toHaveLength(1);
  });

  it("caps at 8 pages when the feed always reports has_more true", async () => {
    const pages = Array.from({ length: 10 }, (_, i) => ({
      data: {
        results: [
          row(`2021-09-${String(i * 2 + 1).padStart(2, "0")}`, 10 + i, 11 + i),
          lastRow(`2021-09-${String(i * 2 + 2).padStart(2, "0")}`, 11 + i, 12 + i, {
            has_more: true,
            next_time: (1700000000 + i) * 1000,
          }),
        ],
      },
    }));
    const { fake, queryParams } = makeFake(pages);
    const rows = await fetchEquityRows(
      "NVDA",
      "2021-09-01",
      "2026-09-20",
      fake as unknown as typeof fetch,
    );
    expect(queryParams).toHaveLength(8);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("keeps the first occurrence when two rows share a calendar date", async () => {
    const pageOne = {
      data: {
        results: [lastRow("2021-09-01", 10, 11, { has_more: true, next_time: T2 * 1000 })],
      },
    };
    const pageTwo = {
      data: {
        results: [row("2021-09-01", 99, 99), lastRow("2021-09-02", 11, 12, { has_more: false })],
      },
    };
    const { fake } = makeFake([pageOne, pageTwo]);
    const rows = await fetchEquityRows(
      "NVDA",
      "2021-09-01",
      "2026-09-20",
      fake as unknown as typeof fetch,
    );
    expect(rows).toEqual([
      { date: "2021-09-01", open: 10, close: 11 },
      { date: "2021-09-02", open: 11, close: 12 },
    ]);
  });

  it("reads the real feed shape: paging on the last row", async () => {
    const T2MS = T2 * 1000;
    const text = JSON.stringify({
      success: true,
      status_code: 200,
      data: {
        id: "abc",
        results: [
          { date: "2021-09-01T04:00:00Z", open: 10, close: 11 },
          {
            date: "2021-09-02T04:00:00Z",
            open: 11,
            close: 12,
            has_more: true,
            next_time: T2MS,
          },
        ],
      },
    });
    const { parseEquityPage } = await import("./mcp-page");
    const parsed = parseEquityPage(text);
    expect(parsed.rows.map((r: CandleRow) => r.date)).toEqual([
      "2021-09-01",
      "2021-09-02",
    ]);
    expect(parsed.hasMore).toBe(true);
    expect(parsed.nextTime).toBe(T2MS);
  });
});
