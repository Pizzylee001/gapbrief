import type { GapResult } from "./gaps";

export type MarketStateKind = "open" | "closed" | "weekend";

/* Payload of GET /api/brief, every field is server computed */
export type BriefData = {
  ticker: string;
  underlying: string;
  price: {
    last: number;
    lastClose: number;
    deltaPct: number;
  };
  gaps: GapResult;
  marketState: MarketStateKind;
  generatedAt: string;
};