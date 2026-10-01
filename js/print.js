// Security print — the generators behind every cheque drawn in the app.
// Shared by the cheque view (js/cheque-form.js) and the login page
// (js/login-art.js), so the two cheques can't drift apart.
//
//   ChekinoPrint.guilloche(svg, opts)  interleaved sine-wave lattice, drawn
//                                      into <svg>
//   ChekinoPrint.star(svg)             the eight-pointed star medallion in
//                                      the middle of the uniform Sayad
//                                      cheque (a شمسه): nested stars, a
//                                      ring of petals, two circles
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  function wave(W, y0, amp, k, ph) {
    let d = '';
    for (let x = -10; x <= W + 10; x += 6) {
      const y = y0 + amp * Math.sin(x * k + ph) + amp * 0.35 * Math.sin(x * k * 2.7 + ph * 1.9);
      d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }
  function add(svg, d, cls) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', cls);
    svg.appendChild(p);
    return p;
  }

  // opts: { width, height, lines, gap }
  function guilloche(svg, opts) {
    if (!svg || svg.childElementCount) return;
    const o = Object.assign({ width: 1000, height: 490, lines: 34, gap: 15 }, opts);
    svg.setAttribute('viewBox', `0 0 ${o.width} ${o.height}`);
    for (let i = 0; i < o.lines; i++) add(svg, wave(o.width, -20 + i * o.gap, 14, 0.012, i * 0.42), 'g-a');
    for (let i = 0; i < o.lines; i++) add(svg, wave(o.width, -12 + i * o.gap, 11, 0.017, Math.PI - i * 0.31), 'g-b');
  }

  // An eight-pointed star: sixteen points, alternating outer and inner radius
  function starPath(R, r, turn) {
    let d = '';
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI / 8) * i + (turn || 0) - Math.PI / 2;
      const rad = i % 2 ? r : R;
      d += (d ? 'L' : 'M') + (rad * Math.cos(a)).toFixed(2) + ' ' + (rad * Math.sin(a)).toFixed(2);
    }
    return d + 'Z';
  }
  function circlePath(r) {
    return `M${r} 0A${r} ${r} 0 1 1 ${-r} 0A${r} ${r} 0 1 1 ${r} 0Z`;
  }
  function star(svg) {
    if (!svg || svg.childElementCount) return;
    svg.setAttribute('viewBox', '-100 -100 200 200');
    add(svg, starPath(98, 74), 's-a');
    add(svg, starPath(90, 68), 's-b');
    add(svg, starPath(64, 49, Math.PI / 8), 's-a');
    add(svg, circlePath(44), 's-b');
    // a ring of petals between the inner circle and the middle star
    let petals = '';
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI / 8) * i;
      const x1 = 44 * Math.cos(a), y1 = 44 * Math.sin(a);
      const x2 = 58 * Math.cos(a), y2 = 58 * Math.sin(a);
      const cx = 52 * Math.cos(a + 0.2), cy = 52 * Math.sin(a + 0.2);
      petals += `M${x1.toFixed(2)} ${y1.toFixed(2)}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
    }
    add(svg, petals, 's-b');
    add(svg, starPath(30, 23), 's-a');
    add(svg, circlePath(14), 's-b');
  }

  window.ChekinoPrint = { guilloche, star };
})();
