import { Router } from 'express';

import { BadgeController } from '../controllers/badge.controller';

const router = Router();
const badgeController = new BadgeController();

// Badge routes - badges are predefined in code and auto-initialized on server startup
// GET /api/badges - Get all badges with optional filtering (category, isActive)
router.get('/', (req, res, next) => badgeController.getAllBadges(req, res, next));

// User routes for badge interaction
// GET /api/badges/user/earned - Get user's earned badges
router.get('/user/earned', (req, res, next) => badgeController.getUserBadges(req, res, next));

// GET /api/badges/user/available - Get badges user hasn't earned yet
router.get('/user/available', (req, res, next) => badgeController.getAvailableBadges(req, res, next));

// GET /api/badges/user/progress - Get user's badge progress
router.get('/user/progress', (req, res, next) => badgeController.getBadgeProgress(req, res, next));

// GET /api/badges/user/stats - Get user's badge statistics
router.get('/user/stats', (req, res, next) => badgeController.getBadgeStats(req, res, next));

// POST /api/badges/user/event - Process badge earning event
router.post('/user/event', (req, res, next) => void badgeController.processBadgeEvent(req, res, next));

export default router;
