---
version: heroui-1
name: Chekino design system — HeroUI-style, one blue accent
description: >
  An RTL Persian tool for registering Sayad cheques and tracking whether the
  payee registered them. The look follows HeroUI v3: a light grey canvas,
  white cards that lift off it with a soft shadow instead of a border,
  filled grey fields inside cards, pill-shaped buttons, chips and tabs, and
  one blue accent. The one illustrative element is a realistic drawing of
  the Sayad cheque, used to view a cheque. Every value below is read out of
  css/shared.css.

colors:
  canvas: "#F4F4F5"        # --bg (page and modal body)
  surface: "#FFFFFF"       # --surface: cards, bars, floating surfaces
  field: "#F1F1F3"         # --field-bg: fields inside a white card
  field-hover: "#EAEAED"   # --field-bg-hover; also tab tracks on the canvas
  border-subtle: "#EFEFF1" # dividers inside cards
  border: "#E4E4E7"
  border-strong: "#D0D0D6"
  ink: "#18181B"
  ink-2: "#3F3F46"
  muted: "#6B6B74"         # 5.1:1 on white
  accent: "#0B66E4"        # the only interactive colour
  accent-hover: "#0953BD"
  accent-wash: "#EBF2FE"   # selected / active backgrounds
  pending: accent
  done: "#16A34A"
  problem: "#DC2626"
  due-soon: "#E09B12"      # text step #92400E

colors-dark:
  canvas: "#0C0C0E"
  surface: "#18181B"
  surface-2: "#1F1F23"
  field: "rgba(255,255,255,0.07)"
  accent: "#2F7CF6"
  border: "rgba(255,255,255,0.09)"

shadows:
  shadow-1: "0 0 1px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.04)"  # cards
  shadow-lift: "card under the pointer"
  shadow-2: "floating: menus, popovers, calendar, modals"
  ring: "0 0 0 3px rgba(11,102,228,.22)"  # focus

typography:
  family: "IRANYekanX (variable: wght 100–1000, dots 1–2)"
  scale: [12, 13, 14, 15, 17, 22, 28, 32]

radius: { control: 12px, menu-item: 10px, card: 20px, float: 20px, modal: 24px, pill: 999px }
heights: { field: 38px, button: 36–40px, chip: 24–30px }
motion: { press: 100ms, default: 180ms, enter: 280ms }
---

## Principles

1. **Grey canvas, white cards, no borders.** The page is `--bg` (light
   grey). Content sits on white cards (`--surface`, radius 20) separated
   from the canvas by `--shadow-1`, not by lines. Hairlines appear only
   *inside* a card, between rows.
2. **Fields follow their background.** Inside a white card a field is
   filled grey (`--field-bg`) with no border. Directly on the grey canvas
   (the search box, the note under the cheque form, login fields) a field
   is white with `--shadow-1`. Focus is the same everywhere: white fill,
   accent border, `--ring`. An error turns the fill red (`--state-bad-bg`).
3. **Pills for everything you press.** Buttons, filter chips, tab tracks,
   status chips and the date chip on a card are `--rad-pill`. Primary is
   solid accent; secondary is white with `--shadow-1`; quiet actions are
   grey circles.
4. **One accent.** Blue marks what can be pressed or is active: primary
   buttons, focus rings, the selected filter, today and the selection in
   the calendar. No gradients.
5. **Status is a dot and a word.** Pending blue, registered green, problem
   red, due-soon amber — always a small dot plus the Persian label.
6. **Type and space carry hierarchy.** One family (IRANYekanX). **Never
   letter-space Persian text** — it breaks the joins. Machine values (serial,
   sayad id, national id) are set LTR, tabular.
7. **Motion only answers the user.** No idle or looping animation.
   `prefers-reduced-motion` is honoured globally.

## Components

**Header.** Frosted canvas, no separator. Brand mark + wordmark; in the
middle a white command button that opens the Ctrl+K palette; on the other
side white round icon buttons (support, theme, account).

**Board.** Page title (28px) with a one-line summary of what needs doing
(`#boardSummary`). A toolbar with the search box and filter pills. Three
transparent columns; each head is a white pill chip (coloured dot, status
name, count) with the column's total at the other end. Cards: white,
radius 20, `--shadow-1`, lift on hover; serial on top with the due date as
a chip (amber / red with a dot when due soon / overdue), payee and amount
in the middle, grey round actions and a tinted status button below. Empty
columns are a dashed box. On narrow screens the columns become pill tabs
on a grey track.

**Cheque window** (`css/cheque-form.css`, `js/cheque-form.js`). One window,
two faces, switched by the `.ve-locked` class dashboard.js puts on
`#modalBody`:

- *Add / edit — two cards on the grey body.* «مشخصات چک»: serial, sayad id,
  amount (with the amount in words), due date, spend date (optional),
  photo (optional). «مشخصات اشخاص»: owner, party, beneficiary and their
  national id, then — under a divider — send date and the channels it was
  sent through. A free note (optional) sits under the cards as a white
  field. Labels are short; there are no hints or side descriptions. Each
  card title has a small icon in an accent-wash tile. The save button is
  compact and sits at the end of the footer; saving an edit asks for a
  one-tap confirmation in place.
- *View — the cheque itself.* The status sentence, the drawn cheque with
  its stamp, then a white card with only what the cheque doesn't carry
  (party, send date, channels, spend date, notes, photos, sayad id with a
  copy button) and the status history. On narrow screens the cheque's key
  values are repeated in readable type. «ویرایش» switches to the form.

The inert wrappers `#veFieldsWrapA/A2/B/C` are what `lockFormFields()`
makes inert in view mode; `#sayadField` stays outside them. The wrappers
are `display: contents`, so they never affect the grid.

**Calendar.** A white floating card (radius 20). Month and year are ghost
selects; the arrows are round accent buttons. Day cells are circles; today
has an accent ring; the selected day is accent-wash with accent text; in a
range the ends are solid accent and the middle a wash. «امروز» is a grey
pill.

**The cheque** (`css/cheque.css`, `js/print.js`). Laid out like the printed
leaf: stub (ته‌چک) with a perforated tear line, bank emblem and sayad id box,
the date boxed and written out in words, the payment sentence with blanks,
the amount in rial words, owner and a signature that draws itself, and the
MICR line. Its paper and faint guilloche are its own colours (dimmed in dark
mode). A clean outlined stamp («ثبت شد» / «ثبت نشد» / «منتظر ثبت») sits over
the stub. Sized off a container-query font size, so the leaf scales as one
object. Used in the view face and on the login page.

**Floating surfaces.** No border, `--shadow-2`, radius 16–24, a 280ms
rise. Menu items are radius 10 with a grey hover. Overlays use `--scrim`
with a light blur. Dropdowns and popovers live on `<body>`,
`position: fixed`, positioned from the trigger's rect — never nested inside
a transformed ancestor.

**Modals.** Radius 24, no header or footer borders, a grey round close
button. The people window uses segmented pill tabs and grey rows.

**Login.** Two panes on the canvas: the form with white floating-label
fields and a pill submit, and a white panel with the sample cheque and one
line of copy. Below 960px the panel becomes a band above the form.

**Admin.** Same system: brand bar, a side navigation whose active item is a
white pill, white cards without borders, filled fields, pill buttons,
status chips with a dot. On narrow screens the navigation becomes pill tabs
on a grey track.

## Files

| File | Role |
|---|---|
| `css/shared.css` | tokens (both themes), baseline, command palette |
| `css/dashboard.css` | dashboard; the **VISUAL LAYER — HeroUI-style** section at the end decides the look |
| `css/cheque.css` | the cheque leaf |
| `css/cheque-form.css` | the add / view / edit modal |
| `css/login.css`, `css/admin.css` | the two other pages (each ends with a "HeroUI finish" section) |
| `js/print.js` | guilloche + signature generators |
| `js/cheque-form.js` | view face: the cheque and the facts card (read-only) |
| `js/shell.js` | header command button, board summary, column totals (read-only) |
| `js/login-art.js` | the login page's sample cheque |
