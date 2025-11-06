import { Router } from 'express';
import {
  getRecommendations,
  sendRecommendationNotification,
  markPinVisited,
  getUserPreferences,
  getUserActivity,
  getCurrentWeather,
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
 * @route POST /recommendations/visit
 * @desc Mark a pin as visited (simplified interaction tracking)
 * @access Private
 */
router.post('/visit', markPinVisited);

/**
 * @route GET /recommendations/preferences
 * @desc Get user's recommendation preferences (from votes and visits)
 * @access Private
 */
router.get('/preferences', getUserPreferences);

/**
 * @route GET /recommendations/activity
 * @desc Get user's recommendation-related activity (votes and visits)
 * @access Private
 */
router.get('/activity', getUserActivity);

/**
 * @route GET /recommendations/weather
 * @desc Get current weather context for recommendations
 * @access Private
 */
router.get('/weather', getCurrentWeather);

export default router;