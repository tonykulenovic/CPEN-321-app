import { Request, Response } from 'express';
import { userModel } from '../models/user.model';
import { notificationService } from '../services/notification.service';
import { firebaseService } from '../config/firebase';
import logger from '../utils/logger.util';
import mongoose from 'mongoose';

export class DebugController {
  constructor() {
    this.sendTestNotification = this.sendTestNotification.bind(this);
    this.sendTestFriendRequest = this.sendTestFriendRequest.bind(this);
    this.listUsersWithTokens = this.listUsersWithTokens.bind(this);
  }

  /**
   * POST /debug/notification/test - Send a test notification to a user
   * Body: { userId: string, title?: string, message?: string }
   */
  async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, title = 'Test Notification', message = 'This is a test push notification!' } = req.body;

      logger.info(`🧪 [DEBUG] sendTestNotification called:`);
      logger.info(`   📋 Request body: ${JSON.stringify(req.body)}`);
      logger.info(`   🆔 User ID: ${userId}`);
      logger.info(`   📰 Title: "${title}"`);
      logger.info(`   💬 Message: "${message}"`);

      if (!userId) {
        logger.warn(`❌ [DEBUG] No userId provided in request`);
        res.status(400).json({ 
          success: false,
          message: 'userId is required' 
        });
        return;
      }

      // Find the user
      const userIdStr = String(userId);
      logger.info(`🔍 [DEBUG] Looking up user by ID: ${userIdStr}`);
      const user = await userModel.findById(new mongoose.Types.ObjectId(userIdStr));
      
      if (!user) {
        logger.warn(`❌ [DEBUG] User not found for ID: ${userId}`);
        res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
        return;
      }

      logger.info(`✅ [DEBUG] User found: ${user.name} (${user.email})`);
      logger.info(`   📱 Has FCM token: ${!!user.fcmToken}`);
      
      if (user.fcmToken) {
        logger.info(`   🔑 FCM token preview: ${user.fcmToken.substring(0, 30)}...${user.fcmToken.substring(user.fcmToken.length - 10)}`);
        logger.info(`   📏 FCM token length: ${user.fcmToken.length} characters`);
      }

      if (!user.fcmToken) {
        logger.warn(`❌ [DEBUG] User ${user.name} has no FCM token registered`);
        res.status(400).json({ 
          success: false,
          message: `User ${user.name} has no FCM token registered` 
        });
        return;
      }

      // Send the test notification
      logger.info(`📤 [DEBUG] Sending test notification via Firebase service...`);
      const startTime = Date.now();
      
      const sent = await firebaseService.sendNotification(
        user.fcmToken,
        String(title),
        String(message),
        {
          type: 'debug_test',
          timestamp: new Date().toISOString(),
          testData: 'This is debug data'
        }
      );

      const duration = Date.now() - startTime;
      logger.info(`⏱️ [DEBUG] Firebase call completed in ${duration}ms`);
      logger.info(`📊 [DEBUG] Notification sent successfully: ${sent}`);

      if (sent) {
        logger.info(`🎉 [DEBUG] Test notification sent successfully to ${user.name} (${user.email})`);
        res.status(200).json({
          success: true,
          message: `Test notification sent successfully to ${user.name}`,
          data: {
            userId: user._id,
            userEmail: user.email,
            userName: user.name,
            title,
            message,
            hasToken: !!user.fcmToken,
            tokenPreview: user.fcmToken ? `${user.fcmToken.substring(0, 20)}...` : null,
            duration: `${duration}ms`
          }
        });
      } else {
        logger.error(`💥 [DEBUG] Failed to send notification to ${user.name}`);
        res.status(500).json({
          success: false,
          message: 'Failed to send notification - check server logs for details'
        });
      }
    } catch (error) {
      logger.error(`💥 [DEBUG] Exception in sendTestNotification:`, error);
      logger.error(`   📊 Error stack: ${error instanceof Error ? error.stack : 'N/A'}`);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /debug/notification/friend-request - Send a test friend request notification
   * Body: { toUserId: string, fromUserId: string }
   */
  async sendTestFriendRequest(req: Request, res: Response): Promise<void> {
    try {
      const { toUserId, fromUserId } = req.body;

      if (!toUserId || !fromUserId) {
        res.status(400).json({ 
          success: false,
          message: 'toUserId and fromUserId are required' 
        });
        return;
      }

      const [toUser, fromUser] = await Promise.all([
        userModel.findById(new mongoose.Types.ObjectId(String(toUserId))),
        userModel.findById(new mongoose.Types.ObjectId(String(fromUserId)))
      ]);

      if (!toUser || !fromUser) {
        res.status(404).json({ 
          success: false,
          message: 'One or both users not found' 
        });
        return;
      }

      // Send test friend request notification
      await notificationService.sendFriendRequestNotification(
        String(toUserId),
        String(fromUserId),
        fromUser.name
      );

      logger.info(`🧪 Debug: Test friend request notification sent from ${fromUser.name} to ${toUser.name}`);

      res.status(200).json({
        success: true,
        message: `Test friend request notification sent from ${fromUser.name} to ${toUser.name}`,
        data: {
          toUser: {
            id: toUser._id,
            name: toUser.name,
            email: toUser.email,
            hasToken: !!toUser.fcmToken
          },
          fromUser: {
            id: fromUser._id,
            name: fromUser.name,
            email: fromUser.email
          }
        }
      });
    } catch (error) {
      logger.error('Error in debug sendTestFriendRequest:', error);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /debug/users/tokens - List all users with their FCM token status
   */
  async listUsersWithTokens(req: Request, res: Response): Promise<void> {
    try {
      const users = await userModel.findAll();
      
      const userTokenInfo = users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        hasToken: !!user.fcmToken,
        tokenPreview: user.fcmToken ? `${user.fcmToken.substring(0, 20)}...` : null,
        lastActiveAt: user.lastActiveAt,
        createdAt: user.createdAt
      }));

      const stats = {
        totalUsers: users.length,
        usersWithTokens: users.filter(u => u.fcmToken).length,
        usersWithoutTokens: users.filter(u => !u.fcmToken).length
      };

      logger.info(`🧪 Debug: Listed ${users.length} users, ${stats.usersWithTokens} have FCM tokens`);

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          stats,
          users: userTokenInfo
        }
      });
    } catch (error) {
      logger.error('Error in debug listUsersWithTokens:', error);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const debugController = new DebugController();