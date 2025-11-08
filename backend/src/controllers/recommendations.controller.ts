import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendation.service';
import logger from '../utils/logger.util';

/**
 * GET /recommendations/:mealType - Get meal recommendations for current user
 * @param params.mealType - 'breakfast', 'lunch', or 'dinner'
 * @param query.maxDistance - Maximum distance in meters (default: 2000)
 * @param query.limit - Maximum number of recommendations (default: 5)
 */
export async function getRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const { mealType } = req.params;
    const { maxDistance = '2000', limit = '5' } = req.query;
    const currentUser = req.user!;

    // Validate meal type
    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      res.status(400).json({
        message: 'Invalid meal type. Must be breakfast, lunch, or dinner',
      });
      return;
    }

    logger.info(`🍽️ Getting ${mealType} recommendations for user ${currentUser._id}`);

    const recommendations = await recommendationService.generateRecommendations(
      currentUser._id,
      mealType as 'breakfast' | 'lunch' | 'dinner',
      parseInt(maxDistance as string),
      parseInt(limit as string)
    );

    res.status(200).json({
      message: `${mealType} recommendations retrieved successfully`,
      data: {
        mealType,
        recommendations: recommendations.map(rec => ({
          pin: rec.pin,
          place: rec.place, // Include Places API results
          score: rec.score,
          distance: Math.round(rec.distance),
          reason: rec.reason,
          factors: rec.factors,
          source: rec.source, // 'database' or 'places_api'
        })),
        count: recommendations.length,
        // Include weather context for user reference
        weather: recommendations.length > 0 ? {
          // Weather info is included in the recommendation generation process
          hasWeatherContext: true,
          note: "Weather conditions considered in recommendations"
        } : null,
      },
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * POST /recommendations/notify/:mealType - Send recommendation notification
 * @param params.mealType - 'breakfast', 'lunch', or 'dinner'
 */
export async function sendRecommendationNotification(req: Request, res: Response): Promise<void> {
  try {
    const { mealType } = req.params;
    const currentUser = req.user!;

    // Validate meal type
    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      res.status(400).json({
        message: 'Invalid meal type. Must be breakfast, lunch, or dinner',
      });
      return;
    }

    logger.info(`📲 Sending ${mealType} recommendation notification to user ${currentUser._id}`);

    const sent = await recommendationService.sendRecommendationNotification(
      currentUser._id,
      mealType as 'breakfast' | 'lunch' | 'dinner'
    );

    if (sent) {
      res.status(200).json({
        message: `${mealType} recommendation notification sent successfully`,
        data: { sent: true },
      });
    } else {
      res.status(204).json({
        message: `No recommendations available for ${mealType}`,
        data: { sent: false },
      });
    }
  } catch (error) {
    logger.error('Error sending recommendation notification:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

