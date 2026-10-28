import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { FileRow } from '../types/drive.types';
import { isImage, isPdf } from '../utils/fileTypes';
import { filePath, thumbnailPath } from '../utils/storage';

const WIDTH = 480;
const HEIGHT = 360;

/** Like `drizzle/`, found relative to the working directory (start the server from backend/). */
const PDF_RENDER_SCRIPT = path.resolve(process.cwd(), 'scripts/pdf-render.mjs');
const PDF_RENDER_TIMEOUT_MS = 30_000;
const MAX_PARALLEL_PDF_RENDERS = 2;

/** Several cards can ask for the same thumbnail at once; generate it only once. */
const inFlight = new Map<string, Promise<void>>();

// Limits how many PDF renderer processes run at the same time (each one uses real CPU and memory)
let runningRenders = 0;
const waitingRenders: (() => void)[] = [];

const acquireRenderSlot = async () => {
  if (runningRenders < MAX_PARALLEL_PDF_RENDERS) {
    runningRenders++;
    return;
  }
  await new Promise<void>((resolve) => waitingRenders.push(resolve)); // slot is handed over by releaseRenderSlot
};

const releaseRenderSlot = () => {
  const next = waitingRenders.shift();
  if (next) next();
  else runningRenders--;
};

/**
 * Renders page 1 of a PDF to a PNG in a separate process. PDF rendering uses native code that can
 * crash hard; keeping it out of the API server means a bad PDF only costs one thumbnail.
 */
async function renderPdfFirstPage(source: string, outputPng: string): Promise<void> {
  await acquireRenderSlot();
  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        process.execPath,
        [PDF_RENDER_SCRIPT, source, outputPng, String(WIDTH * 1.5)],
        { timeout: PDF_RENDER_TIMEOUT_MS, windowsHide: true, maxBuffer: 1024 * 1024 },
        (err, _stdout, stderr) => {
          if (!err) return resolve();
          const detail = stderr.trim().split('\n').slice(-2).join(' ') || err.message;
          reject(new Error(`PDF renderer failed: ${detail.slice(0, 200)}`));
        },
      );
    });
  } finally {
    releaseRenderSlot();
  }
}

async function generate(file: FileRow, source: string, target: string) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const unique = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const tmpPng = `${target}.${unique}.png`;
  const tmpOut = `${target}.${unique}.tmp`; // written first so a half-written file is never served

  try {
    let input = source;
    if (isPdf(file.name)) {
      await renderPdfFirstPage(source, tmpPng);
      input = tmpPng;
    }
    await sharp(input, { limitInputPixels: 100_000_000 })
      .rotate()
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: isPdf(file.name) ? 'top' : 'centre' })
      .flatten({ background: '#ffffff' })
      .webp({ quality: 75 })
      .toFile(tmpOut);
    await fs.rename(tmpOut, target);
  } finally {
    await Promise.all([fs.unlink(tmpPng), fs.unlink(tmpOut)].map((p) => p.catch(() => undefined)));
  }
}

export const thumbnailService = {
  /** Path of the cached thumbnail, creating it first if needed. Throws if the file can't be rendered. */
  async ensure(file: FileRow): Promise<string> {
    if (!isImage(file.name) && !isPdf(file.name)) throw new Error('No thumbnail for this file type');

    const target = thumbnailPath(file.userId, file.storedName);
    const exists = await fs.access(target).then(
      () => true,
      () => false,
    );
    if (exists) return target;

    let job = inFlight.get(target);
    if (!job) {
      job = generate(file, filePath(file.userId, file.storedName), target).finally(() => inFlight.delete(target));
      inFlight.set(target, job);
    }
    await job;
    return target;
  },
};
