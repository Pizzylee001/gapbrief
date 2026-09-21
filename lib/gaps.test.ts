import { describe, expect, it } from "vitest";
import {
  GAP_BUCKETS,
  computeGaps,
  type CandleRow,
} from "../lib/gaps";

/* Candles cover exactly one weekend, Sat Feb 5 2022 to Sun Feb 6 2022 */
function weekendRows(gapPct: number): CandleRow[] {
  return [
    { date: "2022-02-04", open: 100, close: 100 },
    { date: "2022-02-07", open: 100 + gapPct, close: 100 + gapPct },
  ];
}

const DAY_MS = 86_400_000;

function iso(day: number): string {
  return new Date(day).toISOString().slice(0, 10);
}

function rowsFromGaps(gaps: number[]): CandleRow[] {
  const rows: CandleRow[] = [];
  let friday = Date.parse("2022-01-07T00:00:00Z");
  let close = 100;
  for (const gap of gaps) {
    rows.push({ date: iso(friday), open: close, close });
    const open = close * (1 + gap / 100);
    const monday = friday + 3 * DAY_MS;
    rows.push({ date: iso(monday), open, close: open });
    close = open;
    friday += 7 * DAY_MS;
  }
  return rows;
}

describe("computeGaps", () => {
  it("measures the gap from the Friday close to the Monday open", () => {
    const result = computeGaps(weekendRows(-2.5), 5);
    expect(result.totalWeekends).toBe(1);
    expect(result.top).toHaveLength(1);
    expect(result.top[0].date).toBe("2022-02-07");
    expect(result.top[0].gapPct).toBe(-2.5);
  });

  it("rounds gap percent to 2 decimals", () => {
    const rows: CandleRow[] = [
      { date: "2022-02-04", open: 100, close: 100 },
      { date: "2022-02-07", open: 100 * (1 - 0.012345), close: 100 },
    ];
    const result = computeGaps(rows, 5);
    expect(result.top[0].gapPct).toBe(-1.23);
  });

  it("skips a holiday Monday and falls through to the next trading day", () => {
    /* Monday Feb 21 2022 is Presidents Day, no candle, next day Feb 22 */
    const rows: CandleRow[] = [
      { date: "2022-02-18", open: 100, close: 100 },
      { date: "2022-02-22", open: 103, close: 103 },
    ];
    const result = computeGaps(rows, 5);
    expect(result.totalWeekends).toBe(1);
    expect(result.top[0].date).toBe("2022-02-22");
    expect(result.top[0].gapPct).toBe(3);
  });

  it("buckets exactly the six named buckets", () => {
    expect(GAP_BUCKETS).toEqual([
      "< -4%",
      "-4 to -2%",
      "-2 to 0%",
      "0 to +2%",
      "+2 to +4%",
      "> +4%",
    ]);
  });

  it("places counts in the right buckets and they sum to totalWeekends", () => {
    const result = computeGaps(rowsFromGaps([-5, -3, -1, 1, 3, 5]), 5);
    expect(result.totalWeekends).toBe(6);
    expect(result.buckets).toEqual({
      "< -4%": 1,
      "-4 to -2%": 1,
      "-2 to 0%": 1,
      "0 to +2%": 1,
      "+2 to +4%": 1,
      "> +4%": 1,
    });
    const sum = GAP_BUCKETS.reduce((n, key) => n + result.buckets[key], 0);
    expect(sum).toBe(result.totalWeekends);
  });

  it("counts must equal the number of weekends across many gaps", () => {
    const gaps = [0.4, -0.4, 2, -2, 4, -4, 0, 1.5, -1.5];
    const result = computeGaps(rowsFromGaps(gaps), 5);
    const sum = GAP_BUCKETS.reduce((n, key) => n + result.buckets[key], 0);
    expect(sum).toBe(result.totalWeekends);
    expect(result.totalWeekends).toBe(gaps.length);
  });

  it("bucket edges are inclusive on the lower bound of each bucket", () => {
    const result = computeGaps(rowsFromGaps([-4, -2, 0, 2, 4]), 5);
    expect(result.buckets["-4 to -2%"]).toBe(1);
    expect(result.buckets["-2 to 0%"]).toBe(1);
    expect(result.buckets["0 to +2%"]).toBe(1);
    expect(result.buckets["+2 to +4%"]).toBe(1);
  });

  it("top events are the 5 largest by absolute value, sorted descending", () => {
    const gaps = [-1, 7, 2, -8, 3, -4, 5];
    const result = computeGaps(rowsFromGaps(gaps), 5);
    expect(result.totalWeekends).toBe(gaps.length);
    expect(result.top.map((event) => event.gapPct)).toEqual([-8, 7, 5, -4, 3]);
  });

  it("top events never exceed five rows even with many weekends", () => {
    const gaps = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const result = computeGaps(rowsFromGaps(gaps), 5);
    expect(result.top).toHaveLength(5);
  });

  it("ignores weekends outside the years window", () => {
    const rows: CandleRow[] = [
      { date: "2016-02-05", open: 100, close: 100 },
      { date: "2016-02-08", open: 110, close: 110 },
      { date: "2022-02-04", open: 100, close: 100 },
      { date: "2022-02-07", open: 104, close: 104 },
    ];
    const result = computeGaps(rows, 5);
    expect(result.totalWeekends).toBe(1);
    expect(result.top).toHaveLength(1);
    expect(result.top[0].gapPct).toBe(4);
  });

  it("ignores multi-year data holes between sparse clusters", () => {
    const rows: CandleRow[] = [
      { date: "2016-02-05", open: 100, close: 100 },
      { date: "2016-02-08", open: 110, close: 110 },
      { date: "2022-02-04", open: 100, close: 100 },
      { date: "2022-02-07", open: 104, close: 104 },
    ];
    const result = computeGaps(rows, 50);
    expect(result.totalWeekends).toBe(2);
  });

  it("accepts full ISO timestamps as row dates", () => {
    const rows: CandleRow[] = [
      { date: "2022-02-04T05:00:00Z", open: 100, close: 100 },
      { date: "2022-02-07T05:00:00Z", open: 102, close: 102 },
    ];
    const result = computeGaps(rows, 5);
    expect(result.totalWeekends).toBe(1);
    expect(result.top[0].date).toBe("2022-02-07");
    expect(result.top[0].gapPct).toBe(2);
  });

  it("accepts a mix of bare dates and full ISO timestamps", () => {
    const rows: CandleRow[] = [
      { date: "2022-02-04", open: 100, close: 100 },
      { date: "2022-02-07T05:00:00Z", open: 99, close: 99 },
    ];
    const result = computeGaps(rows, 5);
    expect(result.totalWeekends).toBe(1);
    expect(result.top[0].gapPct).toBe(-1);
  });

  it("handles a years window large enough for all rows", () => {
    const result = computeGaps(rowsFromGaps([-1, 2, -3]), 50);
    expect(result.totalWeekends).toBe(3);
  });
});