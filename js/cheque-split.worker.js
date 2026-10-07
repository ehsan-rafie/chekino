// The cheque finder off the page's thread (js/cheque-split.js): given a
// photo, it answers with the boxes in the photo's own pixels. The page
// falls back to running it itself where workers can't draw (no
// OffscreenCanvas). Loaded from the site, so the CSP's 'self' covers it.
//
//   postMessage({ id, blob })  →  { id, width, height, boxes, rejected }  or  { id, error }
importScripts('/js/cheque-split.js' + self.location.search);   // the same ?v= as this file

self.onmessage = async (e) => {
  const { id, blob } = e.data;
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0, w, h);
    const { boxes, rejected } = self.ChekinoSplit.findCheques(ctx.getImageData(0, 0, w, h));
    self.postMessage({
      id, width: bmp.width, height: bmp.height, rejected,
      boxes: boxes.map((b) => ({ x: b.x / scale, y: b.y / scale, w: b.w / scale, h: b.h / scale })),
    });
    bmp.close();
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
