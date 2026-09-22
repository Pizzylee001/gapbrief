import type { Metadata, Viewport } from "next";
import { Bebas_Neue, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const body = Source_Sans_3({
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const data = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-data",
});

export const metadata: Metadata = {
  title: "GapBrief, Weekend Open Stress-Test Desk For Tokenized US Stocks",
  description:
    "Live weekend open history for Bitget rTokens, computed from five years of closes, with a model-written desk read. Not financial advice.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4EC" },
    { media: "(prefers-color-scheme: dark)", color: "#0C1512" },
  ],
};

/* Applies the stored theme before the first paint, so there is no flash */
const themeScript = `(function(){try{var t=localStorage.getItem('gb-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

/* Fixed grain overlay: feTurbulence noise at 2 percent, never interactive */
function NoiseOverlay() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.02]"
    >
      <defs>
        <filter id="gb-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#gb-noise)" />
    </svg>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${data.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <NoiseOverlay />
        {children}
      </body>
    </html>
  );
}
