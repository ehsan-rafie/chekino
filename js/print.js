// Security print — the generators behind every cheque drawn in the app.
// Shared by the cheque form (js/cheque-form.js) and the login page
// (js/login-art.js), so the two cheques can't drift apart.
//
//   ChekinoPrint.guilloche(svg, opts)  interleaved sine-wave lattice plus a
//                                      spirograph rosette, drawn into <svg>
//   ChekinoPrint.signaturePath(name)   a cursive scribble seeded from a name —
//                                      the same stroke every time for the
//                                      same name
//   ChekinoPrint.drawIn(path, ms)      plays a stroke as if drawn by pen
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed || 1;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function wave(W, y0, amp, k, ph) {
    let d = '';
    for (let x = -10; x <= W + 10; x += 6) {
      const y = y0 + amp * Math.sin(x * k + ph) + amp * 0.35 * Math.sin(x * k * 2.7 + ph * 1.9);
      d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }
  function rosette(cx, cy, R, r, dd, turns) {
    let d = '';
    const k = (R - r) / r;
    for (let t = 0; t <= Math.PI * 2 * turns; t += 0.02) {
      const x = cx + (R - r) * Math.cos(t) + dd * Math.cos(k * t);
      const y = cy + (R - r) * Math.sin(t) - dd * Math.sin(k * t);
      d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d + 'Z';
  }

  // opts: { width, height, lines, gap, rosettes: [[cx, cy, scale], ...], rough }
  function guilloche(svg, opts) {
    if (!svg || svg.childElementCount) return;
    const o = Object.assign({ width: 1000, height: 510, lines: 34, gap: 16, rosettes: [[610, 250, 1]], rough: false }, opts);
    svg.setAttribute('viewBox', `0 0 ${o.width} ${o.height}`);
    const add = (d, cls) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', cls);
      svg.appendChild(p);
      return p;
    };
    for (let i = 0; i < o.lines; i++) add(wave(o.width, -20 + i * o.gap, 14, 0.012, i * 0.42), 'g-a');
    for (let i = 0; i < o.lines; i++) add(wave(o.width, -12 + i * o.gap, 11, 0.017, Math.PI - i * 0.31), 'g-b');
    o.rosettes.forEach(([cx, cy, s]) => {
      add(rosette(cx, cy, 150 * s, 34 * s, 92 * s, 17), 'g-r');
      add(rosette(cx, cy, 110 * s, 27 * s, 64 * s, 27), 'g-r g-r2');
    });
    if (o.rough) {
      // Rough edge for rubber stamps — a tiny displacement, not a blur.
      const defs = document.createElementNS(NS, 'defs');
      defs.innerHTML = '<filter id="cqcRough" x="-10%" y="-10%" width="120%" height="120%">'
        + '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>'
        + '<feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>'
        + '</filter>';
      svg.appendChild(defs);
    }
  }

  // Not handwriting, and not meant to pass for it — a stand-in stroke so a
  // preview reads as signed.
  function signaturePath(name) {
    const r = rng(hash(name));
    let x = 14 + r() * 8;
    const y = 38 + r() * 6;
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    const lx = x + 18 + r() * 10, ly = y - 26 - r() * 8;
    d += ` C${(x + 30).toFixed(1)} ${(y - 6).toFixed(1)} ${(lx + 14).toFixed(1)} ${(ly - 2).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)}`;
    d += ` S${(x + 2).toFixed(1)} ${(y + 10).toFixed(1)} ${(x + 26).toFixed(1)} ${(y + 2).toFixed(1)}`;
    x += 26;
    const n = Math.min(9, Math.max(4, Math.round(name.length / 2)));
    for (let i = 0; i < n; i++) {
      const dx = 11 + r() * 9;
      const up = (i % 2 ? 1 : -1) * (8 + r() * 14);
      d += ` q${(dx / 2).toFixed(1)} ${up.toFixed(1)} ${dx.toFixed(1)} ${(r() * 6 - 3).toFixed(1)}`;
      x += dx;
    }
    d += ` c${(10 + r() * 8).toFixed(1)} ${(6 + r() * 4).toFixed(1)} ${(-40 - r() * 30).toFixed(1)} ${(16 + r() * 4).toFixed(1)} ${(-90 - r() * 30).toFixed(1)} ${(12 + r() * 4).toFixed(1)}`;
    return d;
  }

  function drawIn(path) {
    if (!path || !path.getTotalLength) return;
    const len = path.getTotalLength();
    path.style.transition = 'none';
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.getBoundingClientRect();
    path.style.transition = '';
    path.style.strokeDashoffset = '0';
  }

  window.ChekinoPrint = { guilloche, signaturePath, drawIn };
})();
