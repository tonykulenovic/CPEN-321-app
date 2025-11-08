import { Router } from 'express';
import {
  getRecommendations,
  sendRecommendationNotification,
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

export default router;