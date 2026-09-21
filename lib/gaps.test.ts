import { describe, expect, it } from "vitest";
import {
  GAP_BUCKETS,
  bucketSharePct,
  computeGaps,
  lastCompletedSession,
  rankedBuckets,
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

  /* The feed's final row can be a mid-session snapshot while the US
     session is still running. It carries a partial close, so it must
     never reach the buckets. Counts stay identical whether or not the
     snapshot row is in the feed. */
  it("bucket counts are unchanged by today's mid-session snapshot", () => {
    const now = new Date("2022-01-24T15:00:00Z"); /* Monday, session running */
    const feed: CandleRow[] = [
      { date: "2022-01-07", open: 100, close: 100 },
      { date: "2022-01-10", open: 101, close: 101 },
      { date: "2022-01-14", open: 101, close: 101 },
      { date: "2022-01-18", open: 103, close: 103 },
      { date: "2022-01-21", open: 103, close: 103 },
    ];
    const snapshot: CandleRow = {
      date: "2022-01-24",
      open: 108,
      close: 104, /* partial, the session is still running */
    };

    const complete = computeGaps(feed, 5, now);
    const withSnapshot = computeGaps([...feed, snapshot], 5, now);

    expect(complete.totalWeekends).toBe(2);
    expect(withSnapshot.totalWeekends).toBe(complete.totalWeekends);
    expect(withSnapshot.buckets).toEqual(complete.buckets);
    expect(withSnapshot.top.map((event) => event.date)).not.toContain(
      "2022-01-24",
    );
  });

  it("counts nothing when today's snapshot is the only row", () => {
    const now = new Date("2022-01-24T15:00:00Z");
    const feed: CandleRow[] = [
      { date: "2022-01-21", open: 100, close: 100 },
      { date: "2022-01-24", open: 100.4, close: 101.2 },
    ];
    const result = computeGaps(feed, 5, now);
    expect(result.totalWeekends).toBe(0);
    expect(result.top).toHaveLength(0);
  });
});

describe("lastCompletedSession", () => {
  it("skips today's mid-session snapshot and returns yesterday's session", () => {
    const now = new Date("2026-09-15T15:00:00Z"); /* Tuesday, session running */
    const rows: CandleRow[] = [
      { date: "2026-09-11", open: 100, close: 100 },
      { date: "2026-09-14", open: 101, close: 101.5 },
      { date: "2026-09-15", open: 101.6, close: 102.1 }, /* today, partial */
    ];
    const closed = lastCompletedSession(rows, now);
    expect(closed?.date).toBe("2026-09-14");
    expect(closed?.close).toBe(101.5);
  });

  it("returns the last row when the feed already ends yesterday", () => {
    const now = new Date("2026-09-21T14:00:00Z"); /* Monday */
    const rows: CandleRow[] = [
      { date: "2026-09-17", open: 100, close: 100 },
      { date: "2026-09-18", open: 100, close: 99.2 },
    ];
    const closed = lastCompletedSession(rows, now);
    expect(closed?.date).toBe("2026-09-18");
    expect(closed?.close).toBe(99.2);
  });

  it("returns null for an empty feed", () => {
    expect(
      lastCompletedSession([], new Date("2026-09-21T14:00:00Z")),
    ).toBeNull();
  });

  it("returns null when today's snapshot is the only row", () => {
    const rows: CandleRow[] = [{ date: "2026-09-21", open: 100, close: 101 }];
    expect(
      lastCompletedSession(rows, new Date("2026-09-21T18:00:00Z")),
    ).toBeNull();
  });

  it("ignores future dated rows", () => {
    const rows: CandleRow[] = [
      { date: "2026-09-16", open: 100, close: 100 },
      { date: "2026-09-25", open: 120, close: 120 },
    ];
    const closed = lastCompletedSession(rows, new Date("2026-09-17T10:00:00Z"));
    expect(closed?.date).toBe("2026-09-16");
  });

  it("accepts full ISO timestamps as row dates", () => {
    const rows: CandleRow[] = [
      { date: "2026-09-11T05:00:00Z", open: 100, close: 100 },
      { date: "2026-09-14T05:00:00Z", open: 101, close: 102 },
    ];
    const closed = lastCompletedSession(rows, new Date("2026-09-15T05:00:00Z"));
    expect(closed?.date).toBe("2026-09-14T05:00:00Z");
    expect(closed?.close).toBe(102);
  });

  it("reads the UTC calendar date, never the local one", () => {
    const rows: CandleRow[] = [{ date: "2026-09-15", open: 100, close: 100 }];
    /* 23:30 UTC is already Sep 16 on a UTC+8 desk clock */
    expect(
      lastCompletedSession(rows, new Date("2026-09-15T23:30:00Z")),
    ).toBeNull();
    expect(
      lastCompletedSession(rows, new Date("2026-09-16T00:30:00Z"))?.date,
    ).toBe("2026-09-15");
  });
});

describe("bucket shares", () => {
  it("reports a bucket share as a percent of measured weekends", () => {
    const result = computeGaps(rowsFromGaps([-5, -3, -1, 1]), 5);
    expect(result.totalWeekends).toBe(4);
    expect(bucketSharePct(result, ["-4 to -2%"])).toBe(25);
    expect(bucketSharePct(result, ["-2 to 0%", "0 to +2%"])).toBe(50);
  });

  it("rounds the share to one decimal", () => {
    const result = computeGaps(rowsFromGaps([1, 1, -3]), 5);
    expect(bucketSharePct(result, ["0 to +2%"])).toBe(66.7);
  });

  it("returns zero when no weekend was measured", () => {
    const result = computeGaps([], 5);
    expect(result.totalWeekends).toBe(0);
    expect(bucketSharePct(result, ["0 to +2%"])).toBe(0);
  });

  it("ignores bucket labels that are not in the result", () => {
    const result = computeGaps(rowsFromGaps([1]), 5);
    expect(bucketSharePct(result, ["0 to +2%", "not a bucket"])).toBe(100);
  });

  it("ranks buckets by share, biggest first, declared order on ties", () => {
    const ranked = rankedBuckets(computeGaps(rowsFromGaps([0.5, 0.5, -3]), 5));
    expect(ranked).toHaveLength(6);
    expect(ranked[0]).toEqual({ label: "0 to +2%", sharePct: 66.7 });
    expect(ranked[1]).toEqual({ label: "-4 to -2%", sharePct: 33.3 });
    expect(ranked[2]).toEqual({ label: "< -4%", sharePct: 0 });
  });

  it("lists all six buckets in declared order when every share is zero", () => {
    const ranked = rankedBuckets(computeGaps([], 5));
    expect(ranked.map((bucket) => bucket.label)).toEqual([...GAP_BUCKETS]);
  });
});