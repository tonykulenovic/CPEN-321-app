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
      description: 'Create 50 pins',
      icon: 'pin_master',
      category: BadgeCategory.EXPLORATION,
      rarity: 'epic' as any,
      requirements: {
        type: BadgeRequirementType.PINS_CREATED,
        target: 50,
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
    // This would need to be implemented based on your login tracking system
    // For now, we'll use a placeholder implementation
    // You might want to track login dates in a separate collection or user model
    logger.info(`Checking login streak for user ${userId}, target: ${target}`);
    return false; // Placeholder - implement based on your login tracking
  }

  /**
   * Check pins created requirement
   */
  private static async checkPinsCreated(userId: mongoose.Types.ObjectId, target: number): Promise<boolean> {
    // This would need to be implemented based on your pin system
    // You might want to query a pins collection or track this in user stats
    logger.info(`Checking pins created for user ${userId}, target: ${target}`);
    return false; // Placeholder - implement based on your pin system
  }

  /**
   * Check pins visited requirement
   */
  private static async checkPinsVisited(userId: mongoose.Types.ObjectId, target: number): Promise<boolean> {
    // This would need to be implemented based on your pin visit tracking
    logger.info(`Checking pins visited for user ${userId}, target: ${target}`);
    return false; // Placeholder - implement based on your visit tracking
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

      const progress = available.map(badge => ({
        badge,
        progress: null, // This would need to be calculated based on current user activity
      }));

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
