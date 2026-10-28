import { trashService } from '../services/trash.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { parseId } from '../utils/parseId';

export const listTrash = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, 'Trash loaded', await trashService.list(req.user!.sub));
});

export const restoreFolder = asyncHandler(async (req, res) => {
  const folder = await trashService.restoreFolder(req.user!.sub, parseId(req.params.id));
  sendSuccess(res, 200, 'Folder restored', { folder });
});

export const restoreFile = asyncHandler(async (req, res) => {
  const file = await trashService.restoreFile(req.user!.sub, parseId(req.params.id));
  sendSuccess(res, 200, 'File restored', { file });
});

export const deleteFolderForever = asyncHandler(async (req, res) => {
  await trashService.deleteFolderForever(req.user!.sub, parseId(req.params.id));
  sendSuccess(res, 200, 'Folder permanently deleted');
});

export const deleteFileForever = asyncHandler(async (req, res) => {
  await trashService.deleteFileForever(req.user!.sub, parseId(req.params.id));
  sendSuccess(res, 200, 'File permanently deleted');
});

export const emptyTrash = asyncHandler(async (req, res) => {
  await trashService.empty(req.user!.sub);
  sendSuccess(res, 200, 'Trash emptied');
});
