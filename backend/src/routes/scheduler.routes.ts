import { Router } from 'express';
import { SchedulerController } from '../controllers/scheduler.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route GET /api/admin/scheduler/status
 * @desc Get recommendation scheduler status
 * @access Private (admin only in production)
 */
router.get('/status', authenticateToken, SchedulerController.getStatus);

/**
 * @route POST /api/admin/scheduler/start
 * @desc Start the recommendation scheduler
 * @access Private (admin only in production)
 */
router.post('/start', authenticateToken, SchedulerController.startScheduler);

/**
 * @route POST /api/admin/scheduler/stop
 * @desc Stop the recommendation scheduler
 * @access Private (admin only in production)
 */
router.post('/stop', authenticateToken, SchedulerController.stopScheduler);

/**
 * @route POST /api/admin/scheduler/trigger/:mealType
 * @desc Manually trigger recommendations for a meal type
 * @access Private (admin only in production)
 */
router.post('/trigger/:mealType', authenticateToken, SchedulerController.triggerRecommendations);

/**
 * @route GET /api/admin/scheduler/users
 * @desc Get eligible users for debugging
 * @access Private (admin only in production)
 */
router.get('/users', authenticateToken, SchedulerController.getEligibleUsers);

export default router;