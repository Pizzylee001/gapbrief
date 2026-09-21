export type MarketState = "open" | "closed" | "weekend";

/* Approximation: fixed 13:30 to 20:00 UTC window, ignores US DST shifts
   of plus or minus one hour. */
export function marketState(now: Date): MarketState {
  const day = now.getUTCDay();
  if (day === 0 || day === 6) {
    return "weekend";
  }
  const minutes =
    now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
  if (minutes >= 13 * 60 + 30 && minutes <= 20 * 60) {
    return "open";
  }
  return "closed";
}