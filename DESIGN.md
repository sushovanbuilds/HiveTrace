# Design System: HiveTrace — HoneyChain Traceability Platform

## 1. Visual Theme & Atmosphere
HiveTrace is a high-assurance agricultural crypto-traceability operating system connecting tribal apiaries, laboratory spectroscopy centers, supply-chain logistics, and consumer verification portals.

- **Atmosphere:** Clinical cryptographic accuracy merged with warm organic provenance. The interface breathes with deep graphite glassmorphism, specular top-edge light refraction, and subtle warm honey ambient diffusion.
- **Density:** 7 / 10 — High-utility enterprise cockpit on desktop; clean, touch-prioritized ergonomic stream on mobile.
- **Variance:** 7 / 10 — Asymmetric bento hierarchy with double-span lead metrics, offset timeline journeys, and 3D interactive consoles.
- **Motion:** 8 / 10 — Hardware-accelerated 3D perspective tilt (`perspective: 1400px`), real-time pointer-tracking specular sheen, GPU-driven scroll parallax, and spring-physics state transitions (`stiffness: 100, damping: 20`).

---

## 2. Color Palette & Roles

### Base Surfaces & Neutrals
- **Graphite Deep** (`#09090b`) — Primary canvas background, deep obsidian tone avoiding flat pure black.
- **Surface Level 1 / Glass Surface** (`rgba(255, 248, 236, 0.035)`) — Base container fill with `backdrop-filter: blur(24px) saturate(180%)`.
- **Surface Level 2 / Solid Glass** (`rgba(20, 18, 16, 0.72)`) — Floating modal windows, sidebar rails, and sticky topbars.
- **Specular Toplight** (`rgba(255, 250, 240, 0.14)`) — 1px inner top highlight (`inset 0 1px 0`) simulating physical edge refraction.
- **Hairline Border** (`rgba(255, 248, 236, 0.075)`) — Structural 1px micro-borders separating content panes.
- **Hairline Strong** (`rgba(255, 248, 236, 0.14)`) — Active, focused, or hovered container boundary.

### Primary Accent & Functional Tokens
- **Amber Honey Core** (`#f59e0b`) — Primary brand accent, verified status highlights, active tab indicators, and primary CTAs.
- **Honey Warm Radiant** (`#eab86e` / `#ffb800`) — Gradient start for primary buttons and interactive hover states.
- **Honey Dim / Deep Ochre** (`#b47000` / `#7c5800`) — Border anchors and dark container accents.
- **Honey Glow RGB** (`245 158 11`) — Alpha-channel tinted drop shadows (`0 14px 34px -18px rgb(245 158 11 / 0.45)`).
- **Sage Verification Green** (`#8fb191` / `#3b6934`) — Cryptographic integrity confirmed, 100% lab panel pass, low-risk rating.
- **Clay / Restrained Warning** (`#cf8069` / `#ba1a1a`) — Tamper alert, lab anomaly, supply chain custody delay.
- **Ink Primary** (`#faf6ee`) — High-contrast display text and titles (95% brightness).
- **Ink Soft** (`#c8beae`) — Body text, descriptions, and secondary metadata (75% brightness).
- **Ink Faint** (`#867c6c`) — Timestamps, table column labels, and inactive icons (50% brightness).

**Color Rules:**
- Max 1 primary accent hue (Amber Honey). Saturation strictly bounded below 80%.
- Banned: Purple/Blue "AI neon" gradients, cyan glows, and pure black (`#000000`) surfaces.

---

## 3. Typography Architecture

### Font Families
- **Display & Headlines:** `Geist Sans` — Tight negative tracking, optical kerning, weight-driven hierarchy (`-0.035em` on hero displays).
- **Body & Interface:** `Geist Sans` / `Inter` — Tabular lining figures, relaxed leading, max line length `65ch`.
- **Technical & Cryptographic Data:** `Geist Mono` / `JetBrains Mono` — Hashes, batch codes (`HC-2026-K7QM2X`), block depths, temperatures, timestamps.

### Typographic Scale
- **Display Hero:** `clamp(2.4rem, 5.5vw, 4.4rem)` · 700 Weight · Line-height `1.05` · Letter-spacing `-0.04em`
- **Section Heading (H2):** `clamp(1.4rem, 2.5vw, 2.0rem)` · 620 Weight · Line-height `1.2` · Letter-spacing `-0.03em`
- **Card Heading (H3):** `15px` – `17px` · 580 Weight · Line-height `1.35` · Letter-spacing `-0.02em`
- **Body Large:** `16px` – `18px` · 400 Weight · Line-height `1.6` · Color: `var(--ink-soft)`
- **Body Regular:** `13px` – `14px` · 450 Weight · Line-height `1.55` · Color: `var(--ink-soft)`
- **Metadata Caps:** `10.5px` – `11px` · 700 Weight · Line-height `1.0` · Letter-spacing `0.06em` · `text-transform: uppercase`
- **Mono Values:** `11.5px` – `13px` · `font-variant-numeric: tabular-nums`

---

## 4. Component Stylings & Behaviors

### 1. Buttons
- **Primary:** Linear gradient (`168deg, #eab86e, #f59e0b 46%, #b47000`), inset specular highlight (`inset 0 1px 0 rgba(255,252,244,0.42)`), tactile `-1.5px` hover lift, and physical `translateY(1px) scale(0.985)` active press feedback.
- **Glass / Secondary:** Ghost glass with `inset 0 0 0 1px var(--hairline)`, expanding to `--hairline-strong` on hover.
- **Text Link:** Inline flex with directional hover arrow shift (`gap: 6px` → `9px`).
- **Touch Target:** Minimum `44px × 44px` bounding box on mobile devices.

### 2. Glassmorphic Cards & Panels (`<Surface tilt>`)
- Multi-layer composite with `backdrop-filter: blur(24px) saturate(180%)`.
- 1px continuous hairline border with top specular refraction.
- Dynamic 3D tilt tracking pointer coordinates (`--px`, `--py`) without re-rendering the React tree.
- Generous internal padding: `24px` – `32px` on desktop, `16px` – `20px` on mobile.

### 3. Account & Persona Switcher
- Compact sidebar trigger with current persona tag and quick organisation name.
- Animated glass dropdown with keyboard trap, `Escape` dismiss, and arrow-key navigation.
- 1-click persona switching (Beekeeper, Analyst, Investigator, Processor, Admin) and multi-tenant org selector.

### 4. Dual-Area Network Velocity Chart
- Dual SVG mathematical area paths with linear gradient opacity fades (Verified Batches & Harvest Volume).
- Dashed horizontal reference gridlines and crosshair hover guides.
- Floating glass tooltip showing exact values with tabular numerals (`tabular-nums`).
- Time-range pill toggles (`7D`, `30D`, `90D`) with smooth path interpolation.

### 5. Supply Chain Provenance Timeline
- Linear progressive node tracker with completed, active, and pending stage states.
- Active nodes radiate a continuous warm honey beacon ring.
- Cryptographic hash badges with 1-click copy feedback.

---

## 5. Layout & Responsive Architecture

```
+-------------------------------------------------------------------------------+
| DESKTOP (>= 900px): Multi-Column Rail + Main Content Cockpit                  |
| +------------+ +------------------------------------------------------------+ |
| | RAIL (240) | | TOPBAR: Breadcrumb + Search + Quick Status + Actions       | |
| | Brand      | +------------------------------------------------------------+ |
| | Persona Sw | | BENTO GRID / LEAD METRICS (5 Cols: 2-Col Lead + 3 Standard)| |
| | Nav Items  | +------------------------------------------------------------+ |
| | Footer Org | | DUAL-AREA VELOCITY CHART (70%) | LIVE ALERTS FEED (30%)    | |
| |            | +------------------------------------------------------------+ |
| |            | | DATA LEDGER TABLE (Tabular, Search, Filter, Detail Panel)  | |
| +------------+ +------------------------------------------------------------+ |
+-------------------------------------------------------------------------------+

+-------------------------------------------------------------------------------+
| MOBILE (< 620px): Single-Column Stream + Floating Bottom Dock                 |
| +---------------------------------------------------------------------------+ |
| | SLIM HEADER: Brand Mark + Compact Verifier Status                         | |
| +---------------------------------------------------------------------------+ |
| | HERO & QUICK ACTIONS (100% Width Swipeable Carousel)                      | |
| +---------------------------------------------------------------------------+ |
| | METRIC CARDS (Single Column Vertical Stack)                               | |
| +---------------------------------------------------------------------------+ |
| | COMPACT CHART & TABULAR CARDS (No horizontal window overflow)             | |
| +---------------------------------------------------------------------------+ |
| | FIXED BOTTOM DOCK (Glass Pill: Home, Ledger, Hives, Lab, Profile)        | |
| +---------------------------------------------------------------------------+ |
+-------------------------------------------------------------------------------+
```

### Responsive Rules
1. **Desktop (>= 900px):**
   - 240px persistent glass sidebar rail with full label hierarchy.
   - 5-column metric grid with double-width lead metric card.
   - Dual split views (70/30 or 50/50) for charts, timelines, and audit logs.
   - Container max-width: `1440px`.

2. **Tablet (621px – 899px):**
   - Rail collapses to 76px icon-only rail.
   - Metric grid shifts to 2-column layout.
   - Split grids collapse to single stacked column.

3. **Mobile (< 620px):**
   - Rail transforms into a **floating bottom dock** (`position: fixed; inset: auto 10px 10px;`) with 5 primary touch destinations.
   - Topbar strips decorative breadcrumbs and expands search to full width.
   - Multi-column tables transform into swipeable card views or horizontal-contained scroll containers with sticky lead columns.
   - All interactive touch targets enforce minimum `44px` tap heights.
   - Zero horizontal page overflow (`overflow-x: hidden`).

---

## 6. Motion & Three.js Interaction Engine

### 1. Three.js Honeycomb Cryptographic Mesh
- **Desktop Canvas (`three.js_1`):** 7-cylinder hexagonal honeycomb geometry with phong reflections (`specular: 0xffffff, shininess: 100`), wireframe edge lattice, and 50 ambient floating node particles reacting smoothly to mouse velocity (`lerp: 0.05`).
- **Mobile Canvas (`three.js_2`):** Lightweight 3-cluster hexagon array optimized for GPU battery preservation and touch drag rotation.

### 2. Spring Physics Specification
```ts
export const SPRING_TRANSITION = {
  type: 'spring',
  stiffness: 100,
  damping: 20,
  mass: 1,
}
```

### 3. GPU Performance Guidelines
- Animations exclusively mutate `transform` (`translate3d`, `rotate3d`, `scale`) and `opacity`.
- Never animate layout geometry properties (`top`, `left`, `width`, `height`, `margin`, `padding`).
- Pointer coordinates and scroll metrics bind to CSS variables (`--px`, `--py`, `--scroll-y`) updated inside `requestAnimationFrame`.

---

## 7. Anti-Patterns & AI Tells (Strictly Banned)

- **NO Emojis in UI:** Use structured `@phosphor-icons/react` vector iconography with consistent regular/bold stroke weights.
- **NO Pure Black (`#000000`):** Use calibrated obsidian `#09090b` and graphite tones.
- **NO Generic Fonts:** No standard unstyled browser fonts. Always load Geist Sans, Geist Mono, and Inter with `font-display: swap`.
- **NO AI Neon Purple Gradients:** Banned purple glows, cyan laser lines, and cyberpunk aesthetics.
- **NO Equal 3-Column AI Grids:** Break uniform card walls with asymmetric bento layouts, lead metrics, and dynamic split ratios.
- **NO AI Copywriting Clichés:** Ban words like *"Elevate"*, *"Seamless"*, *"Unleash"*, *"Next-Gen"*, *"Tapestry"*. Use direct, precise domain terminology (*"Cryptographic State Anchor"*, *"Spectroscopic HMF Threshold"*, *"Purity Index"*).
- **NO Circular Loading Spinners:** Use layout-matching skeletal shimmer pulse bars for pending states.
- **NO Missing Responsive States:** Every screen must gracefully scale from 360px mobile viewports up to 4K ultra-wide monitors.
