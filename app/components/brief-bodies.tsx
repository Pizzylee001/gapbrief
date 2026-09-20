import type { ReactNode } from "react";

/* SAMPLE gap history: bucket label, fill share of the half track, week count */
const GAP_ROWS = [
  { label: "< -4%", fill: 6, count: "4 wks", dir: "neg" },
  { label: "-4 to -2%", fill: 14, count: "11 wks", dir: "neg" },
  { label: "-2 to 0%", fill: 30, count: "24 wks", dir: "neg" },
  { label: "0 to +2%", fill: 28, count: "22 wks", dir: "pos" },
  { label: "+2 to +4%", fill: 15, count: "12 wks", dir: "pos" },
  { label: "> +4%", fill: 7, count: "5 wks", dir: "pos" },
];

/* SAMPLE weekend analogs with the Monday open that followed */
const EVENTS = [
  { date: "2025-06-14", name: "Strike on the Strait of Hormuz", delta: "-2.1%" },
  { date: "2024-08-03", name: "Carry-trade unwind, yen surge", delta: "-6.8%" },
  { date: "2023-10-07", name: "Attack on Israel", delta: "-1.2%" },
];

/* SAMPLE desk options */
const OPTIONS = [
  {
    tag: "HOLD",
    text: "58 percent of this stock’s Mondays opened flat to up, and the token already reflects the Saturday move.",
  },
  {
    tag: "TRIM",
    text: "Selling 25 percent before Monday open caps the worst historical bucket at a known cost.",
  },
  {
    tag: "HEDGE",
    text: "A short perp position of equal size has carried a funding cost near 0.01% per hour, SAMPLE.",
  },
];

const COLUMNS = "grid grid-cols-1 lg:grid-cols-[5fr_1px_7fr]";
const LEFT_COLUMN = "p-6 max-lg:border-b max-lg:border-line-subtle";
const HAIRLINE = "hidden bg-line-subtle lg:block";
const RIGHT_COLUMN = "p-6";

/* One zone: 3px forest rule, Bebas heading, mono stamp floated right */
function Zone({
  title,
  stamp,
  first = false,
  delay,
  children,
}: {
  title: string;
  stamp?: string;
  first?: boolean;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <div
      className={`mb-5 pb-5 ${first ? "" : "border-t-[3px] border-t-green"}${
        delay === undefined ? "" : " gb-zone-in"
      }`}
      style={delay === undefined ? undefined : { animationDelay: `${delay}ms` }}
    >
      <h2 className="m-3 font-display text-[20px] font-normal uppercase tracking-[0.04em]">
        {stamp ? (
          <span className="float-right mt-1.5 font-data text-[11px] font-medium text-muted">
            {stamp}
          </span>
        ) : null}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Skel({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`gb-skeleton ${className}`} />;
}

export function EmptyBody() {
  return (
    <div className="px-6 py-6">
      <p>No brief has been computed yet.</p>
      <p className="text-muted">Pick a ticker and run the brief.</p>
    </div>
  );
}

export function ErrorBody({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-6 py-6">
      <p>The data feed failed to respond. Check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-12 border border-line bg-card px-7 font-body text-sm font-semibold uppercase tracking-[0.06em] text-ink transition-colors duration-150 hover:border-muted"
      >
        Retry
      </button>
    </div>
  );
}

/* Skeleton rows shaped like each zone, labels stay visible */
export function ComputingBody() {
  return (
    <div className={COLUMNS}>
      <div className={LEFT_COLUMN}>
        <Zone title="The desk’s read" first delay={0}>
          <div className="flex flex-col gap-2">
            <Skel className="w-full" />
            <Skel className="w-[92%]" />
            <Skel className="w-2/3" />
          </div>
        </Zone>
        <Zone title="Options on the desk" stamp="NOT FINANCIAL ADVICE" delay={40}>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skel className="h-5 w-12 shrink-0" />
                <Skel className="w-full" />
              </div>
            ))}
          </div>
        </Zone>
      </div>
      <div className={HAIRLINE} aria-hidden="true" />
      <div className={RIGHT_COLUMN}>
        <Zone title="Where the token sits now" stamp="BITGET SPOT" first delay={80}>
          <div className="flex flex-wrap items-center gap-3">
            <Skel className="h-5 w-24" />
            <Skel className="w-40" />
            <Skel className="h-5 w-16" />
          </div>
        </Zone>
        <Zone title="Monday gap history, 5 years" stamp="SAMPLE DATA" delay={120}>
          <div className="flex flex-col gap-1.5">
            {GAP_ROWS.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[72px_1fr_52px] items-center gap-2.5"
              >
                <Skel className="w-full" />
                <Skel className="w-full" />
                <Skel className="w-full" />
              </div>
            ))}
          </div>
        </Zone>
        <Zone
          title="Weekends that looked like this one"
          stamp="SAMPLE DATA"
          delay={160}
        >
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="grid grid-cols-[110px_1fr_auto] items-center gap-3"
              >
                <Skel className="w-full" />
                <Skel className="w-full" />
                <Skel className="w-full" />
              </div>
            ))}
          </div>
        </Zone>
      </div>
    </div>
  );
}

/* The computed sheet, every number on it is SAMPLE data */
export function PopulatedBody({ swept }: { swept: boolean }) {
  return (
    <div className={COLUMNS}>
      <div className={LEFT_COLUMN}>
        <Zone title="The desk’s read" first delay={0}>
          <p className="text-base">
            SAMPLE: The token trades 0.39 percent above Friday’s close, which
            says the overnight crowd already leaned bullish.{" "}
            <span className="gb-marker" data-on={swept ? "true" : "false"}>
              In the five historical analogs, the average Monday open was down
              2.5 percent, but three of five recovered within two sessions.
            </span>
          </p>
        </Zone>
        <Zone title="Options on the desk" stamp="NOT FINANCIAL ADVICE" delay={40}>
          <div className="mt-1 flex flex-col gap-3">
            {OPTIONS.map((option) => (
              <div
                key={option.tag}
                className="flex items-baseline gap-3 text-[14.5px]"
              >
                <span className="whitespace-nowrap border border-green px-2 py-0.5 font-data text-xs text-green">
                  {option.tag}
                </span>
                <span>{option.text}</span>
              </div>
            ))}
          </div>
        </Zone>
      </div>
      <div className={HAIRLINE} aria-hidden="true" />
      <div className={RIGHT_COLUMN}>
        <Zone title="Where the token sits now" stamp="BITGET SPOT" first delay={80}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-data text-[20px] tabular-nums">219.26</span>
            <span className="font-data text-[12.5px] tabular-nums text-muted">
              last US close 218.40
            </span>
            <span className="font-data text-[20px] tabular-nums text-pos">
              +0.39%
            </span>
          </div>
        </Zone>
        <Zone title="Monday gap history, 5 years" stamp="SAMPLE DATA" delay={120}>
          <div
            className="flex flex-col gap-1.5"
            role="img"
            aria-label="Distribution of Friday close to Monday open gaps, sample data"
          >
            {GAP_ROWS.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[72px_1fr_52px] items-center gap-2.5 font-data text-xs tabular-nums text-muted"
              >
                <span>{row.label}</span>
                <div className="relative h-3.5 overflow-hidden bg-line-subtle">
                  <div
                    className={`absolute bottom-0 top-0 ${
                      row.dir === "pos"
                        ? "left-1/2 bg-pos"
                        : "right-1/2 bg-neg"
                    }`}
                    style={{ width: `${row.fill}%` }}
                  />
                </div>
                <span>{row.count}</span>
              </div>
            ))}
          </div>
          <table className="gb-visually-hidden">
            <caption>Monday gap history, five years, sample data</caption>
            <thead>
              <tr>
                <th scope="col">Gap bucket</th>
                <th scope="col">Share of weeks</th>
                <th scope="col">Weeks</th>
              </tr>
            </thead>
            <tbody>
              {GAP_ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.fill} percent</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Zone>
        <Zone
          title="Weekends that looked like this one"
          stamp="SAMPLE DATA"
          delay={160}
        >
          <div className="flex flex-col">
            {EVENTS.map((event, index) => (
              <div
                key={event.date}
                className={`grid grid-cols-[110px_1fr_auto] items-baseline gap-3 py-2.5 text-sm${
                  index < EVENTS.length - 1
                    ? " border-b border-line-subtle"
                    : ""
                }`}
              >
                <span className="font-data text-[13px] tabular-nums text-muted">
                  {event.date}
                </span>
                <span>{event.name}</span>
                <span className="font-data text-[12.5px] tabular-nums text-muted">
                  MON OPEN <span className="text-neg">{event.delta}</span>
                </span>
              </div>
            ))}
          </div>
        </Zone>
      </div>
    </div>
  );
}