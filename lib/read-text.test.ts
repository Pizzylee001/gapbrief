import { describe, expect, it } from "vitest";
import { splitFinalSentence } from "../lib/read-text";

describe("splitFinalSentence", () => {
  it("splits the final sentence off the read", () => {
    const split = splitFinalSentence(
      "The token trades 0.39 percent above Friday's close. In the five analogs the average Monday open was down 2.5 percent.",
    );
    expect(split.body).toBe(
      "The token trades 0.39 percent above Friday's close.",
    );
    expect(split.final).toBe(
      "In the five analogs the average Monday open was down 2.5 percent.",
    );
  });

  it("keeps only the last sentence as the marked clause", () => {
    const split = splitFinalSentence("One. Two. Three.");
    expect(split.body).toBe("One. Two.");
    expect(split.final).toBe("Three.");
  });

  it("does not cut on decimals", () => {
    const split = splitFinalSentence(
      "The desk reads 0.01 percent funding per hour as the biggest risk.",
    );
    expect(split.body).toBe("");
    expect(split.final).toBe(
      "The desk reads 0.01 percent funding per hour as the biggest risk.",
    );
  });

  it("returns the whole text as final when there is no separator", () => {
    expect(splitFinalSentence("Watch the funding cost")).toEqual({
      body: "",
      final: "Watch the funding cost",
    });
  });

  it("returns empty parts for an empty paragraph", () => {
    expect(splitFinalSentence("   ")).toEqual({ body: "", final: "" });
  });

  it("trims whitespace around the parts", () => {
    const split = splitFinalSentence("  First sentence.   Final sentence.  ");
    expect(split.body).toBe("First sentence.");
    expect(split.final).toBe("Final sentence.");
  });
});