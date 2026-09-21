import { bucketSharePct, rankedBuckets, type GapResult } from "./gaps";

export type OptionRow = {
  tag: "HOLD" | "TRIM" | "HEDGE";
  text: string;
};

/* The options zone is template composition from the computed numbers,
   never model text. HOLD cites the real share of weekends that opened
   between -2 and +2 percent. TRIM keeps its sentence and cites the
   worst historical bucket, the bucket that holds the largest share of
   the measured weekends, the outcome the trim most plausibly pays
   for. HEDGE keeps its funding sentence; the funding rate is not
   computed in this brief, so its number keeps the SAMPLE marker. */
export function optionRows(gaps: GapResult): OptionRow[] {
  const flat = bucketSharePct(gaps, ["-2 to 0%", "0 to +2%"]);
  const worst = rankedBuckets(gaps)[0];
  return [
    {
      tag: "HOLD",
      text: `${flat} percent of the last ${gaps.totalWeekends} weekends opened between -2 percent and +2 percent, and the token already reflects the move.`,
    },
    {
      tag: "TRIM",
      text: `Selling 25 percent before Monday open caps the worst historical bucket at a known cost: ${worst.sharePct} percent of the last ${gaps.totalWeekends} weekends opened in ${worst.label}.`,
    },
    {
      tag: "HEDGE",
      text: "A short perp position of equal size has carried a funding cost near 0.01% per hour, SAMPLE.",
    },
  ];
}