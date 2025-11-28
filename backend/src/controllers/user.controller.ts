import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

import {
  GetProfileResponse,
  UpdateProfileRequest,
} from '../types/user.types';
import {
  UserSearchResponse,
  userSearchQuerySchema,
  privacySettingsSchema,
} from '../types/friends.types';
import logger from '../utils/logger.util';
import { MediaService } from '../services/media.service';
import { userModel } from '../models/user.model';
import { friendshipModel } from '../models/friendship.model';
import { badgeModel } from '../models/badge.model';
import { pinModel } from '../models/pin.model';

export class UserController {
  constructor() {
    // Bind methods to preserve 'this' context
    this.getProfile = this.getProfile.bind(this);
    this.getUserProfile = this.getUserProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.deleteProfile = this.deleteProfile.bind(this);
    this.searchUsers = this.searchUsers.bind(this);
    this.getMe = this.getMe.bind(this);
    this.updatePrivacy = this.updatePrivacy.bind(this);
    // FCM token methods
    this.updateFcmToken = this.updateFcmToken.bind(this);
    this.removeFcmToken = this.removeFcmToken.bind(this);
    // Admin methods
    this.getAllUsers = this.getAllUsers.bind(this);
    this.suspendUser = this.suspendUser.bind(this);
    this.unsuspendUser = this.unsuspendUser.bind(this);
    this.deleteUserByAdmin = this.deleteUserByAdmin.bind(this);
  }

  /**
   * Helper method to check if a user can appear in search results based on privacy settings
   * Note: This is specifically for SEARCH visibility. Profile access through other means 
   * (like friend lists) may have different privacy rules.
   */
  private async canViewUserProfile(
    viewerId: mongoose.Types.ObjectId,
    targetUserId: mongoose.Types.ObjectId,
    profileVisibleTo: 'friends' | 'everyone' | 'private'
  ): Promise<boolean> {
    logger.info(`🔐 Privacy check: viewer=${viewerId.toString()} target=${targetUserId.toString()} setting=${profileVisibleTo}`);
    
    switch (profileVisibleTo) {
      case 'everyone':
        // Anyone can find this user in search results
        logger.info(`✅ Everyone can see this profile`);
        return true;
      case 'friends': {
        // Only friends can find this user in search results
        const areFriends = await friendshipModel.areFriends(viewerId, targetUserId);
        logger.info(`👥 Friends only - are they friends? ${areFriends}`);
        return areFriends;
      }
      case 'private':
        // User doesn't appear in search results at all
        // (but friends can still access profile through other means like friend lists)
        logger.info(`🔒 Private profile - blocked from search`);
        return false;
      default:
        logger.info(`❓ Unknown privacy setting: ${String(profileVisibleTo)} - defaulting to private`);
        return false; // Default to private for unknown values
    }
  }
  getProfile(req: Request, res: Response<GetProfileResponse>) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    res.status(200).json({
      message: 'Profile fetched successfully',
      data: { user },
    });
  }

  /**
   * GET /api/users/:userId/profile - Get a friend's profile with badges and stats
   * Only returns profile if users are friends
   */
  async getUserProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const { userId } = req.params;

      // Validate userId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          message: 'Invalid user ID format',
        });
      }

      const targetUserId = new mongoose.Types.ObjectId(userId);

      // Fetch target user first to ensure they exist
      const targetUser = await userModel.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({
          message: 'User not found',
        });
      }

      // Check if users are friends
      const areFriends = await friendshipModel.areFriends(currentUser._id, targetUserId);
      if (!areFriends) {
        return res.status(403).json({
          message: 'You can only view profiles of your friends',
        });
      }

      // Get online status
      const onlineStatusMap = await userModel.getOnlineStatus([targetUserId], 10);
      const isOnline = onlineStatusMap.get(targetUserId.toString()) ?? false;

      // Get user badges
      const userBadges = await badgeModel.getUserBadges(targetUserId);
      
      logger.info(`Fetched ${userBadges.length} badges for user ${targetUserId.toString()}`);

      // Format response
      const profileData = {
        userId: targetUser._id.toString(),
        name: targetUser.name,
        username: targetUser.username,
        email: targetUser.email,
        bio: targetUser.bio,
        campus: targetUser.campus,
        profilePicture: targetUser.profilePicture,
        isOnline,
        friendsCount: targetUser.friendsCount,
        badgesCount: userBadges.length, // Use actual count from fetched badges
        stats: {
          pinsCreated: targetUser.stats.pinsCreated,
          pinsVisited: targetUser.stats.pinsVisited,
          locationsExplored: targetUser.stats.locationsExplored,
          librariesVisited: targetUser.stats.librariesVisited,
          cafesVisited: targetUser.stats.cafesVisited,
          restaurantsVisited: targetUser.stats.restaurantsVisited,
        },
        badges: userBadges,
      };

      res.status(200).json({
        message: 'Friend profile fetched successfully',
        data: profileData,
      });
    } catch (error) {
      logger.error('Error in getUserProfile:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to fetch friend profile',
        });
      }
      next(error);
    }
  }

  async updateProfile(
    req: Request<unknown, unknown, UpdateProfileRequest>,
    res: Response<GetProfileResponse>,
    next: NextFunction
  ) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const updatedUser = await userModel.update(user._id, req.body as Partial<import('../types/user.types').IUser>);

      if (!updatedUser) {
        return res.status(404).json({
          message: 'User not found',
        });
      }

      res.status(200).json({
        message: 'User info updated successfully',
        data: { user: updatedUser },
      });
    } catch (error) {
      logger.error('Failed to update user info:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to update user info',
        });
      }

      next(error);
    }
  }

  async deleteProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await MediaService.deleteAllUserImages(user._id.toString());

      await userModel.delete(user._id);

      res.status(200).json({
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete user:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to delete user',
        });
      }

      next(error);
    }
  }

  /**
   * GET /users/search — Search users for friend discovery.
   * Note: This endpoint is used for finding users to send friend requests to.
   * Privacy settings (profileVisibleTo) do NOT apply here - users must be discoverable
   * for the friend system to work. Privacy controls profile viewing, not friend discovery.
   * @param query.q string - Term.
   * @param query.limit number - Max.
   * @return 200 UserSearchResult[]
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate query parameters
      const validation = userSearchQuerySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({
          message: 'Invalid query parameters',
          errors: validation.error.issues,
        });
        return;
      }

      const { q, limit } = validation.data;
      const searchLimit = limit ? parseInt(String(limit), 10) : 20;

      // Get current user to exclude from results
      const currentUser = req.user;
      if (!currentUser) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const currentUserId = currentUser._id;

      // 2. Search users by username, name, or email
      const users = await userModel.searchUsers(String(q), searchLimit + 50); // Get extra to account for filtering
      
      // DEBUG: Log search results
      logger.info(`🔍 Search query: "${q}" returned ${users.length} users`);
      users.forEach(user => {
        logger.info(`  - User: ${user.username} (${user.name}) - Privacy: ${user.privacy.profileVisibleTo}`);
      });

      // 3. Filter results based on privacy settings and exclude current user
      const filteredUsers = [];
      
      for (const user of users) {
        // Exclude current user
        if (user._id.toString() === currentUserId.toString()) {
          logger.info(`⏭️  Skipping current user: ${user.username}`);
          continue;
        }

        // Apply privacy filtering using the helper method
        const canView = await this.canViewUserProfile(
          currentUserId, 
          user._id, 
          user.privacy.profileVisibleTo
        );
        
        if (!canView) {
          logger.info(`🔒 Privacy check for ${user.username}: ${user.privacy.profileVisibleTo} -> BLOCKED from search`);
          continue;
        }
        
        logger.info(`🔒 Privacy check for ${user.username}: ${user.privacy.profileVisibleTo} -> ALLOWED in search`);
        filteredUsers.push(user);

        // Stop once we have enough results
        if (filteredUsers.length >= searchLimit) {
          break;
        }
      }

      // 5. Map to response format
      const mappedUsers = filteredUsers.map(user => ({
        _id: user._id.toString(),
        username: user.username,
        displayName: user.name || user.username,
        photoUrl: user.profilePicture,
      }));

      // 6. Return search results
      const response: UserSearchResponse = {
        message: 'Users search completed successfully',
        data: mappedUsers,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error in searchUsers:', error);
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /me — Current user's profile.
   * @return 200 UserProfile
   */
  getMe(req: Request, res: Response): void {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      
      res.status(200).json({
        message: 'Profile fetched successfully',
        data: { user },
      });
    } catch (error) {
      logger.error('Error in getMe:', error);
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }

  /**
   * PATCH /me/privacy — Update privacy.
   * @param body object - Partial privacy object.
   * @return 200 { success: true }
   */
  async updatePrivacy(req: Request, res: Response): Promise<void> {
    try {
      // 1. Validate request body
      const validation = privacySettingsSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          message: 'Invalid request body',
          errors: validation.error.issues,
        });
        return;
      }

      const privacyUpdates = validation.data;

      // Check if at least one privacy setting is provided
      if (Object.keys(privacyUpdates as Record<string, unknown>).length === 0) {
        res.status(400).json({
          message: 'At least one privacy setting must be provided',
        });
        return;
      }

      // 2. Get user ID from auth middleware
      const currentUser = req.user;
      if (!currentUser) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const currentUserId = currentUser._id;

      // 3. Update user's privacy settings
      const updatedUser = await userModel.updatePrivacy(currentUserId, privacyUpdates);

      if (!updatedUser) {
        res.status(404).json({
          message: 'User not found',
        });
        return;
      }

      // 4. Return success response with full user object (matching other endpoints)
      res.status(200).json({
        message: 'Privacy settings updated successfully',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      logger.error('Error in updatePrivacy:', error);
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }

  // ==================== ADMIN METHODS ====================
  
  /**
   * GET /users/admin/all — Get all users (admin only).
   * @return 200 Users list
   */
  async getAllUsers(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        res.status(403).json({ message: 'Unauthorized: Admin access required' });
        return;
      }

      const users = await userModel.findAllWithAllFields();

      res.status(200).json({
        message: 'Users fetched successfully',
        data: { users, total: users.length },
      });
    } catch (error) {
      logger.error('Error in getAllUsers:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * PATCH /users/admin/:id/suspend — Suspend a user (admin only).
   * @param id string - User ID to suspend
   * @return 200 Success
   */
  async suspendUser(req: Request<{ id: string }>, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        res.status(403).json({ message: 'Unauthorized: Admin access required' });
        return;
      }

      const userId = new mongoose.Types.ObjectId(req.params.id);
      
      // Prevent admin from suspending themselves
      if (userId.equals(req.user._id)) {
        res.status(400).json({ message: 'Cannot suspend your own account' });
        return;
      }

      const user = await userModel.updateSuspensionStatus(userId, true);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.status(200).json({
        message: 'User suspended successfully',
        data: { user },
      });
    } catch (error) {
      logger.error('Error in suspendUser:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * PATCH /users/admin/:id/unsuspend — Unsuspend a user (admin only).
   * @param id string - User ID to unsuspend
   * @return 200 Success
   */
  async unsuspendUser(req: Request<{ id: string }>, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        res.status(403).json({ message: 'Unauthorized: Admin access required' });
        return;
      }

      const userId = new mongoose.Types.ObjectId(req.params.id);

      const user = await userModel.updateSuspensionStatus(userId, false);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.status(200).json({
        message: 'User unsuspended successfully',
        data: { user },
      });
    } catch (error) {
      logger.error('Error in unsuspendUser:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * DELETE /users/admin/:id — Delete a user (admin only).
   * @param id string - User ID to delete
   * @return 200 Success
   */
  async deleteUserByAdmin(req: Request<{ id: string }>, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        res.status(403).json({ message: 'Unauthorized: Admin access required' });
        return;
      }

      const userId = new mongoose.Types.ObjectId(req.params.id);
      
      // Prevent admin from deleting themselves
      if (userId.equals(req.user._id)) {
        res.status(400).json({ message: 'Cannot delete your own account' });
        return;
      }

      // Delete user's media
      await MediaService.deleteAllUserImages(userId.toString());

      // Delete user's pins (cascading delete)
      const deletedPinsCount = await pinModel.deleteAllByUser(userId);
      logger.info(`🗑️ Cascading delete: Removed ${deletedPinsCount} pins for user ${userId.toString()}`);

      // Delete user
      await userModel.delete(userId);

      res.status(200).json({
        message: 'User deleted successfully',
        deletedPins: deletedPinsCount,
      });
    } catch (error) {
      logger.error('Error in deleteUserByAdmin:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * PUT /users/me/fcm-token - Update user's FCM token for push notifications
   */
  async updateFcmToken(req: Request, res: Response): Promise<void> {
    logger.info('📤 [USER-CONTROLLER] FCM token update request received');
    
    try {
      // Authentication check
      if (!req.user) {
        logger.warn('🚫 [USER-CONTROLLER] Unauthorized FCM token update attempt');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      
      const userId = req.user._id;
      const userName = req.user.name || 'unknown';
      logger.info(`👤 [USER-CONTROLLER] FCM token update for user: ${userName} (${userId.toString()})`);
      
      const { fcmToken } = req.body;
      logger.debug(`📦 [USER-CONTROLLER] Request body keys: ${Object.keys(req.body as Record<string, unknown>).join(', ')}`);

      // Validation
      if (!fcmToken || typeof fcmToken !== 'string') {
        logger.warn('⚠️ [USER-CONTROLLER] Invalid FCM token in request');
        logger.debug(`🔍 [USER-CONTROLLER] Token type: ${typeof fcmToken}, value: ${fcmToken}`);
        res.status(400).json({ 
          message: 'FCM token is required and must be a string' 
        });
        return;
      }

      const trimmedToken = fcmToken.trim();
      logger.debug(`🔑 [USER-CONTROLLER] Token preview: ${trimmedToken.substring(0, 30)}...${trimmedToken.substring(trimmedToken.length - 10)}`);
      logger.debug(`📏 [USER-CONTROLLER] Token length: ${trimmedToken.length} characters`);

      // Update token in database
      logger.debug('💾 [USER-CONTROLLER] Updating FCM token in database...');
      const startTime = Date.now();
      const updatedUser = await userModel.updateFcmToken(userId, trimmedToken);
      const duration = Date.now() - startTime;
      logger.debug(`⏱️ [USER-CONTROLLER] Database update completed in ${duration}ms`);

      if (!updatedUser) {
        logger.error(`❌ [USER-CONTROLLER] User not found: ${userId.toString()}`);
        res.status(404).json({ message: 'User not found' });
        return;
      }

      // Success response
      const hasToken = !!updatedUser.fcmToken;
      logger.info(`🎉 [USER-CONTROLLER] FCM token updated successfully for user ${updatedUser.name}`);
      logger.debug(`✅ [USER-CONTROLLER] User now has token: ${hasToken}`);
      logger.debug(`🔍 [USER-CONTROLLER] Updated token preview: ${updatedUser.fcmToken?.substring(0, 30)}...${updatedUser.fcmToken?.substring(updatedUser.fcmToken.length - 10)}`);

      res.status(200).json({
        message: 'FCM token updated successfully',
        data: {
          userId: updatedUser._id,
          hasToken
        }
      });
      
      logger.debug('📤 [USER-CONTROLLER] Success response sent');
      
    } catch (error) {
      logger.error('💥 [USER-CONTROLLER] Error in updateFcmToken:', error);
      if (error instanceof Error) {
        logger.error(`   💬 Error message: ${error.message}`);
        logger.error(`   📍 Error stack: ${error.stack}`);
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * DELETE /users/me/fcm-token - Remove user's FCM token
   */
  async removeFcmToken(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      
      const userId = req.user._id;

      const updatedUser = await userModel.removeFcmToken(userId);

      if (!updatedUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      logger.info(`📱 FCM token removed for user ${updatedUser.name}`);

      res.status(200).json({
        message: 'FCM token removed successfully',
        data: {
          userId: updatedUser._id,
          hasToken: false
        }
      });
    } catch (error) {
      logger.error('Error in removeFcmToken:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
