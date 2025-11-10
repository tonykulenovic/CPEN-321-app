import mongoose, { Schema } from 'mongoose';
import { z } from 'zod';

import {
  BadgeCategory,
  BadgeRarity,
  BadgeRequirementType,
  BadgeProgress,
  createBadgeSchema,
  updateBadgeSchema,
  IBadge,
  IUserBadge,
} from '../types/badge.types';
import logger from '../utils/logger.util';

// Badge Schema
const badgeSchema = new Schema<IBadge>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(BadgeCategory),
      required: true,
    },
    rarity: {
      type: String,
      enum: Object.values(BadgeRarity),
      required: true,
    },
    requirements: {
      type: new Schema({
        type: {
          type: String,
          enum: Object.values(BadgeRequirementType),
          required: true,
        },
        target: {
          type: Number,
          required: true,
          min: 1,
        },
        timeframe: {
          type: String,
          required: false,
        },
        conditions: {
          type: Schema.Types.Mixed,
          required: false,
        },
      }, { _id: false }),
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// UserBadge Schema
const userBadgeSchema = new Schema<IUserBadge>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    badgeId: {
      type: Schema.Types.ObjectId,
      ref: 'Badge',
      required: true,
      index: true,
    },
    earnedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    progress: {
      current: {
        type: Number,
        default: 0,
        min: 0,
      },
      target: {
        type: Number,
        required: true,
        min: 1,
      },
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    isDisplayed: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
userBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
userBadgeSchema.index({ userId: 1, earnedAt: -1 });
badgeSchema.index({ category: 1, rarity: 1 });
badgeSchema.index({ isActive: 1 });

export class BadgeModel {
  private badge: mongoose.Model<IBadge>;
  private userBadge: mongoose.Model<IUserBadge>;

  constructor() {
    this.badge = mongoose.model<IBadge>('Badge', badgeSchema);
    this.userBadge = mongoose.model<IUserBadge>('UserBadge', userBadgeSchema);
  }

  // Badge CRUD operations
  async create(badgeData: unknown): Promise<IBadge> {
    try {
      const validatedData = createBadgeSchema.parse(badgeData);
      return await this.badge.create(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Badge validation error:', error.issues);
        throw new Error('Invalid badge data');
      }
      logger.error('Error creating badge:', error);
      throw new Error('Failed to create badge');
    }
  }

  async findById(badgeId: mongoose.Types.ObjectId): Promise<IBadge | null> {
    try {
      return await this.badge.findById(badgeId);
    } catch (error) {
      logger.error('Error finding badge by ID:', error);
      throw new Error('Failed to find badge');
    }
  }

  async findAll(filters: Record<string, unknown> = {}): Promise<IBadge[]> {
    try {
      return await this.badge.find(filters).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Error finding badges:', error);
      throw new Error('Failed to find badges');
    }
  }

  async findByCategory(category: BadgeCategory): Promise<IBadge[]> {
    try {
      return await this.badge.find({ category, isActive: true }).sort({ rarity: 1, name: 1 });
    } catch (error) {
      logger.error('Error finding badges by category:', error);
      throw new Error('Failed to find badges by category');
    }
  }

  async update(badgeId: mongoose.Types.ObjectId, updateData: unknown): Promise<IBadge | null> {
    try {
      const validatedData = updateBadgeSchema.parse(updateData);
      return await this.badge.findByIdAndUpdate(badgeId, validatedData, { new: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Badge update validation error:', error.issues);
        throw new Error('Invalid badge update data');
      }
      logger.error('Error updating badge:', error);
      throw new Error('Failed to update badge');
    }
  }

  async delete(badgeId: mongoose.Types.ObjectId): Promise<void> {
    try {
      await this.badge.findByIdAndDelete(badgeId);
      // Also remove all user badge associations
      await this.userBadge.deleteMany({ badgeId });
    } catch (error) {
      logger.error('Error deleting badge:', error);
      throw new Error('Failed to delete badge');
    }
  }

  // UserBadge operations
  async assignBadge(userId: mongoose.Types.ObjectId, badgeId: mongoose.Types.ObjectId, progress?: BadgeProgress): Promise<IUserBadge> {
    try {
      // Get badge to get target for default progress
      const badge = await this.badge.findById(badgeId);
      const defaultTarget = badge?.requirements?.target ?? 0;

      const userBadgeData: Record<string, unknown> = {
        userId,
        badgeId,
        earnedAt: new Date(),
        isDisplayed: true,
      };

      if (progress) {
        userBadgeData.progress = {
          ...progress,
          lastUpdated: new Date(),
        };
      } else {
        // Provide default progress to satisfy schema requirements
        userBadgeData.progress = {
          current: 0,
          target: defaultTarget,
          percentage: 0,
          lastUpdated: new Date(),
        };
      }

      return await this.userBadge.create(userBadgeData);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error) {
        const mongoError = error as { code: number };
        if (mongoError.code === 11000) {
          throw new Error('User already has this badge');
        }
      }
      logger.error('Error assigning badge:', error);
      throw new Error('Failed to assign badge');
    }
  }

  async getUserBadges(userId: mongoose.Types.ObjectId): Promise<IUserBadge[]> {
    try {
      const userBadges = await this.userBadge
        .find({ userId })
        .populate('badgeId')
        .sort({ earnedAt: -1 });
      
      // Filter out badges where badgeId is null (badge template was deleted)
      // After populate, badgeId can be null if the badge was deleted
      return userBadges.filter(ub => {
        const badge = ub.badgeId;
        return badge != null;
      });
    } catch (error) {
      logger.error('Error getting user badges:', error);
      throw new Error('Failed to get user badges');
    }
  }

  async getUserBadge(userId: mongoose.Types.ObjectId, badgeId: mongoose.Types.ObjectId): Promise<IUserBadge | null> {
    try {
      return await this.userBadge
        .findOne({ userId, badgeId })
        .populate('badgeId');
    } catch (error) {
      logger.error('Error getting user badge:', error);
      throw new Error('Failed to get user badge');
    }
  }

  async getBadgeStats(userId: mongoose.Types.ObjectId): Promise<{
    totalBadges: number;
    earnedBadges: number;
    categoryBreakdown: Record<BadgeCategory, number>;
    recentBadges: IUserBadge[];
  }> {
    try {
      const [totalBadges, userBadges] = await Promise.all([
        this.badge.countDocuments({ isActive: true }),
        this.userBadge.find({ userId }).populate('badgeId').sort({ earnedAt: -1 }).limit(5),
      ]);

      // Filter out user badges where badgeId is null (badge was deleted)
      const validUserBadges = userBadges.filter(ub => {
        const badge = ub.badgeId;
        return badge !== null && badge !== undefined;
      });

      // Initialize all categories to 0
      const categoryBreakdown = Object.values(BadgeCategory).reduce((acc, category) => {
        acc[category] = validUserBadges.filter(ub => {
          const badge = ub.badgeId as IBadge | mongoose.Types.ObjectId;
          return typeof badge === 'object' && 'category' in badge && badge.category === category;
        }).length;
        return acc;
      }, {
        [BadgeCategory.ACTIVITY]: 0,
        [BadgeCategory.SOCIAL]: 0,
        [BadgeCategory.EXPLORATION]: 0,
        [BadgeCategory.ACHIEVEMENT]: 0,
        [BadgeCategory.SPECIAL]: 0,
      } as Record<BadgeCategory, number>);

      return {
        totalBadges,
        earnedBadges: validUserBadges.length,
        categoryBreakdown,
        recentBadges: validUserBadges,
      };
    } catch (error) {
      logger.error('Error getting badge stats:', error);
      throw new Error('Failed to get badge stats');
    }
  }

  async getAvailableBadges(userId: mongoose.Types.ObjectId): Promise<IBadge[]> {
    try {
      const userBadgeIds = await this.userBadge.distinct('badgeId', { userId });
      return await this.badge.find({
        _id: { $nin: userBadgeIds },
        isActive: true,
      }).sort({ category: 1, rarity: 1 });
    } catch (error) {
      logger.error('Error getting available badges:', error);
      throw new Error('Failed to get available badges');
    }
  }
}

export const badgeModel = new BadgeModel();
