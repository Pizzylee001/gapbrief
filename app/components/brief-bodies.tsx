import type { ReactNode } from "react";
import { GAP_BUCKETS } from "@/lib/gaps";
import { optionRows } from "@/lib/options";
import { splitFinalSentence } from "@/lib/read-text";
import { stampForSource, historyStamp } from "@/lib/types";
import type { BriefData } from "@/lib/types";

/* Direction color of each gap bucket, neg bars grow left of center */
const BUCKET_DIR: Record<string, "neg" | "pos"> = {
  "< -4%": "neg",
  "-4 to -2%": "neg",
  "-2 to 0%": "neg",
  "0 to +2%": "pos",
  "+2 to +4%": "pos",
  "> +4%": "pos",
};

/* Gap history row shape, kept for the computing skeleton only */
const GAP_ROWS = [
  { label: "< -4%", fill: 6, count: "4 wks", dir: "neg" },
  { label: "-4 to -2%", fill: 14, count: "11 wks", dir: "neg" },
  { label: "-2 to 0%", fill: 30, count: "24 wks", dir: "neg" },
  { label: "0 to +2%", fill: 28, count: "22 wks", dir: "pos" },
  { label: "+2 to +4%", fill: 15, count: "12 wks", dir: "pos" },
  { label: "> +4%", fill: 7, count: "5 wks", dir: "pos" },
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
        <Zone title="Gap history" stamp="BITGET US EQUITY FEED" delay={120}>
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
          stamp="BITGET US EQUITY FEED"
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

/* The computed sheet, every zone reads the API payload: the read is
   the model's paragraph with its final sentence under the marker
   stroke, the options are template sentences composed from the
   measured bucket shares */
export function PopulatedBody({
  swept,
  data,
}: {
  swept: boolean;
  data: BriefData;
}) {
  const { last, lastClose, deltaPct } = data.price;
  const total = data.gaps.totalWeekends;
  const { body, final } = splitFinalSentence(data.read);
  const options = optionRows(data.gaps);
  return (
    <div className={COLUMNS}>
      <div className={LEFT_COLUMN}>
        <Zone
          title="The desk’s read"
          stamp={stampForSource(data.readSource)}
          first
          delay={0}
        >
          <p
            className={`text-base${
              data.readSource === "fallback" ? " text-muted" : ""
            }`}
          >
            {body ? `${body} ` : null}
            <span className="gb-marker" data-on={swept ? "true" : "false"}>
              {final}
            </span>
          </p>
        </Zone>
        <Zone title="Options on the desk" stamp="NOT FINANCIAL ADVICE" delay={40}>
          <div className="mt-1 flex flex-col gap-3">
            {options.map((option) => (
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
            <span className="font-data text-[20px] tabular-nums">{last}</span>
            <span className="font-data text-[12.5px] tabular-nums text-muted">
              last close ({data.sessionCloseDate}) {lastClose}
            </span>
            <span
              className={`font-data text-[20px] tabular-nums ${
                deltaPct < 0 ? "text-neg" : "text-pos"
              }`}
            >
              {deltaPct < 0 ? "" : "+"}
              {deltaPct}%
            </span>
          </div>
        </Zone>
        <Zone
          title={`Gap history, last ${total} weekends`}
          stamp={historyStamp(data.source)}
          delay={120}
        >
          <div
            className="flex flex-col gap-1.5"
            role="img"
            aria-label={`Distribution of Friday close to next week open gaps, ${historyStamp(data.source)}`}
          >
            {GAP_BUCKETS.map((label) => {
              const count = data.gaps.buckets[label];
              const fill = total > 0 ? (count / total) * 100 : 0;
              return (
                <div
                  key={label}
                  className="grid grid-cols-[72px_1fr_52px] items-center gap-2.5 font-data text-xs tabular-nums text-muted"
                >
                  <span>{label}</span>
                  <div className="relative h-3.5 overflow-hidden bg-line-subtle">
                    <div
                      className={`absolute bottom-0 top-0 ${
                        BUCKET_DIR[label] === "pos"
                          ? "left-1/2 bg-pos"
                          : "right-1/2 bg-neg"
                      }`}
                      style={{ width: `${fill}%` }}
                    />
                  </div>
                  <span>{count} wks</span>
                </div>
              );
            })}
          </div>
          <table className="gb-visually-hidden">
            <caption>
              Gap history, last five years, {historyStamp(data.source)}
            </caption>
            <thead>
              <tr>
                <th scope="col">Gap bucket</th>
                <th scope="col">Share of weekends</th>
                <th scope="col">Weekends</th>
              </tr>
            </thead>
            <tbody>
              {GAP_BUCKETS.map((label) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>
                    {total > 0
                      ? ((data.gaps.buckets[label] / total) * 100).toFixed(1)
                      : "0.0"}{" "}
                    percent
                  </td>
                  <td>{data.gaps.buckets[label]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Zone>
        <Zone
          title="Weekends that looked like this one"
          stamp={historyStamp(data.source)}
          delay={160}
        >
          <div className="flex flex-col">
            {data.gaps.top.map((event, index) => (
              <div
                key={event.date}
                className={`grid grid-cols-1 gap-1 py-2.5 text-sm sm:grid-cols-[110px_1fr_auto] sm:items-baseline sm:gap-3${
                  index < data.gaps.top.length - 1
                    ? " border-b border-line-subtle"
                    : ""
                }`}
              >
                <span className="font-data text-[13px] tabular-nums text-muted">
                  {event.date}
                </span>
                <span>Worst gaps from the last five years</span>
                <span className="font-data text-[12.5px] tabular-nums text-muted">
                  WEEKEND OPEN{" "}
                  <span
                    className={event.gapPct < 0 ? "text-neg" : "text-pos"}
                  >
                    {event.gapPct < 0 ? "" : "+"}
                    {event.gapPct}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Zone>
      </div>
    </div>
  );
}