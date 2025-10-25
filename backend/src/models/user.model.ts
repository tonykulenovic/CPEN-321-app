import mongoose, { Schema } from 'mongoose';
import { z } from 'zod';

import {
  createUserSchema,
  GoogleUserInfo,
  IUser,
  updateProfileSchema,
} from '../types/user.types';
import logger from '../utils/logger.util';

import { PrivacySettings } from '../types/friends.types';

const PrivacySchema = new Schema<PrivacySettings>(
  {
    profileVisibleTo: {
      type: String,
      enum: ['friends', 'everyone', 'private'],
      default: 'friends',
    },
    showBadgesTo: {
      type: String,
      enum: ['friends', 'everyone', 'private'],
      default: 'friends',
    },
    location: {
      sharing: {
        type: String,
        enum: ['off', 'live', 'approximate'],
        default: 'off',
      },
      precisionMeters: { type: Number, default: 30 },
    },
    allowFriendRequestsFrom: {
      type: String,
      enum: ['everyone', 'friendsOfFriends', 'noOne'],
      default: 'everyone',
    },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    profilePicture: {
      type: String,
      required: false,
      trim: true,
    },
    bio: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    campus: {
      type: String,
      required: false,
      trim: true,
    },
    privacy: {
      type: PrivacySchema,
      default: () => ({}),
    },
    friendsCount: {
      type: Number,
      default: 0,
    },
    badgesCount: {
      type: Number,
      default: 0,
    },

    isAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    fcmToken: {
      type: String,
      required: false,
      trim: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    stats: {
      pinsCreated: {
        type: Number,
        default: 0,
      },
      pinsVisited: {
        type: Number,
        default: 0,
      },
      librariesVisited: {
        type: Number,
        default: 0,
      },
      cafesVisited: {
        type: Number,
        default: 0,
      },
      reportsMade: {
        type: Number,
        default: 0,
      },
      locationsExplored: {
        type: Number,
        default: 0,
      },
    },
    visitedPins: [{
      type: Schema.Types.ObjectId,
      ref: 'Pin',
    }],
    loginTracking: {
      lastLoginDate: {
        type: Date,
        default: null,
      },
      currentStreak: {
        type: Number,
        default: 0,
      },
      longestStreak: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Text search index for username and name
userSchema.index({ username: 'text', name: 'text' });
// Virtual field to get user badges
userSchema.virtual('badges', {
  ref: 'UserBadge',
  localField: '_id',
  foreignField: 'userId',
  justOne: false,
});

export class UserModel {
  private user: mongoose.Model<IUser>;

  constructor() {
    this.user = mongoose.model<IUser>('User', userSchema);
  }

  async create(userInfo: GoogleUserInfo): Promise<IUser> {
    try {
      const validatedData = createUserSchema.parse(userInfo);

      return await this.user.create(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.issues);
        throw new Error('Invalid update data');
      }
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async update(
    userId: mongoose.Types.ObjectId,
    user: Partial<IUser>
  ): Promise<IUser | null> {
    try {
      const validatedData = updateProfileSchema.parse(user);

      const updatedUser = await this.user.findByIdAndUpdate(
        userId,
        validatedData,
        {
          new: true,
        }
      );
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async delete(userId: mongoose.Types.ObjectId): Promise<void> {
    try {
      await this.user.findByIdAndDelete(userId);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  async findById(_id: mongoose.Types.ObjectId): Promise<IUser | null> {
    try {
      const user = await this.user.findOne({ _id });

      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error finding user by Google ID:', error);
      throw new Error('Failed to find user');
    }
  }

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    try {
      const user = await this.user.findOne({ googleId });

      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error finding user by Google ID:', error);
      throw new Error('Failed to find user');
    }
  }

  async findByUsername(username: string): Promise<IUser | null> {
    try {
      const user = await this.user.findOne({ username });
      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw new Error('Failed to find user');
    }
  }

  async searchUsers(
    query: string,
    limit = 20
  ): Promise<Pick<IUser, '_id' | 'username' | 'name' | 'profilePicture' | 'privacy'>[]> {
    try {
      const users = await this.user
        .find(
          {
            $or: [
              { username: { $regex: query, $options: 'i' } },
              { name: { $regex: query, $options: 'i' } },
              { email: { $regex: query, $options: 'i' } },
            ],
          },
          '_id username name profilePicture privacy'
        )
        .limit(limit);

      return users;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  async updatePrivacy(
    userId: mongoose.Types.ObjectId,
    privacyUpdates: any
  ): Promise<IUser | null> {
    try {
      // Handle partial updates with dot notation for nested objects
      const updateObject: any = {};
      
      if (privacyUpdates.profileVisibleTo !== undefined) {
        updateObject['privacy.profileVisibleTo'] = privacyUpdates.profileVisibleTo;
      }
      
      if (privacyUpdates.showBadgesTo !== undefined) {
        updateObject['privacy.showBadgesTo'] = privacyUpdates.showBadgesTo;
      }
      
      if (privacyUpdates.allowFriendRequestsFrom !== undefined) {
        updateObject['privacy.allowFriendRequestsFrom'] = privacyUpdates.allowFriendRequestsFrom;
      }
      
      if (privacyUpdates.location) {
        if (privacyUpdates.location.sharing !== undefined) {
          updateObject['privacy.location.sharing'] = privacyUpdates.location.sharing;
        }
        if (privacyUpdates.location.precisionMeters !== undefined) {
          updateObject['privacy.location.precisionMeters'] = privacyUpdates.location.precisionMeters;
        }
      }

      return await this.user.findByIdAndUpdate(
        userId,
        { $set: updateObject },
        { new: true }
      );
    } catch (error) {
      logger.error('Error updating privacy settings:', error);
      throw new Error('Failed to update privacy settings');
    }
  }

  async incrementFriendsCount(
    userId: mongoose.Types.ObjectId,
    increment = 1
  ): Promise<void> {
    try {
      await this.user.findByIdAndUpdate(userId, {
        $inc: { friendsCount: increment },
      });
    } catch (error) {
      logger.error('Error updating friends count:', error);
      throw new Error('Failed to update friends count');
    };
  }

  async updateFcmToken(
    userId: mongoose.Types.ObjectId,
    fcmToken: string
  ): Promise<IUser | null> {
    try {
      const updatedUser = await this.user.findByIdAndUpdate(
        userId,
        { fcmToken },
        { new: true, select: '_id name fcmToken' }
      );
      return updatedUser;
    } catch (error) {
      logger.error('Error updating FCM token:', error);
      throw new Error('Failed to update FCM token');
    }
  }

  async removeFcmToken(
    userId: mongoose.Types.ObjectId
  ): Promise<IUser | null> {
    try {
      const updatedUser = await this.user.findByIdAndUpdate(
        userId,
        { $unset: { fcmToken: 1 } },
        { new: true, select: '_id name fcmToken' }
      );
      return updatedUser;
    } catch (error) {
      logger.error('Error removing FCM token:', error);
      throw new Error('Failed to remove FCM token');
    }
  }

  async findByIdWithBadges(_id: mongoose.Types.ObjectId): Promise<IUser | null> {
    try {
      const user = await this.user.findById(_id).populate({
        path: 'badges',
        populate: {
          path: 'badgeId',
          model: 'Badge',
        },
      });

      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error finding user with badges:', error);
      throw new Error('Failed to find user with badges');
    }
  }

  async updateLoginStreak(userId: mongoose.Types.ObjectId): Promise<number> {
    try {
      const user = await this.user.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let newStreak = 1;

      if (user.loginTracking?.lastLoginDate) {
        const lastLogin = new Date(user.loginTracking.lastLoginDate);
        const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());

        const daysDiff = Math.floor((today.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
          // Same day, don't update streak
          return user.loginTracking.currentStreak || 0;
        } else if (daysDiff === 1) {
          // Consecutive day, increment streak
          newStreak = (user.loginTracking.currentStreak || 0) + 1;
        }
        // daysDiff > 1: streak broken, newStreak = 1 (already set)
      }

      const longestStreak = Math.max(newStreak, user.loginTracking?.longestStreak || 0);

      await this.user.findByIdAndUpdate(userId, {
        $set: {
          'loginTracking.lastLoginDate': now,
          'loginTracking.currentStreak': newStreak,
          'loginTracking.longestStreak': longestStreak,
        },
      });

      logger.info(`User ${userId} login streak updated: ${newStreak} days`);
      return newStreak;
    } catch (error) {
      logger.error('Error updating login streak:', error);
      throw new Error('Failed to update login streak');
    }
  }

  async updateLastActiveAt(
    userId: mongoose.Types.ObjectId
  ): Promise<void> {
    try {
      await this.user.findByIdAndUpdate(
        userId,
        { lastActiveAt: new Date() }
      );
    } catch (error) {
      logger.error('Error updating last active time:', error);
      throw new Error('Failed to update last active time');
    }
  }

  async getOnlineStatus(
    userIds: mongoose.Types.ObjectId[],
    minutesThreshold: number = 10
  ): Promise<Map<string, boolean>> {
    try {
      const onlineStatus = new Map<string, boolean>();

      if (userIds.length === 0) {
        return onlineStatus;
      }

      // Calculate threshold time (X minutes ago)
      const thresholdTime = new Date();
      thresholdTime.setMinutes(thresholdTime.getMinutes() - minutesThreshold);

      // Find users who have been active recently
      const activeUsers = await this.user.find({
        _id: { $in: userIds },
        lastActiveAt: { $gte: thresholdTime }
      }, '_id lastActiveAt');

      // Initialize all users as offline
      userIds.forEach(userId => {
        onlineStatus.set(userId.toString(), false);
      });

      // Mark recently active users as online
      activeUsers.forEach(user => {
        onlineStatus.set(user._id.toString(), true);
      });

      logger.info(`👥 Online status: ${activeUsers.length}/${userIds.length} users online (threshold: ${minutesThreshold}min)`);

      return onlineStatus;
    } catch (error) {
      logger.error('Error getting online status:', error);
      // Return all users as offline on error
      const onlineStatus = new Map<string, boolean>();
      userIds.forEach(userId => {
        onlineStatus.set(userId.toString(), false);
      });
      return onlineStatus;
    }
  }

  async findAll(): Promise<IUser[]> {
    try {
      const users = await this.user.find({}, '_id name email username fcmToken lastActiveAt createdAt');
      return users;
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw new Error('Failed to find users');
    }
  }
}

export const userModel = new UserModel();
