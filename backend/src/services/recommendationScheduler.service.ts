import * as cron from 'node-cron';
import * as mongoose from 'mongoose';
import { userModel } from '../models/user.model';
import { recommendationService } from './recommendation.service';
import logger from '../utils/logger.util';

interface MealTimeConfig {
  name: 'breakfast' | 'lunch' | 'dinner';
  startHour: number;
  endHour: number;
  cronExpression: string;
  emoji: string;
}

export class RecommendationSchedulerService {
  private static instance: RecommendationSchedulerService | undefined;
  private scheduledJobs = new Map<string, unknown>();
  private isRunning = false;

  // Meal time configurations
  private readonly mealTimes: MealTimeConfig[] = [
    {
      name: 'breakfast',
      startHour: 8,
      endHour: 10,
      cronExpression: '0 8,9,10 * * *', // Every day at 8:00, 9:00, 10:00 AM
      emoji: '🍳'
    },
    {
      name: 'lunch', 
      startHour: 12,
      endHour: 14,
      cronExpression: '0 12,13,14 * * *', // Every day at 12:00, 1:00, 2:00 PM
      emoji: '🍽️'
    },
    {
      name: 'dinner',
      startHour: 18,
      endHour: 22,
      cronExpression: '0 18,19,20,21,22 * * *', // Every day at 6:00-10:00 PM
      emoji: '🌙'
    }
  ];

  private constructor() {}

  public static getInstance(): RecommendationSchedulerService {
    if (!RecommendationSchedulerService.instance) {
      RecommendationSchedulerService.instance = new RecommendationSchedulerService();
    }
    return RecommendationSchedulerService.instance;
  }

  /**
   * Start the recommendation scheduler
   */
  public startScheduler(): void {
    if (this.isRunning) {
      logger.warn('⚠️ [SCHEDULER] Recommendation scheduler already running');
      return;
    }

    logger.info('🕐 [SCHEDULER] Starting recommendation scheduler...');

    this.mealTimes.forEach(mealTime => {
      const job = cron.schedule(
        mealTime.cronExpression,
        () => this.triggerMealRecommendations(mealTime),
        {
          timezone: 'America/Vancouver' // Adjust timezone as needed
        }
      );

      this.scheduledJobs.set(mealTime.name, job);
      logger.info(`✅ [SCHEDULER] ${mealTime.emoji} ${mealTime.name} notifications scheduled: ${mealTime.cronExpression}`);
    });

    this.isRunning = true;
    logger.info('🚀 [SCHEDULER] Recommendation scheduler started successfully');
  }

  /**
   * Stop the recommendation scheduler
   */
  public stopScheduler(): void {
    if (!this.isRunning) {
      logger.warn('⚠️ [SCHEDULER] Recommendation scheduler not running');
      return;
    }

    logger.info('🛑 [SCHEDULER] Stopping recommendation scheduler...');

    this.scheduledJobs.forEach((job, mealType) => {
      const cronJob = job as cron.ScheduledTask;
      cronJob.stop();
      cronJob.destroy();
      logger.info(`❌ [SCHEDULER] Stopped ${mealType} recommendations`);
    });

    this.scheduledJobs.clear();
    this.isRunning = false;
    logger.info('🔴 [SCHEDULER] Recommendation scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  public getStatus(): {
    isRunning: boolean;
    activeJobs: string[];
    nextExecutions: { mealType: string; nextRun: string }[];
  } {
    const activeJobs = Array.from(this.scheduledJobs.keys());
    const nextExecutions = this.mealTimes.map(mealTime => ({
      mealType: mealTime.name,
      nextRun: this.getNextExecutionTime(mealTime.cronExpression)
    }));

    return {
      isRunning: this.isRunning,
      activeJobs,
      nextExecutions
    };
  }

  /**
   * Manually trigger recommendations for a specific meal type
   */
  public async triggerMealRecommendations(mealTime: MealTimeConfig, forceExecute = false): Promise<void> {
    const currentHour = new Date().getHours();
    
    // Check if we're in the correct time window (unless forced)
    if (!forceExecute && (currentHour < mealTime.startHour || currentHour > mealTime.endHour)) {
      logger.info(`⏰ [SCHEDULER] Skipping ${mealTime.name} - outside time window (${mealTime.startHour}-${mealTime.endHour}h, current: ${currentHour}h)`);
      return;
    }

    if (forceExecute) {
      logger.info(`🔧 [SCHEDULER] Force executing ${mealTime.name} recommendations (bypassing time window)`);
    }

    logger.info(`${mealTime.emoji} [SCHEDULER] Triggering ${mealTime.name} recommendations for all users...`);

    try {
      // Get all active users with notifications enabled
      const users = await this.getEligibleUsers();
      
      if (users.length === 0) {
        logger.info(`📭 [SCHEDULER] No eligible users found for ${mealTime.name} recommendations`);
        return;
      }

      logger.info(`👥 [SCHEDULER] Found ${users.length} eligible users for ${mealTime.name} recommendations`);

      // Process users in batches to avoid overwhelming the system
      const batchSize = 10;
      const batches = this.chunkArray(users, batchSize);
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.info(`📦 [SCHEDULER] Processing batch ${i + 1}/${batches.length} (${batch.length} users)`);

        const batchPromises = batch.map(async (user: unknown) => {
          try {
            const userObj = user as { _id: mongoose.Types.ObjectId };
            // Check if user can receive recommendation for this meal type today
            const canReceive = await userModel.canReceiveRecommendation(userObj._id, mealTime.name);
            
            if (!canReceive) {
              logger.info(`⏭️ [SCHEDULER] User ${userObj._id.toString()} already received ${mealTime.name} recommendation today - skipping`);
              return; // Skip this user
            }

            const sent = await recommendationService.sendRecommendationNotification(
              userObj._id,
              mealTime.name
            );
            
            if (sent) {
              // Mark that the recommendation was sent
              await userModel.markRecommendationSent(userObj._id, mealTime.name);
              successCount++;
              logger.info(`✅ [SCHEDULER] Sent ${mealTime.name} recommendation to user ${userObj._id.toString()}`);
            } else {
              failureCount++;
              logger.info(`❌ [SCHEDULER] Failed to send ${mealTime.name} recommendation to user ${userObj._id.toString()}`);
            }
          } catch (error) {
            failureCount++;
            const userObj = user as { _id: mongoose.Types.ObjectId };
            logger.error(`💥 [SCHEDULER] Error sending ${mealTime.name} recommendation to user ${userObj._id.toString()}:`, error);
          }
        });

        // Wait for batch to complete
        await Promise.allSettled(batchPromises);

        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await this.delay(1000); // 1 second delay between batches
        }
      }

      logger.info(`📊 [SCHEDULER] ${mealTime.name} recommendations completed: ${successCount} sent, ${failureCount} failed`);

    } catch (error) {
      logger.error(`💥 [SCHEDULER] Error during ${mealTime.name} recommendation batch:`, error);
    }
  }

  /**
   * Get users eligible for recommendations
   */
  private async getEligibleUsers(): Promise<unknown[]> {
    try {
      // Get all users (in production you would add filtering criteria)
      const allUsers = await userModel.findAll();
      logger.info(`👤 [SCHEDULER] Found ${allUsers.length} total users in database`);

      // Filter users with FCM tokens (can receive notifications)
      const eligibleUsers = allUsers.filter((user: unknown) => {
        const userObj = user as { fcmToken?: string; _id: mongoose.Types.ObjectId };
        const hasFcmToken = userObj.fcmToken && userObj.fcmToken.length > 0;
        if (!hasFcmToken) {
          logger.debug(`🚫 [SCHEDULER] User ${userObj._id.toString()} has no FCM token - skipping`);
        }
        return hasFcmToken;
      });

      logger.info(`📱 [SCHEDULER] ${eligibleUsers.length}/${allUsers.length} users have FCM tokens`);
      return eligibleUsers;
    } catch (error) {
      logger.error('❌ [SCHEDULER] Error fetching eligible users:', error);
      return [];
    }
  }

  /**
   * Get next execution time for a cron expression
   */
  private getNextExecutionTime(cronExpression: string): string {
    try {
      // This is a simplified version - in production you might want to use a proper cron parser
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return `Next execution scheduled (${cronExpression})`;
    } catch (error) {
      return 'Unable to determine next execution';
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manual trigger for testing purposes
   */
  public async testRecommendations(mealType: 'breakfast' | 'lunch' | 'dinner'): Promise<void> {
    const mealTime = this.mealTimes.find(mt => mt.name === mealType);
    if (!mealTime) {
      logger.error(`❌ [SCHEDULER] Invalid meal type: ${mealType}`);
      return;
    }

    logger.info(`🧪 [SCHEDULER] Manual test trigger for ${mealType} recommendations (bypassing time window)`);
    await this.triggerMealRecommendations(mealTime, true); // Force execution
  }
}

export const recommendationScheduler = RecommendationSchedulerService.getInstance();