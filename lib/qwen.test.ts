import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FALLBACK_STAMP,
  MODEL_STAMP,
  NO_KEY_READ,
  NO_RESPONSE_READ,
  TIMEOUT_MS,
  buildReadPrompt,
  deskRead,
  parseCompletion,
} from "../lib/qwen";
import type { GapResult } from "../lib/gaps";

/* The key only exists inside this test process, it is never printed */
const KEY = "sk-test-key-for-vitest-only";

function gapsFixture(): GapResult {
  return {
    totalWeekends: 240,
    buckets: {
      "< -4%": 12,
      "-4 to -2%": 18,
      "-2 to 0%": 60,
      "0 to +2%": 96,
      "+2 to +4%": 36,
      "> +4%": 18,
    },
    top: [
      { date: "2024-08-05", gapPct: -6.4 },
      { date: "2025-04-07", gapPct: 5.2 },
      { date: "2025-06-09", gapPct: -3.1 },
      { date: "2023-10-30", gapPct: 2.8 },
      { date: "2024-01-22", gapPct: -2.4 },
    ],
  };
}

function inputFixture() {
  return {
    ticker: "RNVDAUSDT",
    underlying: "NVDA",
    last: 101.2,
    lastClose: 99.2,
    sessionCloseDate: "2026-09-18",
    deltaPct: 2.02,
    gaps: gapsFixture(),
  };
}

function completion(content: string) {
  return {
    id: "chatcmpl-1",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
  };
}

function responseOf(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("parseCompletion", () => {
  it("extracts the assistant content as a trimmed string", () => {
    expect(parseCompletion(completion("  The desk reads a flat open.  "))).toBe(
      "The desk reads a flat open.",
    );
  });

  it("returns null when the envelope carries no content", () => {
    expect(parseCompletion(null)).toBeNull();
    expect(parseCompletion({})).toBeNull();
    expect(parseCompletion({ choices: [] })).toBeNull();
    expect(parseCompletion({ choices: [{ message: {} }] })).toBeNull();
  });

  it("returns null when the content is not a string", () => {
    expect(
      parseCompletion({ choices: [{ message: { content: 42 } }] }),
    ).toBeNull();
  });

  it("returns null for blank content", () => {
    expect(parseCompletion(completion("   "))).toBeNull();
  });
});

describe("buildReadPrompt", () => {
  it("assembles the prompt from the computed numbers only", () => {
    const prompt = buildReadPrompt(inputFixture());
    expect(prompt).toContain("You are a trading desk writer.");
    expect(prompt).toContain("Ticker: RNVDAUSDT");
    expect(prompt).toContain("Underlying: NVDA");
    expect(prompt).toContain("Live token price: 101.2");
    expect(prompt).toContain(
      "Last completed session close: 99.2 on 2026-09-18",
    );
    expect(prompt).toContain("Delta against that close: 2.02 percent");
    expect(prompt).toContain(
      "Weekends measured over the last five years: 240",
    );
    expect(prompt).toContain("- 0 to +2%: 40 percent");
    expect(prompt).toContain("- -2 to 0%: 25 percent");
    expect(prompt).toContain("- +2 to +4%: 15 percent");
    expect(prompt).toContain("Largest weekend gaps:");
    expect(prompt).toContain("- 2024-08-05: -6.4 percent");
    expect(prompt).toContain("- 2025-04-07: +5.2 percent");
    expect(prompt).toContain("- 2025-06-09: -3.1 percent");
    expect(prompt).not.toContain("2023-10-30");
    expect(prompt).toContain(
      "End by naming the single biggest risk in one clause.",
    );
  });

  it("never carries the API key", () => {
    process.env.QWEN_API_KEY = KEY;
    try {
      expect(buildReadPrompt(inputFixture())).not.toContain(KEY);
    } finally {
      delete process.env.QWEN_API_KEY;
    }
  });
});

describe("deskRead", () => {
  afterEach(() => {
    delete process.env.QWEN_API_KEY;
  });

  it("returns the model text with the model stamp", async () => {
    process.env.QWEN_API_KEY = KEY;
    const calls: Array<{ url: RequestInfo | URL; init: RequestInit }> = [];
    const result = await deskRead(inputFixture(), async (url, init) => {
      calls.push({ url, init: init ?? {} });
      return responseOf(
        200,
        completion(
          " The token sits 2.02 percent above Friday's close. Risk: a weekend gap worse than -4 percent. ",
        ),
      );
    });
    expect(result).toEqual({
      read: "The token sits 2.02 percent above Friday's close. Risk: a weekend gap worse than -4 percent.",
      readSource: "model",
      stamp: MODEL_STAMP,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://hackathon.bitgetops.com/v1/chat/completions",
    );
    expect(calls[0].init.method).toBe("POST");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${KEY}`,
    );
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.model).toBe("qwen3.8-max");
    expect(body.temperature).toBe(0.4);
    expect(body.max_tokens).toBe(320);
    expect(body.enable_thinking).toBe(false);
    expect(body.messages).toEqual([
      { role: "user", content: expect.stringContaining("Ticker: RNVDAUSDT") },
    ]);
  });

  it("returns the fixed unavailable string when the key is missing", async () => {
    let calls = 0;
    const result = await deskRead(inputFixture(), async () => {
      calls += 1;
      return responseOf(200, completion("should never be read"));
    });
    expect(result.read).toBe(NO_KEY_READ);
    expect(result.readSource).toBe("fallback");
    expect(result.stamp).toBe(FALLBACK_STAMP);
    expect(calls).toBe(0);
  });

  it("retries once on a 5xx and falls back", async () => {
    process.env.QWEN_API_KEY = KEY;
    let calls = 0;
    const result = await deskRead(inputFixture(), async () => {
      calls += 1;
      return responseOf(503, { error: "upstream" });
    });
    expect(result).toEqual({
      read: NO_RESPONSE_READ,
      readSource: "fallback",
      stamp: FALLBACK_STAMP,
    });
    expect(calls).toBe(2);
  });

  it("recovers on the retry after a 5xx", async () => {
    process.env.QWEN_API_KEY = KEY;
    let calls = 0;
    const result = await deskRead(inputFixture(), async () => {
      calls += 1;
      return calls === 1
        ? responseOf(500, {})
        : responseOf(200, completion("Recovered read."));
    });
    expect(result.read).toBe("Recovered read.");
    expect(result.readSource).toBe("model");
    expect(result.stamp).toBe(MODEL_STAMP);
    expect(calls).toBe(2);
  });

  it("falls back on a 4xx", async () => {
    process.env.QWEN_API_KEY = KEY;
    const result = await deskRead(inputFixture(), async () =>
      responseOf(401, {}),
    );
    expect(result.read).toBe(NO_RESPONSE_READ);
    expect(result.readSource).toBe("fallback");
  });

  it("falls back when the call throws, like a timeout", async () => {
    process.env.QWEN_API_KEY = KEY;
    let calls = 0;
    const result = await deskRead(inputFixture(), async () => {
      calls += 1;
      throw new DOMException("The operation was aborted", "TimeoutError");
    });
    expect(result.read).toBe(NO_RESPONSE_READ);
    expect(result.readSource).toBe("fallback");
    expect(calls).toBe(2);
  });

  it("falls back when the response carries no content", async () => {
    process.env.QWEN_API_KEY = KEY;
    const result = await deskRead(inputFixture(), async () =>
      responseOf(200, { choices: [] }),
    );
    expect(result.read).toBe(NO_RESPONSE_READ);
    expect(result.readSource).toBe("fallback");
  });

  it("never echoes the key into the returned text", async () => {
    process.env.QWEN_API_KEY = KEY;
    const result = await deskRead(inputFixture(), async () => responseOf(502, {}));
    expect(result.read).not.toContain(KEY);
    expect(result.stamp).toBe(FALLBACK_STAMP);
  });

  it("budgets 60000 ms so a 35s model delay resolves without fallback", async () => {
    expect(TIMEOUT_MS).toBe(60000);
    process.env.QWEN_API_KEY = KEY;
    vi.useFakeTimers();
    try {
      const slowFetch = (
        _url: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve(responseOf(200, completion("Slow but steady read. Risk: a sharp gap.")));
          }, 35000);
          init?.signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new DOMException("The operation was aborted", "TimeoutError"));
            },
            { once: true },
          );
        });
      const pending = deskRead(inputFixture(), slowFetch);
      await vi.advanceTimersByTimeAsync(80000);
      const result = await pending;
      expect(result.read).toBe("Slow but steady read. Risk: a sharp gap.");
      expect(result.readSource).toBe("model");
      expect(result.stamp).toBe(MODEL_STAMP);
      expect(result.read).not.toBe(NO_RESPONSE_READ);
    } finally {
      vi.useRealTimers();
    }
  });
});