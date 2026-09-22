import { marketState } from "@/lib/market-state";
import BriefSection, { type BriefState } from "./components/brief-section";
import ThemeToggle from "./components/theme-toggle";

/* Brand mark, the two-bar gap glyph drawn in theme tokens so it tracks
   light and dark. The wordmark carries the name, so the mark stays
   aria-hidden. Same geometry as app/icon.svg at a 20 by 20 size */
function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" fill="var(--green)" />
      <rect x="7" y="6" width="7" height="20" fill="var(--ink)" />
      <rect x="18" y="12" width="7" height="14" fill="var(--accent-fill)" />
    </svg>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const initialState: BriefState = params.state === "error" ? "error" : "empty";

  /* Masthead chip follows the same real clock logic as the brief */
  const now = new Date();
  const state = marketState(now);
  const chip =
    state === "open"
      ? { lead: "US MARKET OPEN", live: "" }
      : state === "weekend"
        ? { lead: "WEEKEND,", live: "rTOKENS LIVE" }
        : { lead: "US MARKET CLOSED,", live: "rTOKENS LIVE" };
  const dataStamp = `DATA ${now.toISOString().slice(11, 16)} UTC`;

  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-6">
        <span className="flex items-center gap-[10px] font-display text-[24px] tracking-[0.08em]">
          <LogoMark />
          GAPBRIEF
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="border border-green px-3 py-[3px] text-[12.5px] font-semibold text-green">
            {chip.lead}{" "}
            {chip.live ? (
              <b className="font-semibold text-accent">{chip.live}</b>
            ) : null}
          </span>
          <span className="font-data text-[12px] tabular-nums text-muted">
            {dataStamp}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="h-2.5 w-full bg-green" />

      <main className="mx-auto w-full max-w-[1200px] px-6 pb-16 pt-10">
        <h1 className="max-w-[16ch] text-balance font-display text-[clamp(44px,7vw,76px)] font-normal uppercase leading-[0.95] tracking-[0.01em]">
          What are you holding through the close?
        </h1>
        <p className="mt-3 max-w-[52ch] text-muted">
          Live data from Bitget spot and Bitget's US equity feed. The desk's
          read is written by Qwen from the computed numbers, and is not
          financial advice.
        </p>
        <div className="mt-5 h-1.5 w-[72px] bg-accent-fill" />

        <BriefSection initialState={initialState} />
      </main>

      <footer className="mx-auto flex w-full max-w-[1200px] flex-wrap justify-between gap-x-6 gap-y-2 border-t border-line-subtle px-6 pb-10 pt-4 text-[12px] text-muted">
        <span>GapBrief, A Weekend Stress-Test Desk For Tokenized US Stocks</span>
        <span className="font-data tabular-nums">
          SOURCES: BITGET SPOT, MCP US EQUITY K-LINES
        </span>
        <span>Not financial advice. Educational tool.</span>
      </footer>
    </>
  );
}
