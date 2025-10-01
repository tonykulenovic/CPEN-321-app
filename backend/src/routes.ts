import { Router } from 'express';

import { authenticateToken } from './core/middleware/auth.middleware';
import authRoutes from './features/auth/auth.routes';
import mediaRoutes from './features/media/media.routes';
import usersRoutes from './features/user/user.routes';

const router = Router();

router.use('/auth', authRoutes);

router.use('/user', authenticateToken, usersRoutes);

router.use('/media', authenticateToken, mediaRoutes);

export default router;