import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendation.service';
import { weatherService } from '../services/weather.service';
import { locationModel } from '../models/location.model';
import { pinVoteModel } from '../models/pinVote.model';
import { userModel } from '../models/user.model';
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

/**
 * POST /recommendations/visit - Mark a pin as visited (simplified interaction tracking)
 * @param body.pinId - Pin ID that was visited
 */
export async function markPinVisited(req: Request, res: Response): Promise<void> {
  try {
    const { pinId } = req.body;
    const currentUser = req.user!;

    if (!pinId) {
      res.status(400).json({
        message: 'pinId is required',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(pinId)) {
      res.status(400).json({
        message: 'Invalid pin ID format',
      });
      return;
    }

    logger.info(`📍 Marking pin ${pinId} as visited by user ${currentUser._id}`);

    // Add pin to user's visited pins if not already there using Mongoose model directly
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(
      currentUser._id,
      { 
        $addToSet: { visitedPins: new mongoose.Types.ObjectId(pinId) },
        $inc: { 'gameData.locationsExplored': 1 }
      }
    );

    res.status(200).json({
      message: 'Pin marked as visited successfully',
      data: {
        pinId,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error marking pin as visited:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * GET /recommendations/preferences - Get user's recommendation preferences (simplified)
 */
export async function getUserPreferences(req: Request, res: Response): Promise<void> {
  try {
    const currentUser = req.user!;

    logger.info(`📊 Getting recommendation preferences for user ${currentUser._id}`);

    // Get user's upvoted pins
    const PinVote = mongoose.model('PinVote');
    const upvotedPins = await PinVote.find({ userId: currentUser._id, voteType: 'upvote' }).select('pinId');
    const likedPins = upvotedPins.map((vote: any) => vote.pinId);

    // Get user's visited pins using Mongoose model directly
    const User = mongoose.model('User');
    const user = await User.findById(currentUser._id).select('visitedPins').lean() as any;
    const visitedPins = user?.visitedPins || [];

    res.status(200).json({
      message: 'User preferences retrieved successfully',
      data: {
        likedPinsCount: likedPins.length,
        visitedPinsCount: visitedPins.length,
        likedPins: likedPins,
        visitedPins: visitedPins,
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
 * GET /recommendations/activity - Get user's recommendation-related activity (votes and visits)
 */
export async function getUserActivity(req: Request, res: Response): Promise<void> {
  try {
    const { limit = '20' } = req.query;
    const currentUser = req.user!;

    logger.info(`📊 Getting recommendation activity for user ${currentUser._id}`);

    // Get recent votes
    const PinVote = mongoose.model('PinVote');
    const recentVotes = await PinVote
      .find({ userId: currentUser._id })
      .populate('pinId', 'name category location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string) / 2)
      .lean();

    // Get user's visited pins (recent ones) using Mongoose model directly
    const User = mongoose.model('User');
    const user = await User.findById(currentUser._id)
      .populate({
        path: 'visitedPins',
        select: 'name category location',
        options: { limit: parseInt(limit as string) / 2 }
      })
      .lean() as any;

    const visitedPins = user?.visitedPins || [];

    res.status(200).json({
      message: 'User activity retrieved successfully',
      data: {
        recentVotes: recentVotes.map((vote: any) => ({
          _id: vote._id,
          pin: vote.pinId,
          voteType: vote.voteType,
          timestamp: vote.createdAt,
          activityType: 'vote'
        })),
        visitedPins: visitedPins.map((pin: any) => ({
          _id: pin._id,
          pin: pin,
          activityType: 'visit'
        })),
        totalVotes: recentVotes.length,
        totalVisits: visitedPins.length,
      },
    });
  } catch (error) {
    logger.error('Error getting user activity:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * GET /recommendations/weather - Get current weather context for recommendations
 */
export async function getCurrentWeather(req: Request, res: Response): Promise<void> {
  try {
    const currentUser = req.user!;

    // Get user's current/recent location
    const location = await locationModel.findByUserId(currentUser._id);
    if (!location) {
      res.status(404).json({
        message: 'User location not found. Location sharing required for weather context.',
      });
      return;
    }

    logger.info(`🌤️ Getting weather for user ${currentUser._id} at (${location.lat}, ${location.lng})`);

    const weather = await weatherService.getCurrentWeather(location.lat, location.lng);
    
    if (!weather) {
      res.status(503).json({
        message: 'Weather service temporarily unavailable',
      });
      return;
    }

    const weatherRecommendations = weatherService.getWeatherRecommendations(weather);

    res.status(200).json({
      message: 'Weather context retrieved successfully',
      data: {
        location: {
          lat: location.lat,
          lng: location.lng,
        },
        weather: {
          condition: weather.condition,
          temperature: weather.temperature,
          humidity: weather.humidity,
          description: weather.description,
          isGoodForOutdoor: weather.isGoodForOutdoor,
        },
        recommendations: {
          preferOutdoor: weatherRecommendations.preferOutdoor,
          suggestions: weatherRecommendations.suggestions,
        },
      },
    });
  } catch (error) {
    logger.error('Error getting weather context:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}