import { folderService } from '../services/folder.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { parseId } from '../utils/parseId';

export const createFolder = asyncHandler(async (req, res) => {
  const folder = await folderService.create(req.user!.sub, req.body);
  sendSuccess(res, 201, 'Folder created', { folder });
});

export const ensureFolderPath = asyncHandler(async (req, res) => {
  const folder = await folderService.ensurePath(req.user!.sub, req.body);
  sendSuccess(res, 200, 'Folder ready', { folder });
});

export const renameFolder = asyncHandler(async (req, res) => {
  const folder = await folderService.rename(req.user!.sub, parseId(req.params.id), req.body.name);
  sendSuccess(res, 200, 'Folder renamed', { folder });
});

export const moveFolder = asyncHandler(async (req, res) => {
  const folder = await folderService.move(req.user!.sub, parseId(req.params.id), req.body.parentId);
  sendSuccess(res, 200, 'Folder moved', { folder });
});

/** DELETE /folders/:id moves the folder to the trash. */
export const trashFolder = asyncHandler(async (req, res) => {
  await folderService.trash(req.user!.sub, parseId(req.params.id));
  sendSuccess(res, 200, 'Folder moved to trash');
});
