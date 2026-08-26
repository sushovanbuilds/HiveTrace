# UI / UX Design System

## Design Direction
Dark, security-ops "console" aesthetic (zinc/near-black surfaces, subtle ring borders, semantic severity colors). Built with Tailwind v4 utility classes — **shadcn/ui was intentionally not adopted** for MVP to keep the dependency surface minimal (consistent with the project's direct-library approach). If a richer component kit is needed later, shadcn can be layered on without changing the data layer.

## Visual Hierarchy
- Masthead (title + auto-refresh hint) → stat cards → honeypot table → threat feed.
- Severity drives color: LOW=neutral, MEDIUM=amber, HIGH=orange, CRITICAL=red.

## Layout
- Responsive: single column; stat cards `grid-cols-2` → `sm:grid-cols-3`.
- Content width: `max-w-5xl` centered.

## Components
| Component | Purpose | Variants | States |
|---|---|---|---|
| `StatCard` (in page) | Headline counts | — | static |
| `HoneypotList` (`src/components/HoneypotList.tsx`) | Table of deployed honeypots | row per honeypot | loading skeleton, empty, populated; status pill (ACTIVE/COMPROMISED/RETIRED) |
| `ThreatFeed` (`src/components/ThreatFeed.tsx`) | List of `ThreatReport`s | item per report | loading skeleton, empty, populated |
| `Dashboard` (`src/app/page.tsx`) | Client page: polls `/api/honeypots` + `/api/reports` every 15s | — | loading / error banner / populated |

## Typography
Geist Sans (body) + Geist Mono (addresses, vectors) via `next/font`.

## Color
Tailwind zinc scale + severity accents (emerald/red for honeypot status; zinc/amber/orange/red for report severity).

## Spacing
Tailwind default scale; section gaps via `mb-8`/`mb-10`.

## Borders / Shadows
`ring-1 ring-zinc-800` borders, no heavy shadows (flat console look).

## Interaction States
- Loading: `animate-pulse` skeleton blocks.
- Error: red-tinted banner (`bg-red-500/10 ring-red-500/30`).
- Empty: inline helper text in each list component.

## Accessibility
- Semantic `main`/`header`/`section`/`table`; `th` scope implicit.
- Color is never the sole signal (status text + colored pill).
- Reduced-motion: skeletons use `animate-pulse` (acceptable; no layout-shift motion).

## Responsive / Mobile Behavior
Single-column stack; stat grid collapses to 2 cols on small screens.

## Loading / Empty / Error States
Defined for every list (loading skeleton, empty copy, error banner at page level).
