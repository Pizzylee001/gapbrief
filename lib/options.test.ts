import { describe, expect, it } from "vitest";
import { optionRows } from "../lib/options";
import type { GapResult } from "../lib/gaps";

/* 240 measured weekends, a realistic distribution */
function gapsFixture(): GapResult {
  return {
    totalWeekends: 240,
    buckets: {
      "< -4%": 12,
      "-4 to -2%": 18,
      "-2 to 0%": 60,
      "0 to +2%": 96,
      "+2 to +4%": 36,
      "> +4%": 18,
    },
    top: [],
  };
}

describe("optionRows", () => {
  it("HOLD cites the real share of weekends opening between -2 and +2 percent", () => {
    const hold = optionRows(gapsFixture()).find((row) => row.tag === "HOLD");
    expect(hold?.text).toBe(
      "65 percent of the last 240 weekends opened between -2 percent and +2 percent, and the token already reflects the move.",
    );
  });

  it("TRIM keeps its sentence and cites the real worst-bucket share", () => {
    const trim = optionRows(gapsFixture()).find((row) => row.tag === "TRIM");
    expect(trim?.text).toBe(
      "Selling 25 percent before Monday open caps the worst historical bucket at a known cost: 40 percent of the last 240 weekends opened in 0 to +2%.",
    );
  });

  it("HEDGE keeps its funding sentence with its SAMPLE marker", () => {
    const hedge = optionRows(gapsFixture()).find((row) => row.tag === "HEDGE");
    expect(hedge?.text).toBe(
      "A short perp position of equal size has carried a funding cost near 0.01% per hour, SAMPLE.",
    );
  });

  it("returns exactly the three desk options in order", () => {
    expect(optionRows(gapsFixture()).map((row) => row.tag)).toEqual([
      "HOLD",
      "TRIM",
      "HEDGE",
    ]);
  });

  it("cites different shares for a different distribution", () => {
    const other = gapsFixture();
    other.totalWeekends = 10;
    other.buckets = {
      "< -4%": 0,
      "-4 to -2%": 1,
      "-2 to 0%": 4,
      "0 to +2%": 3,
      "+2 to +4%": 1,
      "> +4%": 1,
    };
    const rows = optionRows(other);
    expect(rows.find((row) => row.tag === "HOLD")?.text).toContain(
      "70 percent of the last 10 weekends",
    );
    expect(rows.find((row) => row.tag === "TRIM")?.text).toContain(
      "40 percent of the last 10 weekends opened in -2 to 0%",
    );
  });
});