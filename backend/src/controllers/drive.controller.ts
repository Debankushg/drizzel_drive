import { driveService } from '../services/drive.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { parseId } from '../utils/parseId';

export const getContents = asyncHandler(async (req, res) => {
  const raw = req.query.folderId;
  const folderId = raw === undefined || raw === '' ? null : parseId(raw, 'folderId');
  sendSuccess(res, 200, 'Drive loaded', await driveService.getContents(req.user!.sub, folderId));
});

export const search = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : '';
  sendSuccess(res, 200, 'Search results', await driveService.search(req.user!.sub, q));
});

export const getStorage = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, 'Storage usage', await driveService.getStorage(req.user!.sub));
});
