import { describe, expect, it } from "vitest";
import { UNDERLYING_BY_RTOKEN, underlyingFor } from "../lib/symbols";

describe("UNDERLYING_BY_RTOKEN", () => {
  it("maps the four tradable rTokens to their underlyings", () => {
    expect(UNDERLYING_BY_RTOKEN).toEqual({
      RNVDAUSDT: "NVDA",
      RTSLAUSDT: "TSLA",
      RSPYUSDT: "SPY",
      RMSTRUSDT: "MSTR",
    });
  });
});

describe("underlyingFor", () => {
  it("maps each known rToken symbol", () => {
    expect(underlyingFor("RNVDAUSDT")).toBe("NVDA");
    expect(underlyingFor("RTSLAUSDT")).toBe("TSLA");
    expect(underlyingFor("RSPYUSDT")).toBe("SPY");
    expect(underlyingFor("RMSTRUSDT")).toBe("MSTR");
  });

  it("rejects unknown symbols with an error", () => {
    expect(() => underlyingFor("BADUSDT")).toThrow();
    expect(() => underlyingFor("BTCUSDT")).toThrow();
    expect(() => underlyingFor("")).toThrow();
  });

  it("is case sensitive, lowercase input is rejected", () => {
    expect(() => underlyingFor("rnvdausdt")).toThrow();
  });
});