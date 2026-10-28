import { thumbnailService } from './src/services/thumbnail.service';
const files = Array.from({ length: 12 }, (_, i) => [
  { id: i, userId: 1, name: `img${i}.png`, storedName: `img${i}.png` },
  ...[0, 1, 2, 3, 4].map((k) => ({ id: 100 + i * 10 + k, userId: 1, name: `real${k}.pdf`, storedName: `real${k}.pdf` })),
]).flat();
const t = Date.now();
const results = await Promise.allSettled(files.map((f) => thumbnailService.ensure(f as never)));
console.log('done in', Date.now() - t, 'ms; ok:', results.filter((r) => r.status === 'fulfilled').length, 'failed:', results.filter((r) => r.status === 'rejected').length);
