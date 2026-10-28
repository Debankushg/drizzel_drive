import { Router } from 'express';
import authRoutes from './auth.routes';
import driveRoutes from './drive.routes';
import fileRoutes from './file.routes';
import folderRoutes from './folder.routes';
import shareRoutes from './share.routes';
import trashRoutes from './trash.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'OK' });
});
router.use('/auth', authRoutes);
router.use('/drive', driveRoutes);
router.use('/folders', folderRoutes);
router.use('/files', fileRoutes);
router.use('/trash', trashRoutes);
router.use('/shares', shareRoutes);

export default router;
