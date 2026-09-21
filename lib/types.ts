import type { GapResult } from "./gaps";

export type MarketStateKind = "open" | "closed" | "weekend";

/* Where the desk read came from: the model wrote it, or the brief fell
   back to the fixed unavailable string */
export type ReadSource = "model" | "fallback";

/* Stamps of the read zone. They travel with the payload contract so
   the server and the sheet agree on the wording. */
export const MODEL_STAMP = "QWEN QWEN3.8-MAX";
export const FALLBACK_STAMP = "MODEL OFFLINE";

/* Resolves the read zone stamp from the readSource of the payload */
export function stampForSource(source: ReadSource): string {
  return source === "model" ? MODEL_STAMP : FALLBACK_STAMP;
}

/* Payload of GET /api/brief, every field is server computed */
export type BriefData = {
  ticker: string;
  underlying: string;
  price: {
    last: number;
    lastClose: number;
    deltaPct: number;
  };
  /* Date of the completed session the live price is compared against,
     the most recent session that finished */
  sessionCloseDate: string;
  gaps: GapResult;
  /* The desk's read, written by the model or the fixed fallback string */
  read: string;
  readSource: ReadSource;
  marketState: MarketStateKind;
  generatedAt: string;
};