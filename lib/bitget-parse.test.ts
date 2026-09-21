import { describe, expect, it } from "vitest";
import { pickLast } from "./bitget-parse";

describe("pickLast", () => {
  it("prefers last when both price fields are present", () => {
    const envelope = { data: [{ last: "10", lastPr: "20" }] };
    expect(pickLast(envelope)).toBe(10);
  });

  it("falls back to lastPr when last is absent", () => {
    const envelope = { data: [{ lastPr: "223.74" }] };
    expect(pickLast(envelope)).toBe(223.74);
  });

  it("rejects a body with no usable price", () => {
    expect(() => pickLast({ data: [{}] })).toThrow();
    expect(() => pickLast({ data: [] })).toThrow();
  });
});