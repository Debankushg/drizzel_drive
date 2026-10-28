import { thumbnailService } from './src/services/thumbnail.service';
import { thumbnailPath, filePath } from './src/utils/storage';
const files = Array.from({ length: 30 }, (_, i) => [
  { id: i, userId: 1, name: `img${i}.png`, storedName: `img${i}.png` },
  { id: 100 + i, userId: 1, name: `doc${i}.pdf`, storedName: `doc${i}.pdf` },
]).flat();
const t = Date.now();
const results = await Promise.allSettled(files.map((f) => thumbnailService.ensure(f as never)));
console.log('done in', Date.now() - t, 'ms; ok:', results.filter((r) => r.status === 'fulfilled').length, 'failed:', results.filter((r) => r.status === 'rejected').length);
