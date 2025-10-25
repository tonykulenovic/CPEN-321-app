import { Router } from 'express';

import { authenticateToken } from '../middleware/auth.middleware';
import authRoutes from '../routes/auth.routes';
import badgeRoutes from '../routes/badge.routes';
import mediaRoutes from '../routes/media.routes';
import usersRoutes from '../routes/user.routes';
import friendsRoutes from '../routes/friends.routes';
import locationRoutes from '../routes/location.routes';
import pinsRoutes from '../routes/pins.routes';


const router = Router();

// Health check endpoint - no auth required
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

router.use('/auth', authRoutes);

router.use('/user', authenticateToken, usersRoutes);
router.use('/users', authenticateToken, usersRoutes); // Additional route for search

router.use('/media', authenticateToken, mediaRoutes);

router.use('/friends', friendsRoutes); // Authentication middleware applied within friends routes

router.use('/me', locationRoutes); // Authentication middleware applied within location routes

router.use('/badges', authenticateToken, badgeRoutes);

router.use('/pins', pinsRoutes);

export default router;