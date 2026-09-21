import { rankedBuckets, type GapResult } from "./gaps";
import { FALLBACK_STAMP, MODEL_STAMP, type ReadSource } from "./types";

/* Re-exported so the whole desk-read layer speaks one vocabulary. The
   stamps live with the payload contract in types.ts. */
export { FALLBACK_STAMP, MODEL_STAMP };

/* Qwen is the desk writer. The request goes to the hackathon gateway
   with the key from the environment. The key is read once per call,
   never logged, never echoed into the response and never written to
   any file. */
export const QWEN_URL = "https://hackathon.bitgetops.com/v1/chat/completions";
export const QWEN_MODEL = "qwen3.8-max";
export const QWEN_TIMEOUT_MS = 30000;

/* Fixed fallback strings of the read zone */
export const NO_KEY_READ =
  "The desk's read is unavailable: model key not configured.";
export const NO_RESPONSE_READ =
  "The desk's read is unavailable: the model did not respond.";

const INSTRUCTION =
  "You are a trading desk writer. Write 2 to 3 sentences, plain language, no financial advice, no invented numbers, only use the numbers given. End by naming the single biggest risk in one clause.";

export type ReadInput = {
  ticker: string;
  underlying: string;
  last: number;
  lastClose: number;
  sessionCloseDate: string;
  deltaPct: number;
  gaps: GapResult;
};

export type DeskRead = {
  read: string;
  readSource: ReadSource;
  stamp: string;
};

function fallback(read: string): DeskRead {
  return { read, readSource: "fallback", stamp: FALLBACK_STAMP };
}

/* Extracts choices[0].message.content as a trimmed string. A missing
   envelope, a missing field, a non string or blank content all return
   null, which the caller treats as no response. */
export function parseCompletion(body: unknown): string | null {
  const envelope = body as
    | { choices?: Array<{ message?: { content?: unknown } }> }
    | null
    | undefined;
  const content = envelope?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return null;
  }
  const trimmed = content.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/* The prompt assembles from the computed numbers only: ticker,
   underlying, live token price, the completed session close and its
   date, the delta, the measured weekends, the top three bucket shares
   as percents and the top three weekend gaps with dates and gapPct. */
export function buildReadPrompt(input: ReadInput): string {
  const buckets = rankedBuckets(input.gaps)
    .slice(0, 3)
    .map((bucket) => `- ${bucket.label}: ${bucket.sharePct} percent`);
  const events = input.gaps.top
    .slice(0, 3)
    .map(
      (event) =>
        `- ${event.date}: ${event.gapPct > 0 ? "+" : ""}${event.gapPct} percent`,
    );
  return [
    INSTRUCTION,
    "",
    `Ticker: ${input.ticker}`,
    `Underlying: ${input.underlying}`,
    `Live token price: ${input.last}`,
    `Last completed session close: ${input.lastClose} on ${input.sessionCloseDate}`,
    `Delta against that close: ${input.deltaPct} percent`,
    `Weekends measured over the last five years: ${input.gaps.totalWeekends}`,
    "Top bucket shares of the measured weekends:",
    ...buckets,
    "Largest weekend gaps:",
    ...events,
  ].join("\n");
}

/* One call to the gateway with a hard 30 second timeout and one retry.
   On a missing key, a failed status, a timeout or an unusable envelope
   the brief still returns, with the fixed fallback string, so the
   route keeps answering 200. */
export async function deskRead(
  input: ReadInput,
  fetchImpl: typeof fetch = fetch,
): Promise<DeskRead> {
  const key = process.env.QWEN_API_KEY;
  if (!key) {
    return fallback(NO_KEY_READ);
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(QWEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(QWEN_TIMEOUT_MS),
        body: JSON.stringify({
          model: QWEN_MODEL,
          messages: [{ role: "user", content: buildReadPrompt(input) }],
          temperature: 0.4,
          max_tokens: 220,
        }),
      });
      if (!response.ok) {
        throw new Error(`Qwen status ${response.status}`);
      }
      const read = parseCompletion(await response.json());
      if (read === null) {
        throw new Error("Qwen response carries no content");
      }
      return { read, readSource: "model", stamp: MODEL_STAMP };
    } catch {
      /* One retry, then the fixed fallback */
    }
  }
  return fallback(NO_RESPONSE_READ);
}