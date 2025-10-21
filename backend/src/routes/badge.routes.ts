import { Router } from 'express';

import { BadgeController } from '../controllers/badge.controller';
import {
  CreateBadgeRequest,
  UpdateBadgeRequest,
  AssignBadgeRequest,
  createBadgeSchema,
  updateBadgeSchema,
  assignBadgeSchema,
} from '../types/badge.types';
import { validateBody } from '../middleware/validation.middleware';

const router = Router();
const badgeController = new BadgeController();

// Admin routes for badge management (these would typically require admin authentication)
// GET /api/badges - Get all badges with optional filtering
router.get('/', badgeController.getAllBadges);

// GET /api/badges/initialize - Initialize default badges (admin only)
router.post('/initialize', badgeController.initializeDefaultBadges);

// GET /api/badges/category/:category - Get badges by category
router.get('/category/:category', badgeController.getBadgesByCategory);

// GET /api/badges/:id - Get specific badge by ID
router.get('/:id', badgeController.getBadgeById);

// POST /api/badges - Create new badge (admin only)
router.post(
  '/',
  validateBody<CreateBadgeRequest>(createBadgeSchema),
  badgeController.createBadge
);

// PUT /api/badges/:id - Update badge (admin only)
router.put(
  '/:id',
  validateBody<UpdateBadgeRequest>(updateBadgeSchema),
  badgeController.updateBadge
);

// DELETE /api/badges/:id - Delete badge (admin only)
router.delete('/:id', badgeController.deleteBadge);

// User routes for badge interaction
// GET /api/badges/user/earned - Get user's earned badges
router.get('/user/earned', badgeController.getUserBadges);

// GET /api/badges/user/available - Get badges user hasn't earned yet
router.get('/user/available', badgeController.getAvailableBadges);

// GET /api/badges/user/progress - Get user's badge progress
router.get('/user/progress', badgeController.getBadgeProgress);

// GET /api/badges/user/stats - Get user's badge statistics
router.get('/user/stats', badgeController.getBadgeStats);

// POST /api/badges/user/assign - Manually assign badge to user (admin only)
router.post(
  '/user/assign',
  validateBody<AssignBadgeRequest>(assignBadgeSchema),
  badgeController.assignBadge
);

// POST /api/badges/user/event - Process badge earning event
router.post('/user/event', badgeController.processBadgeEvent);

// PUT /api/badges/user/:badgeId/progress - Update badge progress
router.put('/user/:badgeId/progress', badgeController.updateBadgeProgress);

// DELETE /api/badges/user/:badgeId - Remove badge from user (admin only)
router.delete('/user/:badgeId', badgeController.removeUserBadge);

export default router;
