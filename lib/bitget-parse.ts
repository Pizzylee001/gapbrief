/* Bitget spot ticker price: the payload carries lastPr, older docs
   name it last, so last wins and lastPr is the fallback. Throws when
   neither field parses. */
export function pickLast(body: unknown): number {
  const data = (body as { data?: Array<{ last?: unknown; lastPr?: unknown }> })
    ?.data;
  const entry = data?.[0];
  const last = Number(entry?.last ?? entry?.lastPr);
  if (!Number.isFinite(last)) {
    throw new Error("Ticker response carries no price");
  }
  return last;
}