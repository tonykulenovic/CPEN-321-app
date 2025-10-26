import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendation.service';
import { userInteractionModel } from '../models/userInteraction.model';
import logger from '../utils/logger.util';
import mongoose from 'mongoose';

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
          score: rec.score,
          distance: Math.round(rec.distance),
          reason: rec.reason,
          factors: rec.factors,
        })),
        count: recommendations.length,
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

/**
 * POST /recommendations/interaction - Record user interaction with a recommendation
 * @param body.pinId - Pin ID that was interacted with
 * @param body.interactionType - 'view', 'like', 'visit', 'share', 'save'
 * @param body.interactionData - Optional additional data
 */
export async function recordInteraction(req: Request, res: Response): Promise<void> {
  try {
    const { pinId, interactionType, interactionData } = req.body;
    const currentUser = req.user!;

    if (!pinId || !interactionType) {
      res.status(400).json({
        message: 'pinId and interactionType are required',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(pinId)) {
      res.status(400).json({
        message: 'Invalid pin ID format',
      });
      return;
    }

    const validInteractionTypes = ['view', 'like', 'visit', 'share', 'save'];
    if (!validInteractionTypes.includes(interactionType)) {
      res.status(400).json({
        message: `Invalid interaction type. Must be one of: ${validInteractionTypes.join(', ')}`,
      });
      return;
    }

    logger.info(`📊 Recording ${interactionType} interaction for user ${currentUser._id} on pin ${pinId}`);

    const interaction = await userInteractionModel.recordInteraction(
      currentUser._id,
      new mongoose.Types.ObjectId(pinId),
      interactionType,
      interactionData
    );

    res.status(201).json({
      message: 'Interaction recorded successfully',
      data: {
        interactionId: interaction._id,
        interactionType,
        timestamp: interaction.timestamp,
      },
    });
  } catch (error) {
    logger.error('Error recording interaction:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * GET /recommendations/preferences - Get user's recommendation preferences
 */
export async function getUserPreferences(req: Request, res: Response): Promise<void> {
  try {
    const currentUser = req.user!;

    logger.info(`📊 Getting recommendation preferences for user ${currentUser._id}`);

    const preferences = await userInteractionModel.getUserPreferences(currentUser._id);

    res.status(200).json({
      message: 'User preferences retrieved successfully',
      data: {
        likedPinsCount: preferences.likedPins.length,
        visitedPinsCount: preferences.visitedPins.length,
        preferredMealTimes: preferences.preferredMealTimes,
        preferredWeatherConditions: preferences.preferredWeatherConditions,
      },
    });
  } catch (error) {
    logger.error('Error getting user preferences:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * GET /recommendations/history - Get user's recent interactions
 */
export async function getInteractionHistory(req: Request, res: Response): Promise<void> {
  try {
    const { limit = '20' } = req.query;
    const currentUser = req.user!;

    logger.info(`📊 Getting interaction history for user ${currentUser._id}`);

    const interactions = await userInteractionModel.getRecentInteractions(
      currentUser._id,
      parseInt(limit as string)
    );

    res.status(200).json({
      message: 'Interaction history retrieved successfully',
      data: {
        interactions: interactions.map(interaction => ({
          _id: interaction._id,
          pinId: interaction.pinId,
          interactionType: interaction.interactionType,
          interactionData: interaction.interactionData,
          timestamp: interaction.timestamp,
        })),
        count: interactions.length,
      },
    });
  } catch (error) {
    logger.error('Error getting interaction history:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}