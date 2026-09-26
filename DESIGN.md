---
version: lajvard-1
name: Chekino design system — Lajvard (لاجورد)
description: >
  An RTL Persian tool for registering Sayad cheques and tracking whether the
  payee registered them. The system is built from the cheque itself: cool
  paper and lapis ink, turquoise security print (guilloche), rubber stamps,
  and the stub-and-tear-line of a cheque book. Lapis is the one colour that
  means "press this"; turquoise is decoration that only ever appears as
  security print. Every value below is read out of css/shared.css.

colors:
  paper: "#F2F4F9"        # --bg, the canvas
  sheet: "#FFFFFF"        # --surface, cards / panels / modals
  paper-1: "#F9FAFD"      # --surface-2
  paper-3: "#E8EBF3"      # --surface-sunken, wells, the cheque "desk"
  line-1: "#E7E9F1"       # --border-subtle
  line-2: "#D8DCE8"       # --border
  line-3: "#B9BFD3"       # --border-strong
  ink: "#141934"          # --ink (lapis-black)
  ink-mid: "#434A68"      # --ink-2
  ink-soft: "#646A88"     # --muted (5.3:1 on white)
  lajvard-600: "#2C3FC4"  # --accent (9:1 on white)
  lajvard-700: "#2332A1"  # --accent-hover / --accent-text
  lajvard-50: "#EEF0FC"   # --accent-wash
  firouzeh-500: "#14A594" # --accent-2, security print only
  pending: "#2C3FC4"      # --st-pending
  done: "#17875B"         # --st-done
  problem: "#C93B33"      # --st-problem
  due-soon: "#D08E0C"     # --state-warn (text step #8F5F00)

colors-dark:
  bg: "#090C1A"
  surface: "#10142A"
  surface-2: "#151A33"
  ink: "#EDEFFA"
  accent: "#7A8BF6"
  border: "rgba(255,255,255,0.09)"

typography:
  family: "IRANYekanX (variable: wght 100–1000, dots 1–2)"
  scale: [12, 13, 14, 15, 17, 22, 32, 46]
  axes:
    brand:   "'wght' 820, 'dots' 2"   # wordmark
    display: "'wght' 760, 'dots' 2"   # page titles, hero lines
    title:   "'wght' 660, 'dots' 1"
    label:   "'wght' 580, 'dots' 1"
    button:  "'wght' 620, 'dots' 1"
    value:   "'wght' 520, 'dots' 1"
    number:  "'wght' 580, 'dots' 1"
    body:    "'wght' 420, 'dots' 1"

radius: { xs: 6px, control: 10px, card: 14px, float: 20px, pill: 999px }
heights: { sm: 34px, md: 42px, lg: 50px }
spacing: [4, 8, 12, 16, 24, 32, 48, 64]
motion:
  press: 100ms
  default: 180ms
  enter: 280ms
  ease-out: "cubic-bezier(0.16, 1, 0.3, 1)"
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)"   # only for things the user just caused
---

## The idea

Chekino is about one object — the Sayad cheque — so the interface borrows
that object's materials instead of a generic dashboard kit:

- **Paper and ink.** The page is a cool paper (`--bg`); everything you work
  with is a white sheet (`--surface`) resting on it with a soft shadow tinted
  in the ink's own lapis hue (`--shadow-1`). Shadows are never plain grey.
- **Lapis means action.** `--accent` is on primary buttons (as a vertical
  gradient, `--accent-grad`, with a matching coloured shadow), focus rings,
  links and the active state of a filter or tab. Nowhere else.
- **Turquoise is security print.** `--accent-2` appears only in guilloche
  lines and cheque details. It is never a button and never a status.
- **Status is ink on a stamp.** Pending lapis, registered green, problem
  pomegranate red, due-soon saffron. Status always travels with an icon and a
  Persian word.
- **The cheque is the one bold element.** It is drawn realistically (see
  below) in the form and on the login page. Everything around it stays quiet.

## Typography

One family, IRANYekanX, everywhere. Hierarchy comes from size and the `wght`
axis; the `dots` axis opens to 2 only at display sizes and on the wordmark.

**Never letter-space Persian text** — tracking pulls a cursive script's joins
apart. Tracking is only used on Latin digits and machine values (serial,
sayad id), which are also set LTR with tabular figures.

## Layout

- RTL throughout, logical properties only (`margin-inline-*`,
  `inset-inline-*`). A physical property is a latent bug.
- Pages sit in a centred column (dashboard max 1480px, admin 1320px).
- Sticky glass header (`--surface-glass` + backdrop blur) on the dashboard and
  admin.
- Radius steps with depth: field 10 → card 14 → modal / popover 20.

## Components

### Buttons
- **Primary** (`.add-check-btn`, `.btn-submit`, `.submit`, `.btn-primary`,
  `.btn-add`): `--accent-grad`, white text, `--shadow-accent`, a 1px inner top
  highlight. Hover brightens; press scales to 0.98.
- **Secondary** (`.icon-action`, `.filter-pill-btn`, `.btn-ghost`): sheet
  background, 1px `--border`, `--shadow-1`; hover lifts to `--shadow-lift`.
- No idle animation on any button. The old infinite shimmer was removed —
  motion answers the pointer.

### Fields
42px, 1px `--border`, radius 10. Hover: `--border-strong`. Focus: `--accent`
border plus `--ring` (4px lapis wash). Error: red border, `--ring-bad`, the
message below in `--state-bad-text`, and a single small nudge. Labels 13px at
`label` weight; the required mark is a lapis `*`. Login fields use a floating
label.

### Board (dashboard)
Three trays (one per status) on the paper, each with a status pill, a count,
and the running total of the amounts in it (`js/shell.js`). Cards are cheque
stubs: serial and a due-date chip on top (saffron when due within 3 days, red
when overdue), payee and amount in the middle, then a dashed tear line with a
half-circle notch cut into each edge, then the actions. A 3px status stripe
sits on the binding edge. Cards lift 2px on hover.

The page title carries a one-line summary of what needs doing
(`#boardSummary`, e.g. «۱ چک منتظر ثبت، ۱ سررسید تا ۳ روز آینده»).

### The cheque (`css/cheque.css`, `js/print.js`)
Laid out like the printed leaf: stub (ته‌چک) on the binding side, a
perforated tear line whose holes show whatever the cheque lies on (`--hole`),
then the cheque — bank emblem and sayad id box, serial, the date boxed and
**written out in words**, the payment sentence «به موجب این چک مبلغ … ریال در
وجه … به شماره / شناسه ملی … پرداخت نمایید» with dotted blanks, owner /
signature / amount along the foot, and a MICR line at the bottom.

- Sized in `em` off a container-query font size (`cqi`), so the whole leaf
  scales as one object.
- Paper and print colours are the cheque's own, not the theme's; in dark mode
  it is only dimmed.
- Guilloche (two interleaved sine-wave families plus spirograph rosettes) and
  the signature (a stroke seeded from the owner's name) come from
  `js/print.js`, shared by the form and the login page.
- In the form (`js/cheque-form.js`, read-only): values are "inked" in as they
  are typed, the signature draws itself once typing settles, focusing a field
  highlights its blank on the cheque with a highlighter yellow, and the cheque
  tilts toward a fine pointer with a moving sheen. In view mode it carries a
  rubber stamp for its status (double border, rough edge via an SVG
  displacement filter), placed over the stub so it never hides a value.

### Cheque form (`css/cheque-form.css`)
Three numbered step cards; each badge turns into a green check when its
required fields are filled and red when one has an error. The cheque sits on a
sticky "desk" beside the form (on top below 860px). The inert wrappers
`#veFieldsWrapA/A2/B/C` are what `lockFormFields()` makes inert in view mode;
`#sayadField` stays outside them so its digits remain selectable.

### Floating surfaces
Modals, popovers, menus, the calendar and the command palette use
`--shadow-2`, radius 20 (menus 14), and enter with a 280ms rise. Overlays use
`--scrim` with an 8px blur. Every dropdown/popover lives on `<body>`,
`position: fixed`, positioned from its trigger's rect — never nested inside a
transformed ancestor (a past source of real bugs).

### Login (`chekino_login.html`, `css/login.css`, `js/login-art.js`)
Two panes: the form on paper, and a lapis art pane whose guilloche draws
itself in once on load (the page's one orchestrated moment) with a sample
cheque lying on it, stamped «ثبت شد». Below 960px the art becomes a band
above the form.

### Admin (`css/admin.css`)
Same system: glass top bar, a side navigation (a segmented bar below 860px),
white cards, tables with a tinted header and lapis row hover, status badges
with a dot.

## Motion rules
- Presses 100ms, state changes 180ms, entrances 280ms on the expo curve.
- The spring curve only for things the user just caused (a step check, a
  stamp, a toast).
- No looping or idle animation. `prefers-reduced-motion` is honoured globally
  in shared.css.

## Do / Don't
- Do pull every value from a token; a new raw hex is a sign the scale wasn't
  checked.
- Do pair status colour with an icon and a word.
- Do keep dropdowns on `<body>`.
- Don't letter-space Persian.
- Don't use turquoise for anything interactive.
- Don't add a shadow-less white card on white; sheets sit on paper.

## Files
| File | Role |
|---|---|
| `css/shared.css` | tokens (both themes), baseline, command palette, finish |
| `css/dashboard.css` | dashboard; the **LAJVARD** section at the end is the visual layer |
| `css/cheque.css` | the cheque leaf |
| `css/cheque-form.css` | the add / view / edit modal |
| `css/login.css`, `css/admin.css` | the two other pages |
| `js/print.js` | guilloche + signature generators |
| `js/cheque-form.js` | live cheque, step progress (read-only) |
| `js/shell.js` | header command button, board summary, column totals (read-only) |
| `js/login-art.js` | login art pane |
