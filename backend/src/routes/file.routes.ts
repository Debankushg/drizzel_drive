import { Router } from 'express';
import { getFileUrl, moveFile, renameFile, streamFile, streamThumbnail, trashFile, uploadFile } from '../controllers/file.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkQuota } from '../middleware/quota.middleware';
import { uploadSingle } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import { moveFileSchema, renameSchema } from '../validators/drive.validator';

const router = Router();

// Authorised by the signed ?token= in the URL, so <img>/<video>/download links work
router.get('/:id/content', streamFile);
router.get('/:id/thumbnail', streamThumbnail);

router.post('/', authenticate, checkQuota, uploadSingle, uploadFile);
router.get('/:id/url', authenticate, getFileUrl);
router.patch('/:id', authenticate, validate(renameSchema), renameFile);
router.patch('/:id/move', authenticate, validate(moveFileSchema), moveFile);
router.delete('/:id', authenticate, trashFile);

export default router;
