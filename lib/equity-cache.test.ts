import { describe, expect, it } from "vitest";
import { readCache, writeCache } from "./equity-cache";

describe("equity-cache", () => {
  it("serves a fresh entry and drops a stale one", () => {
    const now = Date.now();
    writeCache("NVDA", [{ date: "2026-09-22", open: 1, close: 2 }], "nasdaq", now);
    expect(readCache("NVDA", now)?.source).toBe("nasdaq");
    expect(readCache("NVDA", now + 6 * 3600 * 1000 + 1)).toBeNull();
  });
});
