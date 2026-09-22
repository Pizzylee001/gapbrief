import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GapBrief, A Weekend Stress-Test Desk For Tokenized US Stocks";
export const runtime = "nodejs";

/* Fonts read once at module scope, Bebas for the display text, JetBrains
   Mono for the disclaimer line. No network fetch, the files ship in the
   repo under app/fonts */
const bebas = readFileSync(
  join(process.cwd(), "app/fonts/BebasNeue-Regular.ttf"),
);
const mono = readFileSync(
  join(process.cwd(), "app/fonts/JetBrainsMono-Regular.ttf"),
);

const BONE = "#F2EFE6";

/* Flat print style, same geometry as app/icon.svg at 32 by 32, the amber
   bar sits lower than the bone bar, the drop is the gap */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0C1512",
          padding: "72px 80px 64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              position: "relative",
              width: 32,
              height: 32,
              backgroundColor: "#1D4D36",
              display: "flex",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 7,
                top: 6,
                width: 7,
                height: 20,
                backgroundColor: "#F6F4EC",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 18,
                top: 12,
                width: 7,
                height: 14,
                backgroundColor: "#D97706",
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "Bebas Neue",
              fontSize: 96,
              lineHeight: 1,
              letterSpacing: 6,
              color: BONE,
            }}
          >
            GAPBRIEF
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 84,
            fontFamily: "Bebas Neue",
            fontSize: 72,
            lineHeight: 1.05,
            color: BONE,
          }}
        >
          <div>What are you holding</div>
          <div>through the close?</div>
        </div>
        <div
          style={{
            marginTop: 36,
            fontFamily: "Bebas Neue",
            fontSize: 30,
            color: "rgba(242, 239, 230, 0.7)",
          }}
        >
          Weekend gap history for Bitget rTokens, computed from five years of
          closes
        </div>
        <div
          style={{
            marginTop: "auto",
            fontFamily: "JetBrains Mono",
            fontSize: 24,
            color: "#A3B3A8",
          }}
        >
          Not financial advice
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bebas Neue", data: bebas, weight: 400, style: "normal" },
        { name: "JetBrains Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}