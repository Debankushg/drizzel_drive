// Renders the first page of a PDF to a PNG file.
//
//   node scripts/pdf-render.mjs <input.pdf> <output.png> [width]
//
// This runs as its OWN PROCESS (started by src/services/thumbnail.service.ts). pdf.js and
// @napi-rs/canvas are native code, and a crash in them ("double free or corruption", a segfault)
// would take down the whole API server if they lived in it. Here, a crash only fails one thumbnail.
import { readFile, writeFile } from 'node:fs/promises';
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';

// pdf.js expects these browser classes to exist
Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

const [input, output, widthArg] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: pdf-render.mjs <input.pdf> <output.png> [width]');
  process.exit(2);
}
const width = Number(widthArg) || 720;

const doc = await pdfjs.getDocument({
  data: new Uint8Array(await readFile(input)),
  useSystemFonts: true,
  isEvalSupported: false,
  // Errors only: pdf.js prints harmless warnings (e.g. "TT: undefined function") for some fonts
  verbosity: pdfjs.VerbosityLevel.ERRORS,
}).promise;

const page = await doc.getPage(1);
const base = page.getViewport({ scale: 1 });
const viewport = page.getViewport({ scale: width / base.width });
const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
await page.render({ canvasContext: canvas.getContext('2d'), viewport, canvas }).promise;
await writeFile(output, canvas.toBuffer('image/png'));
await doc.destroy();

// Exit explicitly so no native handle keeps the process alive
process.exit(0);
