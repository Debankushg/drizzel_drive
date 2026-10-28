import { Router } from 'express';
import {
  deleteFileForever,
  deleteFolderForever,
  emptyTrash,
  listTrash,
  restoreFile,
  restoreFolder,
} from '../controllers/trash.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', listTrash);
router.delete('/', emptyTrash);
router.post('/folders/:id/restore', restoreFolder);
router.post('/files/:id/restore', restoreFile);
router.delete('/folders/:id', deleteFolderForever);
router.delete('/files/:id', deleteFileForever);

export default router;
