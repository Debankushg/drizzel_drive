import { thumbnailService } from './src/services/thumbnail.service';
for (const k of [0, 1, 2, 3, 4]) {
  try { await thumbnailService.ensure({ id: k, userId: 1, name: `real${k}.pdf`, storedName: `real${k}.pdf` } as never); console.log(`real${k}.pdf OK`); }
  catch (e) { console.log(`real${k}.pdf FAILED:`, String((e as Error).message).slice(0, 150)); }
}
