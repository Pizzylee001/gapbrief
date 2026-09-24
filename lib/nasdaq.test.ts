import { describe, expect, it } from "vitest";
import { parseNasdaqRows } from "./nasdaq";

describe("parseNasdaqRows", () => {
  it("strips dollar signs and commas and sorts ascending", () => {
    const json = {
      data: {
        tradesTable: {
          rows: [
            { date: "09/22/2026", open: "$230.10", close: "$228.87", high: "$231", low: "$229", volume: "1,000" },
            { date: "09/18/2026", open: "$220.00", close: "$222.27", high: "$223", low: "$219", volume: "2,000" },
            { date: "09/21/2026", open: "$228.00", close: "$227.38", high: "$229", low: "$227", volume: "3,000" },
          ],
        },
      },
    };
    expect(parseNasdaqRows(json)).toEqual([
      { date: "2026-09-18", open: 220, close: 222.27 },
      { date: "2026-09-21", open: 228, close: 227.38 },
      { date: "2026-09-22", open: 230.1, close: 228.87 },
    ]);
  });

  it("skips malformed rows", () => {
    const json = {
      data: {
        tradesTable: {
          rows: [
            { date: "09/22/2026", open: "$10", close: "$11" },
            { date: "bad", open: "$10", close: "$11" },
            { date: "09/23/2026", open: "n/a", close: "$12" },
            { date: "09/24/2026", open: "$10", close: "" },
            null,
          ],
        },
      },
    };
    expect(parseNasdaqRows(json)).toEqual([{ date: "2026-09-22", open: 10, close: 11 }]);
  });

  it("treats empty or missing rows as empty result", () => {
    expect(parseNasdaqRows({ data: { tradesTable: { rows: [] } } })).toEqual([]);
    expect(parseNasdaqRows({ data: {} })).toEqual([]);
    expect(parseNasdaqRows({})).toEqual([]);
    expect(parseNasdaqRows(null)).toEqual([]);
  });
});
