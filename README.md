# GapBrief

GapBrief answers one question: "I hold tokenized US stock X, what does Monday open look like for me?" It produces a stress-test brief built from real gap history, not opinions.

Live demo: https://gapbrief.vercel.app

## The thesis

rTokens for US equities trade 7x24 on Bitget. The underlying stock does not. When news breaks on a Saturday, the token reprices immediately while the stock cannot, and the token now carries a risk the stock market cannot express until Monday's open. Deciding whether to hold, trim, or hedge over a weekend should not be done on vibes. GapBrief computes the actual five-year distribution of weekend gaps for the underlying (Friday close to the next trading open, every weekend for five years) and puts that distribution next to the live token price, so the decision has a number behind it.

## How it works

- **Live token price** comes from the Bitget public spot ticker endpoint `https://api.bitget.com/api/v2/spot/market/tickers?symbol=RNVDAUSDT`, no key needed.
- **Five years of daily candles** for the underlying come from the Bitget MCP feed at `https://agent.bitget.com/mcp` via the `equity_price_historical` entry. The feed is paginated, so `lib/mcp-page.ts` walks the pages forward (two pages per symbol for a five-year window), keeping the same end date and resuming from each page's `next_time` until the whole window is collected.
- **Weekend gap logic** in `lib/gaps.ts` walks the sessions in date order, keeps only spans that cross a Saturday or Sunday, measures Friday close to next open in percent, bins every gap into six buckets, and ranks the five biggest events. Holiday Mondays stretch the gap instead of losing it, and spans longer than six days are treated as feed holes and skipped.
- **Market state** in `lib/market-state.ts` is a simple UTC clock: weekend on Saturday or Sunday, open inside a fixed 13:30 to 20:00 UTC window, closed otherwise.
- **The desk read** is written by Qwen `qwen3.8-max` through `https://hackathon.bitgetops.com/v1/chat/completions` with `enable_thinking: false`. The model gets the computed numbers and writes the narrative. If the model is unavailable, the brief still ships with an honest "model offline" fallback string and a `readSource` of `fallback`, so the numbers are never faked.

## Honest validation

All figures observed from the running app during Sep 2026, reproducible by running the repo.

- 89 tests green across 10 test files (`npm test`).
- NVDA brief: 261 weekends measured over the five-year window.
- NVDA bucket counts 9 / 24 / 85 / 116 / 25 / 2, summing exactly to 261.
- NVDA top gap: 2024-08-05 at -14.18%.
- Latest session close in the feed: 2026-09-21.
- End-to-end brief latency on a live run: 14.3 to 18.4 seconds, dominated by the MCP history walk and the model call.

## What is real vs approximate

Real, straight from the feeds and computed code:

- Live token prices from Bitget spot tickers.
- The latest completed session close from the equity history feed.
- Every weekend gap, every bucket count, every top event.
- The market state (open, closed, weekend).
- The model read, when Qwen responds.

Approximate, stated plainly:

- The HEDGE funding sentence is qualitative, not a computed funding-rate figure.
- The market-state clock uses a fixed 13:30 to 20:00 UTC window and ignores US daylight saving shifts of plus or minus one hour.
- Four tickers are supported: RNVDAUSDT, RTSLAUSDT, RSPYUSDT, RMSTRUSDT.

## Stack

- Next.js 16
- TypeScript
- Tailwind v4
- vitest
- Qwen qwen3.8-max

## Run it

```bash
git clone https://github.com/Pizzylee001/gapbrief
cd gapbrief
npm install
npm run dev
```

Open http://localhost:3000. The brief works with no configuration. Optionally set `QWEN_API_KEY` in `.env.local` to enable the model-written read; without it the brief uses the honest fallback string.

Run the tests:

```bash
npm test
```

Not financial advice, educational tool.

## Limitations

- Four tickers only. Adding one is a map entry in `lib/symbols.ts`, but nothing else is wired for arbitrary symbols.
- The market-state clock ignores US daylight saving, so open and closed can be off by an hour around the DST transitions.
- The HEDGE line describes funding in words, not from a live funding-rate feed.
- Weekend gaps are measured on the underlying's daily candles. Intraday gaps, earnings moves inside a session, and multi-week holiday stretches are out of scope by design.
- A span longer than six days is skipped as a feed hole, so a data outage around a weekend removes that weekend from the distribution instead of inflating it.
- The model read depends on the hackathon gateway. When it is down, the brief degrades to the fallback string rather than guessing.
