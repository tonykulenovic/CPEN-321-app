import { NextFunction, Request, Response } from 'express';

import {
  BadgeResponse,
  BadgeStatsResponse,
  BadgeCategory,
  BadgeEarningEvent,
} from '../types/badge.types';
import { badgeModel } from '../models/badge.model';
import { BadgeService } from '../services/badge.service';
import logger from '../utils/logger.util';

export class BadgeController {
  // Get all badges with optional filtering (badges are predefined in code)
  async getAllBadges(
    req: Request,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const { category, isActive } = req.query;
      const filters: Record<string, unknown> = {};

      if (category) {
        filters.category = category;
      }
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      const badges = await badgeModel.findAll(filters);

      res.status(200).json({
        message: 'Badges fetched successfully',
        data: { badges },
      });
    } catch (error) {
      logger.error('Failed to fetch badges:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to fetch badges',
        });
      }

      next(error);
    }
  }

  // User endpoints for badge interaction
  async getUserBadges(
    req: Request,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userBadges = await badgeModel.getUserBadges(user._id);

      res.status(200).json({
        message: 'User badges fetched successfully',
        data: { userBadges },
      });
    } catch (error) {
      logger.error('Failed to fetch user badges:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to fetch user badges',
        });
      }

      next(error);
    }
  }

  async getAvailableBadges(
    req: Request,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const availableBadges = await badgeModel.getAvailableBadges(user._id);

      res.status(200).json({
        message: 'Available badges fetched successfully',
        data: { badges: availableBadges },
      });
    } catch (error) {
      logger.error('Failed to fetch available badges:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to fetch available badges',
        });
      }

      next(error);
    }
  }

  async getBadgeProgress(
    req: Request,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const progress = await BadgeService.getUserBadgeProgress(user._id);

      res.status(200).json({
        message: 'Badge progress fetched successfully',
        data: { progress },
      });
    } catch (error) {
      logger.error('Failed to fetch badge progress:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to fetch badge progress',
        });
      }

      next(error);
    }
  }

  async getBadgeStats(
    req: Request,
    res: Response<BadgeStatsResponse>,
    next: NextFunction
  ) {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ 
          message: 'Unauthorized',
          data: {
            totalBadges: 0,
            earnedBadges: 0,
            recentBadges: [],
            categoryBreakdown: {} as Record<BadgeCategory, number>,
          }
        });
        return;
      }
      const stats = await BadgeService.getUserBadgeStats(user._id);

      res.status(200).json({
        message: 'Badge statistics fetched successfully',
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to fetch badge statistics:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to fetch badge statistics',
          data: {
            totalBadges: 0,
            earnedBadges: 0,
            recentBadges: [],
            categoryBreakdown: {} as Record<BadgeCategory, number>,
          },
        });
      }

      next(error);
    }
  }

  // Endpoint to process badge earning events
  async processBadgeEvent(
    req: Request<unknown, BadgeResponse, BadgeEarningEvent>,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const userId = req.body.userId || req.user?._id?.toString();
      if (!userId) {
        return res.status(400).json({
          message: 'User ID is required',
        });
      }

      const event: BadgeEarningEvent = {
        ...req.body,
        userId,
        timestamp: new Date(),
      };

      const earnedBadges = await BadgeService.processBadgeEvent(event);

      res.status(200).json({
        message: 'Badge event processed successfully',
        data: { userBadges: earnedBadges },
      });
    } catch (error) {
      logger.error('Failed to process badge event:', error);

      if (error instanceof Error) {
        return res.status(400).json({
          message: error.message || 'Failed to process badge event',
        });
      }

      next(error);
    }
  }
}
