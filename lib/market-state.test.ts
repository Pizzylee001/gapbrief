import { describe, expect, it } from "vitest";
import { marketState } from "../lib/market-state";

describe("marketState", () => {
  it("returns open on a weekday between 13:30 and 20:00 UTC inclusive", () => {
    /* Wednesday Sep 16 2026, 13:30:00 UTC */
    expect(marketState(new Date("2026-09-16T13:30:00Z"))).toBe("open");
    /* Wednesday Sep 16 2026, 16:00:00 UTC mid session */
    expect(marketState(new Date("2026-09-16T16:00:00Z"))).toBe("open");
    /* Wednesday Sep 16 2026, 19:59:59 UTC one second before close */
    expect(marketState(new Date("2026-09-16T19:59:59Z"))).toBe("open");
    /* Wednesday Sep 16 2026, 20:00:00 UTC inclusive close */
    expect(marketState(new Date("2026-09-16T20:00:00Z"))).toBe("open");
  });

  it("returns closed on a weekday outside the window", () => {
    /* Wednesday Sep 16 2026, 13:29:59 UTC one second before open */
    expect(marketState(new Date("2026-09-16T13:29:59Z"))).toBe("closed");
    /* Wednesday Sep 16 2026, 08:00:00 UTC early morning */
    expect(marketState(new Date("2026-09-16T08:00:00Z"))).toBe("closed");
    /* Wednesday Sep 16 2026, 22:00:00 UTC evening */
    expect(marketState(new Date("2026-09-16T22:00:00Z"))).toBe("closed");
    /* Wednesday Sep 16 2026, 20:00:01 UTC one second after close */
    expect(marketState(new Date("2026-09-16T20:00:01Z"))).toBe("closed");
  });

  it("returns weekend on Saturday and Sunday at any hour", () => {
    /* Saturday Sep 19 2026 */
    expect(marketState(new Date("2026-09-19T16:00:00Z"))).toBe("weekend");
    expect(marketState(new Date("2026-09-19T03:00:00Z"))).toBe("weekend");
    /* Sunday Sep 20 2026 */
    expect(marketState(new Date("2026-09-20T16:00:00Z"))).toBe("weekend");
    expect(marketState(new Date("2026-09-20T21:00:00Z"))).toBe("weekend");
  });
});