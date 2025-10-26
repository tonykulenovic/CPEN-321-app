import { Router } from 'express';
import {
  getRecommendations,
  sendRecommendationNotification,
  recordInteraction,
  getUserPreferences,
  getInteractionHistory,
} from '../controllers/recommendations.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All recommendation routes require authentication
router.use(authenticateToken);

/**
 * @route GET /recommendations/:mealType
 * @desc Get meal recommendations for current user
 * @access Private
 */
router.get('/:mealType', getRecommendations);

/**
 * @route POST /recommendations/notify/:mealType
 * @desc Send recommendation notification to current user
 * @access Private
 */
router.post('/notify/:mealType', sendRecommendationNotification);

/**
 * @route POST /recommendations/interaction
 * @desc Record user interaction with a recommendation
 * @access Private
 */
router.post('/interaction', recordInteraction);

/**
 * @route GET /recommendations/preferences
 * @desc Get user's recommendation preferences
 * @access Private
 */
router.get('/preferences', getUserPreferences);

/**
 * @route GET /recommendations/history
 * @desc Get user's recent interactions
 * @access Private
 */
router.get('/history', getInteractionHistory);

export default router;