import { Router } from 'express';
import { createShare, listRecipients, revokeShare, sharedWithMe } from '../controllers/share.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { shareSchema } from '../validators/drive.validator';

const router = Router();

router.use(authenticate);
router.get('/with-me', sharedWithMe);
router.get('/item', listRecipients);
router.post('/', validate(shareSchema), createShare);
router.delete('/:id', revokeShare);

export default router;
