/* Command palette — ⌘K / Ctrl+K.
   Shared by the dashboard and the admin panel. Each page calls
   ChekinoPalette.register([...]) with its own commands; this file owns the
   markup, the matching, the keyboard handling and the shortcut routing.

   Two things here are deliberate rather than incidental:

   · The palette builds its own DOM on first use instead of living in the
     page markup. Two pages would otherwise carry the same forty lines of
     HTML, and they would drift.

   · Matching normalises Persian text before comparing. A user typing
     "کيف" (Arabic yeh) must find "کیف" (Persian yeh), and someone typing
     "123" must find "۱۲۳". Without that the palette looks broken to
     exactly the people it's meant to speed up.
*/
(function () {
  const commands = [];
  let root = null, input = null, listEl = null, emptyEl = null;
  let matches = [];
  let cursor = 0;
  let lastFocus = null;

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const MOD_LABEL = isMac ? '⌘' : 'Ctrl';

  // ---- Persian/Arabic text normalisation -------------------------------
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  function normalize(str) {
    return String(str == null ? '' : str)
      .replace(/[يى]/g, 'ی')
      .replace(/[ك]/g, 'ک')
      .replace(/[ۀة]/g, 'ه')
      .replace(/[أإآ]/g, 'ا')
      .replace(/[ً-ْ‌‏‎]/g, '')   // harakat + zero-width marks
      .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Subsequence match: typing "افچک" still finds "افزودن چک". Returns a
  // score so exact prefix hits sort above scattered ones.
  function score(haystack, needle) {
    if (!needle) return 1;
    const h = normalize(haystack), n = normalize(needle);
    if (!h) return 0;
    if (h.startsWith(n)) return 1000 - h.length;
    const idx = h.indexOf(n);
    if (idx > -1) return 600 - idx;
    let hi = 0, hits = 0;
    for (const ch of n) {
      const found = h.indexOf(ch, hi);
      if (found === -1) return 0;
      hits++;
      hi = found + 1;
    }
    return hits * 10 - hi;
  }

  function build() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'cp-overlay';
    root.id = 'commandPalette';
    root.innerHTML = `
      <div class="cp-box" role="dialog" aria-modal="true" aria-label="پالت دستور">
        <div class="cp-search">
          <svg class="cp-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="cpInput" autocomplete="off" spellcheck="false" placeholder="دستور یا جستجو…" aria-label="جستجوی دستور">
          <kbd class="cp-esc">Esc</kbd>
        </div>
        <div class="cp-list" id="cpList" role="listbox"></div>
        <div class="cp-empty" id="cpEmpty">چیزی پیدا نشد</div>
        <div class="cp-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> حرکت</span>
          <span><kbd>↵</kbd> اجرا</span>
          <span><kbd>${MOD_LABEL}</kbd><kbd>K</kbd> باز و بسته کردن</span>
        </div>
      </div>`;
    document.body.appendChild(root);

    input = root.querySelector('#cpInput');
    listEl = root.querySelector('#cpList');
    emptyEl = root.querySelector('#cpEmpty');

    input.addEventListener('input', () => { cursor = 0; render(); });
    input.addEventListener('keydown', onKeyInPalette);
    root.addEventListener('mousedown', (e) => { if (e.target === root) close(); });
  }

  function visibleCommands() {
    return commands.filter((c) => (typeof c.when === 'function' ? c.when() : true));
  }

  function render() {
    const q = input.value.trim();
    const pool = visibleCommands();
    matches = pool
      .map((c) => ({ c, s: Math.max(score(c.title, q), score(c.keywords || '', q) * 0.9) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || (a.c.order || 0) - (b.c.order || 0))
      .map((x) => x.c)
      .slice(0, 40);

    if (cursor >= matches.length) cursor = Math.max(0, matches.length - 1);
    emptyEl.style.display = matches.length ? 'none' : 'block';

    let html = '';
    let lastGroup = null;
    matches.forEach((c, i) => {
      if (c.group && c.group !== lastGroup) {
        html += `<div class="cp-group">${esc(c.group)}</div>`;
        lastGroup = c.group;
      }
      html += `
        <div class="cp-item${i === cursor ? ' is-active' : ''}" data-i="${i}" role="option" aria-selected="${i === cursor}">
          <span class="cp-icon">${c.icon || defaultIcon}</span>
          <span class="cp-title">${esc(c.title)}</span>
          ${c.hint ? `<span class="cp-hint">${esc(c.hint)}</span>` : ''}
          ${c.shortcut ? `<span class="cp-keys">${keyChips(c.shortcut)}</span>` : ''}
        </div>`;
    });
    listEl.innerHTML = html;

    listEl.querySelectorAll('.cp-item').forEach((el) => {
      el.addEventListener('mousemove', () => {
        const i = Number(el.dataset.i);
        if (i !== cursor) { cursor = i; paintCursor(); }
      });
      el.addEventListener('click', () => run(Number(el.dataset.i)));
    });
  }

  function paintCursor() {
    listEl.querySelectorAll('.cp-item').forEach((el, i) => {
      const on = i === cursor;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
  }

  const defaultIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>`;

  function keyChips(shortcut) {
    return String(shortcut).split('+').map((k) => `<kbd>${esc(k.trim())}</kbd>`).join('');
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function onKeyInPalette(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (matches.length) { cursor = (cursor + 1) % matches.length; paintCursor(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (matches.length) { cursor = (cursor - 1 + matches.length) % matches.length; paintCursor(); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(cursor);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      e.preventDefault();   // the palette is the whole world while it's up
    }
  }

  function run(i) {
    const cmd = matches[i];
    if (!cmd) return;
    close();
    // Let the overlay finish leaving before the action repaints the page —
    // otherwise a command that opens a modal fights the palette's own exit.
    requestAnimationFrame(() => { try { cmd.run(); } catch (err) { console.error('command failed:', err); } });
  }

  function open() {
    build();
    if (root.classList.contains('show')) return;
    lastFocus = document.activeElement;
    root.classList.add('show');
    document.body.style.overflow = 'hidden';
    input.value = '';
    cursor = 0;
    render();
    input.focus();
  }

  function close() {
    if (!root || !root.classList.contains('show')) return;
    root.classList.remove('show');
    document.body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
  }

  function isOpen() { return !!root && root.classList.contains('show'); }

  // ---- global keys -----------------------------------------------------
  // A single-letter shortcut must never fire while the user is writing. That
  // includes contenteditable and any open modal's fields.
  function typingInField(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function anotherOverlayOpen() {
    return !!document.querySelector(
      '.modal-overlay.show, .bulk-overlay.show, .send-overlay.show, .confirm-overlay.show, .photo-editor-overlay.show, .lightbox-overlay.show'
    );
  }

  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;

    if (mod && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      isOpen() ? close() : open();
      return;
    }
    if (isOpen()) return;                       // palette owns its own keys
    if (mod || e.altKey) return;
    if (typingInField(e.target)) return;
    if (anotherOverlayOpen()) return;           // a modal's Escape chain comes first

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const hit = visibleCommands().find(
      (c) => c.key && String(c.key).toLowerCase() === key
    );
    if (hit) {
      e.preventDefault();
      try { hit.run(); } catch (err) { console.error('shortcut failed:', err); }
    }
  });

  window.ChekinoPalette = {
    register(list) {
      (Array.isArray(list) ? list : [list]).forEach((c) => {
        if (c && c.title && typeof c.run === 'function') commands.push(c);
      });
    },
    open, close, isOpen,
    modLabel: MOD_LABEL,
  };
})();
