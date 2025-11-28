import { Router } from 'express';

import { upload } from '../utils/storage';
import { authenticateToken } from '../middleware/auth.middleware';
import { MediaController } from '../controllers/media.controller';

const router = Router();
const mediaController = new MediaController();

router.post(
  '/upload',
  authenticateToken,
  upload.single('media'),
  (req, res, next) => {
    mediaController.uploadImage(req, res, next).catch(() => {});
  }
);

export default router;
