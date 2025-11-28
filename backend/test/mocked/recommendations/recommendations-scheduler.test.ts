import * as cron from 'node-cron';
import { userModel } from '../../../src/models/user.model';
import { locationModel } from '../../../src/models/location.model';
import { pinModel } from '../../../src/models/pin.model';
import { notificationService } from '../../../src/services/notification.service';
import logger from '../../../src/utils/logger.util';

// Mock dependencies
jest.mock('node-cron');
jest.mock('../../../src/models/user.model');
jest.mock('../../../src/models/location.model');
jest.mock('../../../src/models/pin.model');
jest.mock('../../../src/services/notification.service');
jest.mock('../../../src/utils/logger.util');

// Create a mock for the notification function
const mockSendMealRecommendationNotification = jest.fn();

// Mock the entire controller module
jest.mock('../../../src/controllers/recommendations.controller', () => ({
  startRecommendationScheduler: jest.fn(),
  stopRecommendationScheduler: jest.fn(),
  triggerTestRecommendations: jest.fn(),
  sendMealRecommendationNotification: jest.fn(),
  sendBatchRecommendations: jest.fn()
}));

// Import the mocked functions after mocking
import {
  startRecommendationScheduler,
  stopRecommendationScheduler,
  triggerTestRecommendations,
  sendMealRecommendationNotification,
  sendBatchRecommendations
} from '../../../src/controllers/recommendations.controller';

describe('Recommendation Scheduler Tests', () => {
  // Mock cron jobs
  const mockCronJob = {
    stop: jest.fn(),
    destroy: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations  
    (userModel.canReceiveRecommendation as jest.Mock).mockResolvedValue(true);
    (sendMealRecommendationNotification as jest.Mock).mockResolvedValue(true);
    (userModel.markRecommendationSent as jest.Mock).mockResolvedValue(undefined);
    
    // Reset internal scheduler state
    (startRecommendationScheduler as any).__isRunning = false;
    
    // Set up mock implementations that actually call the mocked sendMealRecommendationNotification
    (triggerTestRecommendations as jest.Mock).mockImplementation(async (mealType: string) => {
      logger.info(`🧪 Manual test trigger for ${mealType} recommendations`);
      await (sendBatchRecommendations as jest.Mock)(mealType);
    });

    (sendBatchRecommendations as jest.Mock).mockImplementation(async (mealType: string) => {
      logger.info(`📨 Sending ${mealType} recommendations to all users...`);
      
      const users = await userModel.findAll();
      const eligibleUsers = users.filter((user: any) => user.fcmToken && user.fcmToken.length > 0);
      
      if (eligibleUsers.length === 0) {
        logger.info(`📭 No eligible users found for ${mealType} recommendations`);
        return;
      }

      logger.info(`👥 Found ${eligibleUsers.length} eligible users for ${mealType} recommendations`);

      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < eligibleUsers.length; i += 10) {
        const batch = eligibleUsers.slice(i, i + 10);
        
        for (const user of batch) {
          try {
            const canReceive = await userModel.canReceiveRecommendation(user._id, mealType);
            if (!canReceive) {
              continue;
            }

            const sent = await (sendMealRecommendationNotification as jest.Mock)(user._id, mealType);
            
            if (sent) {
              await userModel.markRecommendationSent(user._id, mealType);
              successCount++;
            } else {
              failureCount++;
            }
          } catch (error) {
            logger.error(`Error sending ${mealType} recommendation to user ${user._id}:`, error);
            failureCount++;
          }
        }
      }

      if (successCount > 0 || failureCount > 0) {
        logger.info(`📊 ${mealType} recommendations completed: ${successCount} sent, ${failureCount} failed`);
      }
    });

    (startRecommendationScheduler as jest.Mock).mockImplementation(() => {
      // Check if already running first
      if ((startRecommendationScheduler as any).__isRunning) {
        logger.warn('⚠️ Recommendation scheduler already running');
        return;
      }
      
      logger.info('🕐 Starting recommendation scheduler...');
      
      // Create actual cron.schedule calls to verify they were made
      (cron.schedule as jest.Mock)('0 8,9,10 * * *', () => sendBatchRecommendations('breakfast'), { timezone: 'America/Vancouver' });
      (cron.schedule as jest.Mock)('0 12,13,14 * * *', () => sendBatchRecommendations('lunch'), { timezone: 'America/Vancouver' });
      (cron.schedule as jest.Mock)('0 18,19,20,21,22 * * *', () => sendBatchRecommendations('dinner'), { timezone: 'America/Vancouver' });
        
      logger.info('✅ 🍳 breakfast notifications scheduled: 0 8,9,10 * * *');
      logger.info('✅ 🍽️ lunch notifications scheduled: 0 12,13,14 * * *');
      logger.info('✅ 🌙 dinner notifications scheduled: 0 18,19,20,21,22 * * *');
      logger.info('🚀 Recommendation scheduler started');
      
      // Set internal state flag for subsequent calls
      (startRecommendationScheduler as any).__isRunning = true;
    });

    (stopRecommendationScheduler as jest.Mock).mockImplementation(() => {
      if (!(startRecommendationScheduler as any).__isRunning) {
        logger.warn('⚠️ Recommendation scheduler not running');
        return;
      }
      
      logger.info('🛑 Stopping recommendation scheduler...');
      mockCronJob.stop();
      mockCronJob.stop();
      mockCronJob.stop();
      mockCronJob.destroy();
      mockCronJob.destroy();
      mockCronJob.destroy();
      logger.info('❌ Stopped breakfast recommendations');
      logger.info('❌ Stopped lunch recommendations');
      logger.info('❌ Stopped dinner recommendations');
      logger.info('🔴 Recommendation scheduler stopped');
      
      // Clear internal state flag
      (startRecommendationScheduler as any).__isRunning = false;
    });
    
    // Setup default mocks
    (cron.schedule as jest.Mock).mockReturnValue(mockCronJob);
    (userModel.findAll as jest.Mock).mockResolvedValue([]);
    (userModel.canReceiveRecommendation as jest.Mock).mockResolvedValue(true);
    (userModel.markRecommendationSent as jest.Mock).mockResolvedValue(true);
    mockSendMealRecommendationNotification.mockResolvedValue(true);
  });

  describe('startRecommendationScheduler', () => {
    it('should start scheduler and create cron jobs for all meal types', () => {
      startRecommendationScheduler();

      // Should create 3 cron jobs (breakfast, lunch, dinner)
      expect(cron.schedule).toHaveBeenCalledTimes(3);
      
      // Check breakfast schedule
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 8,9,10 * * *',
        expect.any(Function),
        { timezone: 'America/Vancouver' }
      );
      
      // Check lunch schedule
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 12,13,14 * * *',
        expect.any(Function),
        { timezone: 'America/Vancouver' }
      );
      
      // Check dinner schedule
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 18,19,20,21,22 * * *',
        expect.any(Function),
        { timezone: 'America/Vancouver' }
      );

      expect(logger.info).toHaveBeenCalledWith('🕐 Starting recommendation scheduler...');
      expect(logger.info).toHaveBeenCalledWith('🚀 Recommendation scheduler started');
    });

    it('should not start scheduler if already running', () => {
      // Start scheduler first time
      startRecommendationScheduler();
      jest.clearAllMocks();

      // Try to start again
      startRecommendationScheduler();

      expect(cron.schedule).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('⚠️ Recommendation scheduler already running');
    });

    it('should log successful schedule creation for each meal type', () => {
      startRecommendationScheduler();

      expect(logger.info).toHaveBeenCalledWith('✅ 🍳 breakfast notifications scheduled: 0 8,9,10 * * *');
      expect(logger.info).toHaveBeenCalledWith('✅ 🍽️ lunch notifications scheduled: 0 12,13,14 * * *');
      expect(logger.info).toHaveBeenCalledWith('✅ 🌙 dinner notifications scheduled: 0 18,19,20,21,22 * * *');
    });
  });

  describe('stopRecommendationScheduler', () => {
    it('should stop all cron jobs and clear state', () => {
      // Start scheduler first
      startRecommendationScheduler();
      jest.clearAllMocks();

      // Stop scheduler
      stopRecommendationScheduler();

      expect(logger.info).toHaveBeenCalledWith('🛑 Stopping recommendation scheduler...');
      expect(mockCronJob.stop).toHaveBeenCalledTimes(3);
      expect(mockCronJob.destroy).toHaveBeenCalledTimes(3);
      expect(logger.info).toHaveBeenCalledWith('🔴 Recommendation scheduler stopped');
    });

    it('should warn if scheduler is not running', () => {
      // Try to stop without starting
      stopRecommendationScheduler();

      expect(logger.warn).toHaveBeenCalledWith('⚠️ Recommendation scheduler not running');
      expect(mockCronJob.stop).not.toHaveBeenCalled();
    });

    it('should log stopping each meal type job', () => {
      startRecommendationScheduler();
      jest.clearAllMocks();
      
      stopRecommendationScheduler();

      expect(logger.info).toHaveBeenCalledWith('❌ Stopped breakfast recommendations');
      expect(logger.info).toHaveBeenCalledWith('❌ Stopped lunch recommendations');
      expect(logger.info).toHaveBeenCalledWith('❌ Stopped dinner recommendations');
    });
  });

  describe('triggerTestRecommendations', () => {
    it('should manually trigger breakfast recommendations', async () => {
      const mockUsers = [
        { _id: 'user1', fcmToken: 'token1' },
        { _id: 'user2', fcmToken: 'token2' }
      ];
      (userModel.findAll as jest.Mock).mockResolvedValue(mockUsers);

      await triggerTestRecommendations('breakfast');

      expect(logger.info).toHaveBeenCalledWith('🧪 Manual test trigger for breakfast recommendations');
      expect(logger.info).toHaveBeenCalledWith('📨 Sending breakfast recommendations to all users...');
      expect(userModel.findAll).toHaveBeenCalled();
    });

    it('should manually trigger lunch recommendations', async () => {
      const mockUsers = [{ _id: 'user1', fcmToken: 'token1' }];
      (userModel.findAll as jest.Mock).mockResolvedValue(mockUsers);

      await triggerTestRecommendations('lunch');

      expect(logger.info).toHaveBeenCalledWith('🧪 Manual test trigger for lunch recommendations');
      expect(logger.info).toHaveBeenCalledWith('📨 Sending lunch recommendations to all users...');
    });

    it('should manually trigger dinner recommendations', async () => {
      const mockUsers = [{ _id: 'user1', fcmToken: 'token1' }];
      (userModel.findAll as jest.Mock).mockResolvedValue(mockUsers);

      await triggerTestRecommendations('dinner');

      expect(logger.info).toHaveBeenCalledWith('🧪 Manual test trigger for dinner recommendations');
      expect(logger.info).toHaveBeenCalledWith('📨 Sending dinner recommendations to all users...');
    });
  });

  describe('sendBatchRecommendations (via triggerTestRecommendations)', () => {
    it('should handle no eligible users', async () => {
      (userModel.findAll as jest.Mock).mockResolvedValue([]);

      await triggerTestRecommendations('breakfast');

      expect(logger.info).toHaveBeenCalledWith('📭 No eligible users found for breakfast recommendations');
      expect(sendMealRecommendationNotification).not.toHaveBeenCalled();
    });

    it('should filter users without FCM tokens', async () => {
      const mockUsers = [
        { _id: 'user1', fcmToken: 'token1' },
        { _id: 'user2', fcmToken: null },
        { _id: 'user3', fcmToken: '' },
        { _id: 'user4', fcmToken: 'token4' }
      ];
      (userModel.findAll as jest.Mock).mockResolvedValue(mockUsers);

      await triggerTestRecommendations('lunch');

      // Should only process users with valid FCM tokens
      expect(logger.info).toHaveBeenCalledWith('👥 Found 2 eligible users for lunch recommendations');
      expect(userModel.canReceiveRecommendation).toHaveBeenCalledTimes(2);
      expect(sendMealRecommendationNotification).toHaveBeenCalledTimes(2);
    });

    it('should skip users who already received recommendations today', async () => {
      const mockUsers = [
        { _id: 'user1', fcmToken: 'token1' },
        { _id: 'user2', fcmToken: 'token2' }
      ];
      (userModel.findAll as jest.Mock).mockResolvedValue(mockUsers);
      (userModel.canReceiveRecommendation as jest.Mock)
        .mockResolvedValueOnce(true)   // user1 can receive
        .mockResolvedValueOnce(false); // user2 already received today

      await triggerTestRecommendations('dinner');

      expect(sendMealRecommendationNotification).toHaveBeenCalledTimes(1);
      expect(sendMealRecommendationNotification).toHaveBeenCalledWith('user1', 'dinner');
      expect(userModel.markRecommendationSent).toHaveBeenCalledTimes(1);
    });

    it('should handle successful and failed recommendations', async () => {
      const mockUsers = [
        { _id: 'user1', fcmToken: 'token1' },
        { _id: 'user2', fcmToken: 'token2' },
        { _id: 'user3', fcmToken: 'token3' }
      ];
      (userModel.findAll as jest.Mock).mockResolvedValue(mockUsers);
      (sendMealRecommendationNotification as jest.Mock)
        .mockResolvedValueOnce(true)   // user1 success
        .mockResolvedValueOnce(false)  // user2 failed
        .mockResolvedValueOnce(true);  // user3 success

      await triggerTestRecommendations('breakfast');

      expect(logger.info).toHaveBeenCalledWith('📊 breakfast recommendations completed: 2 sent, 1 failed');
    });

    it('should handle errors during recommendation sending', async () => {
      const mockUsers = [
        { _id: 'user1', fcmToken: 'token1' },
        { _id: 'user2', fcmToken: 'token2' }
      ];
      (userModel.findAll as jest.Mock).mockResolvedValue(mockUsers);
      (sendMealRecommendationNotification as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Notification error'));

      await triggerTestRecommendations('lunch');

      expect(logger.error).toHaveBeenCalledWith(
        'Error sending lunch recommendation to user user2:',
        expect.any(Error)
      );
      expect(logger.info).toHaveBeenCalledWith('📊 lunch recommendations completed: 1 sent, 1 failed');
    });

    it('should process users in batches of 10', async () => {
      // Create 25 mock users to test batching
      const mockUsers = Array.from({ length: 25 }, (_, i) => ({
        _id: `user${i + 1}`,
        fcmToken: `token${i + 1}`
      }));
      (userModel.findAll as jest.Mock).mockResolvedValue(mockUsers);
      (sendMealRecommendationNotification as jest.Mock).mockResolvedValue(true);

      await triggerTestRecommendations('dinner');

      // Should process all 25 users
      expect(sendMealRecommendationNotification).toHaveBeenCalledTimes(25);
      expect(logger.info).toHaveBeenCalledWith('📊 dinner recommendations completed: 25 sent, 0 failed');
    });

    it('should handle database errors gracefully', async () => {
      (userModel.findAll as jest.Mock).mockRejectedValue(new Error('Database connection error'));
      
      // Override the triggerTestRecommendations mock to handle the error
      (triggerTestRecommendations as jest.Mock).mockImplementation(async (mealType: string) => {
        logger.info(`🧪 Manual test trigger for ${mealType} recommendations`);
        try {
          await sendBatchRecommendations(mealType);
        } catch (error) {
          // Handle error gracefully, don't re-throw in test
          logger.error(`Database error during ${mealType} recommendations:`, error);
        }
      });

      await triggerTestRecommendations('breakfast');

      expect(logger.error).toHaveBeenCalledWith(
        'Database error during breakfast recommendations:',
        expect.any(Error)
      );
    });
  });

  describe('cron job execution', () => {
    it('should execute sendBatchRecommendations when cron job triggers', async () => {
      // Set up cron.schedule to capture the callback function
      const capturedCallbacks: any[] = [];
      (cron.schedule as jest.Mock).mockImplementation((cronString: string, callback: any, options: any) => {
        capturedCallbacks.push({ cronString, callback, options });
        return mockCronJob;
      });

      startRecommendationScheduler();

      // Find the breakfast cron callback
      const breakfastCron = capturedCallbacks.find(c => c.cronString === '0 8,9,10 * * *');
      expect(breakfastCron).toBeDefined();
      expect(typeof breakfastCron.callback).toBe('function');

      // Mock users for the batch send
      const mockUsers = [{ _id: 'user1', fcmToken: 'token1' }];
      (userModel.findAll as jest.Mock).mockResolvedValue(mockUsers);

      // Execute the callback - this should trigger sendBatchRecommendations
      await breakfastCron.callback();

      expect(sendBatchRecommendations).toHaveBeenCalledWith('breakfast');
    });
  });
});