// node --test "test/*.test.js"   (from backend/)
// The cheque finder (js/cheque-split.js, spec 6.6) on made-up scans: pink
// leaves with dark marks on kraft paper, as a scanner or a phone sees them.
// (Real scans are personal data and never go in the repository.)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../js/cheque-split.js');
const here = fs.existsSync(file);
const { findCheques } = here ? require(file) : {};
const maybe = (name, fn) => test(name, (t) => (here ? fn(t) : t.skip('no js/cheque-split.js beside the backend here')));

const KRAFT = [200, 175, 135];      // hue ≈ 37°, saturation ≈ 83, value 200: background
const LEAF = [236, 214, 230];       // a Sayad leaf's pink: not background
const INK = [60, 50, 90];           // print and handwriting on it
function scan(w, h, leaves, { margin = 0 } = {}) {
  const data = new Uint8ClampedArray(w * h * 4);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const dark = margin && (y < margin || y >= h - margin);
      const c = dark ? [8, 8, 8] : KRAFT.map((v) => v + Math.round((rnd() - 0.5) * 10));   // paper grain
      data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2]; data[p + 3] = 255;
    }
  }
  for (const L of leaves) {
    for (let y = L.y; y < L.y + L.h; y++) {
      for (let x = L.x; x < L.x + L.w; x++) {
        const p = (y * w + x) * 4;
        // lines of print every 24 px, and a few marks
        const ink = ((y - L.y) % 24 < 3 && (x - L.x) % 90 < 60) || rnd() < 0.01;
        const c = ink ? INK : LEAF;
        data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2];
      }
    }
  }
  return { width: w, height: h, data };
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const matches = (box, leaf, tol = 12) => near(box.x, leaf.x, tol) && near(box.y, leaf.y, tol) && near(box.w, leaf.w, tol * 2) && near(box.h, leaf.h, tol * 2);

maybe('four leaves one under another, as the scanner gives them: all four, in order', () => {
  const leaves = [0, 1, 2, 3].map((i) => ({ x: 120, y: 40 + i * 380, w: 700, h: 340 }));
  const { boxes, rejected } = findCheques(scan(940, 1560, leaves));
  assert.strictEqual(rejected, 0);
  assert.strictEqual(boxes.length, 4);
  boxes.forEach((b, i) => assert.ok(matches(b, leaves[i]), `box ${i}: ${JSON.stringify(b)}`));
  boxes.forEach((b) => assert.ok(b.w / b.h > 1.9 && b.w / b.h < 2.2));
});

maybe('two side by side in a band: read right to left', () => {
  const leaves = [{ x: 40, y: 60, w: 560, h: 280 }, { x: 680, y: 60, w: 560, h: 280 }];
  const { boxes, rejected } = findCheques(scan(1280, 420, leaves));
  assert.strictEqual(rejected, 0);
  assert.strictEqual(boxes.length, 2);
  assert.ok(matches(boxes[0], leaves[1]), 'the right one first');
  assert.ok(matches(boxes[1], leaves[0]));
});

maybe('a phone screenshot with black margins: the margins are background', () => {
  const leaves = [{ x: 60, y: 260, w: 600, h: 300 }, { x: 60, y: 660, w: 600, h: 300 }];
  const { boxes, rejected } = findCheques(scan(720, 1220, leaves, { margin: 140 }));
  assert.strictEqual(rejected, 0);
  assert.strictEqual(boxes.length, 2);
  boxes.forEach((b, i) => assert.ok(matches(b, leaves[i]), `box ${i}: ${JSON.stringify(b)}`));
});

maybe('something not shaped like a cheque is counted as rejected, not kept', () => {
  const leaves = [{ x: 100, y: 60, w: 640, h: 320 }, { x: 250, y: 480, w: 340, h: 340 }];
  const { boxes, rejected } = findCheques(scan(840, 900, leaves));
  assert.strictEqual(boxes.length, 1);
  assert.strictEqual(rejected, 1);
});

maybe('a white background finds nothing (cut by hand)', () => {
  const img = scan(800, 800, [{ x: 100, y: 200, w: 600, h: 300 }]);
  for (let p = 0; p < img.data.length; p += 4) if (img.data[p] === KRAFT[0] || Math.abs(img.data[p] - KRAFT[0]) <= 5) { img.data[p] = 250; img.data[p + 1] = 250; img.data[p + 2] = 250; }
  const { boxes } = findCheques(img);
  assert.strictEqual(boxes.length, 0);
});
