import { describe, expect, it, vi } from "vitest";
import { assetClassFor, fetchNasdaqRows, nasdaqUrl } from "./nasdaq-fetch";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

describe("fetchNasdaqRows", () => {
  it("returns [] on HTTP 200 with no rows", async () => {
    const fake = vi.fn(async () => jsonResponse({ data: { tradesTable: { rows: [] } } }));
    const rows = await fetchNasdaqRows(
      "NVDA",
      "2021-09-01",
      "2026-09-22",
      fake as unknown as typeof fetch,
    );
    expect(rows).toEqual([]);
    expect(fake).toHaveBeenCalledTimes(1);
  });

  it("parses real rows from the Nasdaq envelope", async () => {
    const fake = vi.fn(async () =>
      jsonResponse({
        data: {
          tradesTable: {
            rows: [{ date: "09/22/2026", open: "$230.10", close: "$228.87" }],
          },
        },
      }),
    );
    const rows = await fetchNasdaqRows(
      "NVDA",
      "2026-09-20",
      "2026-09-22",
      fake as unknown as typeof fetch,
    );
    expect(rows).toEqual([{ date: "2026-09-22", open: 230.1, close: 228.87 }]);
  });

  it("uses the etf asset class for SPY and stocks for the rest", () => {
    expect(assetClassFor("SPY")).toBe("etf");
    expect(assetClassFor("NVDA")).toBe("stocks");
    expect(nasdaqUrl("SPY", "2021-09-24", "2026-09-23")).toContain("assetclass=etf");
    expect(nasdaqUrl("NVDA", "2021-09-24", "2026-09-23")).toContain("assetclass=stocks");
  });
});
