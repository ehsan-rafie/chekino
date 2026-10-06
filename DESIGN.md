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
  pending: "#64748B"       # slate: the waiting state stays neutral, lighter than ink (dark #94A3B8, wash #F1F5F9)
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
heights: { field: 38px (42px in the cheque form), button: 36px, badge: 20–22px }
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
   blue (`--hl`) means two things only — **where you type** and **what you
   picked**: a 2px blue line round the focused field, the date segment
   being typed, the chosen day / a range in the calendar, the chosen year
   and month in its picker, a chosen channel, ticked boxes, an applied
   filter, a lane about to take a dragged card. **Keyboard focus on a
   control** (button, tag, card, link) is an ink ring instead — 2px, set
   2px off the edge, black (white in the dark theme), `--focus-outline`,
   the shadcn / Magic UI ring: a blue ring round a black button read as
   two colours at odds, and the ink one is higher-contrast too. Pointer
   users never see it (`:focus-visible`). No gradients.
4. **Fields are outlined.** White, 38px (42px in the cheque form, see
   below), `--field-border`, radius 12. Hover
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
5. **Colour means status.** Pending is a cool slate grey — neutral, not yet
   good or bad, lighter than ink so it doesn't outweigh the outcomes (amber
   stays "due soon", blue stays focus and picks); registered green, problem red,
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
   arrive with, the theme switch opening as a circle from its button
   (every CSS transition is off while it runs — html.theme-switching — or
   the hundreds of colour transitions it starts repaint the page under the
   circle each frame and it drops to ~35fps; without them it holds 60). Two
   quiet loops are the exceptions, each on the one thing it points at:
   the shimmer round «افزودن چک» (Magic UI's Shimmer Button) and, on the
   login page, a border beam round the form. `prefers-reduced-motion` stops
   all of it.

## Components

**Header.** 56px, white glass with one hairline under it. Brand mark +
wordmark (the mark's strokes are drawn in the page colour, so it inverts)
at the start; ghost square icon buttons (support, theme, account) at the
end. **Theme** follows the sun over Tehran on the day: light from sunrise
to sunset, dark after (sunset runs from about 17:00 in winter to 20:30
in summer; SunCalc's method in `js/boot.js`, applied before the first
paint so nothing flashes). The button is a plain toggle — the sun or the moon — and a press
wins over the sun until the sun next turns the other way: a dark chosen by
day lasts until sunrise, a light chosen at night until the next sunset, so
never more than a day (the scheduled dark theme on phones works the same
way). A press opens as a circle from the button; a change nobody pressed —
sunrise, sunset, the end of a choice, another tab — is a soft fade. Saved
as `chekino_theme_v3` ({theme, until}), shared by the dashboard, the admin
panel and the login page.

Nothing in the middle: the Ctrl+K palette has no button, only its
shortcut. The floating support button is hidden on the dashboard, since
the header already has one. The bar spans the window but its content is
set to the page's width (1320px, 32px in), so the brand sits over
«افزودن چک» and the icons over «مدیریت اشخاص». The account button opens
a menu with a header section («وارد شده با حساب» and the company name)
and a labelled «خروج از حساب» item, red under the pointer (HeroUI's
Dropdown).

**Page head.** No title and no summary line. The one primary action,
«افزودن چک», opens the page at the start (the right); «گزارش‌گیری»
(unrolls into PDF / Excel) and «مدیریت اشخاص» sit at the other end.
With nothing to report (an empty board, a search with no match)
«گزارش‌گیری» is switched off, not hidden, so nothing moves along the row.
The add button is Magic UI's Shimmer Button (@dillionverma), ported class
for class (`.shimmer-btn`): black, a 1px white/10 border, shadow-2xl,
a blurred spark sliding end to end (3s, alternate) while spinning (6s),
a 0.05em lit edge, a soft light rising from the bottom. Two departures:
the theme's 12px corner instead of 100px (the owner's choice), and its
size — 36px high with a 14px label and a plus in front, like the buttons
beside it (40px on phones). The button is kept on whole device pixels
(`snapAddCheckBtn`: width rounded up, nudged ≤ half a pixel, redone on
any layout change): the lit edge is under a pixel thick, and with the
label's fractional width (120.36px) one end sat between two pixels, so
the spark faded and smeared there — on the climb up the left side, never
on the right. It wasn't the corner.

**Toolbar.** The search field (320px), then the facet filters «تاریخ»
«مبلغ» «اشخاص» (dashed until they hold a value), then «پاک کردن فیلترها»
when something is filtered, and after it, in the same row, a chip per
applied filter with its value and its own × — an outlined badge (radius
8, not a capsule). Filtering never moves the board: the chips used to
take a line of their own under the row. Below 860px, with no room left
in the row, they wrap under it. On phones the three facet filters share
their row evenly.
**«اشخاص» takes several people per role.** Each field (صاحب چک، طرف
حساب، ذینفع — the last also by national id) opens a checklist right under
it, inside the popover (HeroUI's ListBox, multiple selection): a box that
fills blue when ticked, the name, and how many cheques that person has;
it stays open to tick more. The chosen people sit as outlined tags under
the field, each with its own ×. A cheque passes when its owner is any of
the chosen owners (and so on); the three roles narrow one another. The
toolbar chip reads «صاحب چک: الف، ب و ۲ نفر دیگر». Keyboard: ↑ ↓, Enter
ticks, Backspace in the empty field drops the last tag, Escape closes the
list and then the popover.

**Board.** Three lanes, each with a faint wash of its status colour (3%),
an edge of the same hue (11%), and down its start edge a thin line of that
colour — 2px, pale (45%), fading out at both ends — which divides the
lanes and names their state at once: slate grey for «منتظر ثبت» (waiting
is the neutral state; blue stays for focus and picks), green for «ثبت شد»,
red for «مشکل در ثبت» — the same three carry the view's status block and
the PDF report's tiles and pills. Nothing glows or moves (a glow and a line along the
top were tried and dropped: too loud).
The white cards read clearly on it; a lane taking a dragged card turns
the blue "pick" wash with a dashed edge. Each head is a small badge in
the status colour — dot, name, and an outlined count (no totals). On the
phone's lane tabs the chosen tab takes its lane's tint.
Cards (HeroUI's Card: a body and a footer): white, 1px edge, radius 16,
16px in. The body: the serial on top with the due date as an outlined
badge (amber / red wash with a dot when due soon / overdue), and the owner
— the customer the cheque was received from, the one to follow up with
(not necessarily the account holder; the name printed on the cheque goes
in the notes) — beside the amount. The party and the beneficiary are only
in the view. The footer, under a hairline on a faint band: the tinted
status square (radius 8) with the problem reason or the copy-receipt
button beside it, and the eye at the other end — 28px buttons, 44px tap
areas on touch.
**When the list can't be fetched** the board never says «هنوز چکی ثبت نشده»: with nothing loaded yet, a panel takes its place (a no-signal icon, «چک‌ها بارگذاری نشدند», «تلاش دوباره»); when a refresh fails, the last list stays and a slim red alert bar over it says «فهرست به‌روز نشد … مال ساعت ۹:۰۶ است» with the same button. Coming back online retries by itself.
**Tooltips** (HeroUI's Tooltip, `#appTooltip`): ink, small, above what
they explain with a little arrow (below, flipped, only without room); they
wait 400ms so a pointer crossing a card doesn't set them flashing, and the
next one shows at once while one is open. Only where a word is needed:
the status square («تغییر وضعیت»), the copy-receipt slip («کپی رسید ثبت»),
the due date's distance, and a problem reason only when it was cut off.
The eye and the owner's name have none. Under the pointer a soft light
follows the cursor and catches the card's edge (Magic Card; `shell.js`
sets `--mx` / `--my`). Empty lanes say so in a dashed box («چکی در این
وضعیت نیست», or «موردی با این جستجو پیدا نشد» under a search or filter).
On narrow screens the lanes become segmented tabs.
The due badge's tooltip says how far away the date is («۳ روز دیگر»,
«امروز», «۶ روز از سررسید گذشته»). A problem cheque shows its reason
in red beside its red mark, in the bottom row's free space (the status
button's tooltip just says «تغییر وضعیت»). A registered cheque's copy-
receipt button is a slip with lines of text (Lucide receipt-text — the
plain receipt carries a dollar sign). A lane taller than the screen
scrolls on its own and fades out at an edge with more cards past it.
The empty board (nothing registered yet) is a dashed box with a line of
explanation and its own «افزودن اولین چک» button.

**People.** One record per person. A beneficiary is identified by national
id and belongs to no single party — the same one can be paid by several;
the parties it has been paid by are read off the cheques. Saving a cheque
or adding in the people panel finds the person first: by national id (the
same id is the same person, however the name was typed), then by name — a
same-named person without an id gains this one, one holding a different id
is a namesake and gets a record of their own. The server refuses a second
person with a national id already on file (409 with the one on file,
backed by a unique index), so nothing duplicates even in a race. The
cheque form's beneficiary list shows only the chosen party's own
beneficiaries (the owner's choice); a person typed in full who is already
on file folds onto that record, and a national id the form fills in is
selected when the field is entered, so typing it again replaces it instead
of running on into an 11-digit id. The people panel's beneficiaries tab
shows each beneficiary's parties under its name.

**Cheque window** (`css/cheque-form.css`, `js/cheque-form.js`). One window,
two faces, switched by the `.ve-locked` class dashboard.js puts on
`#modalBody`:

- *Add / edit — fields first, on a plain white body.* The two sections
  have no border, shadow or header strip: each title is a small grey
  caption centred on a hairline (── مشخصات چک ──), and that line is the
  only thing parting the sections, so the fields themselves are what the
  eye lands on. **From 1160px across the sections stand side by side**
  in a 1100px window — the cheque on the right (read first), the people
  on the left — so the form is about half as tall (no scroll at 1280×720)
  and each field nearer the size of what goes in it; there the photo and
  the note each take a full row, and the channel tags sit under their
  label at a field's height (all five on one line). The two columns
  share their rows (CSS subgrid), so each row lines up across the form,
  error lines included, and the last rows end level. A hairline runs
  down the middle of the 48px gap, from the first row of fields to the
  last — without it the two sections' wide fields, meeting in the
  middle, read as one row of four. Enter / Tab run
  down the right column before the left. Narrower screens keep the
  stacked layout described here.
  **The short fields sit at the outer edges**: in the cheque section
  they come first (on the right) — serial | sayad id, due date | amount —
  and in the people section last (on the left) — owner | send date, party
  | spend date — so side by side the wide fields meet in the middle. The
  form opens with the caret in the serial. «مشخصات چک»: serial | sayad
  id, due date | amount, then the photo | the note side by side at one
  field's height. **The amount in words** sits on the amount label's own line,
  at its far end (like the «(۶ رقم)» hints), so it appears without moving
  anything; one line, a long one ending in «…» with the whole of it on
  hover. The photo is one slim row (an image icon, a tile per file once
  added — a landscape thumbnail, a cheque's shape, with its own ×
  beside it behind a hairline, always shown, red under the pointer;
  «PDF» and its icon for a PDF; as tall as «انتخاب فایل», so the row never
  grows — a drop hint until then, «انتخاب فایل» at the
  end, after 21st.dev's File Upload). **A copied photo or PDF pastes in**:
  Ctrl+V in the open form while no field has the caret (after clicking
  an empty spot, or on a button), or on the photo row itself (click it,
  or right-click → Paste there) — a screenshot, an image copied from a
  page or chat, a file copied in Explorer; an image goes through the crop
  editor like a picked one. **Inside any other field Ctrl+V is only that
  field's paste**, never a file: a copied sayad id goes where the caret
  is, and nothing gets attached behind the user's back.
  The row's empty part (`#filePaste`, «عکس یا PDF را رها یا پیست کنید»,
  «…اینجا پیست کنید» on touch) is contenteditable only so the context
  menu offers Paste: nothing types into it, no caret, no ring of its own —
  focused, the row takes the blue field edge. It stays after the
  thumbnails, wordless, so there's always somewhere to right-click. Text
  pasted on the photo row says «عکس یا PDF کپی نشده» on the label line. Nothing pastes while viewing, or with a dialog over the
  form.
  **Photo editor** (every image passes through it before it's attached).
  The cheque form's own card — surface, radius 24, title «ویرایش عکس چک»
  with the same close button, «۲ از ۳» beside it when several photos came
  at once. The photo sits in a dark well (radius 16) in both themes, a
  fixed size whatever the photo, so turning it never makes the card jump;
  small images are enlarged up to 2× to be easy to crop. The crop: a thin
  white frame, L-shaped corners and short edge bars, all draggable with
  generous hit areas; outside it is dimmed; the thirds grid shows only
  while dragging. Bottom bar in the form footer's order: rotate right /
  rotate left (outlined icon buttons), «بازنشانی» (only once something
  changed), and the black «افزودن عکس» at the end (full width on phones,
  where the editor takes the whole screen). Non-destructive until the
  final press: turning carries the crop round with the photo, and reset
  goes back to the photo as it came. Enter adds (focus starts on the
  action), Escape cancels, Tab stays inside, and focus returns to where it
  was when the last photo is done. A transparent image is laid on white
  so it can't come out black as JPEG.
  **Viewing an attached photo** (the eye on its tile) opens the same card:
  «عکس چک», the photo in the same dark well, and below it outlined
  buttons — «ویرایش» (pencil), «اشتراک‌گذاری», «دانلود». «ویرایش» takes
  the photo back into the editor as it was left: each attached photo keeps
  its original and its turns and crop, so the crop comes back where it was
  and can be widened again (the parts cut off aren't lost); the primary
  then reads «ذخیره» and the result replaces the photo in place. A photo
  that came back from the server has no original kept: it opens as it is.
  «ویرایش» shows only while the form can be edited. With more than one
  photo, round arrows on the dark well's sides step through them, ← and →
  do the same (← goes on, as the page reads right to left), and the title
  counts «۱ از ۲».
  The note is a single line that grows as it is typed into (up to 120px), its count at the end of the
  line while focused; Shift+Enter breaks a line. «مشخصات اشخاص», each
  person beside the date that belongs to them: owner | send date, party
  | spend date (names 4 columns, the dates 2 — as wide as the due date,
  in the same column), beneficiary | their national id (3 | 3), then the
  channels. On phones every cheque field is full width; the people keep
  their pairs.
  **Enter moves on in the same order as Tab** (`focusNextField`): it
  passes over the photo button (Enter there is inert), a name picked from
  a list with Enter moves on too, and after the national id it lands on
  the channel tags, where Space picks and Enter saves. Ctrl+Enter saves
  from anywhere in the form.
  **The channels are toggle tags**, not a dropdown (HeroUI's TagGroup,
  selection «multiple»): the options are too few to hide behind a list.
  Compact tags (36px — 42px side by side — radius 10) on the label's own line; they wrap
  under each other, not under the label (on a phone they start on the
  line below it). Each holds a logo and the name. The four messengers —
  روبیکا، واتس‌اپ، ایتا، تلگرام — carry their official marks in their
  brand colours, taken from their own sites (rubika.ir, whatsapp.com,
  eitaa.com, telegram.org) and inlined with fill attributes, never
  classes, so nothing leaks into the page. The tags themselves are the
  theme's — outlined like a field — and a chosen one takes the selection
  blue (blue edge, faint blue wash). One tab stop for the group; the
  arrow keys walk it and Space presses a tag — Enter does not: as with
  checkboxes in a form, Enter means "done", and the channels being the
  last stop, it saves the cheque (editing: asks to confirm).
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
  is missing or wrong.
  **Errors never move the form.** A field in error gets a red edge and a
  short message at the far end of its label line (where the hints and the
  amount in words sit), with a small icon and a soft fade-in — never a
  line under the field: that grew the form, knocked the rows across the
  two columns out of line, and on blur slid the save button out from
  under the pointer so the click was lost. The message says what's needed,
  not the field's name again: «لازم است», «باید ۶ رقم باشد», «ناقص است»,
  «مهر ۳۰ روزه است», «۱۰ یا ۱۱ رقم باشد», «قبلاً با سریال ۴۸۲۹۱۳ ثبت شده»,
  «یکی را انتخاب کنید», «فقط عکس یا PDF: نام فایل», «کد ملی معتبر نیست» /
  «شناسه ملی معتبر نیست» (the check digit, js/nid.js — the same file the
  server checks people with; ten digits are checked on leaving the field,
  since they may be the start of an eleven-digit شناسه ملی, eleven at once).
  Persian, Arabic and Latin digits are all read as digits. Too long for a
  narrow field, it ends in «…» with the whole of it in its title. The
  label keeps its colour, the format hint and the amount in words step
  aside while the error shows, and the input carries `aria-invalid`.
  **The form's own messages sit in the footer**, as a small pill beside
  the buttons (Sonner's toast, set inline): «چک ۴۸۲۹۱۳ ثبت شد» (green,
  leaves after ~4.5s), «۳ مورد را اصلاح کنید» (red; pressing it goes to the
  first field to fix; it leaves once the user edits something), a
  duplicate or a server error. A request that got no answer says
  «ذخیره نشد — اتصال را بررسی کنید و دوباره بزنید» rather than the
  browser's English «Failed to fetch». On a phone, where the buttons fill
  the footer, the pill floats just above it. It replaced a banner at the
  top of the form that pushed every field down and scrolled the form
  back to the top. A field's format rule is a quiet hint in brackets after its
  label — «سریال (۶ رقم)», «شناسه صیادی (۱۶ رقم)», «کد / شناسه ملی ذینفع
  (۱۰ یا ۱۱ رقم)» — not a placeholder: it stays visible while typing, and
  Persian placeholder text inside a left-to-right box came out reversed
  («رقم ۶»). The name pickers have no «انتخاب کنید»; their icon and
  arrow say it. Placeholders left: the date segments and the
  note's example. The save button is compact and sits at the end of the
  footer; saving an edit asks for a one-tap confirmation in place.
- *Size.* The form reads at the size of the board's cards (whose
  figures are 15–16px): what's typed is 15px, labels and section titles
  14px (hints 13px), and fields, the date and amount boxes and the save
  buttons 42px tall — about a tenth larger than the rest of the app's
  controls. Type and heights only, not a zoom: icons, gaps and 1px lines
  stay as they are, and the lists and the calendar, which open outside
  the window, grow in step by their own rules. On a phone every field's
  text is 16px, since below that Safari on iOS zooms the page when a
  field is tapped.
- *View — the cheque itself.* Top to bottom:
  - **The status**, as HeroUI's Alert: a soft wash of the status colour,
    the icon in a tinted square (tick / warning / clock), the state as the
    title and one line under it with what matters for that state —
    «تاریخ ثبت … | ۴ روز پس از ارسال», the problem's reason and date, or
    «۱۱ روز پیش برای ثبت ارسال شد | سررسید: ۱۴ روز دیگر». The parts are
    parted by a short hairline, never a middle dot: beside Persian digits a
    dot reads as a zero. «کپی رسید ثبت» sits at its end once the cheque is
    registered (it used to be in the header; the header is now just the
    title and the close button). This replaced a long sentence
    («… برای آقای …»), which was slow to read and wrong for a company.
    For a waiting cheque the line says how long it has waited; how far off
    the due date is, the cheque itself says.
  - **The cheque**, carrying everything Chekino has about it — see «The
    cheque» below. There is no separate card of facts any more: each value
    sits where the printed leaf keeps its counterpart, under the word the
    form uses for it.
  - **The status history**, a vertical timeline (a dot in the status colour
    per step, joined by a hairline, the date at the end, the reason under
    its step) — only once there has been more than one change; a single
    change is already the status block's own line.

  «ویرایش» switches to the form.

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
digits), and while the field has focus one of them is active — its
text turns blue and bold («روز» or «۱۲»), with no box round it. Bold
makes a variable-font word a touch wider, so every segment reserves the
width of its own bold self (an invisible copy of its text, `::after`
from `data-text`): moving between day, month and year never nudges the
date sideways. Escape on an open
calendar puts the caret back in the field (the calendar button, out of
the Tab order, never shows a focus ring). Editing works a segment at a
time (`createDateField` in dashboard.js):
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

**Calendar** (Jalali). HeroUI's, sized to the form: a white popover
(radius 20, ring + drop) 280px across, with one «مهر ۱۴۰۵ ⌄» button at the
start and two grey arrows at the end. Day cells are 34px circles with
14px figures (the labels' size), and the weeks are filled out with the
neighbouring months' days, faded; Fridays are red, as the Persian
calendar prints them. Blue is for the choice alone: the chosen day is a
solid blue circle, a range has solid blue ends and a soft blue band;
today is only a thin grey ring (none once it's chosen or inside a
range). «امروز» is a small outlined button (30px, radius 10) at the
start of the footer; the range's «ثبت» and delete buttons are the same
height. On a phone the calendar is a centred overlay with larger,
finger-sized cells. The title
button (`js/cal-picker.js`) swaps the days for HeroUI's year grid (three
columns, the chosen year solid blue); picking a year shows the twelve
months, and picking a month goes back to the days. It writes to the two
hidden `<select>`s dashboard.js reads, so the calendar logic is unchanged.

**The cheque** (`css/cheque.css`, `js/print.js`). Modelled on the
uniform Sayad cheque every bank now prints — pale pink paper with an
eight-pointed star (a شمسه) in the middle, a lilac band with a chain of
rings down the binding edge carrying the serial and the name reading
upward («331010-CHEKINO», as the leaf prints its series and bank), and a
line of microprint along the foot — but laid out around what Chekino knows
about a cheque, each value where the leaf keeps its counterpart and
captioned with the word the form uses:
- top, at the start: «سررسید» in three boxes, the date in words under it,
  and how far off it is («۱۴ روز دیگر», «۳ روز گذشته» — amber when close
  and red when past, while the cheque still waits to be registered);
  in the middle «چک صیادی» with a bank emblem; at the end «سریال» and
  «شناسه صیادی» (caption above value) with «کپی», and the cheque's photo
  where the leaf has its QR («۲ عکس» when there are more; it opens the
  photo viewer);
- the payment sentence: «به موجب این چک مبلغ … ریال», «در وجه [the
  beneficiary, captioned ذینفع] به کد ملی (or به شناسه ملی, by the
  number's length) … پرداخت نمایید.»;
- the middle: the status stamp where a signature would go, and «مبلغ به
  عدد» boxed at the end;
- the foot, where the leaf names its account holder: «صاحب چک», «تاریخ
  ارسال» and «از طریق» (the request to register went to the owner); at the
  end, under the amount, «طرف حساب» and «تاریخ خرج»; then «توضیحات».
Printed words are a grey violet and whatever was filled in is blue ink, so
the cheque's data stands apart from its print at a glance; an empty value
is a muted «—». The paper, print and ink are the cheque's own colours,
dimmed in dark mode. The stamp («ثبت شد» / «ثبت نشد» / «منتظر ثبت») is in
the status colours — slate for waiting. The leaf keeps a cheque's
proportions at the least and grows when what it carries needs more room.
Everything is sized in em: 14px in the view; on the login page the leaf
scales with its container as one object. Below 540px the view reflows the
same zones into one column — the numbers and the photo, the due date, the
amount with the stamp beside it (or under it, when the amount is long),
the sentence flowing as text, the people, the notes. The photo itself is not in the cheque list — only its id — and arrives
from /api/images when the cheque is opened; until then its tile pulses
faintly. A PDF shows as «PDF» and opens in a new tab. There is no stub, no
MICR line and no signature: the leaf people hold has none of the first
two, and a drawn signature said nothing true. Used in the view face and on
the login page.

**Floating surfaces.** No border of their own: `--shadow-2` plus the 1px
ring, radius 16–20, a 280ms rise. Menu items are radius 10 with a grey
hover; checkboxes are solid ink when ticked. Overlays use `--scrim` with a
light blur. Dropdowns and popovers live on `<body>`, `position: fixed`,
positioned from the trigger's rect — never nested inside a transformed
ancestor.

**Modals.** Radius 24, header and footer framed by hairlines, a ghost
close button. The people window uses segmented tabs and outlined rows.
The command palette follows shadcn's Command.

**When the session ends** (the 24-hour sign-in ran out, or another tab signed
out or into another account), the page doesn't jump to the login page: a
small dialog that can't be dismissed (`#sessionOverlay`, above every
other layer, the page behind it inert and deaf to shortcuts) says so in
one line and offers one ink button, «ورود دوباره» (or «باز کردن دوباره‌ی
صفحه» when another account signed in). When the sign-in ran out the work
behind it is only dimmed — it's still yours; when another account signed
in, or nobody is signed in any more, the page behind is covered.
Whatever was open — the add form with its photos, an edit with its
starting version, a cheque being viewed — is put aside in that tab
(sessionStorage: no other tab can take it, and it goes when the tab is
closed) and reopens after signing in again with the same account, once
the cheque list has loaded. Signing out on purpose keeps nothing: the
logout button leaves a mark, so a page can tell a sign-out from a token
that merely ran out. The add form's draft is the add form's only — an
edit never writes it. The login page then says why in a plain grey note
with an «i», never in the red of an error, and promises the work back
only when some was kept. If the same account signs in again in another
tab, the dialog goes by itself.

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
| `js/print.js` | guilloche + the star medallion |
| `js/cheque-form.js` | view face: fills the cheque from the form's fields (read-only) |
| `js/shell.js` | card spotlight, first-load blur-fade, tooltip tidy-up (read-only) |
| `js/theme-reveal.js` | the circular theme switch (dashboard and admin) |
| `js/date-segments.js` | the day / month / year segments drawn over each date field (read-only) |
| `js/cal-picker.js` | the calendar's title button and its year / month picker |
| `js/field-addons.js` | the live input-group suffixes on the dashboard: digit counts, list arrows, copy buttons |
| `js/login-art.js` | the login page's sample cheque |
