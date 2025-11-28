import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as cron from 'node-cron';
import { locationModel } from '../models/location.model';
import { pinModel } from '../models/pin.model';
import { userModel } from '../models/user.model';
import { notificationService } from '../services/notification.service';
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
    const currentUser = req.user;
    
    if (!currentUser) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Validate meal type
    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      res.status(400).json({
        message: 'Invalid meal type. Must be breakfast, lunch, or dinner',
      });
      return;
    }

    logger.info(`🍽️ Getting ${mealType} recommendations for user ${currentUser._id.toString()}`);

    // Get user location
    const userLocation = await locationModel.findByUserId(currentUser._id);
    if (!userLocation) {
      res.status(200).json({
        message: 'No location found for recommendations',
        data: { mealType, recommendations: [], count: 0 }
      });
      return;
    }

    // Get meal-relevant keywords
    const mealKeywords = getMealKeywords(mealType);
    
    // Find nearby pins that match meal type
    const nearbyPins = await pinModel.findNearbyForMeal(
      userLocation.lat, 
      userLocation.lng, 
      parseInt(maxDistance as string),
      mealKeywords,
      parseInt(limit as string) * 2 // Get more candidates for better scoring
    );

    // Simple scoring: distance + rating
    const recommendations = nearbyPins.map(pin => {
      const distance = calculateDistance(
        userLocation.lat, 
        userLocation.lng, 
        pin.location.latitude, 
        pin.location.longitude
      );
      
      const upvotes = pin.rating ? pin.rating.upvotes || 0 : 0;
      const downvotes = pin.rating ? pin.rating.downvotes || 0 : 0;
      const totalVotes = upvotes + downvotes;
      const rating = totalVotes > 0 ? upvotes / totalVotes : 0.5;
      
      // Score: max 100 points from distance (closer = better) + max 20 points from rating
      const distanceScore = Math.max(0, 100 - (distance / 20));
      const ratingScore = rating * 20;
      const score = distanceScore + ratingScore;
      
      return {
        pin,
        score: Math.round(score),
        distance: Math.round(distance),
        reason: `${Math.round(distance)}m away${totalVotes > 0 ? `, ${Math.round(rating * 100)}% rating` : ''}`,
        source: 'database' as const
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, parseInt(limit as string));

    res.status(200).json({
      message: `${mealType} recommendations retrieved successfully`,
      data: {
        mealType,
        recommendations,
        count: recommendations.length
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
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Validate meal type
    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      res.status(400).json({
        message: 'Invalid meal type. Must be breakfast, lunch, or dinner',
      });
      return;
    }

    const sent = await sendMealRecommendationNotification(
      currentUser._id,
      mealType as 'breakfast' | 'lunch' | 'dinner'
    );

    if (sent) {
      res.status(200).json({
        message: `${mealType} recommendation notification sent successfully`,
        data: { mealType, notificationSent: true }
      });
    } else {
      // 204 No Content should not have a response body
      res.status(204).send();
    }
  } catch (error) {
    logger.error('Error sending recommendation notification:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * Get meal-relevant keywords for filtering
 */
function getMealKeywords(mealType: string): string[] {
  const keywords: Record<string, string[]> = {
    breakfast: ['breakfast', 'cafe', 'coffee', 'bakery', 'brunch'],
    lunch: ['lunch', 'sandwich', 'bistro', 'deli', 'pizza', 'burger'],
    dinner: ['dinner', 'restaurant', 'bar', 'grill', 'steak']
  };
  // Validate mealType to prevent object injection
  if (mealType in keywords) {
    return keywords[mealType];
  }
  return [];
}

/**
 * Calculate distance between two points in meters using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Convert to meters
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Send a meal recommendation notification to a user - kept simple in controller
 */
async function sendMealRecommendationNotification(
  userId: mongoose.Types.ObjectId,
  mealType: 'breakfast' | 'lunch' | 'dinner'
): Promise<boolean> {
  try {
    // Get user location
    const userLocation = await locationModel.findByUserId(userId);
    if (!userLocation) {
      logger.info(`No location found for user ${userId.toString()} (${mealType})`);
      return false;
    }

    // Get meal recommendations
    const mealKeywords = getMealKeywords(mealType);
    const nearbyPins = await pinModel.findNearbyForMeal(
      userLocation.lat, 
      userLocation.lng, 
      2000, // 2km
      mealKeywords,
      3 // Top 3 for notification
    );

    if (nearbyPins.length === 0) {
      logger.info(`No recommendations to send for user ${userId.toString()} (${mealType})`);
      return false;
    }

    // Get top recommendation
    const topPin = nearbyPins[0];
    const distance = calculateDistance(
      userLocation.lat, 
      userLocation.lng, 
      topPin.location.latitude, 
      topPin.location.longitude
    );

    const distanceText = distance < 1000 
      ? `${Math.round(distance)}m away`
      : `${(distance / 1000).toFixed(1)}km away`;

    // Create notification
    const mealEmoji = mealType === 'breakfast' ? '🍳' : mealType === 'lunch' ? '🍽️' : '🌙';
    const title = `${mealEmoji} ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Recommendation`;
    const body = `Try ${topPin.name} - ${distanceText}. Great choice for ${mealType}!`;

    const sent = await notificationService.sendLocationRecommendationNotification(
      userId.toString(),
      title,
      body,
      {
        pinId: topPin._id.toString(),
        mealType,
        distance,
        score: 100, // Simple score for notification
      }
    );

    return sent;
  } catch (error) {
    logger.error('Error sending meal recommendation notification:', error);
    // Re-throw database errors to be handled by the controller
    if (error instanceof Error && error.message.includes('Database error')) {
      throw error;
    }
    return false;
  }
}

// Export for use by scheduler
export { sendMealRecommendationNotification };

// Simple scheduler state
const scheduledJobs = new Map<string, cron.ScheduledTask>();
let isSchedulerRunning = false;

/**
 * Start recommendation scheduler with simple cron jobs
 */
export function startRecommendationScheduler(): void {
  if (isSchedulerRunning) {
    logger.warn('⚠️ Recommendation scheduler already running');
    return;
  }

  logger.info('🕐 Starting recommendation scheduler...');

  // Simple meal time schedules
  const mealSchedules = [
    { name: 'breakfast' as const, cron: '0 8,9,10 * * *', emoji: '🍳' },
    { name: 'lunch' as const, cron: '0 12,13,14 * * *', emoji: '🍽️' },
    { name: 'dinner' as const, cron: '0 18,19,20,21,22 * * *', emoji: '🌙' }
  ];

  mealSchedules.forEach(schedule => {
    const job = cron.schedule(schedule.cron, () => {
      sendBatchRecommendations(schedule.name).catch(() => {});
    }, { timezone: 'America/Vancouver' });
    
    scheduledJobs.set(schedule.name, job);
    logger.info(`✅ ${schedule.emoji} ${schedule.name} notifications scheduled: ${schedule.cron}`);
  });

  isSchedulerRunning = true;
  logger.info('🚀 Recommendation scheduler started');
}

/**
 * Stop recommendation scheduler
 */
export function stopRecommendationScheduler(): void {
  if (!isSchedulerRunning) {
    logger.warn('⚠️ Recommendation scheduler not running');
    return;
  }

  logger.info('🛑 Stopping recommendation scheduler...');
  
  scheduledJobs.forEach((job, mealType) => {
    job.stop();
    job.destroy();
    logger.info(`❌ Stopped ${mealType} recommendations`);
  });

  scheduledJobs.clear();
  isSchedulerRunning = false;
  logger.info('🔴 Recommendation scheduler stopped');
}

/**
 * Send batch recommendations to all eligible users
 */
export async function sendBatchRecommendations(mealType: 'breakfast' | 'lunch' | 'dinner'): Promise<void> {
  logger.info(`📨 Sending ${mealType} recommendations to all users...`);
  
  try {
    // Get users with FCM tokens who can receive notifications
    const users = await userModel.findAll();
    const eligibleUsers = users.filter((user: unknown) => {
      const u = user as { fcmToken?: string };
      return u.fcmToken && u.fcmToken.length > 0;
    });
    
    if (eligibleUsers.length === 0) {
      logger.info(`📭 No eligible users found for ${mealType} recommendations`);
      return;
    }

    logger.info(`👥 Found ${eligibleUsers.length} eligible users for ${mealType} recommendations`);

    let successCount = 0;
    let failureCount = 0;

    // Process users in small batches to avoid overwhelming system
    for (let i = 0; i < eligibleUsers.length; i += 10) {
      const batch = eligibleUsers.slice(i, i + 10);
      
      const batchPromises = batch.map(async (user: unknown) => {
        const u = user as { _id: mongoose.Types.ObjectId };
        try {
          // Check if user already received recommendation today
          const canReceive = await userModel.canReceiveRecommendation(u._id, mealType);
          if (!canReceive) {
            return; // Skip this user
          }

          const sent = await sendMealRecommendationNotification(u._id, mealType);
          
          if (sent) {
            await userModel.markRecommendationSent(u._id, mealType);
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          failureCount++;
          logger.error(`Error sending ${mealType} recommendation to user ${u._id}:`, error);
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches
      if (i + 10 < eligibleUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info(`📊 ${mealType} recommendations completed: ${successCount} sent, ${failureCount} failed`);
    
  } catch (error) {
    logger.error(`Error during ${mealType} recommendation batch:`, error);
  }
}

/**
 * Manual trigger for testing - send recommendations for specific meal type
 */
export async function triggerTestRecommendations(mealType: 'breakfast' | 'lunch' | 'dinner'): Promise<void> {
  logger.info(`🧪 Manual test trigger for ${mealType} recommendations`);
  await sendBatchRecommendations(mealType);
}

