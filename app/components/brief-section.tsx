"use client";

import { useEffect, useRef, useState } from "react";
import {
  ComputingBody,
  EmptyBody,
  ErrorBody,
  PopulatedBody,
} from "./brief-bodies";

export type BriefState = "empty" | "computing" | "populated" | "error";

/* SAMPLE tickers, the real symbols this phase runs on */
const TICKERS = ["RNVDAUSDT", "RTSLAUSDT", "RSPYUSDT", "RMSTRUSDT"];

export default function BriefSection({
  initialState = "empty",
}: {
  initialState?: BriefState;
}) {
  const [ticker, setTicker] = useState(TICKERS[0]);
  const [position, setPosition] = useState("20");
  const [state, setState] = useState<BriefState>(initialState);
  const [swept, setSwept] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  /* The marker sweep fires once per computed brief */
  useEffect(() => {
    if (state !== "populated") {
      setSwept(false);
      return;
    }
    const frame = requestAnimationFrame(() => setSwept(true));
    return () => cancelAnimationFrame(frame);
  }, [state]);

  function runBrief() {
    if (state === "computing") {
      return;
    }
    setState("computing");
    timerRef.current = window.setTimeout(() => setState("populated"), 900);
  }

  /* RNVDAUSDT reads as rNVDA on the sheet */
  const tickerLabel = `r${ticker.slice(1, -4)}`;

  return (
    <>
      <div className="mt-8 flex flex-wrap items-end gap-4 max-md:flex-col max-md:items-stretch">
        <div>
          <label
            id="gb-ticker-label"
            className="mb-2 block text-[12.5px] font-semibold text-muted"
          >
            Tokenized stock
          </label>
          <div
            role="group"
            aria-labelledby="gb-ticker-label"
            className="flex flex-wrap gap-2"
          >
            {TICKERS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={item === ticker}
                onClick={() => setTicker(item)}
                className="min-h-10 border border-line bg-card px-3 py-[9px] font-data text-[13px] tabular-nums text-ink transition-colors duration-150 hover:border-muted aria-pressed:border-accent-fill aria-pressed:bg-accent-fill aria-pressed:text-accent-on"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="gb-position"
            className="mb-2 block text-[12.5px] font-semibold text-muted"
          >
            Position, tokens
          </label>
          <input
            id="gb-position"
            inputMode="decimal"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className="h-11 w-[130px] border border-line bg-card px-3 font-data text-sm tabular-nums text-ink"
          />
          <p className="mt-1.5 text-[12.5px] text-muted">
            Sizes the dollar exposure in the brief.
          </p>
        </div>

        <button
          type="button"
          onClick={runBrief}
          disabled={state === "computing"}
          className="min-h-12 border-0 bg-accent-fill px-7 font-body text-sm font-semibold uppercase tracking-[0.06em] text-accent-on transition-[filter] duration-150 hover:brightness-[0.94] disabled:cursor-default disabled:opacity-55"
        >
          {state === "computing" ? "Computing brief" : "Run the brief"}
        </button>
      </div>

      <section aria-label="Stress-test brief" className="mt-10 border border-line bg-card">
        <div className="flex items-baseline justify-between gap-3 border-b border-line px-6 py-4">
          <span className="font-display text-[22px] tracking-[0.04em]">
            {tickerLabel}
            <span className="ml-2.5 border border-accent px-1.5 py-px align-[2px] font-data text-[11px] font-medium text-accent">
              SAMPLE
            </span>
          </span>
          <span className="font-data text-[11px] font-medium tabular-nums text-muted">
            {state === "error" ? "FEED ERROR" : "COMPUTED 21:33:04 UTC"}
          </span>
        </div>

        {state === "empty" ? <EmptyBody /> : null}
        {state === "computing" ? <ComputingBody /> : null}
        {state === "populated" ? <PopulatedBody swept={swept} /> : null}
        {state === "error" ? <ErrorBody onRetry={() => setState("empty")} /> : null}
      </section>
    </>
  );
}