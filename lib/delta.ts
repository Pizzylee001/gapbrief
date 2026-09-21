/* Delta of the live rToken price from the last US close, in percent,
   rounded to 2 decimals */
export function deltaPct(last: number, lastClose: number): number {
  if (lastClose === 0) {
    throw new Error("lastClose is zero, delta is undefined");
  }
  const pct = ((last - lastClose) / lastClose) * 100;
  return Math.round(pct * 100) / 100;
}