---
version: alpha
name: Chekino-design-system
description: A quiet, RTL Persian business tool for registering and tracking Sayad cheques. The canvas is plain white (or near-black in dark mode), never tinted. Brand voltage comes from one restrained blue accent used sparingly — on the primary action, on links, on the active state of a filter — everywhere else the interface is ink-on-white with a single hairline border doing the structural work. Type runs one variable Persian face (IRANYekanX) across every size; hierarchy comes from its weight and optical-size ("dots") axes, not from switching families. Status is always color + icon + Persian label together, never color alone. This file replaced an earlier auto-generated DESIGN.md that described Claude/Anthropic's own marketing-site look (cream canvas, coral accent, serif display) — that system doesn't fit this product and was never applied to it. What follows is Chekino's actual, already-shipping system, read directly out of css/shared.css and css/dashboard.css so every value below is real, not aspirational.

colors:
  accent: "#123A9A"
  accent-hover: "#0D2C77"
  accent-wash: "#EDF1FA"
  accent-line: "#A9B8E2"
  ink: "#181816"
  ink-2: "#4B4B46"
  muted: "#696964"
  border: "#E4E4E1"
  border-subtle: "#EFEFED"
  border-strong: "#C2C2BD"
  bg: "#FFFFFF"
  surface: "#FFFFFF"
  surface-2: "#FCFCFC"
  surface-sunken: "#EFEFED"
  success: "#14805C"
  success-bg: "#E3F6ED"
  warning: "#B26A08"
  warning-bg: "#FDF1E3"
  error: "#C2453C"
  error-bg: "#FCEBEA"
  error-border: "#F0C6C2"

colors-dark:
  accent: "#5C87E8"
  accent-hover: "#7BA0EF"
  accent-wash: "rgba(92,135,232,0.15)"
  bg: "#08090A"
  surface: "#0F1011"
  surface-2: "#141516"
  ink: "#F7F8F8"
  ink-2: "#D0D6E0"
  muted: "#8A8F98"
  border: "rgba(255,255,255,0.08)"
  success: "#4CC38A"
  warning: "#E8A63F"
  error: "#FF8078"

typography:
  display:
    fontFamily: "IRANYekanX"
    fontSize: 28px
    variationSettings: "'wght' 680, 'dots' 2"
  brand:
    fontFamily: "IRANYekanX"
    variationSettings: "'wght' 680, 'dots' 2"
    note: "The one place 'dots' stays at 2 — the logo. Every other text size dropped to 'dots' 1 by explicit request; a uniform dot size read calmer across a data-dense screen than the font's default per-size optical variation."
  title:
    fontFamily: "IRANYekanX"
    fontSize: 21px
    variationSettings: "'wght' 600, 'dots' 1"
  label:
    fontFamily: "IRANYekanX"
    fontSize: 13px
    variationSettings: "'wght' 590, 'dots' 1"
  button:
    fontFamily: "IRANYekanX"
    variationSettings: "'wght' 560, 'dots' 1"
  value:
    fontFamily: "IRANYekanX"
    fontSize: 15px
    variationSettings: "'wght' 510, 'dots' 1"
  num:
    fontFamily: "IRANYekanX"
    variationSettings: "'wght' 550, 'dots' 1"
    note: "Used for Persian-digit amounts and serials — a touch heavier than body so numbers hold their own in a dense table row."
  body:
    fontFamily: "IRANYekanX"
    fontSize: 14px
    variationSettings: "'wght' 430, 'dots' 1"
  hint:
    fontFamily: "IRANYekanX"
    variationSettings: "'wght' 330, 'dots' 1"
  micro:
    fontFamily: "IRANYekanX"
    fontSize: 12px
    variationSettings: "'wght' 470, 'dots' 1"
  sub: { fontSize: 17px }
  cap: { fontSize: 13px }

rounded:
  ctl: 8px
  card: 10px
  float: 12px
  pill: 999px

spacing:
  s1: 4px
  s2: 8px
  s3: 12px
  s4: 16px
  s5: 24px
  s6: 32px
  s7: 48px

heights:
  sm: 32px
  md: 40px
  lg: 48px
  row: 44px

motion:
  instant: 90ms
  default: 150ms
  entrance: 220ms
  ease: "cubic-bezier(0.4, 0, 0.2, 1)"
  ease-out: "cubic-bezier(0.16, 1, 0.3, 1)"

components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    typography: "{typography.button}"
    rounded: "{rounded.ctl}"
    height: "{heights.md}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  filter-pill:
    backgroundColor: "{colors.surface}"
    border: "1.5px solid {colors.border}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.ctl}"
    height: "{heights.sm}"
  filter-pill-active:
    backgroundColor: "{colors.accent}"
    border: "1.5px solid {colors.accent}"
    textColor: "#FFFFFF"
  icon-action:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.border}"
    textColor: "{colors.muted}"
    rounded: "{rounded.ctl}"
    height: "{heights.sm}"
    note: "1px border everywhere it stands alone. Bumped to 1.5px only when it sits in the same row as filter-pill, whose border is 1.5px — a real mismatch caught by testing on an actual phone, not a deliberate two-weight system."
  text-input:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.border}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.ctl}"
    height: "{heights.md}"
  text-input-focus:
    border: "1px solid {colors.accent}"
    boxShadow: "0 0 0 3px {colors.accent-wash}"
  card:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.card}"
  modal:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.card}"
    boxShadow: "{elevation.float}"
  dropdown:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.float}"
    boxShadow: "{elevation.float}"
    note: "Always position:fixed off document.body, never nested inside a modal or popover — an ancestor with a transform or backdrop-filter becomes the containing block for a fixed descendant and silently re-bases its coordinates. Cost two separate rounds of live-site bugs (the channel picker, then all four person-autocomplete lists) before this became a standing rule."
  status-chip:
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    note: "Every status chip is color + a status dot/icon + the Persian label in the same element. Never color alone — colorblind-safe by construction, not by afterthought."
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.float}"
    role: "status"
    ariaLive: "polite"
---

## Overview

Chekino is a plain-white, ink-on-white business tool — the opposite instinct from a marketing site. There is no tinted canvas, no illustration, no hero band; the entire visual budget goes toward making a table of cheques scannable at a glance. The one deliberate brand choice is a **single restrained blue** (`{colors.accent}` — #123A9A) reserved for the primary action, links, focus rings, and the active state of a filter pill. Everywhere else the interface reads in `{colors.ink}` on `{colors.surface}`, with a **1px hairline border** (`{colors.border}`) doing almost all of the structural separation — shadows are used once, deliberately (`{elevation.float}`, on modals and dropdowns only), not as general-purpose depth.

Layout direction is **RTL Persian** throughout, including numerals rendered in Persian digits via the app's own `toFa()` helper. This is not a detail to bolt on after the fact — every spacing/margin decision below (`margin-inline-start`, not `margin-left`) exists because the mirror-image of a plain LTR layout breaks silently otherwise.

**Key characteristics:**
- Plain white surface (`{colors.surface}` — #FFFFFF), near-black in dark mode (`{colors-dark.surface}` — #0F1011) — never a tinted canvas.
- One accent color, blue, used scarcely: the primary "افزودن چک" button, links, the focus ring, and `{component.filter-pill-active}`. Nowhere else.
- One type family (IRANYekanX, a Persian variable font) across every size. Hierarchy comes from its `wght` and `dots` axes (see Typography), not from switching typefaces the way a serif/sans pairing would.
- `dots` (the font's optical-size axis) is pinned to `2` only on the logo/brand mark and `1` everywhere else — a deliberate flattening, not the font's own per-size default, done because a uniform dot size read calmer on a dense data screen.
- Border radius is small and consistent: `{rounded.ctl}` (8px) for every control, `{rounded.card}` (10px) for cards/panels, `{rounded.float}` (12px) for anything that floats above the page (modals, dropdowns, popovers, the command-palette-style pickers).
- Status is always color + icon + Persian text together — see `{component.status-chip}` — never a color-only signal.
- Spacing runs a tight 4px-based scale (`{spacing.s1}`…`{spacing.s7}`, 4→48px) — nothing like a marketing site's 96px section rhythm; this is a working screen, not a page you scroll through once.

## Colors

### Accent
- **Accent** (`{colors.accent}` — #123A9A): The only brand color. Primary buttons, links, active filter pills, focus rings. Used on maybe 3% of any given screen — that scarcity is what makes it register as "the important thing" when it appears.
- **Accent Hover** (`{colors.accent-hover}` — #0D2C77): Press/hover-darker variant.
- **Accent Wash** (`{colors.accent-wash}` — #EDF1FA): Focus-ring fill, selected-row tint. Never a large background fill.
- **Accent Line** (`{colors.accent-line}` — #A9B8E2): Border color for accent-adjacent outlines (e.g. an active pill's border before it fills).

### Surface & Border
- **Surface / bg** (`{colors.surface}` — #FFFFFF): The only surface color on light. No cream, no tinted gray.
- **Surface 2** (`{colors.surface-2}` — #FCFCFC): The barely-there step used for e.g. skeleton loading.
- **Surface Sunken** (`{colors.surface-sunken}` — #EFEFED): Table zebra-striping, sunken wells.
- **Border** (`{colors.border}` — #E4E4E1): The default 1px hairline. This is the system's primary structural tool — most "cards" are just this border + `{rounded.card}`, no shadow.
- **Border Subtle / Strong** (`{colors.border-subtle}` #EFEFED / `{colors.border-strong}` #C2C2BD): One step lighter (dividers inside a card) and one step darker (a control that needs to read as more clickable than a static hairline).

### Text
- **Ink** (`{colors.ink}` — #181816): Primary text, headings.
- **Ink 2** (`{colors.ink-2}` — #4B4B46): Secondary emphasis — just under full ink.
- **Muted** (`{colors.muted}` — #696964): Labels, placeholders, icon-only button color at rest.

### Semantic (status)
- **Success** (`{colors.success}` — #14805C / bg #E3F6ED): "ثبت شد" (registered).
- **Warning** (`{colors.warning}` — #B26A08 / bg #FDF1E3): reserved, not currently a board status.
- **Error** (`{colors.error}` — #C2453C / bg #FCEBEA): "مشکل در ثبت" (registration problem).
- Every one of these ships as background-wash + matching dot + Persian text in the same chip — see `{component.status-chip}`.

### Dark mode
Dark mode is not an inverted light mode — surfaces separate by **lightness steps of the same near-black**, not by hue, the same way the reference this was modeled on does it (`{colors-dark.bg}` #08090A → `{colors-dark.surface}` #0F1011 → `{colors-dark.surface-2}` #141516, each a few percent of white lifted on the last). The accent itself shifts from the deep #123A9A to a lighter, more saturated #5C87E8 so it still reads as "blue" against near-black rather than going muddy.

## Typography

### Font Family
**IRANYekanX** — one variable Persian font, loaded once (`css/shared.css`), used for every size in the system including numerals (rendered as Persian digits at runtime, not via CSS). There is no second family, no monospace, no serif. Fallback stack is `'IRANYekanX', 'Tahoma', sans-serif` — Tahoma because it's the most reliable pre-installed Persian-glyph-covering fallback on Windows, not for any stylistic reason.

Hierarchy is carried entirely by two variable axes:
- **`wght`** (330–680 in active use) — the usual weight axis.
- **`dots`** — an optical-size-like axis specific to this font. Pinned to `2` on the brand wordmark only; every other text size uses `1`. This was a deliberate, explicit product decision (not a default) made to calm down a screen that's mostly numbers and short Persian labels.

### Hierarchy

| Token | Size | `wght` | `dots` | Use |
|---|---|---|---|---|
| `{typography.display}` | 28px | 680 | 2 | Reserved size; not in active use outside brand context |
| `{typography.brand}` | (logo size) | 680 | **2** | The "چکینو" wordmark — the one place `dots` stays at 2 |
| `{typography.title}` | 21px | 600 | 1 | Modal titles, section heads |
| `{typography.label}` | 13px | 590 | 1 | Form field labels, filter pill text, buttons' text sibling |
| `{typography.button}` | (inherits) | 560 | 1 | Button label weight |
| `{typography.value}` | 15px | 510 | 1 | Table cell values |
| `{typography.num}` | (inherits) | 550 | 1 | Persian-digit amounts and serials — slightly heavier so numbers hold up in a dense row |
| `{typography.body}` | 14px | 430 | 1 | Default running text |
| `{typography.hint}` | (inherits) | 330 | 1 | Placeholder-weight helper text |
| `{typography.micro}` | 12px | 470 | 1 | Timestamps, fine print |
| `{typography.sub}` | 17px | — | — | Sub-headline size |
| `{typography.cap}` | 13px | — | — | Caption size |

### Principles
Never introduce a second typeface. Every size difference in this product is a difference in IRANYekanX's own `wght`/`dots` axes and `font-size`, never a family switch — that's what keeps a Persian RTL numerals-and-labels screen feeling like one coherent voice instead of a patchwork.

`dots: 2` is reserved for the brand mark. If a new component's spec calls for `dots: 2` anywhere else, that's very likely a copy-paste from the font's own default rather than an intentional choice — check before shipping it.

## Layout

### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.s1}` 4px · `{spacing.s2}` 8px · `{spacing.s3}` 12px · `{spacing.s4}` 16px · `{spacing.s5}` 24px · `{spacing.s6}` 32px · `{spacing.s7}` 48px.
- This is a working screen's scale, not a marketing page's — nothing here plays the role of a 96px section gutter. The largest gap in the system (`{spacing.s7}`, 48px) is still smaller than this reference's smallest "section" spacing.
- Touch targets follow WCAG 2.2 AA (24×24 CSS px minimum) with a documented exception pattern: a visually smaller icon (28–36px, to keep a dense row from ballooning) sits inside a `position: relative` box with an invisible `::after` pseudo-element carrying the full 44×44px hit area, centered via `top/left: 50%; transform: translate(-50%, -50%)`. See `.check-card .eye-btn`, `.receipt-btn`, `.status-dot-btn` in `css/dashboard.css` for the reference implementation.

### Grid & Direction
- **Direction:** RTL throughout (`<html dir="rtl">`). Every directional CSS property in this codebase is logical (`margin-inline-start/end`, `padding-inline-*`, `inset-inline-*`), never physical (`margin-left`) — a physical property silently breaks the mirror the moment RTL assumptions change.
- **Board:** three fixed status columns (منتظر ثبت / ثبت شد / مشکل در ثبت) side by side on desktop, collapsed to one column behind a tab strip below `860px`.
- **Toolbar:** search box, filter pills, and the report/export cluster share **one row**, wrapping onto a second line as a whole only when the viewport is too narrow for the search box itself (`≤700px`) — never split into two permanently separate rows, which reads as messier than a tight single line even when the split technically "fits."
- **Max content width:** the board's own width; no separate marketing-style max-width container.

### Whitespace Philosophy
Whitespace here does one job: keep adjacent controls from being mis-tapped, and keep a table row scannable. It is not used for pacing or drama the way a marketing page uses it — there's no equivalent of "96px between bands." When in doubt, less whitespace is more correct for this product than more.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, 1px `{colors.border}` only | The overwhelming majority of the UI — cards, table rows, toolbar |
| `{elevation.float}` | `0 1px 2px rgba(22,21,17,.08), 0 16px 36px -10px rgba(22,21,17,.16)` (light) / a four-layer stacked shadow that tightens as it darkens (dark mode) | Modals, dropdowns, popovers, the command-palette-style calendar/channel pickers — **the only things allowed a real shadow** |
| Skeleton | Flat shimmer (`--skeleton-base`/`--skeleton-sheen`) | Loading state before first data paint |

The philosophy is **border-first, shadow rare** — almost the inverse of a marketing site's "color-block first." A hairline border is enough to separate a card from the page; a shadow is reserved for something that's genuinely floating above the rest of the page (a modal, an open dropdown) and needs to visually detach from it. Dark mode's shadow additionally carries `{elevation.inset-hairline}` (`inset 0 0 0 1px rgba(255,255,255,.05)`) — a thin inner light line that makes a dark panel read as lit from its own edge rather than as a hole cut in the page.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.ctl}` | 8px | Every control: buttons, inputs, filter pills, icon-action buttons |
| `{rounded.card}` | 10px | Cards, panels — one step softer than a control, on purpose |
| `{rounded.float}` | 12px | Anything that floats: modals, dropdowns, popovers, tooltips |
| `{rounded.pill}` | 999px | Status chips, count badges — never a button |

Radius increases in three small, closely-spaced steps rather than a marketing system's wide jump (8→16px). The point isn't visual drama; it's a consistent, almost-subliminal signal for "this is a control" vs. "this is a container" vs. "this is floating above the page."

## Components

### Buttons
**`button-primary`** — The one place the accent blue appears at real size. `{colors.accent}` background, white text, `{typography.button}`, `{rounded.ctl}`, `{heights.md}` (40px). Hover darkens to `{colors.accent-hover}`.

**`icon-action`** — Icon-only or icon+label button used for secondary actions (people management, the report/export trigger). `{colors.surface}` background, `{colors.muted}` text/icon, 1px border. The label (when present) is hidden entirely, not just visually collapsed, on any touch-primary device — see Do's and Don'ts.

**`filter-pill`** / **`filter-pill-active`** — Toggle-style filter trigger (تاریخ / مبلغ / اشخاص). At rest: `{colors.surface}`, 1.5px border, `{colors.ink}` text. Active: fills solid `{colors.accent}`, white text. The 1.5px border weight is the one every other bordered control in the same toolbar row should match — see the icon-action note.

### Inputs
**`text-input`** — 1px `{colors.border}` at rest, thickens/shifts to `{colors.accent}` with a 3px `{colors.accent-wash}` outer ring on focus. `{rounded.ctl}`, `{heights.md}`.

### Dropdowns & Floating Panels
**`dropdown`** — Every autocomplete list, the channel-picker, the status-reason menu, and the Jalali calendar all share this component and, critically, share **where they live in the DOM**: always a direct child of `<body>`, `position: fixed`, positioned in JS from the trigger element's `getBoundingClientRect()`. Nesting one inside a modal or another popover is the single most-repeated real bug in this codebase's history — a transform or `backdrop-filter` on any ancestor becomes that fixed element's containing block and silently re-bases its coordinates onto the ancestor's own box instead of the viewport. If a new floating panel is ever added, it goes to `<body>` from the start.

### Status
**`status-chip`** — color wash + a solid dot of the same semantic color + the Persian status word, always together. `role="status" aria-live="polite"` on the toast variant so a screen reader hears status changes without focus moving.

### Modal
**`modal`** — `{colors.surface}`, 1px border, `{rounded.card}`, `{elevation.float}` shadow — one of only two places in the system with a real shadow (the other is a dropdown). `role="dialog" aria-modal="true"`.

### Cheque form (add / view / edit modal)
Styles in `css/cheque-form.css`, behavior in `js/cheque-form.js`, both scoped to `#modalOverlay`.
- **Two panes.** The form on the start (right) side, a sticky aside on the end (left) side with a live drawing of the Sayad cheque. Below 860px the aside moves on top and drops its progress/facts block.
- **Three numbered step cards** (مشخصات چک / طرفین چک / ارسال و پیوست). Fields sit on a 6-track grid (`.cq-span-2/3/4/6`). The step badge turns into a green check when that step's required fields are filled, and red when one of them has `.error`.
- **The cheque drawing** is `aria-hidden`: it only mirrors fields that already announce themselves. Its guilloche background is `color-mix()` of `{colors.accent}` so it follows dark mode. In view mode it carries a rotated stamp for the status (ثبت شد / ثبت نشد / منتظر ثبت).
- **`js/cheque-form.js` is read-only.** It never writes to a field or to modal state. Several values change without an input event (calendar `setDate`, `setAmountValue`, channel chips), so it also re-reads every 300ms while the modal is open and skips the redraw when nothing changed.
- **The inert wrappers are load-bearing.** `#veFieldsWrapA/A2/B/C` are what `lockFormFields()` makes inert in view mode. `#sayadField` sits outside them on purpose so its digits stay selectable.

## Do's and Don'ts

### Do
- Keep the canvas plain `{colors.surface}` (white / near-black). No tint, ever — that's the opposite instinct from a marketing brand and it's deliberate here: this is a tool people stare at for hours, not a page they visit once.
- Reserve `{colors.accent}` for the primary action, links, the focus ring, and the active filter state. If more than a small fraction of a screen is blue, something's wrong.
- Pair color with an icon and a Persian text label on every status signal. Never ship color alone.
- Put every dropdown/popover/calendar directly on `<body>`, `position: fixed`, positioned from the trigger's own rect. Never nest one inside a modal or another floating panel.
- Use logical CSS properties (`margin-inline-*`, not `margin-left`) for anything directional. This is an RTL-only product; a physical property is a latent bug.
- Give a visually-small icon button (<44px) an invisible `::after` pseudo-element carrying the real 44×44 tap target, rather than shrinking the tap target itself.
- On a touch-primary device (`hover: none` or `pointer: coarse`), remove a hover-reveal label outright (`display: none`), not just visually — a tap can leave an element stuck in `:hover`/`:focus-visible` with no real hover to leave, and a collapsed-but-still-in-the-DOM label reappears looking stuck open.

### Don't
- Don't introduce a second typeface. Every size/weight difference is IRANYekanX's own variable axes.
- Don't set `dots: 2` anywhere outside the brand wordmark — it's almost certainly an unintentional carry-over from the font's own default.
- Don't add a shadow to an ordinary card or table row. Shadows are reserved for modals and floating panels.
- Don't split a toolbar's controls across two permanently separate rows to solve a narrow-viewport crowding problem — first try shrinking what's already there (icon-only buttons, tighter pill padding) so everything stays one row; a second row that's idle at any width wider than the one bug you were chasing reads as more disorganized than a tight single line, even when nothing technically overlaps.
- Don't rely on `margin-left`/`padding-right`/etc. for anything that should mirror in RTL.
- Don't nest a `position: fixed` dropdown inside anything with a `transform` or `backdrop-filter` ancestor (a modal, an animated card) — it will silently reposition relative to that ancestor instead of the viewport.
- Don't treat a filtered-to-zero-results list the same as a genuine bug report — several toolbar elements (the export/report cluster, "چکی در این وضعیت نیست") intentionally hide or change when a filter matches nothing; that's by design, not breakage.

## Responsive Behavior

### Breakpoints
This codebase currently uses several breakpoints (420/480/560/600/601/700/720/760/860px) that don't reduce to a clean small set — a known, flagged inconsistency, not a documented system. Treat the two most load-bearing ones as authoritative for new work rather than adding a new value:

| Width | What changes |
|---|---|
| `≤ 860px` | Touch-target pass: interactive controls step up toward 44px (via the pseudo-element pattern, not literal resizing where that would bloat a dense row); hover-reveal labels are removed outright, not just visually hidden |
| `≤ 700px` | The board toolbar wraps: search box takes its own full-width line; the filter pills, clear-filter button, and report/export cluster share the line below, shrinking (icon-only, tighter padding) to stay on that one line rather than splitting further |
| `≤ 860px` (board) | Three-column board collapses to a status-tab strip over a single column; drag-and-drop is disabled (no pointer precision for it on touch) |

### Touch Targets
Minimum 44×44px effective hit area on every icon-only control at phone width, achieved via the pseudo-element pattern above wherever the visible icon is smaller — never by literally growing a dense row's icons to 44px, which was tried and reads as bulky.

### Collapsing Strategy
Prefer shrinking what's on a line (icon-only buttons, tighter padding, hidden non-essential labels) over adding a new row or splitting a control group that used to read as one unit. A toolbar that used to be "search, then filters, then report" splitting into two visually separate bars is a regression even when each half, alone, is not broken.

## Iteration Guide

1. Pull every value from the live CSS (`css/shared.css` for tokens, `css/dashboard.css` for components) before writing a spec here — this file is a description of what ships, not an aspiration.
2. A new component's colors/spacing/radius should resolve to an existing token. A new raw hex or new spacing value is almost always a sign the existing scale wasn't checked first.
3. Check the "Do's and Don'ts" dropdown-positioning and touch-target rules before adding any new floating panel or icon-only control — both have already caused real, shipped bugs once each.
4. RTL is not a mode this product can fall back out of. Every new rule uses logical properties.
5. When a mobile crowding problem appears, exhaust "shrink what's here" before reaching for "give it its own row."
6. Update this file when the underlying CSS changes meaningfully — it drifts otherwise, the same way the original auto-generated version was already describing the wrong product entirely.

## Known Gaps

- No component inventory yet for the admin panel (`chekino_admin.html` / `css/admin.css`) or the login screen beyond what's referenced inline above — this file currently documents the dashboard board view in depth and the shared tokens everything else draws from.
- Animation/motion tokens (`{motion.*}`) are listed but not exhaustively mapped to every transition in the codebase — treat the values as accurate, the mapping as partial.
- The nine inconsistent breakpoints noted under Responsive Behavior are a known debt, not a documented system; don't treat any of them beyond the two called out as intentional.
