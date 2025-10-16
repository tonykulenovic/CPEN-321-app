import { Router } from 'express';

import { authenticateToken } from '../middleware/auth.middleware';
import authRoutes from '../routes/auth.routes';
import badgeRoutes from '../routes/badge.routes';
import mediaRoutes from '../routes/media.routes';
import usersRoutes from '../routes/user.routes';

const router = Router();

router.use('/auth', authRoutes);

router.use('/user', authenticateToken, usersRoutes);

router.use('/media', authenticateToken, mediaRoutes);

router.use('/badges', authenticateToken, badgeRoutes);

export default router;