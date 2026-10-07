// Finding the Sayad cheques laid on a kraft-paper scan (spec 6.6, appendix
// A) — the code tested on three real scans, 10 cheques of 10. One file for
// the page (window.ChekinoSplit), its worker (js/cheque-split.worker.js,
// self.ChekinoSplit) and the tests (require).
//
//   ChekinoSplit.findCheques(imageData) → { boxes, rejected }
//
// The image is already downscaled (long edge ≤ 1600 px); the boxes are
// {x, y, w, h} in its pixels, in reading order: top to bottom, and right to
// left within one horizontal band. `rejected` counts the regions dropped for
// not being cheque-shaped: detection is "confident" when there is at least
// one box and nothing was rejected — otherwise the boxes are shown for the
// user to correct («اصلاح برش اسکن»).
//
// How: a pixel is background when it is kraft/beige paper (hue 16–48°,
// low-to-mid saturation, mid brightness) or near-black (a phone screenshot's
// margins). Rows ≥ 85 % background separate cheques; inside each band,
// columns ≥ 50 % background separate them sideways. A box is kept only if it
// is shaped like a Sayad cheque (width / height between 1.5 and 3; the leaf
// is about 1.95). A white scanner background is not handled: those are cut
// by hand.
(function (root) {
  const SPLIT = {
    hueMin: 8, hueMax: 24,       // OpenCV scale (0–180) → 16°–48°
    satMin: 28, satMax: 95,      // 0–255
    valMin: 110, valMax: 230,    // 0–255
    darkMax: 45,                 // near-black margins count as background too
    smoothRadius: 4,             // 9×9 majority filter (≈ a median blur on a mask)
    rowGap: 0.85,                // a row this much background separates cheques
    colGap: 0.5,                 // a column this much background separates them
    minBandFrac: 1 / 12,         // a cheque is at least 1/12 of the image tall
    minSpanFrac: 1 / 4,          // … and at least 1/4 of it wide
    aspectMin: 1.5, aspectMax: 3.0,
  };

  function findCheques(img, opt = SPLIT) {
    const { width: w, height: h, data } = img;
    const bg = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
      const r = data[p], g = data[p + 1], b = data[p + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      const v = max;
      const s = max === 0 ? 0 : (255 * d) / max;
      let hue = 0;
      if (d !== 0) {
        if (max === r) hue = 60 * (((g - b) / d) % 6);
        else if (max === g) hue = 60 * ((b - r) / d + 2);
        else hue = 60 * ((r - g) / d + 4);
        if (hue < 0) hue += 360;
      }
      const hcv = hue / 2;
      const kraft = hcv >= opt.hueMin && hcv <= opt.hueMax && s >= opt.satMin && s <= opt.satMax &&
                    v >= opt.valMin && v <= opt.valMax;
      bg[i] = kraft || v < opt.darkMax ? 1 : 0;
    }
    const clean = majorityFilter(bg, w, h, opt.smoothRadius);

    const rowFrac = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let x = 0, o = y * w; x < w; x++) s += clean[o + x];
      rowFrac[y] = s / w;
    }
    const bands = runs(rowFrac, (f) => f < opt.rowGap, Math.floor(h * opt.minBandFrac));

    const boxes = [];
    let rejected = 0;
    for (const [y0, y1] of bands) {
      const colFrac = new Float32Array(w);
      for (let y = y0; y < y1; y++) for (let x = 0, o = y * w; x < w; x++) colFrac[x] += clean[o + x];
      for (let x = 0; x < w; x++) colFrac[x] /= (y1 - y0);
      const spans = runs(colFrac, (f) => f < opt.colGap, Math.floor(w * opt.minSpanFrac)).reverse();   // right to left
      for (const [x0, x1] of spans) {
        const bw = x1 - x0, bh = y1 - y0, ar = bw / bh;
        if (ar > opt.aspectMin && ar < opt.aspectMax) boxes.push({ x: x0, y: y0, w: bw, h: bh });
        else rejected++;
      }
    }
    return { boxes, rejected };
  }

  // [start, end) runs where pred holds, at least minLen long
  function runs(arr, pred, minLen) {
    const out = [];
    let s = -1;
    for (let i = 0; i <= arr.length; i++) {
      const on = i < arr.length && pred(arr[i]);
      if (on && s < 0) s = i;
      if (!on && s >= 0) { if (i - s >= minLen) out.push([s, i]); s = -1; }
    }
    return out;
  }

  // A binary majority filter over a (2r+1)² window, through an integral
  // image — what a median blur does to a 0/1 mask, in O(w·h)
  function majorityFilter(src, w, h, r) {
    const W = w + 1;
    const sum = new Uint32Array(W * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        row += src[y * w + x];
        sum[(y + 1) * W + (x + 1)] = sum[y * W + (x + 1)] + row;
      }
    }
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
        const n = (y1 - y0) * (x1 - x0);
        const s = sum[y1 * W + x1] - sum[y0 * W + x1] - sum[y1 * W + x0] + sum[y0 * W + x0];
        out[y * w + x] = s * 2 > n ? 1 : 0;
      }
    }
    return out;
  }

  const api = { findCheques, SPLIT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChekinoSplit = api;
})(typeof self !== 'undefined' ? self : this);
