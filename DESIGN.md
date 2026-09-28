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
   **Cursors are the usual ones** — a hand on what can be pressed, a text
   cursor where something is typed — with one exception: a field's own
   icons and suffix text (input-group add-ons, «ریال», the search icon)
   show the arrow instead of the text cursor of the input under them.
   They catch the pointer, and pressing one puts the caret in the field
   (`js/field-addons.js`). Buttons press in slightly (scale .97); the
   controls that belong to a field — the channel tags, a field's
   calendar / list / copy button, the photo row's button — don't.
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
   Of the font's extras two are used. **The rial sign ﷼ (U+FDFC)**, which
   IRANSansX draws as its «ریال» logotype, stands for «ریال» wherever a unit
   sits beside an amount in the interface — the amount field and filter,
   the board's cards, the cheque's facts — and screen readers still say
   "rial"; sentences, the printed report, the Excel file and the drawn
   cheque keep the word. The admin's prices get the «تومان» logotype
   (typed «تومانء», in an aria-hidden suffix). **ss04** sets digits a touch
   lower, centred in a box: on fields holding digits alone (serial, sayad
   id, national id, amount, the date segments, the amount filter). DOTS
   (0–8) and the swash / alternate letters (ss05–ss07) are left off.
   The font is licensed for this site only. Its files are git-ignored: they
   sit in `fonts/` on the owner's PC and on the server, and must not be
   committed or copied anywhere public. A fresh clone falls back to Tahoma
   until `IRANSansXVFaNum.woff2` / `.woff` are put back in `fonts/`.
7. **Motion answers the user, with two exceptions.** Magic UI moments tied
   to something the user did or to the page arriving: the spotlight that
   follows the pointer across a cheque card, the blur-fade the first cards
   arrive with, the theme switch opening as a circle from its button. Two
   quiet loops are the exceptions, each on the one thing it points at:
   the shimmer round «افزودن چک» (Magic UI's Shimmer Button) and, on the
   login page, a border beam round the form. `prefers-reduced-motion` stops
   all of it.

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
The add button is Magic UI's Shimmer Button (@dillionverma), ported class
for class (`.shimmer-btn`): black, a 1px white/10 border, shadow-2xl,
a blurred spark sliding end to end (3s, alternate) while spinning (6s),
a 0.05em lit edge, a soft light rising from the bottom. Two departures:
the theme's 12px corner instead of 100px (the owner's choice, knowing
the light fades a little on the climb up the short left side), and its
size — 36px high with a 14px label and a plus in front, like the buttons
beside it (40px on phones).

**Toolbar.** The search field, then the facet filters «تاریخ» «مبلغ»
«اشخاص» (dashed until they hold a value), then «پاک کردن فیلترها» when
something is filtered.

**Board.** Three lanes on `--surface-2` with a subtle edge. Each head is a
status dot, the name in ink and a small outlined count badge (no totals).
Cards: white, 1px edge, radius 16; serial on top with the due date as an
outlined badge (amber / red wash with a dot when due soon / overdue),
payee and amount in the middle, borderless 30px icon buttons (a grey wash
on hover) and a tinted status square without an edge below. Under the pointer a soft light
follows the cursor and catches the card's edge (Magic Card; `shell.js`
sets `--mx` / `--my`). Empty lanes say so in a dashed box. On narrow
screens the lanes become segmented tabs.

**Cheque window** (`css/cheque-form.css`, `js/cheque-form.js`). One window,
two faces, switched by the `.ve-locked` class dashboard.js puts on
`#modalBody`:

- *Add / edit — fields first, on a plain white body.* The two sections
  have no border, shadow or header strip: each title is a small grey
  caption centred on a hairline (── مشخصات چک ──), and that line is the
  only thing parting the sections, so the fields themselves are what the
  eye lands on. **From 1100px across the sections stand side by side**
  in a 1040px window — the cheque on the right (read first), the people
  on the left — so the form is about half as tall (no scroll at 1280×720)
  and each field nearer the size of what goes in it; there the photo and
  the note each take a full row, and the channel tags sit under their
  label (all five on one line). Enter / Tab run down the right column
  before the left. Narrower screens keep the stacked layout described
  here. «مشخصات چک»: serial | sayad id, amount (with the amount in
  words) | due date, then the photo | the note side by side at one
  field's height. The photo is one slim row (an image icon, small
  thumbnails once added, a drop hint until then, «انتخاب فایل» at the
  end, after 21st.dev's File Upload); the note is a single line that
  grows as it is typed into (up to 120px), its count at the end of the
  line while focused; Shift+Enter breaks a line. «مشخصات اشخاص», each
  person beside the date that belongs to them: owner | send date, party
  | spend date (names 4 columns, the dates 2 — as wide as the due date,
  in the same column), beneficiary | their national id (3 | 3), then the
  channels. On phones every cheque field is full width; the people keep
  their pairs.
  **Enter moves on in the same order as Tab** (`focusNextField`): it
  passes over the photo button (Enter there is inert), a name picked from
  a list with Enter moves on too, and after the national id it lands on
  the channel tags, where Enter presses the tag. Ctrl+Enter saves from
  anywhere in the form.
  **The channels are toggle tags**, not a dropdown (HeroUI's TagGroup,
  selection «multiple»): the options are too few to hide behind a list.
  Compact tags (32px, radius 10) on the label's own line; they wrap
  under each other, not under the label (on a phone they start on the
  line below it). Each holds a logo and the name. The four messengers —
  روبیکا، واتس‌اپ، ایتا، تلگرام — carry their official marks in their
  brand colours, taken from their own sites (rubika.ir, whatsapp.com,
  eitaa.com, telegram.org) and inlined with fill attributes, never
  classes, so nothing leaks into the page. The tags themselves are the
  theme's — outlined like a field — and a chosen one takes the selection
  blue (blue edge, faint blue wash). One tab stop for the group; the
  arrow keys walk it, Space / Enter presses.
  **«سایر»** (dashed edge, a plus: it adds, it isn't a choice) slides
  open in its own place into a small text field with the caret in it.
  Enter — or leaving the field — adds what was written as one more tag,
  chosen, with an × to take it off, and folds the field back into
  «سایر», ready for another; Escape folds it without adding. Typing the
  name of one of the four («واتساپ») picks that tag instead. Each entry
  is saved as written, as one more string in the channels array. A
  record's entries that aren't one of the four — typed ones, or «بله» /
  «تماس» / «پیامک» from records made before those left the list — come
  back as such tags, so nothing is dropped.
  **Nothing marks required or optional** — no «اختیاری», no asterisk, no
  dot. All but the photo, spend date and note are required
  (`aria-required` on the inputs); saving focuses the first field that
  is missing or wrong, and each shows a red edge and a line under it (no
  shake). A field's format rule is a quiet hint in brackets after its
  label — «سریال (۶ رقم)», «شناسه صیادی (۱۶ رقم)», «کد / شناسه ملی ذینفع
  (۱۰ یا ۱۱ رقم)» — not a placeholder: it stays visible while typing, and
  Persian placeholder text inside a left-to-right box came out reversed
  («رقم ۶»). The name pickers have no «انتخاب کنید»; their icon and
  arrow say it. Placeholders left: the date segments and the
  note's example. The save button is compact and sits at the end of the
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
| serial / sayad id | # / barcode icon, on the left (a left-to-right group) | — (the sayad id is shown in fours while typed: «۱۲۳۴ ۵۶۷۸ ۹۰۱۲ ۳۴۵۶») |
| amount | — (no icon, no «۰» placeholder) | ﷼ |
| owner / party / beneficiary | building / briefcase / person icon | arrow that opens the full list of names on file |
| national id | id-card icon, on the left (left-to-right group) | «حقیقی» / «حقوقی» as a blue badge on the right |
| dates | — | calendar button |
| notes | — | character count at the end of the line, while focused |
| board search | search icon | «/» key hint, clear button |
| amount filter | «از» / «تا» | ﷼ |
| login / admin sign-in | person / lock icon | show-password toggle |
| admin: company, plan, account fields | building / person / key / tag / people / cheque icons | the «تومان» logotype on prices; «تولید تصادفی» inside the new-password field; a copy button on the revealed password |

Numbers, codes, usernames and passwords read left to right (`direction:
ltr`, left-aligned). Serial, sayad id and national id are whole
left-to-right groups (`.ig.is-ltr`): icon on the left where the number
starts, the badge (national id) on the right; the digit rule is in the
label. The sayad id's spaces are for the eye only — the digits alone are
checked and saved — and Backspace beside a space takes the digit beyond
it. The
amount and the other numeric fields keep their suffix on the left, next
to the digits; the search box turns left-to-right once something is
typed. Generated passwords use a monospace face with Latin digits.

**Drop-down lists** (people suggestions) follow HeroUI's ListBox: one
column, short rows, no boxes inside boxes. People show the name with the
matched part in bold and a quiet tag, and «+ name / new» below a hairline.

**Date fields** (`js/date-segments.js`). HeroUI's DateField: the day,
month and year are three segments («روز» / «ماه» / «سال» until they hold
digits), and while the field has focus one of them is active, in soft
blue. Editing works a segment at a time (`createDateField` in
dashboard.js):
- digits (Persian or Latin): the first one replaces what the segment
  held; a segment moves on by itself once complete — two digits, or one
  that can't start a longer number («۴» → day ۰۴, «۲» → month ۰۲; «۳۵» is
  ۰۵, since ۳۵ can't be a day). The year takes four; focusing an empty
  field fills in this year.
- Backspace takes off the last digit, as in any input; in an empty
  segment it steps back to the one before. Delete clears the segment.
- ← / → the next / previous segment (← is next in this right-to-left
  line), Home / End the ends; «/», «.», «-» or a space move on too.
  ↑ / ↓ step the value.
- a lone day or month digit is padded («۳» → «۰۳») once its segment is
  left.
A phone keyboard, which sends no usable keydown, comes through
`beforeinput` to the same code. The segments are drawn over the real
input, whose caret sits at the active segment; pressing a segment makes it
the active one. In an error the box alone carries the red ring — the bare
input inside no longer gets its own pink one. The calendar button sits inside the field at the end, and it is
the only way the calendar opens — focusing the field to type doesn't.
The calendar stays inside the cheque form's box: under the field if it
fits, above it if not, its right edge on the field's — or its left edge,
when the right would push it out past the form (the dates sit at the
form's left and are narrower than the calendar).

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
| `js/shell.js` | card spotlight, first-load blur-fade, tooltip tidy-up (read-only) |
| `js/theme-reveal.js` | the circular theme switch (dashboard and admin) |
| `js/date-segments.js` | the day / month / year segments drawn over each date field (read-only) |
| `js/cal-picker.js` | the calendar's title button and its year / month picker |
| `js/field-addons.js` | the live input-group suffixes on the dashboard: digit counts, list arrows, copy buttons |
| `js/login-art.js` | the login page's sample cheque |
