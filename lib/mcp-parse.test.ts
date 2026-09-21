import { describe, expect, it } from "vitest";
import {
  extractText,
  lastMessagePayload,
  parseRows,
  parseSseData,
} from "./mcp-parse";

/* A realistic tools/call envelope, folded into a single SSE line */
const TOOL_PAYLOAD = {
  jsonrpc: "2.0",
  id: 2,
  result: {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          code: 0,
          data: {
            has_more: true,
            results: [
              {
                date: "2021-09-01",
                open: 154.21,
                high: 155.4,
                low: 152.03,
                close: 153.98,
                volume: 42194500,
                next_time: 1630518600,
              },
              {
                date: "2021-09-02",
                open: "154.5",
                high: 156.1,
                low: 154.2,
                close: "155.81",
                volume: 39875500,
              },
            ],
          },
        }),
      },
    ],
  },
};

describe("parseSseData", () => {
  it("extracts the JSON payload from a single data line", () => {
    const body = `data: ${JSON.stringify(TOOL_PAYLOAD)}\n\n`;
    expect(parseSseData(body)).toEqual([TOOL_PAYLOAD]);
  });

  it("collects payloads from multiple data lines in order", () => {
    const body = [
      "data: {\"jsonrpc\":\"2.0\",\"method\":\"x\"}",
      "",
      `data: ${JSON.stringify(TOOL_PAYLOAD)}`,
      "",
    ].join("\n");
    expect(parseSseData(body)).toHaveLength(2);
    expect(parseSseData(body)[1]).toEqual(TOOL_PAYLOAD);
  });

  it("skips a truncated trailing line that is not valid JSON", () => {
    const body = `data: ${JSON.stringify(TOOL_PAYLOAD)}\ndata: {"jsonrpc":"2.`;
    const payloads = parseSseData(body);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toEqual(TOOL_PAYLOAD);
  });

  it("falls back to whole-body JSON for application/json responses", () => {
    const body = JSON.stringify(TOOL_PAYLOAD);
    expect(parseSseData(body)).toEqual([TOOL_PAYLOAD]);
  });

  it("returns an empty array for a garbage body", () => {
    expect(parseSseData("not json at all")).toEqual([]);
  });
});

describe("lastMessagePayload", () => {
  it("returns the last payload from an SSE body", () => {
    const body = `data: {"jsonrpc":"2.0","method":"x"}\ndata: ${JSON.stringify(
      TOOL_PAYLOAD,
    )}\n`;
    expect(lastMessagePayload(body)).toEqual(TOOL_PAYLOAD);
  });

  it("returns null when nothing parsed", () => {
    expect(lastMessagePayload("")).toBeNull();
  });
});

describe("extractText", () => {
  it("pulls content[0].text from a tools/call result", () => {
    const text = extractText(TOOL_PAYLOAD);
    expect(JSON.parse(text).data.results).toHaveLength(2);
  });

  it("throws when the envelope carries no content", () => {
    expect(() => extractText({ jsonrpc: "2.0", id: 2, result: {} })).toThrow();
    expect(() => extractText(null)).toThrow();
  });
});

describe("parseRows", () => {
  it("maps data.results to date, open and close rows, coercing strings", () => {
    const rows = parseRows(extractText(TOOL_PAYLOAD));
    expect(rows).toEqual([
      { date: "2021-09-01", open: 154.21, close: 153.98 },
      { date: "2021-09-02", open: 154.5, close: 155.81 },
    ]);
  });

  it("drops rows without a usable date, open or close", () => {
    const text = JSON.stringify({
      data: {
        results: [
          { date: "2021-09-01", open: 1, close: 2 },
          { date: "", open: 1, close: 2 },
          { date: "2021-09-02", open: "x", close: 2 },
          { date: "2021-09-03", open: 3, close: undefined },
        ],
      },
    });
    expect(parseRows(text)).toEqual([{ date: "2021-09-01", open: 1, close: 2 }]);
  });

  it("returns an empty array when there are no results", () => {
    expect(parseRows("{}")).toEqual([]);
    expect(parseRows("broken")).toEqual([]);
  });

  it("normalizes full ISO timestamps to calendar dates", () => {
    const text = JSON.stringify({
      success: true,
      status_code: 200,
      data: {
        id: "06ab1283",
        results: [
          { date: "2021-09-01T04:00:00Z", open: 22.485, close: 22.441 },
          { date: "2021-09-02T04:00:00Z", open: 22.5, close: 22.6 },
        ],
      },
    });
    expect(parseRows(text)).toEqual([
      { date: "2021-09-01", open: 22.485, close: 22.441 },
      { date: "2021-09-02", open: 22.5, close: 22.6 },
    ]);
  });

  it("decodes a real SSE stream with event and data lines", () => {
    const envelope = {
      jsonrpc: "2.0",
      id: 2,
      result: { content: [{ type: "text", text: '{"data":{"results":[]}}' }] },
    };
    const body = `event: message\ndata: ${JSON.stringify(envelope)}\n\n`;
    const payload = lastMessagePayload(body);
    expect(payload).toEqual(envelope);
  });
});