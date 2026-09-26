---
version: minimal-1
name: Chekino design system — minimal, one accent (Lajvard)
description: >
  An RTL Persian tool for registering Sayad cheques and tracking whether the
  payee registered them. Minimal on purpose: a plain white field, hairlines
  instead of shadows, one flat accent (lapis), and type and space doing the
  structural work. The one illustrative element is a realistic drawing of
  the Sayad cheque. Every value below is read out of css/shared.css.

colors:
  bg: "#FFFFFF"            # --bg, --surface
  surface-2: "#F8F9FB"     # quiet fills: search field, side panel, hover
  surface-sunken: "#F3F4F7"
  border-subtle: "#EEEFF3"
  border: "#E3E5EB"
  border-strong: "#C9CDD6"
  ink: "#0F1120"
  ink-2: "#474B5C"
  muted: "#6B7082"         # 4.9:1 on white
  accent: "#2C3FC4"        # lapis, flat — the only interactive colour
  accent-hover: "#2332A1"
  accent-wash: "#EEF0FC"
  accent-2: "#14A594"      # turquoise — only inside the cheque drawing
  pending: "#2C3FC4"
  done: "#17875B"
  problem: "#C93B33"
  due-soon: "#D08E0C"      # text step #8F5F00

colors-dark:
  bg: "#0D0E14"
  surface: "#13151C"
  surface-2: "#181A22"
  ink: "#ECEDF3"
  muted: "#858A9C"
  accent: "#7A8BF6"
  border: "rgba(255,255,255,0.09)"

typography:
  family: "IRANYekanX (variable: wght 100–1000, dots 1–2)"
  scale: [12, 13, 14, 15, 17, 22, 28/30]
  weights: { brand: 820, title: 660–720, label: 580, button: 620, value: 520, body: 420 }

radius: { control: 10px, card: 12px, float: 16px, pill: 999px }
heights: { control: 40–42px, primary-submit: 48px }
motion: { press: 100ms, default: 180ms, enter: 280ms, ease-out: "cubic-bezier(0.16, 1, 0.3, 1)" }
---

## Principles

1. **White field, hairlines.** Surfaces are separated by a 1px line and by
   space. `--shadow-1` is `none`. A shadow appears in only two cases: a card
   under the pointer (`--shadow-lift`) and things that float — menus,
   popovers, modals (`--shadow-2`).
2. **One accent, flat.** Lapis (`--accent`) marks what can be pressed or is
   active: primary buttons, focus rings, the selected filter. No gradients, no
   coloured shadows. Everything else is ink on white.
3. **Type and space carry hierarchy.** One family (IRANYekanX). Titles use
   size and weight; secondary text uses `--muted`. **Never letter-space
   Persian text** — it breaks the joins. Latin digits and machine values
   (serial, sayad id) are set LTR, tabular, lightly tracked.
4. **Status is a dot and a word.** Pending lapis, registered green, problem
   red, due-soon saffron — always a small dot plus the Persian label.
5. **Motion only answers the user.** No idle or looping animation. Presses
   100ms, changes 180ms, entrances 280ms. `prefers-reduced-motion` is
   honoured globally.

## Components

**Buttons.** Primary: solid `--accent`, white text, radius 10, hover
`--accent-hover`, press scale 0.98. Secondary: white with a 1px `--border`,
hover `--surface-2`. Filter chips are pills; the active one is
`--accent-wash` with `--accent-text`.

**Fields.** 42px, 1px `--border`, radius 10, no shadow. Hover
`--border-strong`; focus `--accent` border + `--ring` (3px wash); error red
border + `--ring-bad`, message below, one small nudge. The search field is a
`--surface-2` fill until focused.

**Header.** 60px, translucent white with blur, hairline below. Brand mark +
wordmark, a quiet command button (opens the Ctrl+K palette), icon buttons
without borders.

**Board.** Page title (30px) with a one-line summary of what needs doing
(`#boardSummary`). Three columns separated by space only; each head is a
coloured dot, the status name, a muted count, and the column's total amount,
over a hairline. Cards: white, 1px border, radius 12; serial on top with the
due date beside it (saffron / red text with a dot when due soon / overdue),
payee and amount in the middle, actions under a hairline. Hover: stronger
border + lift shadow. Empty columns just say so in muted text.

**Cheque window** (`css/cheque-form.css`, `js/cheque-form.js`). One window, two
faces, switched by the `.ve-locked` class dashboard.js puts on `#modalBody`:

- *Add / edit — a plain form.* Three sections in the order the work
  happens: «اطلاعات روی چک», «اشخاص», «ارسال برای ثبت». Each has one
  sentence saying what it is for, and every field that is easy to mix up
  (serial vs sayad id; owner vs party vs beneficiary; national id length)
  carries a one-line `.field-hint` that steps aside when the field shows an
  error. Optional fields (spend date, notes, photo) are folded into a
  «جزئیات بیشتر» `<details>`, opened automatically when they hold a value or
  an error. The header chip `#cqRemaining` says how many required fields are
  left («۳ مورد ضروری مانده» → «آماده‌ی ثبت») and jumps to the first empty
  one. A section's number turns into a green check when it is complete.
- *View — the cheque itself.* The status sentence, the drawn cheque with
  its stamp, and below it only what the cheque doesn't carry (party, send
  date, channels, spend date, notes, photos, sayad id with a copy button)
  and the status history. On narrow screens the cheque's key values are
  repeated in readable type. «ویرایش» switches to the form; saving returns
  to the board.

The inert wrappers `#veFieldsWrapA/A2/B/C` are what `lockFormFields()` makes
inert in view mode; `#sayadField` stays outside them.

**The cheque** (`css/cheque.css`, `js/print.js`). Laid out like the printed
leaf: stub (ته‌چک) with a perforated tear line, bank emblem and sayad id box,
the date boxed and written out in words, the payment sentence with blanks,
the amount in rial words, owner and a signature that draws itself, and the
MICR line. Its paper and faint guilloche are its own colours (dimmed in dark
mode). A clean outlined stamp («ثبت شد» / «ثبت نشد» / «منتظر ثبت») sits over
the stub. Sized in `em` off a container-query font size, so the leaf scales
as one object. Used in the view face above and on the login page.

**Floating surfaces.** 1px subtle border, radius 12–16, `--shadow-2`, a
280ms rise. Overlays: `--scrim` with a light blur. Dropdowns and popovers
live on `<body>`, `position: fixed`, positioned from the trigger's rect —
never nested inside a transformed ancestor.

**Login.** Two panes: the form on white; a `--surface-2` panel with the
sample cheque (slightly rotated) and one line of copy. Below 960px the panel
becomes a band above the form.

**Admin.** Same system: translucent top bar, a plain side navigation (the
active item on `--surface-2`), bordered cards, tables with a tinted header,
status badges with a dot.

## Files

| File | Role |
|---|---|
| `css/shared.css` | tokens (both themes), baseline, command palette |
| `css/dashboard.css` | dashboard; the **VISUAL LAYER** section at the end decides the look |
| `css/cheque.css` | the cheque leaf |
| `css/cheque-form.css` | the add / view / edit modal |
| `css/login.css`, `css/admin.css` | the two other pages |
| `js/print.js` | guilloche + signature generators |
| `js/cheque-form.js` | view face (the cheque + facts), section checks, required-left chip (read-only) |
| `js/shell.js` | header command button, board summary, column totals (read-only) |
| `js/login-art.js` | the login page's sample cheque |
