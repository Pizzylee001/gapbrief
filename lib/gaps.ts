export type CandleRow = {
  date: string;
  open: number;
  close: number;
};

export type GapEvent = {
  date: string;
  gapPct: number;
};

export type GapResult = {
  totalWeekends: number;
  buckets: Record<string, number>;
  top: GapEvent[];
};

export const GAP_BUCKETS = [
  "< -4%",
  "-4 to -2%",
  "-2 to 0%",
  "0 to +2%",
  "+2 to +4%",
  "> +4%",
] as const;

const DAY_MS = 86_400_000;

function parseUtc(date: string): number {
  const iso = date.length === 10 ? `${date}T00:00:00Z` : date;
  return Date.parse(iso);
}

function dayIso(date: string): string {
  return date.slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/* Bucket edges are inclusive on the lower bound of each bucket */
function bucketFor(gapPct: number): string {
  if (gapPct < -4) {
    return "< -4%";
  }
  if (gapPct < -2) {
    return "-4 to -2%";
  }
  if (gapPct < 0) {
    return "-2 to 0%";
  }
  if (gapPct < 2) {
    return "0 to +2%";
  }
  if (gapPct < 4) {
    return "+2 to +4%";
  }
  return "> +4%";
}

/* A span between two sessions crosses a weekend when at least one
   missing calendar day between them is a Saturday or a Sunday. A
   Monday to Friday stretch spans four days and crosses none. */
function crossesWeekend(fromDay: number, toDay: number): boolean {
  for (let day = fromDay + DAY_MS; day < toDay; day += DAY_MS) {
    const weekday = new Date(day).getUTCDay();
    if (weekday === 0 || weekday === 6) {
      return true;
    }
  }
  return false;
}

/* Longest real span that still represents one weekend gap: a Friday
   close followed by a holiday Monday and Tuesday opens Wednesday,
   six days. Anything longer is a hole in the feed, not a weekend. */
const MAX_WEEKEND_SPAN_DAYS = 6;

/* Weekend gap: the last trading close of one week to the first trading
   open of the next. Sessions are walked in date order; only spans that
   cross a Saturday or Sunday count, so a holiday Monday stretches the
   gap to the next trading day instead of losing the weekend. Spans
   longer than six days are feed holes and are skipped. The years
   window keeps only weekends whose open falls inside the last N years
   of the provided rows. */
export function computeGaps(rows: CandleRow[], years: number): GapResult {
  const byDay = new Map<number, CandleRow>();
  for (const row of rows) {
    byDay.set(parseUtc(row.date), row);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);
  const windowStart = days[days.length - 1] - years * 365 * DAY_MS;

  const buckets: Record<string, number> = {};
  for (const label of GAP_BUCKETS) {
    buckets[label] = 0;
  }
  const events: GapEvent[] = [];

  for (let i = 1; i < days.length; i += 1) {
    const spanDays = Math.round((days[i] - days[i - 1]) / DAY_MS);
    if (spanDays > MAX_WEEKEND_SPAN_DAYS) {
      continue;
    }
    if (!crossesWeekend(days[i - 1], days[i])) {
      continue;
    }
    const prev = byDay.get(days[i - 1]);
    const curr = byDay.get(days[i]);
    if (days[i] < windowStart || !prev || !curr) {
      continue;
    }
    const gapPct = round2(((curr.open - prev.close) / prev.close) * 100);
    buckets[bucketFor(gapPct)] += 1;
    events.push({ date: dayIso(curr.date), gapPct });
  }

  const top = [...events]
    .sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct))
    .slice(0, 5);

  return { totalWeekends: events.length, buckets, top };
}