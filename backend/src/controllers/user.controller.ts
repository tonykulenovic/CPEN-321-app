import { NextFunction, Request, Response } from 'express';

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

export class UserController {
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
      // TODO: Implement search users logic
      // 1. Validate query parameters
      // 2. Search users by username, name, or email
      // 3. Filter results based on privacy settings
      // 4. Return search results

      res.status(501).json({
        message: 'Search users not implemented yet',
      });
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
      // TODO: Implement update privacy logic
      // 1. Validate request body
      // 2. Get user ID from auth middleware
      // 3. Update user's privacy settings
      // 4. Return success response

      res.status(501).json({
        message: 'Update privacy not implemented yet',
      });
    } catch (error) {
      logger.error('Error in updatePrivacy:', error);
      res.status(500).json({
        message: 'Internal server error',
      });
    }
  }
}
