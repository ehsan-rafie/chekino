// Reading a list of serials (or sayad ids) the way a party sends them — one
// per line, or run together with any separators (spec 6.4). One file for the
// browser (js/serials.js, a classic script: window.ChekinoSerials) and the
// server (backend/lib/serials.js, the same bytes: require) —
// backend/test/serials.test.js fails if the two copies ever differ.
//
//   ChekinoSerials.parse('9017/412587\n٤١٢٥٨٧\n41258') →
//     [{ input: '9017/412587', kind: 'serial', value: '412587' },
//      { input: '41258', kind: 'invalid' }]       (the second line is the same serial)
//
// A token is:
//   serial    exactly one 6-digit group («9017/412587», «0151/055012» — a
//             serial is a string, its leading zero stays)
//   sayad     a 16-digit group, or four groups of four alone on a line
//   uncertain one run of 7 to 15 digits: a serial and its series run together
//             («9017412587»); the last six are offered, for the user to confirm
//   invalid   anything else («41258», «9017» on its own)
// Digits may be Persian, Arabic or Latin. A line with a tab is a spreadsheet
// row: only its first column is read, the rest is kept as the token's label.
// Repeats are dropped, first one kept; an exact token beats an uncertain one.
(function (root) {
  const toLatin = (s) => String(s == null ? '' : s)
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  // marks that keep right-to-left text in order, invisible inside a number:
  // ZWNJ, ZWJ, LRM, RLM, the embeddings and the isolates
  const INVISIBLE = /[‌‍‎‏‪-‮⁦-⁩]/g;

  function parse(text) {
    const out = [];
    const seen = new Map();   // kind:value → its index in out
    const push = (t) => {
      const key = t.kind + ':' + (t.value || t.input);
      if (seen.has(key)) {
        const i = seen.get(key);
        if (out[i].uncertain && !t.uncertain) out[i] = t;
        return;
      }
      seen.set(key, out.length);
      out.push(t);
    };
    for (const rawLine of toLatin(text).split(/\r?\n/)) {
      const tab = rawLine.indexOf('\t');
      const label = tab >= 0 ? (rawLine.slice(tab + 1).trim() || undefined) : undefined;
      const body = (tab >= 0 ? rawLine.slice(0, tab) : rawLine)
        .replace(INVISIBLE, '')
        .replace(/ /g, ' ')
        .trim();
      if (!body) continue;
      // «1234 5678 9012 3456»: a sayad id written in fours, alone on its line
      if (/^\d{4}(?:[\s-]?\d{4}){3}$/.test(body)) {
        push(withLabel({ input: body, kind: 'sayad', value: body.replace(/\D/g, '') }, label));
        continue;
      }
      for (const tok of body.split(/[\s,،٬;؛|]+/).filter(Boolean)) {
        const groups = tok.split(/\D+/).filter(Boolean);
        const sayad = groups.find((g) => g.length === 16);
        const sixes = groups.filter((g) => g.length === 6);
        if (sayad) push(withLabel({ input: tok, kind: 'sayad', value: sayad }, label));
        else if (sixes.length === 1) push(withLabel({ input: tok, kind: 'serial', value: sixes[0] }, label));
        else if (groups.length === 1 && groups[0].length > 6 && groups[0].length < 16) {
          push(withLabel({ input: tok, kind: 'serial', value: groups[0].slice(-6), uncertain: true }, label));
        } else push({ input: tok, kind: 'invalid' });
      }
    }
    return out;
  }
  function withLabel(t, label) {
    if (label !== undefined) t.label = label;
    return t;
  }

  const api = { parse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChekinoSerials = api;
})(typeof window !== 'undefined' ? window : globalThis);
