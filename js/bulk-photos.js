// Photos for bulk add (spec 5.2, 6.5, 6.6): finding the cheques on a scan,
// cutting each one out, the editor for correcting those cuts, and the
// server's photos shown in rows. js/bulk-add.js puts them into its rows and
// uploads them.
//
//   ChekinoPhotos.detect(blob)                → { width, height, boxes, rejected }
//       (in js/cheque-split.worker.js; on the page itself where a worker
//        can't draw). Boxes in the photo's own pixels (its EXIF turn applied).
//   ChekinoPhotos.cut(blob, box, rotation)    → { full, thumb }   JPEG Blobs
//       full: long edge ≤ 1600, quality 0.82; thumb: 360, 0.7 (spec 6.5)
//   ChekinoPhotos.turn(blob, 90)              → the photo turned, a JPEG Blob
//   ChekinoPhotos.editBoxes({ blob, boxes, rotation, single, title })
//       → { boxes, rotation } or null when cancelled: «اصلاح برش اسکن» (the
//         scan, every box) or «برش دوباره» (one cheque's photo, one box)
//   ChekinoPhotos.thumbUrl(imageId)           → an object URL of the server's small copy
//   ChekinoPhotos.readingOrder(boxes)         → top to bottom, right to left
(function () {
  const VER = ((document.currentScript && /[?&]v=([^&]+)/.exec(document.currentScript.src)) || [])[1] || '';

  // ---------------------------------------------------------------
  // Finding the cheques
  // ---------------------------------------------------------------
  let worker = null, workerBroken = false, seq = 0;
  const waiting = new Map();
  function getWorker() {
    if (workerBroken || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
    if (!worker) {
      try {
        worker = new Worker('/js/cheque-split.worker.js' + (VER ? `?v=${VER}` : ''));
        worker.onmessage = (e) => { const w = waiting.get(e.data.id); if (w) { waiting.delete(e.data.id); w(e.data); } };
        worker.onerror = () => {
          workerBroken = true;
          for (const [id, w] of waiting) w({ id, error: 'worker' });
          waiting.clear();
          worker = null;
        };
      } catch (e) { workerBroken = true; return null; }
    }
    return worker;
  }
  const bitmapOf = (blob) => createImageBitmap(blob, { imageOrientation: 'from-image' });
  async function detectHere(blob) {
    const bmp = await bitmapOf(blob);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0, w, h);
    const { boxes, rejected } = window.ChekinoSplit.findCheques(ctx.getImageData(0, 0, w, h));
    const out = { width: bmp.width, height: bmp.height, rejected, boxes: boxes.map((b) => ({ x: b.x / scale, y: b.y / scale, w: b.w / scale, h: b.h / scale })) };
    bmp.close && bmp.close();
    return out;
  }
  async function detect(blob) {
    const w = getWorker();
    if (w) {
      const r = await new Promise((resolve) => {
        const id = ++seq;
        const timer = setTimeout(() => { waiting.delete(id); resolve({ error: 'timeout' }); }, 15000);
        waiting.set(id, (d) => { clearTimeout(timer); resolve(d); });
        w.postMessage({ id, blob });
      });
      if (!r.error) return r;
    }
    return detectHere(blob);
  }

  // Top to bottom; a band of boxes side by side is read right to left
  function readingOrder(boxes) {
    const byY = boxes.slice().sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
    const bands = [];
    for (const b of byY) {
      const c = b.y + b.h / 2;
      const band = bands[bands.length - 1];
      if (band && Math.abs(c - band.c) < Math.min(b.h, band.h) / 2) band.items.push(b);
      else bands.push({ c, h: b.h, items: [b] });
    }
    return bands.flatMap((band) => band.items.sort((a, b) => (b.x + b.w) - (a.x + a.w)));
  }

  // ---------------------------------------------------------------
  // Cutting and turning
  // ---------------------------------------------------------------
  const toBlob = (canvas, q) => new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', q));
  // the image turned by 0/90/180/270 degrees, clockwise, on a canvas
  function turned(src, rotation) {
    const r = ((rotation % 360) + 360) % 360;
    const w = src.width, h = src.height;
    const c = document.createElement('canvas');
    c.width = r % 180 ? h : w;
    c.height = r % 180 ? w : h;
    const ctx = c.getContext('2d');
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((r * Math.PI) / 180);
    ctx.drawImage(src, -w / 2, -h / 2);
    return c;
  }
  function scaledCopy(src, sx, sy, sw, sh, longEdge) {
    const s = Math.min(1, longEdge / Math.max(sw, sh));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(sw * s));
    c.height = Math.max(1, Math.round(sh * s));
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c;
  }
  async function cut(blob, box, rotation = 0) {
    const bmp = await bitmapOf(blob);
    const src = rotation % 360 ? turned(bmp, rotation) : bmp;
    const b = box || { x: 0, y: 0, w: src.width, h: src.height };
    const x = Math.max(0, Math.round(b.x)), y = Math.max(0, Math.round(b.y));
    const w = Math.min(src.width - x, Math.round(b.w)), h = Math.min(src.height - y, Math.round(b.h));
    const full = scaledCopy(src, x, y, w, h, 1600);
    const thumb = scaledCopy(full, 0, 0, full.width, full.height, 360);
    const out = { full: await toBlob(full, 0.82), thumb: await toBlob(thumb, 0.7) };
    bmp.close && bmp.close();
    return out;
  }
  async function turn(blob, deg) {
    const bmp = await bitmapOf(blob);
    const c = turned(bmp, deg);
    bmp.close && bmp.close();
    return toBlob(scaledCopy(c, 0, 0, c.width, c.height, 1600), 0.82);
  }

  // ---------------------------------------------------------------
  // The server's photos: the small copy, fetched with the token
  // ---------------------------------------------------------------
  const thumbs = new Map();   // id → Promise<url>, the last 100
  function thumbUrl(id) {
    let p = thumbs.get(id);
    if (p) { thumbs.delete(id); thumbs.set(id, p); return p; }
    p = apiFetch(`/images/${encodeURIComponent(id)}/thumb`).then(async (res) => {
      if (!res.ok) throw new Error('thumb ' + res.status);
      return URL.createObjectURL(await res.blob());
    });
    p.catch(() => thumbs.delete(id));
    thumbs.set(id, p);
    while (thumbs.size > 100) {
      const [old, oldP] = thumbs.entries().next().value;
      thumbs.delete(old);
      oldP.then((u) => URL.revokeObjectURL(u)).catch(() => {});
    }
    return p;
  }

  // ---------------------------------------------------------------
  // The editor: the image in a dark well, a numbered frame a cheque.
  // Frames are moved and resized by their edges and corners; a drag on
  // the image draws a new one; × takes one away; «کل عکس یک چک است» makes
  // the whole image one; the image turns in quarter turns (the frames with
  // it). One cheque's photo («برش دوباره») has one frame and only shrinks.
  // ---------------------------------------------------------------
  const ov = document.getElementById('scanEditOverlay');
  let ed = null;   // { canvas, W, H, boxes:[{ref,x,y,w,h}], rotation, single, scale, sel, resolve, blob, bmp }
  const MIN = 24;  // the smallest frame, in screen pixels
  const HANDLES = ['t', 'b', 'l', 'r', 'tl', 'tr', 'bl', 'br'];
  const $e = (id) => document.getElementById(id);

  function layout() {
    if (!ed) return;
    const body = $e('seBody');
    const availW = body.clientWidth - 32, availH = body.clientHeight - 32;
    ed.scale = Math.min(availW / ed.W, availH / ed.H, 1.5);
    const stage = $e('seStage');
    stage.style.width = Math.round(ed.W * ed.scale) + 'px';
    stage.style.height = Math.round(ed.H * ed.scale) + 'px';
    drawBoxes();
  }
  function drawBoxes() {
    const stage = $e('seStage');
    stage.querySelectorAll('.se-box').forEach((el) => el.remove());
    const order = readingOrder(ed.boxes);
    ed.boxes.forEach((b) => {
      const el = document.createElement('div');
      el.className = 'se-box' + (ed.sel === b ? ' is-sel' : '');
      el.style.left = b.x * ed.scale + 'px';
      el.style.top = b.y * ed.scale + 'px';
      el.style.width = b.w * ed.scale + 'px';
      el.style.height = b.h * ed.scale + 'px';
      el._box = b;
      if (!ed.single) {
        const n = document.createElement('span');
        n.className = 'se-num';
        n.textContent = toFa(String(order.indexOf(b) + 1));
        el.appendChild(n);
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'se-del';
        del.setAttribute('aria-label', 'حذف این کادر');
        del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
        del.addEventListener('pointerdown', (e) => e.stopPropagation());
        del.addEventListener('click', () => { ed.boxes.splice(ed.boxes.indexOf(b), 1); if (ed.sel === b) ed.sel = null; drawBoxes(); showCount(); });
        el.appendChild(del);
      }
      for (const h of HANDLES) {
        const hd = document.createElement('div');
        hd.className = `pe-handle ${h.length === 2 ? 'pe-corner' : 'pe-edge'} pe-h-${h}`;
        hd.dataset.h = h;
        el.appendChild(hd);
      }
      stage.appendChild(el);
    });
  }
  function showCount() {
    const n = ed.boxes.length;
    $e('seCount').textContent = ed.single ? '' : (n ? `${toFa(String(n))} چک` : 'کادری نیست');
    $e('seDone').disabled = !n;
    $e('seDone').textContent = ed.single ? 'تأیید' : (n ? `تأیید ${toFa(String(n))} چک` : 'تأیید');
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // dragging: a frame's body moves it, a handle resizes it, the image draws one
  let drag = null;
  function onDown(e) {
    if (!ed || e.button > 0) return;
    const stage = $e('seStage');
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - r.left) / ed.scale, py = (e.clientY - r.top) / ed.scale;
    const boxEl = e.target.closest('.se-box');
    const handle = e.target.closest('.pe-handle');
    if (boxEl) {
      const b = boxEl._box;
      ed.sel = b;
      drag = { b, mode: handle ? handle.dataset.h : 'move', px, py, start: { ...b } };
    } else if (!ed.single) {
      const b = { ref: null, x: px, y: py, w: 0, h: 0 };
      ed.boxes.push(b);
      ed.sel = b;
      drag = { b, mode: 'new', px, py, start: { ...b } };
    } else return;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('dragging');
    e.preventDefault();
    drawBoxes();
  }
  function onMove(e) {
    if (!drag) return;
    const stage = $e('seStage');
    const r = stage.getBoundingClientRect();
    const px = clamp((e.clientX - r.left) / ed.scale, 0, ed.W), py = clamp((e.clientY - r.top) / ed.scale, 0, ed.H);
    const { b, start: s, mode } = drag;
    const min = MIN / ed.scale;
    if (mode === 'move') {
      b.x = clamp(s.x + px - drag.px, 0, ed.W - s.w);
      b.y = clamp(s.y + py - drag.py, 0, ed.H - s.h);
    } else if (mode === 'new') {
      b.x = Math.min(px, drag.px); b.y = Math.min(py, drag.py);
      b.w = Math.abs(px - drag.px); b.h = Math.abs(py - drag.py);
    } else {
      // one cheque's photo only shrinks: its frame stays inside where it began
      const lim = ed.single ? { x0: ed.lim.x, y0: ed.lim.y, x1: ed.lim.x + ed.lim.w, y1: ed.lim.y + ed.lim.h } : { x0: 0, y0: 0, x1: ed.W, y1: ed.H };
      let x0 = s.x, y0 = s.y, x1 = s.x + s.w, y1 = s.y + s.h;
      if (mode.includes('l')) x0 = clamp(px, lim.x0, x1 - min);
      if (mode.includes('r')) x1 = clamp(px, x0 + min, lim.x1);
      if (mode.includes('t')) y0 = clamp(py, lim.y0, y1 - min);
      if (mode.includes('b')) y1 = clamp(py, y0 + min, lim.y1);
      Object.assign(b, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
    drawBoxes();
  }
  function onUp() {
    if (!drag) return;
    const { b, mode } = drag;
    drag = null;
    $e('seStage').classList.remove('dragging');
    // a click on the image, not a drag: no frame
    if (mode === 'new' && (b.w * ed.scale < MIN || b.h * ed.scale < MIN)) { ed.boxes.splice(ed.boxes.indexOf(b), 1); ed.sel = null; }
    drawBoxes();
    showCount();
  }

  // a quarter turn clockwise: the image, and every frame with it
  function rotate() {
    const W = ed.W, H = ed.H;
    ed.rotation = (ed.rotation + 90) % 360;
    const c = turned(ed.canvas, 90);
    ed.canvas = c;
    ed.W = c.width; ed.H = c.height;
    const turn = (b) => ({ ...b, x: H - (b.y + b.h), y: b.x, w: b.h, h: b.w });
    ed.boxes = ed.boxes.map(turn);
    if (ed.lim) ed.lim = turn(ed.lim);
    ed.sel = null;
    mountCanvas();
    void W;
  }
  function mountCanvas() {
    const stage = $e('seStage');
    stage.querySelectorAll('canvas').forEach((c) => c.remove());
    ed.canvas.className = 'se-img';
    stage.prepend(ed.canvas);
    layout();
  }

  async function editBoxes(opts) {
    if (!ov) return null;
    const bmp = await bitmapOf(opts.blob);
    const base = turned(bmp, opts.rotation || 0);
    bmp.close && bmp.close();
    const boxes = (opts.boxes && opts.boxes.length ? opts.boxes : (opts.single ? [{ ref: null, x: 0, y: 0, w: base.width, h: base.height }] : []))
      .map((b) => ({ ref: b.ref || null, x: b.x, y: b.y, w: b.w, h: b.h }));
    return new Promise((resolve) => {
      ed = { canvas: base, W: base.width, H: base.height, boxes, rotation: opts.rotation || 0, single: !!opts.single, sel: null, resolve };
      if (ed.single) ed.lim = { ...boxes[0] };
      $e('seTitle').textContent = opts.title || (ed.single ? 'برش دوباره‌ی عکس چک' : 'اصلاح برش اسکن');
      $e('seHint').textContent = ed.single ? 'لبه‌ها را بکش تا فقط خودِ چک بماند'
        : 'هر کادر یک چک است: لبه‌هایش را بکش، با × برش دار، یا روی عکس کادر تازه بکش';
      $e('seWhole').hidden = ed.single;
      ov.classList.add('show');
      ov.setAttribute('aria-hidden', 'false');
      mountCanvas();
      showCount();
      setTimeout(() => $e('seDone').focus(), 30);
    });
  }
  function finish(ok) {
    if (!ed) return;
    const { resolve, boxes, rotation, single } = ed;
    const result = ok ? { rotation, boxes: (single ? boxes : readingOrder(boxes)).map((b) => ({ ref: b.ref, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) })) } : null;
    ed = null;
    ov.classList.remove('show');
    ov.setAttribute('aria-hidden', 'true');
    $e('seStage').querySelectorAll('canvas, .se-box').forEach((el) => el.remove());
    resolve(result);
  }
  if (ov) {
    const stage = $e('seStage');
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    $e('seRotate').addEventListener('click', rotate);
    $e('seWhole').addEventListener('click', () => { ed.boxes = [{ ref: ed.boxes[0] ? ed.boxes[0].ref : null, x: 0, y: 0, w: ed.W, h: ed.H }]; ed.sel = null; drawBoxes(); showCount(); });
    $e('seDone').addEventListener('click', () => finish(true));
    $e('seCancel').addEventListener('click', () => finish(false));
    ov.addEventListener('keydown', (e) => {
      if (!ed) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && ed.sel && !ed.single) {
        e.preventDefault();
        ed.boxes.splice(ed.boxes.indexOf(ed.sel), 1);
        ed.sel = null;
        drawBoxes();
        showCount();
      }
    });
    window.addEventListener('resize', () => { if (ed) layout(); });
  }

  window.ChekinoPhotos = {
    detect, cut, turn, editBoxes, thumbUrl, readingOrder,
    editorOpen: () => !!ed,
    cancelEditor: () => finish(false),
  };
})();
