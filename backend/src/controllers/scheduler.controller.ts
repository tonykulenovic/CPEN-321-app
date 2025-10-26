import { Request, Response } from 'express';
import { recommendationScheduler } from '../services/recommendationScheduler.service';
import logger from '../utils/logger.util';

export class SchedulerController {
  /**
   * Get scheduler status
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = recommendationScheduler.getStatus();
      
      res.status(200).json({
        message: 'Scheduler status retrieved successfully',
        data: status
      });
    } catch (error) {
      logger.error('Error getting scheduler status:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get scheduler status'
      });
    }
  }

  /**
   * Start the scheduler
   */
  static async startScheduler(req: Request, res: Response): Promise<void> {
    try {
      recommendationScheduler.startScheduler();
      
      res.status(200).json({
        message: 'Recommendation scheduler started successfully',
        data: { started: true }
      });
    } catch (error) {
      logger.error('Error starting scheduler:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to start scheduler'
      });
    }
  }

  /**
   * Stop the scheduler
   */
  static async stopScheduler(req: Request, res: Response): Promise<void> {
    try {
      recommendationScheduler.stopScheduler();
      
      res.status(200).json({
        message: 'Recommendation scheduler stopped successfully',
        data: { stopped: true }
      });
    } catch (error) {
      logger.error('Error stopping scheduler:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to stop scheduler'
      });
    }
  }

  /**
   * Get eligible users for debugging
   */
  static async getEligibleUsers(req: Request, res: Response): Promise<void> {
    try {
      // Access the private method through reflection for debugging
      const scheduler = recommendationScheduler as any;
      const users = await scheduler.getEligibleUsers();
      
      res.status(200).json({
        message: 'Eligible users retrieved successfully',
        data: {
          totalEligible: users.length,
          users: users.map((user: any) => ({
            id: user._id,
            email: user.email,
            name: user.name,
            hasFcmToken: !!(user.fcmToken && user.fcmToken.length > 0)
          }))
        }
      });
    } catch (error) {
      logger.error('Error getting eligible users:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get eligible users'
      });
    }
  }

  /**
   * Manually trigger recommendations for a meal type
   */
  static async triggerRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { mealType } = req.params;
      
      if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
        res.status(400).json({
          error: 'Invalid meal type',
          message: 'Meal type must be breakfast, lunch, or dinner'
        });
        return;
      }

      // Trigger recommendations asynchronously
      recommendationScheduler.testRecommendations(mealType as 'breakfast' | 'lunch' | 'dinner')
        .catch(error => {
          logger.error(`Error in manual recommendation trigger for ${mealType}:`, error);
        });
      
      res.status(200).json({
        message: `${mealType} recommendations triggered successfully`,
        data: { 
          mealType,
          triggered: true,
          note: 'Recommendations are being sent asynchronously'
        }
      });
    } catch (error) {
      logger.error('Error triggering recommendations:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to trigger recommendations'
      });
    }
  }
}