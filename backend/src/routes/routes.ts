import { Router } from 'express';

import { authenticateToken } from '../middleware/auth.middleware';
import authRoutes from '../routes/auth.routes';
import mediaRoutes from '../routes/media.routes';
import usersRoutes from '../routes/user.routes';
import friendsRoutes from '../routes/friends.routes';
import locationRoutes from '../routes/location.routes';

const router = Router();

router.use('/auth', authRoutes);

router.use('/user', authenticateToken, usersRoutes);
router.use('/users', authenticateToken, usersRoutes); // Additional route for search

router.use('/media', authenticateToken, mediaRoutes);

router.use('/friends', friendsRoutes); // Authentication middleware applied within friends routes

router.use('/me', locationRoutes); // Authentication middleware applied within location routes

export default router;