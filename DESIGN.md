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
   What is typed in Latin — usernames and passwords, in their fields and
   the admin's lists and log (`.latin-digits`) — shows the digits typed:
   the same face's standard cut (`IRANSansXVF.woff2` / `.woff`, git-ignored
   too) as «IRANSansX Latin Digits», for 0–9 only (unicode-range), fetched
   the first time such a digit is drawn. Everything else keeps Persian digits.
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
at the start, then — on wide screens — the company's name after a hairline,
in ink-2 (whose board this is; on a phone it stays in the account menu); ghost square icon buttons (search, support, theme,
account) at the end — 34px, 44px under 860px where a finger presses them. **Theme** follows the sun over Tehran on the day: light from sunrise
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

Nothing in the middle, and no command palette on the board (the owner's
call, 2026-10-15: «نیاز نیست» — the search box and the buttons do it). The
one-letter shortcuts stay, by the key's place so a Persian layout works:
N a new cheque, / the search, P the people, E the report, T the theme —
never while typing or under an open window. The floating support button is hidden on the dashboard, since
the header already has one. The bar spans the window but its content is
set to the page's width (1320px, 32px in), so the brand sits over
«افزودن چک» and the icons over «مدیریت اشخاص». The account button opens
a menu with a header section («وارد شده با حساب» and the company name)
and two items: «دریافت همه‌ی داده‌ها» (grey under the pointer; saves one
JSON file — the company's people, and its cheques with their history and the
list of their files, the photos themselves left out) and «خروج از حساب»,
red under the pointer (HeroUI's Dropdown).

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
on the right. It wasn't the corner. **On a phone, once the page head has
scrolled away**, the same action floats at the thumb: «افزودن چک» with its
plus, black, radius 14 (not a capsule), 48px high, 16px from the right
edge, clear of «برو به بالا» on the left; it steps aside while any window
is open, and never shows on a wide screen.

**Skip link.** The first Tab on the board shows «رفتن به چک‌ها» at the top
right (ink, radius 12); Enter goes past the header to the board.

**Toolbar.** The search field (320px), then the facet filters «تاریخ»
«مبلغ» «اشخاص» (dashed until they hold a value), then «پاک کردن فیلترها»
when something is filtered.

**The filters (the owner's ask, 2026-10-14: smarter, not busier).** A set
pill says what it holds — «سررسید این ماه», «۵۰ میلیون تا ۲ میلیارد ﷼», a
name or «۲ نفر» — in the applied blue, with its own × at its end; the
second row of chips under the pills went (it said the same words twice),
and only today's question («سررسید نزدیک») still sits there. A report
names the filters in full, dates and rials. Each popover counts what its
choices would show beside the other filters, so a pick that leads nowhere
reads as such before it's made. On phones the three pills share their row
at rest; once a set one needs more room, the row scrolls sideways and
fades at its edges, the words kept whole.
- **تاریخ.** Two tabs in a well (HeroUI's Tabs): «تاریخ سررسید» or
  «تاریخ افزودن». Six quick picks, two to a row, each with its count —
  for a due date «سررسید گذشته، امروز، ۷ روز آینده، ۳۰ روز آینده، این ماه،
  ماه بعد», for the day added «امروز، دیروز، ۷ روز اخیر، ۳۰ روز اخیر، این
  ماه، ماه قبل». They are worked out from today each time (a week ahead
  stays a week ahead), a pick closes the popover, the same pick again lets
  go, and the other tab keeps a pick both have. Under them the span field
  shows the days a pick stands for, and opens the calendar for any other
  span; once its first day is in, the days up to the one under the pointer
  show as the span they'd make. The pill puts a span in short words: «سررسید
  ۳ تا ۱۲ مهر», «سررسید از ۱ مهر» (the year only when it isn't this one).
  The archive toggle stays at the bottom.
- **مبلغ.** The board's amounts as 28 bars on a log scale (a few million
  and tens of billions on one line), smallest on the right like the «از»
  field; the chosen span dark, the rest pale. Two handles ride the bars'
  bottom edge (two range inputs: arrows, Page Up/Down, Home/End); a handle
  sets its own field to a round figure (two significant digits, rounded
  outwards), and one pulled all the way out lets that side go. The fields
  hint the board's smallest and largest, take a figure in full or the way
  it's said — «۵۰ میلیون», «۲٫۵ میلیارد», «۲۰ میلیون تومان», «۵۰۰ هزار» —
  read right to left while words are in them and turn into digits on Enter
  or leaving; a short figure («۵۰») offers «۵۰ میلیون» and «۵۰ میلیارد»
  as dashed chips under them. Under each field, the amount in words, in
  tomans as on the form; under both, «۸ چک در این بازه».
- **اشخاص.** One search (name or national id) over the three roles; the
  list under it goes by role — «صاحب چک», «طرف حساب», «ذینفع», each
  heading with its icon, held at the top while its people scroll — the
  people with the most cheques first, five a role until the search is
  typed in or «و ۱۰ صاحب چک دیگر» opens the rest. Each row: the tick box
  (HeroUI's ListBox, multiple selection; blue when ticked), the name, a
  beneficiary's national id, and the count beside the other filters (a
  person at none is quieter). Several can be ticked: within a role any of
  them, across roles all of them. The ticked sit as outlined tags over the
  list, with their role's icon and their own ×. On a pointer device the
  search takes the caret as the popover opens; on a touch screen it waits
  for a tap. Keyboard: ↑ ↓, Enter ticks (or opens the rest), Backspace in
  the empty search drops the last one ticked, Escape empties the search and
  then closes.

**Board.** Three lanes, each with a faint wash of its status colour (3%),
an edge of the same hue (11%), and down its start edge a thin line of that
colour — 2px, pale (45%), fading out at both ends — which divides the
lanes and names their state at once: slate grey for «منتظر ثبت» (waiting
is the neutral state; blue stays for focus and picks), green for «ثبت شد»,
red for «مشکل در ثبت» — the same three carry the view's status block and
the PDF report's tiles and pills. Nothing glows or moves (a glow and a line along the
top were tried and dropped: too loud) — except a card whose status changes:
it travels to its new lane (0.46s, decelerating; a lifted copy above the
lanes, since a lane clips what it holds — from where it was, or from where
a dragged ghost was let go, tilt and all; «برگردون» flies it back), and its
lane scrolls to show where it lands; there it rings once in the lane's
colour. Not on a phone's one-lane board, not behind the cheque window.
The white cards read clearly on it; a lane taking a dragged card turns
the blue "pick" wash with a dashed edge. A lane that scrolls has its own
scrollbar on the right (the page is right to left; the lane's list is set
left to right for it, its cards right to left as ever): a 3px thumb, the ink
at 12%, 24% while the pointer is on the lane, no track, 5px clear of the
cards (Firefox: its thin one). Every lane keeps the bar's room whether it
scrolls or not, inside its own right padding, so a card is one size in all
three lanes — before, a lane with a scrollbar had cards 5px narrower. Each head is a small badge in
the status colour — dot, name, and an outlined count (no totals). On the
phone's lane tabs the chosen tab takes its lane's tint.
Cards (HeroUI's Card: a body and a footer): white, 1px edge, radius 16,
16px in. The lanes' order: «منتظر ثبت» by due date, the nearest — past due
first — on top (the owner's call, 2026-10-14; on one day, the earliest sent);
«ثبت شد» and «مشکل در ثبت» the latest change of status on top. The body: the
serial on top with the due date as an outlined
badge — amber / red wash when due soon / overdue, the colour alone (the
owner's call, 2026-10-15: no «۳ روز دیگر», no dot); how far in words is in
its tooltip and its label — and the owner
— the customer the cheque was received from, the one to follow up with
(not necessarily the account holder; the name printed on the cheque goes
in the notes) — beside the amount. The bottom row (the owner's asks,
2026-10-14), with no hairline or band over it: the party on the right,
quiet, after the house «خرج شده به» shows in the cheque window; on the left
the tinted status square (radius 8) with the problem reason or the
copy-receipt button beside it, and the eye folded away at the head of these
buttons (2026-10-15: it opens outward, so the receipt and the status don't
move) — it opens under the pointer or the keyboard and stays away on a touch screen,
where a tap on the card opens it. 28px buttons, 44px tap areas on touch. No
days waited on a card. Long words on a card — a name, the party, a problem's
reason — fade at the edge they are cut at and, under the pointer, slide at
an even pace to show the rest (measured once the eye has opened, which may
cut what wasn't cut). The beneficiary is only in the view. A click on a
card's body opens it (not the click that ends a drag); the status square is a WAI-ARIA menu button — its
options are buttons, ↑/↓ between them, Escape back to the square — and a
change of status offers «برگردون». Only «ثبت شد» goes to the archive after
30 days («نمایش «ثبت شد»های قدیمی‌تر از ۳۰ روز» in the date filter); a
problem stays however old. The search finds serials, sayad ids, names,
amounts, national ids, notes and reasons; a list of serials pasted into it
shows those cheques, and a line under it says what wasn't found anywhere.
After a change of one cheque only that cheque is fetched (its row from the
save); the whole list again when the page is come back to after a minute.
**When the subscription ends** (H8): two weeks before, an amber bar over
the board — «اشتراک شما ۵ روز دیگر (۱۴۰۵/۰۸/۱۵) تمام می‌شود؛ برای تمدید به
پشتیبانی پیام بدهید.» with «پیام به پشتیبانی» and a × that closes it for the
session; once it has ended, the same bar in red. Nothing is cut off. The
account menu adds «تا ۱۴۰۵/۰۸/۱۵» to the plan line.
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
explanation and its own «افزودن اولین چک» button, and under it two more ways
to start, as quiet outlined tiles with a title and a line each: «چند چک با
هم» (opens bulk add's window on its two ways) and «اشخاص» (the people window).

**People.** Kept by role (the owner's call, 2026-10-14; migration 010): an
owner, a party and a beneficiary are three records even under one name —
renaming a party never renames a beneficiary of the same name (before, one
name typed as a cheque's party and as its beneficiary was one record, and
renaming one renamed the other). Each record is filed under its role
(`people.role`); one not filed yet takes the role it is first named in.
Migration 010 split the records that played two roles: each kept the role
that matters most to it (beneficiary, for its national id; then party;
then owner) and every other role got a copy of it — the name and mobile,
no national id — with that role's cheques moved to the copy
(`people_role_split` remembers what was copied from what, for
rollback_010.sql). A beneficiary is identified by national id and belongs
to no single party — the same one can be paid by several; the parties it
has been paid by are read off the cheques. Saving a cheque or adding in
the people panel finds the person first, among their role's: by national
id (the same id is the same beneficiary, however the name was typed; one
per company, so held in another role it is refused), then by name — a
same-named person without an id gains this one, one holding a different id
is a namesake and gets a record of their own; a person named by the id of
someone in another role is taken as that name, in this role. The duplicates
the panel offers are looked for within a role, and two roles are never
merged (409 `different_roles`). The server refuses a second
person with a national id already on file (409 with the one on file,
backed by a unique index), so nothing duplicates even in a race. The
cheque form's beneficiary list shows only the chosen party's own
beneficiaries (the owner's choice); a person typed in full who is already
on file folds onto that record, and a national id the form fills in is
selected when the field is entered, so typing it again replaces it instead
of running on into an 11-digit id. The people panel's beneficiaries tab
shows each beneficiary's parties under its name.
**A change shows everywhere at once** (the owner's ask, 2026-10-14: a
beneficiary renamed in «اشخاص» kept its old name on the cheques until a
reload). The cheques name their people by id and carry the names the list
gave them; whenever the people come back from the server — after an edit in
«اشخاص», after a cheque saved with a national id — the people as they are
now are laid over every cheque on the page (names and the beneficiary's
national id) and the board drawn again: cards, search, the cheque window.
Back to the page after five seconds or more away, the cheques and the
people are read again, quietly — what another tab or device did meanwhile.

**The people window** has one search over its three tabs (a name as it
sounds — «رضائی» is «رضایی», a half-space is a space — or a national id's
digits), each tab counting what it found, and an order beside it:
«بیشترین چک» or «الفبا», kept in the browser. A person's name opens their
page in place of the lists: who they are and in which roles, three tiles
(waiting for Sayad with the oldest's days, registered with the average
days from sending to registration, problem with the share of their
cheques that ever had one), how many aren't sent yet, then every cheque
of theirs in that role — the open ones first — each opening in its window
over the page, and «نمایش در بُرد», which filters the board to them.
Escape goes back one step: the cheque, the page, the window.
**Names that may be one person** — the same name as it sounds under two
records, «رضائی» and «رضایی», with and without a half-space, unless their
national ids differ (namesakes) — are counted on an amber line over the tabs
(«۲ نام احتمالاً تکراری» + «بررسی»). The list shows each group with every
record's id and cheque count; «این بماند» asks first (there is no way back)
and moves the others' cheques to it (POST /people/:id/merge: their national
id stays, the cheques get a new version, the others go); «تکراری نیستند»
takes the group off the list in this browser. Nothing is merged on its own.
**A person's mobile** — *switched off for now (the owner's call, 2026-10-11): kept in the database with its rules, shown nowhere; `SHOW_PHONE` in dashboard.js brings back what follows.* It sits on their page under their roles — «افزودن
موبایل», or the number in groups, left to right («۰۹۱۲ ۱۲۳ ۴۵۶۷»), which opens
their WhatsApp chat — edited in place (Enter saves, Escape lets go; an empty
field clears it). Anything typed becomes 09…: Persian digits, +98, 0098; a
landline is refused, said under the field. With it, the send window gives
that owner's section «باز کردن چت»: WhatsApp with the message
already written in (the photos are still copied by hand).

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
  end, after 21st.dev's File Upload). **Every file is kept** (C1): on
  save each new one is uploaded on its own (`/api/images`; a photo up to
  3 MB after its crop, a PDF up to 10), then the cheque names all its
  files by id, in order — the first is the board's photo; one taken off
  in the form is taken off the cheque. The view asks for the whole list
  when it opens (the board's list names only the first) and the leaf
  then says «۳ عکس» or «۳ فایل». A file is only taken off by someone who
  saw it: if the list arrives after the files were touched, the ones
  never shown are added after them, and a save before it arrives says to
  wait a moment. **A copied photo or PDF pastes in**:
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
  footer. **Saving an edit asks once, whatever was changed** (the owner's
  ask, 2026-10-13: a serial used to save at once and a photo to ask — two
  ways for one button), as deleting does: «ذخیره تغییرات» narrows into
  «بله، ذخیره شود» (still the dark one) and an «انصراف» of its size slides
  in beside it (104×36; 96×40 on a phone). «انصراف» or Escape goes back to
  the form with the edit kept; the trash meanwhile asks about deleting
  instead (one question at a time). Saved, the toast offers the way back
  (the cheque as it was, saved over the edit — its people by id, its files
  as they were) — except for files taken off, which are deleted.
  Escape on an edit asks about unsaved changes only when the form differs
  from what it held when «ویرایش» was pressed.
  **What this form saved** since it opened stays at the footer's start,
  quiet, in one line — «✓ ثبت‌شده در این نوبت: ۷۷۱۱۰۱، ۷۷۱۱۰۰» (the
  latest first, the last four, then «و ۳ چک دیگر») — so a run of cheques
  can be checked off at a glance; on a phone it takes a row of its own.
  When the form closes those cards settle in on the board like a moved
  card. **Emptying a new form** is an eraser beside the save (neutral
  under the pointer): one press, then «فرم پاک شد» with the way back. The
  red trash is only a saved cheque's «حذف چک».
- *Size.* The form reads at the size of the board's cards (whose
  figures are 15–16px): what's typed is 15px, labels and section titles
  14px (hints 13px), and fields, the date and amount boxes and the save
  buttons 42px tall — about a tenth larger than the rest of the app's
  controls. Type and heights only, not a zoom: icons, gaps and 1px lines
  stay as they are, and the lists and the calendar, which open outside
  the window, grow in step by their own rules. On a phone every field's
  text is 16px, since below that Safari on iOS zooms the page when a
  field is tapped.
- *View — the cheque, plainly* (the owner's asks, 2026-10-12/13: the drawn
  leaf was too busy, then a long column too tall; someone new to Chekino
  should see at once where a cheque came from and where it went). The
  window is named for its serial («چک ۴۴۰۱۲۲»), 800px wide (no more, so
  nothing sits in empty space), on a white body, in two parts. It keeps
  its own layout but the add form's measures (the owner's ask,
  2026-10-13: one template throughout): the form's paddings (14/20/20,
  14 on a phone) and 20px between sections (16 on a phone); each
  section's title in the middle of a hairline, as the form's are (14px,
  560, muted); labels at the form's labels' size and weight (14px, 560 —
  muted here, with no boxes to part them from their values); values at
  its fields' text (15px, 580; the amount 620; 16px on a phone); the
  small print — dates, units, the national id, how far off the due date
  is — at its hints' (13px); 12px between rows.
  - **«مشخصات چک»**: two by two, halves alike — serial and sayad id (left
    to right, a copy button); due date (how far off in a small outlined
    badge: amber when close, red when past, while it waits for Sayad) and
    amount (its words on hover); the note across both under them, only
    when there is one. Each a small icon and caption over its value, no
    boxes or lines (as the add form lays out its fields). Beside them, in
    a column of its own, the cheque's photo: one frame in a cheque's shape
    (2:1, 232px), no caption (its name is for the screen reader and on
    hover), a soft magnifier on hover, opening in the photo viewer (below);
    the cheque's other files small under
    it, three to a row (a Sayad receipt kept from before has a small green
    dot). A PDF is a document mark and «فایل PDF» on the frame's grey («PDF»
    on a small tile), an «open» mark on hover, opening in a new tab. No photo: a quiet dashed «عکس
    ندارد» in the same place, so every window keeps one shape. The rows
    beside the photo never spread apart for it (a third row takes the
    rest).
  - **«روند چک»**: a row of five steps from right to left joined by a line,
    a round mark each with its icon, and under it a few words, who, and
    when: «گرفته شد از» the owner, «خرج شده به» the party and the spend
    date, «ثبت به نام» the beneficiary with «کد ملی» / «شناسه ملی»
    (copyable), «ارسال به صاحب چک» (the form's own words) with each messenger's logo (a
    message bubble for one written in) and the send date, and «ثبت در صیاد» — Sayad's
    answer as the title in its colour (green tick, red warning, slate
    clock), the date it changed once registered or not, and a problem's
    reason under it. A step's tooltip names its role. Done steps have an
    ink mark on grey; a ready cheque's send step is ringed in ink («هنوز
    فرستاده نشده») and Sayad's still to come (dashed mark, dashed line to
    it). A status set while the window is open makes Sayad's mark settle
    in (0.45s; not with less motion).
  Nothing under the steps (the owner's ask, 2026-10-13): no line of days,
  no status buttons — the status is changed on the board. A registered
  cheque's «کپی رسید ثبت» (the message for its owner) is a quiet button
  with its words in the top bar beside the history; there is no attaching
  a Sayad receipt from the view any more. A ready cheque's «ارسال برای
  صاحب چک» sits in the footer at its start, across from «ویرایش» and the
  trash (on a phone, a row of its own above).
  Deleting: the trash widens into a red «بله، حذف شود» and an «انصراف» of
  the same size slides in beside it, both a size smaller than the footer's
  buttons (104×36; 96×40 on a phone); «ویرایش» stays as it is, and
  pressing it calls the delete off.
  The status history is a small button (a clock turning back) in the top
  bar beside ×, shown once there is a change to tell; it opens a panel
  under it — a dot in the status colour per change joined by a hairline,
  its date at the end, a reason under its change. Escape or a click
  elsewhere closes the panel only. A slip is left out of it (the owner's
  ask, 2026-10-13): a status put back to the one before it within a day —
  «ثبت شد» by mistake, then «برگردون» — is not part of the cheque's
  story, so neither it nor its going back is shown (any number in a row);
  a status that stood longer stays. The server keeps every change (H4);
  only the telling is tidied.
  On a phone the details sit two by two (the sayad id in the wider
  column), the note and the photo each across (the photo 5:2; none, one
  quiet line), and the steps run down the start edge, each with its words
  beside its mark.

  «ویرایش» switches to the form.

The inert wrappers `#veFieldsWrapA/A2/B/C` are what `lockFormFields()`
makes inert in view mode; `#sayadField` stays outside them. The wrappers
are `display: contents`, so they never affect the grid.

**The photo viewer** (`#lightboxOverlay`; the owner's ask, 2026-10-13, after
the viewers people know — a phone's gallery, Telegram). No card: the photo on
a near-black backdrop (both themes), its title and «۱ از ۳» over the top with
×, its actions (ویرایش while the form can be edited, اشتراک‌گذاری، دانلود)
over the bottom, round arrows at its sides for more than one; the bars fade
in once the photo has landed. The photo itself grows out of the thumbnail
it was opened from — the view's frame, a form chip, a bulk-add row: it moves
and scales from there, the thumbnail's crop and corners opening out to the
whole photo (460ms, a fast start and a long soft landing) while the
backdrop darkens; closing (×, Escape, a click on the dark around it), the
bars go first and it shrinks back into its thumbnail (380ms) — from wherever
it is, even still growing. The next photo slides in from the side it lies
on (the next on the left). On a touch screen it follows a finger: down or
up it grows smaller and the backdrop lighter, the page showing through,
and let go far (110px) or fast enough it goes back into its thumbnail,
else it springs back; sideways, the next photo (a lone one gives a little,
then holds); two fingers still zoom the page. With less motion it just
appears and goes; with the thumbnail out of sight it rises from just under
its size and fades out.

**Numbers.** Persian digits, grouped by the Persian thousands separator «٬» (U+066C) everywhere — cards, the form, filters, messages, the leaf, reports — never a Latin comma; decimals would take «٫». One helper (`groupDigits`) does it; the amount field keeps the caret by counting digits, not separators.

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
What a serial, a sayad id, an amount and the channels must be is one file,
`js/rules.js` — the same bytes as the server's `backend/lib/rules.js` (H13;
a test fails if they differ) — so a field's note and the API's refusal say
the same thing: «باید ۶ رقم باشد», «باید ۱۶ رقم باشد», «بیشتر از صفر باشد»,
«مبلغ غیرعادی است؛ صفر اضافه نیست؟» (from ten trillion rials, H7),
«یکی را انتخاب کنید». The API names the field (`field`, code
`invalid_field`) and keeps what passes in Latin digits; a change is held to
the rule only in what it sends, so rows older than the rule still take a
status change.

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
  line), Home / End the ends; «/», «.», «-», «٫» or a space move on too.
  ↑ / ↓ step the value.
- a lone day or month digit is padded («۳» → «۰۳») once its segment is
  left.
- a paste is read as a date wherever it came from: «14050820»,
  «1405/08/20», «۱۴۰۵/۸/۳۰», «۱۴۰۵٫۰۸٫۲۰», «20-08-1405» (the four-digit
  year at either end), with words or bidi marks around it. What isn't a
  date leaves the field alone.
Any number of date fields can be made (`createDateField` with its own
`onChange`; the cheque form's save its draft); each is drawn as segments.
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

The drawn Sayad leaf (`css/cheque.css`, `js/print.js`: pink paper, the
eight-pointed star, the lilac band, the stamp) is gone with it (2026-10-12),
as the login page's sample cheque went before it.

**Floating surfaces.** No border of their own: `--shadow-2` plus the 1px
ring, radius 16–20, a 280ms rise. Menu items are radius 10 with a grey
hover; checkboxes are solid ink when ticked. Overlays use `--scrim` with a
light blur. Dropdowns and popovers live on `<body>`, `position: fixed`,
positioned from the trigger's rect — never nested inside a transformed
ancestor.

**Modals.** Radius 24, header and footer framed by hairlines, a ghost
close button. The people window uses segmented tabs and outlined rows.
The admin panel's command palette follows shadcn's Command.

**Questions** (`askChoice`; `askConfirm` is its yes/no case). A small
alert dialog: a title, one line, the answers. Two answers sit side by
side — the one that keeps the work filled in ink, the destructive one
outlined in red; three or more stand one under another, full width, in
the order given, so long Persian labels fit a phone. Every question has an
answer that changes nothing: Escape, a press outside and the phone's back
give that one, and it puts the caret back where it was. When a saved
cheque changed elsewhere meanwhile, the question offers «دیدن نسخه‌ی
تازه», «ذخیره‌ی تغییرات من» and «برگشت به فرم» (Escape).

**Toasts.** A plain line at the foot of the page, gone after two seconds.
One that offers a way on or back is quieter (the owner's ask, 2026-10-13):
a hairline edge and a soft shadow, the message in a lighter ink, its
buttons quiet ones past a hairline at the end of its line — «مشاهده» in
words, the way back an undo mark (mirrored, right to left; «بازگردانی» to
a screen reader and on hover) — and a thin line along its foot running out
with its time. It stays five seconds, holds still while the pointer moves
on it or the keyboard is in it (not for a pointer it merely appeared
under, which left it standing), goes after three times its time whatever
holds it, and goes on Escape; it keeps its own place, and a plain message
that comes meanwhile shows above it.

**Bulk add** (`js/bulk-add.js`, `css/bulk.css`; photos: `js/bulk-photos.js`,
`js/cheque-split.js` and its worker). For adding many cheques at once.
- **The way in** (the owner's ask, 2026-10-14). Beside «افزودن چک», an
  outlined square with its icon; its words «افزودن گروهی» unroll beside it on
  hover or keyboard focus (a phone keeps the square). Pressed — an
  unfinished one is asked about first — the window opens on its two ways,
  two tiles in its middle and nothing else yet: «افزودن دستی» («سریال‌ها را
  بچسبان، یا ردیف به ردیف بنویس») opens the form; «افزودن با عکس» («عکس چند
  چک را بده، خودم جدایشان می‌کنم») opens the picker for several photos first
  and then the form with a row for each cheque found on them (picking
  nothing stays on the tiles; photos dropped or pasted on the window take
  the same way). A tile is an icon in a soft square over its name and a
  line; a phone stacks them, each icon beside its words. ← → go between
  them; × or Escape closes, nothing made. Rows found on a scan take the
  cursor only when no field is being typed in.
- **The window.** A large window over the board in the cheque form's
  system: radius 24, the same fields and lists.
- **The header.** At the top, once for all rows: «طرف حساب», «تاریخ خرج»
  (today), «ذینفع» and its national id (checked by its check digit). All
  four are needed: a cheque's fate is settled when it is added — there is
  no «منتظر ذینفع» (the owner's call, 2026-10-12).
- **Each row** needs its owner too («صاحب چک: لازم است» under a row
  without one; such a row isn't saved, and the server holds the same line).
- **Pasting serials.** A strip under the header takes a pasted list of
  serials (js/serials.js: any digits, any separators, with or without the
  series). «ساخت ردیف‌ها» makes a row for each and says what it ignored.
- **Scans.** Beside the serials, «عکس اسکن»: a scan is picked, dropped
  anywhere on the window, or pasted (Ctrl+V). The cheques on it are found
  (kraft paper around pink leaves) and each becomes a row with its own cut,
  in reading order — top to bottom, right to left. Sure of them, the rows
  come at once; otherwise the crop editor opens with what was found; with
  nothing found it asks «کل عکس یک چک است» or «خودم کادر می‌کشم». Each scan
  stays as a chip «اسکن ۱، ۴ چک» with «اصلاح برش اسکن» while it is on this
  device.
- **The crop editor.** The photo editor's card and dark well, a white
  numbered frame a cheque: edges and corners drag, × takes a frame away,
  a drag on the image draws one, «کل عکس یک چک است», a quarter turn, and
  «تأیید ۳ چک». A frame taken away takes its row if nothing was typed in it.
- **The rows.** A table of fields, one row per cheque: a tick «در این
  ثبت», #, its photo (a small copy; a dashed place for one), serial, sayad
  id in fours, amount (in words under it), due date in segments, and the
  owner, which may stay empty. A photo dropped or pasted on a row is that
  row's (the leaf found on it is cut out). A click on a photo opens its
  menu: «بزرگ‌نمایی», «چرخش ۹۰ درجه», «برش دوباره» (one frame, only to
  shrink), «جایگزینی عکس», «حذف عکس».
- **The large photo.** On wide screens the row being typed shows its photo
  large beside the rows, on the dark well: a click zooms in at that spot,
  the wheel zooms by steps, ↻ turns the view.
- **Photos going up.** Each is kept on this device until the server has
  it (two at a time; without a connection, again in 1, 2, 4 … 60 seconds).
  A thin moving line under a row's photo says it is on its way. «ثبت»
  waits for the chosen rows' photos («آپلود عکس‌ها ۲ از ۵…») and, still
  without them, says so and keeps the work.
- **Judging a row.** A row is judged when a field is left. What blocks it
  shows red, in one line under the row: «شناسه صیادی: این شناسه قبلاً ثبت
  شده — چک ۴۸۲۹۱۳». What only asks for a look (a serial already on file
  from another bank, one read from a longer number) shows muted with a
  «⚠».
- **The keyboard.** Enter goes to the next field, and from a row's last
  field to the next row (a new one if needed). Shift+Enter goes back.
  Alt+↑/↓ moves between rows. Ctrl+Enter saves. A space in an amount adds
  three zeros.
- **The footer.** It counts «۵ ردیف، ۱ کامل، ۴ ناقص» (a Persian comma
  between counts, never «·»). It says why nothing was saved, and its button
  says how many will be: «ثبت ۳ چک».
- **Saving the draft.** It is saved as it is typed: on this device at
  once (IndexedDB) and on the server two seconds later. A muted
  «ذخیره شد» shows it, or «آفلاین — روی همین دستگاه نگه داشته شد», which
  goes by itself once the connection is back.
- **Unfinished lists.** Escape or × closes the window and keeps the work
  («کارت ذخیره شد، هر وقت خواستی ادامه بده»). A grey bar over the board
  then offers what is unfinished: «ادامه» / «حذف».
- **Saving the cheques.** Saved rows leave the list, and a toast says
  where they went («۴ چک ثبت شد و آماده‌ی ارسال است»); the send window opens
  on them. The toast offers «برگردون», also on Ctrl+Z outside a field. Rows
  that failed stay, each with its reason.
- **Phones.** Each row is a card with its labels, its photo across the top;
  the footer stays at the bottom. «بزرگ‌نمایی» opens the photo full screen.

**Send window** (`js/send-window.js`, its part of `css/bulk.css`). The
cheques that are ready (owner and beneficiary known, not yet sent) go to
their owners from here, so each owner can register them in Sayad.
- **Opening it.** The chip «آماده‌ی ارسال n» over the board,
  «ارسال برای صاحب چک» in a ready cheque's window, or by itself
  after a bulk add.
- **Layout.** The beneficiary once at the top («ذینفع: …، کد ملی …»),
  each part with a copy button; the national id in Latin digits, as Sayad
  takes it. Then one section per owner (Persian order; owner + beneficiary
  when the batch mixes beneficiaries), its cheques by due date, then
  serial. A section's head: the owner, «۲ چک، … ریال», «کپی متن» (and
  «اشتراک» on phones that can't copy a photo).
- **Cards.** Serial, amount, due date; a thumbnail and «کپی عکس» only when
  the cheque has a photo (a PDF offers «باز کردن PDF»). A cheque with no
  photo says «در متن آمد» once its owner's text is copied. Whatever was
  copied turns green («کپی شد»); the head keeps count, «۲ از ۴ کپی شد».
- **The message.**
  «سلام، وقت بخیر / لطفاً چک‌های زیر را در سامانه صیاد به نام «…» با کد ملی
  … ثبت کنید: / • سریال … — … ریال — سررسید … / ممنون». Amounts with «٬».
- **«ارسال کردم».** Needs a channel first (the tags, «سایر» opens a name
  field; the last one is remembered). If some owners weren't copied it asks:
  «همه ارسال شدند» / «فقط کپی‌شده‌ها» / «برگرد». The cheques go to «در
  انتظار» with today's send date, and a toast offers «برگردون».
- **Closing** with nothing copied just closes. Otherwise it asks «همه رو
  برای صاحب چک‌ها فرستادی؟»: «آره، همه» / «بعضی‌ها رو» (checkboxes on the
  sections, then «ثبت ارسالِ این‌ها») / «نه، بعداً».

**Today, over the board.** The chips answer the day's question: «آماده‌ی
ارسال n», then «سررسید نزدیک n» (waiting, due within three days or past due). «سررسید نزدیک»,
pressed, narrows the board to those cards — the blue of a pick, a filter chip
with its own ×, and on a phone the waiting lane in front; pressed again, or
«پاک کردن فیلترها», lets go. A chip with nothing in it isn't shown.
**No follow-up** (the owner's call, 2026-10-14). The follow-up — its chip
«پیگیری n», its window of owners to remind with «کپی متن» and «پیگیری شد»,
its «امروز پیگیری شد» / «n روز از پیگیری» on the cards, its line in the
cheque window and its history line, and POST /checks/follow-up — is gone.
The followed_up events already in histories stay in the database, shown
nowhere; a card counts its days from sending only.

**Cheques off the board** (ready to send). A board search that matches
cheques off the board says so beside the chips: «چک ۱۲۳۴۵۶ در «آماده‌ی
ارسال» است» + «نمایش», which opens it; several open a list (a filter
popover with HeroUI's ListBox inside): one line a cheque — serial, amount,
due date, its party under it; by party, then due date. A cheque opens in
its own window, where:
- the banner says where it stands, in grey («آماده‌ی ارسال — هنوز برای صاحب
  چک فرستاده نشده», with «ارسال برای صاحب چک»); the leaf has no stamp, and
  «—» for the send date and channel;
- editing it has no send date and no channels (the owner takes the row);
  its owner and beneficiary are needed, as for every cheque (the server
  refuses to clear either: `people_required`).

**Bulk edit is gone** (the owner's call, 2026-10-12): a cheque is added with
its owner and beneficiary, so there is nothing left to fill in later in
bulk. Its window, `js/bulk-edit.js`, `POST /api/checks/bulk-update` and its
«برگردون» went with it, and so did the party's group receipt («کپی رسید
ثبت (۵)») that lived in it. A cheque is still changed one at a time, in its
own window.

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
**Where the sign-in lives** (9.10): the signed token is an HttpOnly cookie —
Secure, SameSite=Strict, for `/api` only, a day (the admin's its own, for
`/api/admin`, twelve hours) — that the page's code can't read. The browser
keeps only a hint (`chekino_token`: the token without its signature — who,
until when), which is how the page shows the company and knows a session
ran out. Every request names the page's account (`X-Company`; the admin
panel `X-Admin`): without it the server won't lean on the cookie, and a page
opened for one account gets «switched» if another signed in since. Signing
out asks the server to clear the cookie. A signed Bearer token is still
taken (scripts, and sessions from before the cookie until they run out).

**Login.** The login box alone, in the middle of the page (the owner's
call, 2026-10-12: a sample cheque and a line of copy stood beside it until
then): the brand above it, the form in a bordered card with a Border Beam (a
short bright arc of the edge, going round once as the page opens, then
resting — WCAG 2.2.2), and one line under it, «حساب ندارید یا رمز را فراموش
کرده‌اید؟ به پشتیبانی پیام بدهید». No floating button, no «remember me». A username typed on a
Persian keyboard is read back by key («زمشعیفثسف» → «claudtest») and said
under the field; Caps Lock is said under the password; a password with
Persian digits is tried with Latin ones too. A wrong field is marked
(aria-invalid), described by the alert and focused. Five wrong passwords in a
row for one username lock it for a minute, then two, four, eight, up to a
quarter of an hour (the database counts them, for known names and unknown
alike); the alert says how long: «چند رمز اشتباه پشت سر هم برای این نام
کاربری زده شد؛ ۳ دقیقه‌ی دیگر دوباره امتحان کن». A good sign-in clears it.

**Admin.** Same system: a top bar with a hairline, a side navigation whose
active item is a grey wash, bordered cards, outlined fields, ink buttons,
tables with a faint header row, status badges with a dot. On narrow
screens the navigation becomes segmented tabs. Its words are Persian
throughout (a plan's «دسترسی خروجی گرفتن», a company's «دسترسی … برای این
شرکت»), and its counts Persian digits, «۶ از ۲۰۰». **Subscriptions** (H8): each
company's row says until when («تا ۱۴۰۵/۰۸/۱۵», «۵ روز مانده» in amber within
two weeks, «تمام شده» in red after) or «بدون پایان»; over the list, a search
(name or username) and «در حال انقضا n», a toggle to see only those. In a
company's window, «تمدید ۱ ماه / ۳ ماه / ۶ ماه / ۱ سال» or «بدون پایان», each
saved at once — months added to its end, or to today once it has ended.
**«فعالیت‌ها»** (migration_009): what the admin did, newest first (the last
300) — the day and, quieter, the hour (Tehran), who, what in Persian («ساخت
شرکت»، «غیرفعال کردن شرکت»، «تمدید اشتراک»، «ورود ناموفق» in the red of a
bad state…), the company or plan (its name stays after it is deleted; a
click shows only its rows), and a word of detail («۳ ماه، تا ۱۴۰۵/۱۰/۲۲»،
«۵ شخص، ۱۲ چک»). A search and «همه / شرکت‌ها / پلن‌ها / ورود و حساب». Read
afresh each time the tab opens; the palette has it too (L). Passwords are
never in it — only that one was set. On a phone the four tabs keep their
words and drop their icons.

**On a phone's home screen.** `manifest.webmanifest` (name «چکینو», right to
left, standalone) and icons drawn from the brand mark on white
(`icons/`: 192 and 512, a maskable 512 with the mark in the safe zone,
Apple's 180). The browser's bar takes the page's own colour — white, or
#0A0A0A in the dark theme — following the sun theme as it turns (boot.js).
Pages are served `no-cache` (a 304 when unchanged), files with `?v=` for a
year, `immutable`.

## Files

| File | Role |
|---|---|
| `css/shared.css` | tokens (both themes), baseline, command palette, the theme-switch view transition |
| `css/dashboard.css` | dashboard; the **VISUAL LAYER — Monochrome** section at the end decides the look |
| `css/cheque-form.css` | the add / view / edit modal |
| `css/login.css`, `css/admin.css` | the two other pages (each ends with a "Monochrome finish" section) |
| `js/cheque-form.js` | view face: the cheque at a glance and its way so far, from the form's fields (read-only) |
| `js/shell.js` | card spotlight, first-load blur-fade, tooltip tidy-up (read-only) |
| `js/theme-reveal.js` | the circular theme switch (dashboard and admin) |
| `js/date-segments.js` | the day / month / year segments drawn over each date field (read-only) |
| `js/cal-picker.js` | the calendar's title button and its year / month picker |
| `js/field-addons.js` | the live input-group suffixes on the dashboard: digit counts, list arrows, copy buttons |
| `css/bulk.css` | bulk add, the send window, the chips over the board, the crop editor |
| `js/bulk-add.js` | bulk add: the rows, saving (this device and the server), photos going up, the large photo |
| `js/bulk-photos.js` | finding the cheques on a scan, cutting them, the crop editor, the server's small copies |
| `js/cheque-split.js`, `js/cheque-split.worker.js` | the cheque finder (spec 6.6), and the worker it runs in |
| `js/serials.js` | reading a pasted list of serials (the same file as backend/lib/serials.js) |
| `js/send-window.js` | the send window, the chips over the board, the search hint |
