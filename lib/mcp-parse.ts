import type { CandleRow } from "./gaps";

/* Decoders for the Bitget MCP streamable HTTP responses. The
   tools/call result arrives either as SSE lines, one JSON-RPC message
   per data line (possibly truncated at the tail), or as a plain
   application/json body. */

/* Splits an SSE or JSON body into parsed JSON-RPC payloads. Truncated
   tail lines fail JSON.parse and are skipped. */
export function parseSseData(body: string): unknown[] {
  const payloads: unknown[] = [];
  const hasDataLines = /^data:/m.test(body);
  if (hasDataLines) {
    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }
      try {
        payloads.push(JSON.parse(trimmed.slice(5).trim()));
      } catch {
        /* Truncated tail or keepalive, ignore */
      }
    }
    return payloads;
  }
  try {
    payloads.push(JSON.parse(body));
  } catch {
    /* Not JSON at all */
  }
  return payloads;
}

/* Last parsable payload of a body, the one carrying the final result */
export function lastMessagePayload(body: string): unknown {
  const payloads = parseSseData(body);
  if (payloads.length === 0) {
    return null;
  }
  return payloads[payloads.length - 1];
}

/* Pulls content[0].text out of a tools/call result envelope */
export function extractText(payload: unknown): string {
  const envelope = payload as
    | { result?: { content?: Array<{ text?: string }> } }
    | null;
  const text = envelope?.result?.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("MCP response carries no text content");
  }
  return text;
}

/* Decodes the JSON string inside content[0].text into candle rows.
   Rows live under data.results and carry extra fields that are
   dropped; unusable rows are dropped too. Dates arrive either as
   YYYY-MM-DD or as full ISO timestamps and are normalized to the
   calendar date. */
export function parseRows(text: string): CandleRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const results =
    (parsed as { data?: { results?: unknown } })?.data?.results ??
    (parsed as { results?: unknown })?.results;
  if (!Array.isArray(results)) {
    return [];
  }
  const rows: CandleRow[] = [];
  for (const entry of results) {
    const row = entry as { date?: unknown; open?: unknown; close?: unknown };
    const open = Number(row.open);
    const close = Number(row.close);
    const raw = typeof row.date === "string" ? row.date.slice(0, 10) : "";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
    if (!date || !Number.isFinite(open) || !Number.isFinite(close)) {
      continue;
    }
    rows.push({ date, open, close });
  }
  return rows;
}