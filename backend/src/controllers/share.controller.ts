import { shareService } from '../services/share.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { parseId } from '../utils/parseId';

export const createShare = asyncHandler(async (req, res) => {
  const { itemType, itemId, email } = req.body;
  const share = await shareService.create(req.user!.sub, itemType, itemId, email);
  sendSuccess(res, 201, `Shared with ${share.email}`, { share });
});

export const listRecipients = asyncHandler(async (req, res) => {
  const type = req.query.type;
  if (type !== 'file' && type !== 'folder') throw ApiError.badRequest('type must be "file" or "folder"');
  const shares = await shareService.listRecipients(req.user!.sub, type, parseId(req.query.id, 'id'));
  sendSuccess(res, 200, 'Shares loaded', { shares });
});

export const revokeShare = asyncHandler(async (req, res) => {
  await shareService.revoke(req.user!.sub, parseId(req.params.id));
  sendSuccess(res, 200, 'Share removed');
});

export const sharedWithMe = asyncHandler(async (req, res) => {
  const raw = req.query.folderId;
  const folderId = raw === undefined || raw === '' ? null : parseId(raw, 'folderId');
  sendSuccess(res, 200, 'Shared items loaded', await shareService.browse(req.user!.sub, folderId));
});
