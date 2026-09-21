import { describe, expect, it } from "vitest";
import { deltaPct } from "../lib/delta";

describe("deltaPct", () => {
  it("computes (last - lastClose) / lastClose * 100", () => {
    expect(deltaPct(219.26, 218.4)).toBe(0.39);
  });

  it("returns a negative delta when the token is below the last close", () => {
    expect(deltaPct(100, 102)).toBe(-1.96);
  });

  it("returns 0 when the price matches the last close", () => {
    expect(deltaPct(50, 50)).toBe(0);
  });

  it("rounds to 2 decimals", () => {
    expect(deltaPct(100.555, 100)).toBe(0.56);
    expect(deltaPct(100.554, 100)).toBe(0.55);
  });

  it("throws when lastClose is zero to avoid dividing by zero", () => {
    expect(() => deltaPct(100, 0)).toThrow();
  });
});