import mongoose from 'mongoose';

import {
  BadgeCategory,
  BadgeRequirementType,
  BadgeEarningEvent,
  BadgeTemplate,
  BadgeProgress,
  IBadge,
  IUserBadge,
} from '../types/badge.types';
import { badgeModel } from '../models/badge.model';
import { pinModel } from '../models/pin.model';
import logger from '../utils/logger.util';

export class BadgeService {
  // Predefined badge templates
  private static readonly BADGE_TEMPLATES: BadgeTemplate[] = [
    // Activity badges
    {
      name: 'Early Bird',
      description: 'Log in for 5 consecutive days',
      icon: 'early_bird',
      category: BadgeCategory.ACTIVITY,
      rarity: 'common' as any,
      requirements: {
        type: BadgeRequirementType.LOGIN_STREAK,
        target: 5,
        timeframe: 'consecutive',
      },
    },
    {
      name: 'Dedicated Student',
      description: 'Log in for 30 consecutive days',
      icon: 'dedicated_student',
      category: BadgeCategory.ACTIVITY,
      rarity: 'rare' as any,
      requirements: {
        type: BadgeRequirementType.LOGIN_STREAK,
        target: 30,
        timeframe: 'consecutive',
      },
    },
    {
      name: 'Pin Creator',
      description: 'Create your first pin',
      icon: 'pin_creator',
      category: BadgeCategory.EXPLORATION,
      rarity: 'common' as any,
      requirements: {
        type: BadgeRequirementType.PINS_CREATED,
        target: 1,
      },
    },
    {
      name: 'Campus Explorer',
      description: 'Create 10 pins',
      icon: 'campus_explorer',
      category: BadgeCategory.EXPLORATION,
      rarity: 'uncommon' as any,
      requirements: {
        type: BadgeRequirementType.PINS_CREATED,
        target: 10,
      },
    },
    {
      name: 'Pin Master',
      description: 'Create 25 pins',
      icon: 'pin_master',
      category: BadgeCategory.EXPLORATION,
      rarity: 'epic' as any,
      requirements: {
        type: BadgeRequirementType.PINS_CREATED,
        target: 25,
      },
    },
    {
      name: 'Social Butterfly',
      description: 'Add 5 friends',
      icon: 'social_butterfly',
      category: BadgeCategory.SOCIAL,
      rarity: 'common' as any,
      requirements: {
        type: BadgeRequirementType.FRIENDS_ADDED,
        target: 5,
      },
    },
    {
      name: 'Community Leader',
      description: 'Add 20 friends',
      icon: 'community_leader',
      category: BadgeCategory.SOCIAL,
      rarity: 'rare' as any,
      requirements: {
        type: BadgeRequirementType.FRIENDS_ADDED,
        target: 20,
      },
    },
    {
      name: 'First Visit',
      description: 'Visit your first pin',
      icon: 'first_visit',
      category: BadgeCategory.EXPLORATION,
      rarity: 'common' as any,
      requirements: {
        type: BadgeRequirementType.PINS_VISITED,
        target: 1,
      },
    },
    {
      name: 'Frequent Visitor',
      description: 'Visit 25 pins',
      icon: 'frequent_visitor',
      category: BadgeCategory.EXPLORATION,
      rarity: 'uncommon' as any,
      requirements: {
        type: BadgeRequirementType.PINS_VISITED,
        target: 25,
      },
    },
    {
      name: 'Campus Guardian',
      description: 'Report 3 inappropriate pins',
      icon: 'campus_guardian',
      category: BadgeCategory.ACHIEVEMENT,
      rarity: 'uncommon' as any,
      requirements: {
        type: BadgeRequirementType.REPORTS_MADE,
        target: 3,
      },
    },
    {
      name: 'Bookworm',
      description: 'Visit 3 libraries',
      icon: 'library',
      category: BadgeCategory.EXPLORATION,
      rarity: 'uncommon' as any,
      requirements: {
        type: BadgeRequirementType.LIBRARIES_VISITED,
        target: 3,
      },
    },
    {
      name: 'Caffeine Addict',
      description: 'Visit 3 coffee shops',
      icon: 'coffee',
      category: BadgeCategory.EXPLORATION,
      rarity: 'uncommon' as any,
      requirements: {
        type: BadgeRequirementType.CAFES_VISITED,
        target: 3,
      },
    },
  ];

  /**
   * Initialize default badges in the database
   */
  static async initializeDefaultBadges(): Promise<void> {
    try {
      for (const template of this.BADGE_TEMPLATES) {
        const existingBadge = await badgeModel.findAll({ name: template.name });
        if (existingBadge.length === 0) {
          await badgeModel.create(template);
          logger.info(`Created default badge: ${template.name}`);
        }
      }
    } catch (error) {
      logger.error('Error initializing default badges:', error);
      throw new Error('Failed to initialize default badges');
    }
  }

  /**
   * Process a badge earning event and check if user qualifies for any badges
   */
  static async processBadgeEvent(event: BadgeEarningEvent): Promise<IUserBadge[]> {
    try {
      const userId = new mongoose.Types.ObjectId(event.userId);
      const earnedBadges: IUserBadge[] = [];

      // Get all active badges that match the event type
      const relevantBadges = await badgeModel.findAll({
        'requirements.type': event.eventType,
        isActive: true,
      });

      for (const badge of relevantBadges) {
        // Check if user already has this badge
        const existingUserBadge = await badgeModel.getUserBadge(userId, badge._id);
        if (existingUserBadge) {
          continue; // User already has this badge
        }

        // Check if user qualifies for this badge
        const qualifies = await this.checkBadgeQualification(userId, badge, event);
        if (qualifies) {
          const progress: BadgeProgress = {
            current: badge.requirements.target,
            target: badge.requirements.target,
            percentage: 100,
            lastUpdated: new Date(),
          };

          const userBadge = await badgeModel.assignBadge(userId, badge._id, progress);
          earnedBadges.push(userBadge);
          logger.info(`User ${event.userId} earned badge: ${badge.name}`);
        }
      }

      return earnedBadges;
    } catch (error) {
      logger.error('Error processing badge event:', error);
      throw new Error('Failed to process badge event');
    }
  }

  /**
   * Check if a user qualifies for a specific badge
   */
  private static async checkBadgeQualification(
    userId: mongoose.Types.ObjectId,
    badge: IBadge,
    event: BadgeEarningEvent
  ): Promise<boolean> {
    try {
      switch (badge.requirements.type) {
        case BadgeRequirementType.LOGIN_STREAK:
          return await this.checkLoginStreak(userId, badge.requirements.target);
        
        case BadgeRequirementType.PINS_CREATED:
          return await this.checkPinsCreated(userId, badge.requirements.target);
        
        case BadgeRequirementType.PINS_VISITED:
          return await this.checkPinsVisited(userId, badge.requirements.target);
        
        case BadgeRequirementType.FRIENDS_ADDED:
          return await this.checkFriendsAdded(userId, badge.requirements.target);
        
        case BadgeRequirementType.REPORTS_MADE:
          return await this.checkReportsMade(userId, badge.requirements.target);
        
        case BadgeRequirementType.TIME_SPENT:
          return await this.checkTimeSpent(userId, badge.requirements.target);
        
        case BadgeRequirementType.LOCATIONS_EXPLORED:
          return await this.checkLocationsExplored(userId, badge.requirements.target);
        
        case BadgeRequirementType.LIBRARIES_VISITED:
          return await this.checkLibrariesVisited(userId, badge.requirements.target);
        
        case BadgeRequirementType.CAFES_VISITED:
          return await this.checkCafesVisited(userId, badge.requirements.target);
        
        default:
          logger.warn(`Unknown badge requirement type: ${badge.requirements.type}`);
          return false;
      }
    } catch (error) {
      logger.error('Error checking badge qualification:', error);
      return false;
    }
  }

  /**
   * Check login streak requirement
   */
  private static async checkLoginStreak(userId: mongoose.Types.ObjectId, target: number): Promise<boolean> {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('loginTracking');
      const currentStreak = user?.loginTracking?.currentStreak || 0;
      logger.info(`User ${userId} login streak: ${currentStreak} days, target: ${target}`);
      return currentStreak >= target;
    } catch (error) {
      logger.error('Error checking login streak:', error);
      return false;
    }
  }

  /**
   * Check pins created requirement
   */
  private static async checkPinsCreated(userId: mongoose.Types.ObjectId, target: number): Promise<boolean> {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('stats.pinsCreated');
      const count = user?.stats?.pinsCreated || 0;
      logger.info(`User ${userId} has created ${count} pins (cumulative), target: ${target}`);
      return count >= target;
    } catch (error) {
      logger.error('Error checking pins created:', error);
      return false;
    }
  }

  /**
   * Check pins visited requirement
   */
  private static async checkPinsVisited(userId: mongoose.Types.ObjectId, target: number): Promise<boolean> {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('stats.pinsVisited');
      const count = user?.stats?.pinsVisited || 0;
      logger.info(`User ${userId} has visited ${count} pins (cumulative), target: ${target}`);
      return count >= target;
    } catch (error) {
      logger.error('Error checking pins visited:', error);
      return false;
    }
  }

  /**
   * Check friends added requirement
   */
  private static async checkFriendsAdded(userId: mongoose.Types.ObjectId, target: number): Promise<boolean> {
    // This would need to be implemented based on your friends system
    logger.info(`Checking friends added for user ${userId}, target: ${target}`);
    return false; // Placeholder - implement based on your friends system
  }

  /**
   * Check reports made requirement
   */
  private static async checkReportsMade(userId: mongoose.Types.ObjectId, target: number): Promise<boolean> {
    // This would need to be implemented based on your reporting system
    logger.info(`Checking reports made for user ${userId}, target: ${target}`);
    return false; // Placeholder - implement based on your reporting system
  }

  /**
   * Check time spent requirement
   */
  private static async checkTimeSpent(userId: mongoose.Types.ObjectId, target: number): Promise<boolean> {
    // This would need to be implemented based on your time tracking system
    logger.info(`Checking time spent for user ${userId}, target: ${target}`);
    return false; // Placeholder - implement based on your time tracking
  }

  /**
   * Check locations explored requirement
   */
  private static async checkLocationsExplored(userId: mongoose.Types.ObjectId, target: number): Promise<boolean> {
    // This would need to be implemented based on your location tracking
    logger.info(`Checking locations explored for user ${userId}, target: ${target}`);
    return false; // Placeholder - implement based on your location tracking
  }

  /**
   * Check libraries visited requirement
   */
  private static async checkLibrariesVisited(userId: mongoose.Types.ObjectId, target: number): Promise<boolean> {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('stats.librariesVisited');
      const count = user?.stats?.librariesVisited || 0;
      logger.info(`User ${userId} has visited ${count} libraries (cumulative), target: ${target}`);
      return count >= target;
    } catch (error) {
      logger.error('Error checking libraries visited:', error);
      return false;
    }
  }

  /**
   * Check cafes visited requirement
   */
  private static async checkCafesVisited(userId: mongoose.Types.ObjectId, target: number): Promise<boolean> {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('stats.cafesVisited');
      const count = user?.stats?.cafesVisited || 0;
      logger.info(`User ${userId} has visited ${count} cafes (cumulative), target: ${target}`);
      return count >= target;
    } catch (error) {
      logger.error('Error checking cafes visited:', error);
      return false;
    }
  }

  /**
   * Calculate current progress for a badge
   */
  private static async calculateBadgeProgress(
    userId: mongoose.Types.ObjectId,
    badge: IBadge
  ): Promise<BadgeProgress | null> {
    try {
      let current = 0;
      const target = badge.requirements.target;

      // Get user stats for cumulative tracking
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('stats loginTracking friendsCount');

      switch (badge.requirements.type) {
        case BadgeRequirementType.PINS_CREATED:
          current = user?.stats?.pinsCreated || 0;
          break;
        
        case BadgeRequirementType.PINS_VISITED:
          current = user?.stats?.pinsVisited || 0;
          break;
        
        case BadgeRequirementType.FRIENDS_ADDED:
          // Use friendsCount for now, can track cumulative later
          current = user?.friendsCount || 0;
          break;
        
        case BadgeRequirementType.REPORTS_MADE:
          current = user?.stats?.reportsMade || 0;
          break;
        
        case BadgeRequirementType.LOCATIONS_EXPLORED:
          current = user?.stats?.locationsExplored || 0;
          break;
        
        case BadgeRequirementType.LIBRARIES_VISITED:
          current = user?.stats?.librariesVisited || 0;
          break;
        
        case BadgeRequirementType.CAFES_VISITED:
          current = user?.stats?.cafesVisited || 0;
          break;
        
        case BadgeRequirementType.LOGIN_STREAK:
          current = user?.loginTracking?.currentStreak || 0;
          break;
        
        default:
          current = 0;
      }

      const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

      return {
        current: Math.min(current, target),
        target,
        percentage,
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error('Error calculating badge progress:', error);
      return null;
    }
  }

  /**
   * Get user's badge progress for all available badges
   */
  static async getUserBadgeProgress(userId: mongoose.Types.ObjectId): Promise<{
    earned: IUserBadge[];
    available: IBadge[];
    progress: Array<{ badge: IBadge; progress: BadgeProgress | null }>;
  }> {
    try {
      const [earned, available] = await Promise.all([
        badgeModel.getUserBadges(userId),
        badgeModel.getAvailableBadges(userId),
      ]);

      // Calculate progress for each available badge
      const progressPromises = available.map(async badge => {
        const currentProgress = await this.calculateBadgeProgress(userId, badge);
        return {
          badge,
          progress: currentProgress,
        };
      });

      const progress = await Promise.all(progressPromises);

      return { earned, available, progress };
    } catch (error) {
      logger.error('Error getting user badge progress:', error);
      throw new Error('Failed to get user badge progress');
    }
  }

  /**
   * Manually assign a badge to a user (admin function)
   */
  static async assignBadgeToUser(
    userId: mongoose.Types.ObjectId,
    badgeId: mongoose.Types.ObjectId,
    progress?: BadgeProgress
  ): Promise<IUserBadge> {
    try {
      return await badgeModel.assignBadge(userId, badgeId, progress);
    } catch (error) {
      logger.error('Error assigning badge to user:', error);
      throw new Error('Failed to assign badge to user');
    }
  }

  /**
   * Get badge statistics for a user
   */
  static async getUserBadgeStats(userId: mongoose.Types.ObjectId) {
    try {
      return await badgeModel.getBadgeStats(userId);
    } catch (error) {
      logger.error('Error getting user badge stats:', error);
      throw new Error('Failed to get user badge stats');
    }
  }

  /**
   * Update badge progress for a user
   */
  static async updateBadgeProgress(
    userId: mongoose.Types.ObjectId,
    badgeId: mongoose.Types.ObjectId,
    progress: BadgeProgress
  ): Promise<IUserBadge | null> {
    try {
      return await badgeModel.updateBadgeProgress(userId, badgeId, progress);
    } catch (error) {
      logger.error('Error updating badge progress:', error);
      throw new Error('Failed to update badge progress');
    }
  }
}
