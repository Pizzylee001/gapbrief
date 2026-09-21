---
name: GapBrief
surface_mode: Operate
theme: both
tokens:
  color:
    bg: "#F6F4EC"
    card: "#FDFCF8"
    border: "#D8D2C4"
    borderSubtle: "#E7E2D6"
    text: "#14261C"
    textMuted: "#55645A"
    structural: "#1D4D36"
    accent: "#B45309"
    accentFill: "#D97706"
    accentOn: "#14261C"
    positive: "#1A6B48"
    negative: "#B3362B"
    ring: "#B45309"
  colorDark:
    bg: "#0C1512"
    card: "#101B15"
    border: "#2A3F34"
    borderSubtle: "#1C2C23"
    text: "#F2EFE6"
    textMuted: "#A3B3A8"
    structural: "#2E7D57"
    accent: "#E8A33D"
    accentFill: "#E8A33D"
    accentOn: "#14261C"
    positive: "#3FBF8A"
    negative: "#F87171"
    ring: "#E8A33D"
  fontFamily:
    display: Bebas Neue
    body: Source Sans 3
    data: JetBrains Mono
  radius: 0px everywhere, sharp corners are the shape system
  spacing: 4px base scale
  density: 7
---

# GapBrief DESIGN.md, v2

## 1. Visual Theme and Atmosphere

An analyst's brief sheet, set like a magazine page, printed on bone paper. The Design Read line: "Reading this as: an Operate research desk rendered as an editorial brief sheet for a solo rToken holder, with a bold typographic language on bone paper, leaning toward Editorial Grid / Magazine with the Forest palette."

The desk speaks in print: a giant condensed headline, hairline data tables, full-bleed forest divider bands, and a marker stroke over the conclusion. Punch comes from typography and structure, not glow or gradients. Density 7: numbers sit close, zones are separated by rules and bands.

The identity motif is the mono stamp: every data zone carries a small JetBrains Mono source tag and timestamp, like a stamped research note. It repeats, it is real information, and it is the voice of the desk.

Background treatment (reason per R-07): bone paper base with a 32px chart grid at 1px lines, green-tinted at 5 percent opacity in light and 4 percent in dark, plus 2 percent noise. The grid is the instrument's graph paper. The dark theme is the paired variant of the same system: green-black ground, bone text, brighter amber. Light is the primary identity; first visit follows system preference, choice persists, no flash on load.

## 2. Color Palette and Roles

| Token | Light | Dark | Role |
|---|---|---|---|
| bg | #F6F4EC | #0C1512 | Page ground, bone paper / green-black |
| card | #FDFCF8 | #101B15 | The brief sheet |
| border | #D8D2C4 | #2A3F34 | 1px structural rules |
| borderSubtle | #E7E2D6 | #1C2C23 | Inner dividers |
| text | #14261C | #F2EFE6 | Ink |
| textMuted | #55645A | #A3B3A8 | Captions, stamps |
| structural | #1D4D36 | #2E7D57 | Forest green: divider bands, section rules, table heads |
| accent | #B45309 | #E8A33D | Amber as text, links, focus ring |
| accentFill | #D97706 | #E8A33D | The one hot fill: primary button, selected chip, marker stroke |
| accentOn | #14261C | #14261C | Text on amber fills |
| positive | #1A6B48 | #3FBF8A | Semantic up only |
| negative | #B3362B | #F87171 | Semantic down only |
| ring | #B45309 | #E8A33D | Focus visible |

Rules: one saturated accent (amber), one structural color (forest green), neutrals aside. Green and red are data direction only. Both themes are declared and both get verified: light pairs measure at or above 4.5:1 (ink 15:1, muted 5:1, amber-text 4.8:1, button amber-on-ink 7:1, chip green-on-bone 7.6:1), dark pairs at or above 4.5:1 (ink 15:1, muted 6:1, accent 7:1, positive 7:1, negative 6.6:1). No pure #000000 or #FFFFFF.

## 3. Typography Rules

Bebas Neue for display, uppercase, condensed. Source Sans 3 for body and controls. JetBrains Mono for every number, timestamp, ticker, and stamp, tabular figures. Mono is for measurement only.

| Role | Font | Size / weight | Notes |
|---|---|---|---|
| Display | Bebas Neue | clamp(44px, 7vw, 76px) / 400 | Uppercase, the query IS the headline |
| Zone heading | Bebas Neue | 22px / 400 | Uppercase, letterspaced 0.04em |
| Body | Source Sans 3 | 15.5px / 400, 1.6 | Measure 60 to 72ch |
| Label / button | Source Sans 3 | 14px / 600 | Uppercase only on buttons |
| Stamp | JetBrains Mono | 11px / 500 | Uppercase source tags |
| Data | JetBrains Mono | 13px / 400 | tabular-nums everywhere |

Production load line (final form set in the build brief): next/font/google, Bebas_Neue weight 400, Source_Sans_3 weights 400 600, JetBrains_Mono 400 500, subsets latin, display swap.

## 4. Component Stylings

- Masthead (N9 edge-aligned): single 64px line, no bar background. Wordmark "GAPBRIEF" in Bebas 22px, letterspaced. Right: market-state chip (forest 1px outline, green text, real clock logic: "US market open", "US market closed, rTokens live", "Weekend, rTokens live"), mono data timestamp, theme toggle. Under the masthead: a full-bleed 10px forest band.
- Theme toggle: 36px square, 0 radius, 1px border, sun icon in dark, moon in light, inline SVG matching lucide glyphs, aria-label states the action, 2px ring. System preference on first visit, localStorage "gb-theme", inline head script applies before first paint, instant switch.
- Ticker chips: mono, 0 radius, 1px border, 40px tall. Selected: amber fill with ink text (aria-pressed). Hover: border darkens. 8px gaps.
- Position input: 0 radius, card background, 1px border, mono, 44px tall, label above, helper below.
- Run button: amber fill, ink text, uppercase Source Sans 3 600, 48px tall, 0 radius, no icon. Loading: label "COMPUTING BRIEF", disabled, fill desaturates 20 percent.
- Brief sheet: card background, 1px border, 0 radius, no shadow. Structure is two-column asymmetric on desktop: left 5 columns carry "THE DESK'S READ" and the options, right 7 columns carry the token line, gap history, and analogs, separated by a 1px vertical hairline. Below 1024px: single column, read first.
- Token line: mono 20px price, muted comparison, direction-colored delta, under a forest band head.
- Gap history: diverging bar rows, mono labels, green left of center and amber-red right of center from a center axis, track in borderSubtle, hidden data table twin for screen readers.
- Analogs: editorial rows: giant mono date, event name in body, "WEEKEND OPEN -2.1%" stamp in direction color, separated by hairlines.
- Options: three rows, each led by a mono tag (HOLD, TRIM, HEDGE) in a forest outline box, followed by one plain sentence.
- Desk read: the model's paragraph, with its key clause under the marker stroke: a 300ms amber highlight sweep, once, reduced motion shows it instantly.
- States, all four real: empty (cause plus next action, same chrome), computing (skeleton rows shaped like each zone, zone labels visible, shimmer disabled under reduced motion), populated, error (cause plus fix, RETRY button returns to empty).

## 5. Layout Principles

Single route. Desktop: full-width masthead, then the brief sheet at max 1200px. The query headline hangs above the sheet, full measure. Input band sits between headline and sheet as one row: chips, position input, button. Below 1024px everything stacks. Spacing scale 4/8/12/16/24/32/48; 32px minimum between zones; divider bands and hairlines do the separating, not boxes.

## 6. Depth and Elevation

Print depth: no shadows. Hierarchy comes from ink weight, rules, bands, and the amber accent. The sheet is flat paper; the forest band and amber button are the loudest objects on the page.

## 7. Do's and Don'ts

Do: uppercase display via Bebas only, mono stamps on every data zone, sharp corners everywhere, real timestamps, keyboard focus rings, tabular figures, SAMPLE labels on every placeholder number.
Do not (product entry anti-patterns, verbatim): Light mode default, Slow rendering. Note: both themes ship at Lee's explicit request; dark is the paired variant, light is the primary identity.
Also do not: gradients, glass, glow, rounded cards, card grids, eyebrows above headings, icon rows, emoji icons, dead controls, invented numbers.

## 8. Responsive Behavior

Breakpoints 375 / 768 / 1024 / 1440. Headline scales by clamp, never wraps past three lines. Two-column sheet stacks below 1024px, read column first. Input band becomes a vertical stack below 768px. Touch targets 44px minimum. No horizontal scroll at any width.

## 9. Signature, Motion and Depth

Signature (one): the marker stroke. In the desk read, the key clause receives a human-drawn-marker highlight sweep in amber, 300ms, once, reduced motion renders it complete instantly. Reason: the sheet's whole job is handing you the conclusion; the marker marks it.
Reveal: sheet zones cascade top-down as computed, 40ms stagger, 200ms ease-out, once, never re-hidden on scroll.
Hover: border and fill shifts at 150ms. No parallax, no scroll choreography, no page entrance animation.
Depth: flat print, zero shadows, rules and bands carry structure. Reason: the sheet reads as printed output, and elevation would lie about the medium.
Note (phase 3): the marker sweep runs on the final sentence of the model read, the paragraph Qwen writes from the computed numbers. The options zone keeps its NOT FINANCIAL ADVICE stamp; its three rows are template sentences composed from the measured bucket shares, not model text, and the funding number in HEDGE keeps its SAMPLE marker because it is not computed in this brief.
