/* Map of tradable rToken spot symbols to their US equity underlyings */
export const UNDERLYING_BY_RTOKEN: Record<string, string> = {
  RNVDAUSDT: "NVDA",
  RTSLAUSDT: "TSLA",
  RSPYUSDT: "SPY",
  RMSTRUSDT: "MSTR",
};

/* Resolves the underlying ticker, rejects anything outside the map */
export function underlyingFor(rtoken: string): string {
  const underlying = UNDERLYING_BY_RTOKEN[rtoken];
  if (underlying === undefined) {
    throw new Error(`Unknown rToken symbol: ${rtoken}`);
  }
  return underlying;
}