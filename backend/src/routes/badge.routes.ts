import { Router } from 'express';

import { BadgeController } from '../controllers/badge.controller';

const router = Router();
const badgeController = new BadgeController();

// Badge routes - badges are predefined in code and auto-initialized on server startup
// GET /api/badges - Get all badges with optional filtering (category, isActive)
router.get('/', badgeController.getAllBadges);

// User routes for badge interaction
// GET /api/badges/user/earned - Get user's earned badges
router.get('/user/earned', badgeController.getUserBadges);

// GET /api/badges/user/available - Get badges user hasn't earned yet
router.get('/user/available', badgeController.getAvailableBadges);

// GET /api/badges/user/progress - Get user's badge progress
router.get('/user/progress', badgeController.getBadgeProgress);

// GET /api/badges/user/stats - Get user's badge statistics
router.get('/user/stats', badgeController.getBadgeStats);

// POST /api/badges/user/event - Process badge earning event
router.post('/user/event', badgeController.processBadgeEvent);

export default router;
