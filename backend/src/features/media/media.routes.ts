import { Router } from 'express';

import { upload } from './storage';
import { authenticateToken } from '../../core/middleware/auth.middleware';
import { MediaController } from './media.controller';

const router = Router();
const mediaController = new MediaController();

router.post(
  '/upload',
  authenticateToken,
  upload.single('media'),
  mediaController.uploadImage
);

export default router;
