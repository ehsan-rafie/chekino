---
version: mono-1
name: Chekino design system — black and white, after Magic UI / shadcn/ui
description: >
  An RTL Persian tool for registering Sayad cheques and tracking whether the
  payee registered them. The look follows Magic UI (built on shadcn/ui): a
  white page, neutral greys with no hue, 1px edges doing the separating,
  small tight corners (never a capsule), outlined fields, and ink itself as
  the action colour — black on white, white on black. Colour is kept for
  status and for the one illustrative element, a realistic drawing of the
  Sayad cheque used to view a cheque. Every value below is read out of
  css/shared.css.

colors:
  bg: "#FFFFFF"            # --bg, --surface
  surface-2: "#FAFAFA"     # board lanes, modal body, header search
  surface-sunken: "#F5F5F5" # tab tracks
  border-subtle: "#F0F0F0" # dividers inside cards
  border: "#E5E5E5"        # cards, outlined buttons, fields (--field-border)
  border-strong: "#D4D4D4" # hover edges, dashed facet filters
  ink: "#0A0A0A"
  ink-2: "#404040"
  muted: "#737373"         # 4.7:1 on white
  accent: "#171717"        # primary buttons
  accent-hover: "#262626"
  accent-wash: "#F5F5F5"   # hover backgrounds
  hl: "#0485F7"            # HeroUI's blue: focus, the chosen day / year / month, ticks, applied filters
  hl-text: "#1E63AE"       # blue text on the soft blue wash
  hl-soft: "rgba(4,133,247,.14)"  # active date segment, today, range middle, applied filter
  focus-edge: hl           # a focused field: blue edge + 1px blue ring = a 2px blue line
  pending: "#404040"       # the waiting state is ink, not a colour
  done: "#16A34A"
  problem: "#DC2626"
  due-soon: "#D97706"      # text step #92400E

colors-dark:
  bg: "#0A0A0A"
  surface: "#141414"
  surface-2: "#111111"
  border: "rgba(255,255,255,0.10)"
  field-border: "rgba(255,255,255,0.14)"
  ink: "#FAFAFA"
  muted: "#A1A1A1"
  accent: "#E5E5E5"        # light buttons with dark text
  on-accent: "#171717"
  hl: "#1A8CFF"
  hl-text: "#7AB8FF"

shadows:
  shadow-1: "0 1px 2px rgba(0,0,0,.04)"   # resting: cards, outlined buttons
  shadow-lift: "card under the pointer"
  shadow-2: "floating: menus, popovers, calendar, modals — always with the 1px ring --inset-hairline"
  ring: "0 0 0 1px var(--hl)"  # focus, on top of the blue edge

typography:
  family: "IRANSansX, licensed from fontiran.com (fonts/IRANSansXVFaNum.woff2, variable Farsi-numerals cut: wght 100–1000, DOTS 0–8 left at 0)"
  digits: "proportional everywhere; tabular only in tables and the sayad id"
  scale: [12, 13, 14, 15, 17, 22, 26, 32]

radius: { badge: 8px, control: 12px, lane-card: 16px, menu: 16px, card: 20px, float: 20px, modal: 24px, calendar-day: circle }
heights: { field: 38px, button: 36px, badge: 20–22px }
motion: { press: 100ms, default: 180ms, enter: 280ms }
---

## Principles

1. **Edges, not shadows.** The page is white. Cards, fields and outlined
   buttons carry a 1px `--border` and at most a hair of shadow
   (`--shadow-1`). Only things that float (menus, popovers, the calendar,
   modals, toasts) get a real drop, `--shadow-2`, together with the 1px
   ring in `--inset-hairline` standing in for a border.
2. **HeroUI corners, never a capsule.** Badges 8, fields, buttons and
   icon buttons 12, cards inside a lane 16, menus 16, cards, popovers and
   the calendar 20, modals 24; calendar days are circles. Buttons stay
   rounded rectangles, not pills. `--rad-pill` survives only as an alias
   for 12px, for older rules.
3. **Ink to press, blue for "you are here".** Primary buttons are solid
   `--accent` (near-black; near-white in the dark theme, with dark text).
   Secondary buttons are outlined; facet filters have a dashed edge until
   they hold a value. Hover is a grey wash (`--accent-wash`). HeroUI's
   blue (`--hl`) is kept for focus and selection only: a 2px blue line
   round the focused field, keyboard focus rings, the date segment being
   typed, today / the chosen day / a range in the calendar, the chosen
   year and month in its picker, ticked boxes, an applied filter, a lane
   about to take a dragged card. No gradients.
4. **Fields are outlined.** White, 38px, `--field-border`, radius 12. Hover
   darkens the edge; focus turns it blue (`--focus-edge` + `--ring`); an
   error turns the edge red with a red ring.
5. **Colour means status.** Pending is ink; registered green, problem red,
   due-soon amber — always a small dot plus the Persian label. Besides the
   focus blue, the drawn cheque's own blue print is the only other colour
   on screen.
6. **Type and space carry hierarchy.** One family (IRANSansX). **Never
   letter-space Persian text** — it breaks the joins. Machine values (serial,
   sayad id, national id) are set LTR. IRANSansX's tabular digits are cut
   wide, so single values (amounts, dates, serials on cards and on the
   cheque) use its proportional digits; only tables and the sayad id are
   tabular.
   The font is licensed for this site only. Its files are git-ignored: they
   sit in `fonts/` on the owner's PC and on the server, and must not be
   committed or copied anywhere public. A fresh clone falls back to Tahoma
   until `IRANSansXVFaNum.woff2` / `.woff` are put back in `fonts/`.
7. **Motion answers the user.** Four Magic UI moments, each tied to
   something the user did or to the page arriving: the spotlight that
   follows the pointer across a cheque card, the blur-fade the first cards
   arrive with, the theme switch opening as a circle from its button, and
   (on the login page only) a border beam turning slowly round the form.
   `prefers-reduced-motion` is honoured globally.

## Components

**Header.** 56px, white glass with one hairline under it. Brand mark +
wordmark (the mark's strokes are drawn in the page colour, so it inverts)
at the start; ghost square icon buttons (support, theme, account) at the
end. Nothing in the middle: the Ctrl+K palette has no button, only its
shortcut. The floating support button is hidden on the dashboard, since
the header already has one.

**Page head.** No title and no summary line. The one primary action,
«افزودن چک», opens the page at the start (the right); «گزارش‌گیری»
(unrolls into PDF / Excel) and «مدیریت اشخاص» sit at the other end.

**Toolbar.** The search field, then the facet filters «تاریخ» «مبلغ»
«اشخاص» (dashed until they hold a value), then «پاک کردن فیلترها» when
something is filtered.

**Board.** Three lanes on `--surface-2` with a subtle edge. Each head is a
status dot, the name in ink, a small outlined count badge, and the lane's
total at the far end. Cards: white, 1px edge, radius 16; serial on top
with the due date as an outlined badge (amber / red wash with a dot when
due soon / overdue), payee and amount in the middle, outlined 30px icon
buttons and a tinted status square below. Under the pointer a soft light
follows the cursor and catches the card's edge (Magic Card; `shell.js`
sets `--mx` / `--my`). Empty lanes say so in a dashed box. On narrow
screens the lanes become segmented tabs.

**Cheque window** (`css/cheque-form.css`, `js/cheque-form.js`). One window,
two faces, switched by the `.ve-locked` class dashboard.js puts on
`#modalBody`:

- *Add / edit — two cards on a faint grey body.* Each card has a header
  strip (an outlined icon tile and the title) over a hairline, then its
  fields. «مشخصات چک»: serial, sayad id, amount (with the amount in words),
  due date, spend date (optional), photo (optional). «مشخصات اشخاص»:
  owner, party, beneficiary and their national id, then — under a divider —
  send date and the channels it was sent through. A free note (optional)
  sits under the cards. Labels are short; there are no hints or side
  descriptions. The save button is compact and sits at the end of the
  footer; saving an edit asks for a one-tap confirmation in place.
- *View — the cheque itself.* The status sentence, the drawn cheque with
  its stamp, then a bordered card with only what the cheque doesn't carry
  (party, send date, channels, spend date, notes, photos, sayad id with a
  copy button) and the status history. On narrow screens the cheque's key
  values are repeated in readable type. «ویرایش» switches to the form.

The inert wrappers `#veFieldsWrapA/A2/B/C` are what `lockFormFields()`
makes inert in view mode; `#sayadField` stays outside them. The wrappers
are `display: contents`, so they never affect the grid.

**Fields as input groups** (shared.css "INPUT GROUP", `js/field-addons.js`).
HeroUI's InputGroup: the label above, a prefix at the start (the right)
and a suffix at the end (the left), chosen for what the field holds. The
add-ons are laid over the input's padding (`.ig`, `.ig-pre`, `.ig-suf`,
`.has-pre` / `.has-suf`, widths via `--pre-w` / `--suf-w`), so each
input keeps its own border, focus and error styles; physical sides are
used because the numeric inputs are `direction: ltr`.

| Field | Prefix | Suffix |
|---|---|---|
| serial / sayad id | # / barcode icon, on the left (a left-to-right group) | running digit count on the right, green when complete |
| amount | — (no icon, no «۰» placeholder) | «ریال» |
| owner / party / beneficiary | building / briefcase / person icon | arrow that opens the full list of names on file |
| national id | id-card icon, on the left (left-to-right group) | «حقیقی» / «حقوقی» as a blue badge on the right |
| dates | — | calendar button |
| notes | — | character count inside, bottom corner |
| board search | search icon | «/» key hint, clear button |
| amount filter | «از» / «تا» | «ریال» |
| login / admin sign-in | person / lock icon | show-password toggle |
| admin: company, plan, account fields | building / person / key / tag / people / cheque icons | «تومان» on prices; «تولید تصادفی» inside the new-password field; a copy button on the revealed password |

Numbers, codes, usernames and passwords read left to right (`direction:
ltr`, left-aligned). Serial, sayad id and national id are whole
left-to-right groups (`.ig.is-ltr`): icon on the left where the number
starts, count or badge on the right, placeholder next to the icon. The
amount and the other numeric fields keep their suffix on the left, next
to the digits; the search box turns left-to-right once something is
typed. Generated passwords use a monospace face with Latin digits.

**Drop-down lists** (people suggestions, send channels) follow HeroUI's
ListBox: one column, short rows, no boxes inside boxes. People show the
name with the matched part in bold and a quiet tag, and «+ name / new» below
a hairline; channels show a small logo, the name, and a blue check at the
end when chosen.

**Date fields** (`js/date-segments.js`). HeroUI's DateField: the day,
month and year are three segments («روز» / «ماه» / «سال» until they hold
digits), and while the field has focus the segment the next digit goes
into is highlighted in soft blue. The segments are drawn over the real input, which
keeps the caret, the typing rules, paste and validation
(`createDateField` in dashboard.js); pressing a segment moves the caret
into it. The calendar button sits inside the field at the end, and it is
the only way the calendar opens — focusing the field to type doesn't.

**Calendar** (Jalali). HeroUI's: a white popover (radius 20, ring + drop)
with one «مهر ۱۴۰۵ ⌄» button at the start and two blue arrows at the end.
Day cells are circles, and the weeks are filled out with the neighbouring
months' days, faded. Today is a soft blue circle with blue text; the
chosen day is a solid blue circle; in a range the ends are solid blue and
the middle a soft blue band. «امروز» is an outlined button. The title
button (`js/cal-picker.js`) swaps the days for HeroUI's year grid (three
columns, the chosen year solid blue); picking a year shows the twelve
months, and picking a month goes back to the days. It writes to the two
hidden `<select>`s dashboard.js reads, so the calendar logic is unchanged.

**The cheque** (`css/cheque.css`, `js/print.js`). Laid out like the printed
leaf: stub (ته‌چک) with a perforated tear line, bank emblem and sayad id box,
the date boxed and written out in words, the payment sentence with blanks,
the amount in rial words, owner and a signature that draws itself, and the
MICR line. Its paper, blue print and faint guilloche are its own colours
(dimmed in dark mode). A clean outlined stamp («ثبت شد» / «ثبت نشد» /
«منتظر ثبت») sits over the stub. Sized off a container-query font size, so
the leaf scales as one object. Used in the view face and on the login page.

**Floating surfaces.** No border of their own: `--shadow-2` plus the 1px
ring, radius 16–20, a 280ms rise. Menu items are radius 10 with a grey
hover; checkboxes are solid ink when ticked. Overlays use `--scrim` with a
light blur. Dropdowns and popovers live on `<body>`, `position: fixed`,
positioned from the trigger's rect — never nested inside a transformed
ancestor.

**Modals.** Radius 24, header and footer framed by hairlines, a ghost
close button. The people window uses segmented tabs and outlined rows.
The command palette follows shadcn's Command.

**Login.** Two panes: the form in a bordered card with a Border Beam (a
short bright arc of the edge, turning once every seven seconds), and a
faint grey panel with the sample cheque over a fading Grid Pattern and one
line of copy. Below 960px the panel becomes a band above the form.

**Admin.** Same system: a top bar with a hairline, a side navigation whose
active item is a grey wash, bordered cards, outlined fields, ink buttons,
tables with a faint header row, status badges with a dot. On narrow
screens the navigation becomes segmented tabs.

## Files

| File | Role |
|---|---|
| `css/shared.css` | tokens (both themes), baseline, command palette, the theme-switch view transition |
| `css/dashboard.css` | dashboard; the **VISUAL LAYER — Monochrome** section at the end decides the look |
| `css/cheque.css` | the cheque leaf |
| `css/cheque-form.css` | the add / view / edit modal |
| `css/login.css`, `css/admin.css` | the two other pages (each ends with a "Monochrome finish" section) |
| `js/print.js` | guilloche + signature generators |
| `js/cheque-form.js` | view face: the cheque and the facts card (read-only) |
| `js/shell.js` | header command button, board summary, column totals, card spotlight, first-load blur-fade (read-only) |
| `js/theme-reveal.js` | the circular theme switch (dashboard and admin) |
| `js/date-segments.js` | the day / month / year segments drawn over each date field (read-only) |
| `js/cal-picker.js` | the calendar's title button and its year / month picker |
| `js/field-addons.js` | the live input-group suffixes on the dashboard: digit counts, list arrows, copy buttons |
| `js/login-art.js` | the login page's sample cheque |
