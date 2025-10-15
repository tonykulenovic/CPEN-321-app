import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

import {
  GetProfileResponse,
  UpdateProfileRequest,
} from '../types/user.types';
import {
  UserSearchQuery,
  UpdatePrivacyRequest,
  UserSearchResponse,
  userSearchQuerySchema,
  privacySettingsSchema,
} from '../types/friends.types';
import logger from '../utils/logger.util';
import { MediaService } from '../services/media.service';
import { userModel } from '../models/user.model';
import { friendshipModel } from '../models/friendship.model';

export class UserController {
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
    switch (profileVisibleTo) {
      case 'everyone':
        // Anyone can find this user in search results
        return true;
      case 'friends':
        // Only friends can find this user in search results
        return await friendshipModel.areFriends(viewerId, targetUserId);
      case 'private':
        // User doesn't appear in search results at all
        // (but friends can still access profile through other means like friend lists)
        return false;
      default:
        return false; // Default to private for unknown values
    }
  }
  getProfile(req: Request, res: Response<GetProfileResponse>) {
    const user = req.user!;

    res.status(200).json({
      message: 'Profile fetched successfully',
      data: { user },
    });
  }

  async updateProfile(
    req: Request<unknown, unknown, UpdateProfileRequest>,
    res: Response<GetProfileResponse>,
    next: NextFunction
  ) {
    try {
      const user = req.user!;

      const updatedUser = await userModel.update(user._id, req.body);

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
      const user = req.user!;

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
   * GET /users/search — Search users.
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
      const searchLimit = limit ? parseInt(limit, 10) : 20;

      // Get current user to exclude from results
      const currentUser = req.user!;
      const currentUserId = currentUser._id;

      // 2. Search users by username, name, or email
      const users = await userModel.searchUsers(q, searchLimit + 50); // Get extra to account for filtering

      // 3. Filter results based on privacy settings and exclude current user
      const filteredUsers = [];
      
      for (const user of users) {
        // Exclude current user
        if (user._id.toString() === currentUserId.toString()) {
          continue;
        }

        // Apply privacy filtering based on user's profileVisibleTo setting
        const canViewProfile = await this.canViewUserProfile(currentUserId, user._id, user.privacy.profileVisibleTo);
        
        if (canViewProfile) {
          filteredUsers.push(user);
        }

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
      const user = req.user!;
      
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
      if (Object.keys(privacyUpdates).length === 0) {
        res.status(400).json({
          message: 'At least one privacy setting must be provided',
        });
        return;
      }

      // 2. Get user ID from auth middleware
      const currentUser = req.user!;
      const currentUserId = currentUser._id;

      // 3. Update user's privacy settings
      const updatedUser = await userModel.updatePrivacy(currentUserId, privacyUpdates);

      if (!updatedUser) {
        res.status(404).json({
          message: 'User not found',
        });
        return;
      }

      // 4. Return success response
      res.status(200).json({
        message: 'Privacy settings updated successfully',
        data: {
          success: true,
          privacy: updatedUser.privacy,
        },
      });
    } catch (error) {
      logger.error('Error in updatePrivacy:', error);
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}
