import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

import {
  BadgeResponse,
  BadgeStatsResponse,
  CreateBadgeRequest,
  UpdateBadgeRequest,
  AssignBadgeRequest,
  BadgeCategory,
  BadgeEarningEvent,
  BadgeRequirementType,
} from '../types/badge.types';
import { badgeModel } from '../models/badge.model';
import { BadgeService } from '../services/badge.service';
import logger from '../utils/logger.util';

export class BadgeController {
  // Admin endpoints for badge management
  async createBadge(
    req: Request<unknown, BadgeResponse, CreateBadgeRequest>,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const badge = await badgeModel.create(req.body);

      res.status(201).json({
        message: 'Badge created successfully',
        data: { badge },
      });
    } catch (error) {
      logger.error('Failed to create badge:', error);

      if (error instanceof Error) {
        return res.status(400).json({
          message: error.message || 'Failed to create badge',
        });
      }

      next(error);
    }
  }

  async getAllBadges(
    req: Request,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const { category, isActive } = req.query;
      const filters: any = {};

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

  async getBadgeById(
    req: Request<{ id: string }>,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const badgeId = new mongoose.Types.ObjectId(req.params.id);
      const badge = await badgeModel.findById(badgeId);

      if (!badge) {
        return res.status(404).json({
          message: 'Badge not found',
        });
      }

      res.status(200).json({
        message: 'Badge fetched successfully',
        data: { badge },
      });
    } catch (error) {
      logger.error('Failed to fetch badge:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to fetch badge',
        });
      }

      next(error);
    }
  }

  async updateBadge(
    req: Request<{ id: string }, BadgeResponse, UpdateBadgeRequest>,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const badgeId = new mongoose.Types.ObjectId(req.params.id);
      const badge = await badgeModel.update(badgeId, req.body);

      if (!badge) {
        return res.status(404).json({
          message: 'Badge not found',
        });
      }

      res.status(200).json({
        message: 'Badge updated successfully',
        data: { badge },
      });
    } catch (error) {
      logger.error('Failed to update badge:', error);

      if (error instanceof Error) {
        return res.status(400).json({
          message: error.message || 'Failed to update badge',
        });
      }

      next(error);
    }
  }

  async deleteBadge(
    req: Request<{ id: string }>,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const badgeId = new mongoose.Types.ObjectId(req.params.id);
      await badgeModel.delete(badgeId);

      res.status(200).json({
        message: 'Badge deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete badge:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to delete badge',
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
      const user = req.user!;
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
      const user = req.user!;
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
      const user = req.user!;
      const progress = await BadgeService.getUserBadgeProgress(user._id);

      res.status(200).json({
        message: 'Badge progress fetched successfully',
        data: { progress: progress },
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
      const user = req.user!;
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

  async getBadgesByCategory(
    req: Request<{ category: BadgeCategory }>,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const { category } = req.params;
      const badges = await badgeModel.findByCategory(category);

      res.status(200).json({
        message: 'Badges by category fetched successfully',
        data: { badges },
      });
    } catch (error) {
      logger.error('Failed to fetch badges by category:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to fetch badges by category',
        });
      }

      next(error);
    }
  }

  // Admin endpoint to manually assign badges
  async assignBadge(
    req: Request<unknown, BadgeResponse, AssignBadgeRequest>,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const { badgeId, userId, progress } = req.body;
      const targetUserId = userId ? new mongoose.Types.ObjectId(userId) : req.user!._id;
      const badgeObjectId = new mongoose.Types.ObjectId(badgeId);

      const progressWithTimestamp = progress ? {
        ...progress,
        lastUpdated: new Date(),
      } : undefined;
      
      const userBadge = await BadgeService.assignBadgeToUser(targetUserId, badgeObjectId, progressWithTimestamp);

      res.status(201).json({
        message: 'Badge assigned successfully',
        data: { userBadge },
      });
    } catch (error) {
      logger.error('Failed to assign badge:', error);

      if (error instanceof Error) {
        return res.status(400).json({
          message: error.message || 'Failed to assign badge',
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
      const event: BadgeEarningEvent = {
        ...req.body,
        userId: req.body.userId || req.user!._id.toString(),
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

  // Initialize default badges (admin endpoint)
  async initializeDefaultBadges(
    req: Request,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      await BadgeService.initializeDefaultBadges();

      res.status(200).json({
        message: 'Default badges initialized successfully',
      });
    } catch (error) {
      logger.error('Failed to initialize default badges:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to initialize default badges',
        });
      }

      next(error);
    }
  }

  // Update badge progress
  async updateBadgeProgress(
    req: Request<{ badgeId: string }, BadgeResponse, { progress: any }>,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const user = req.user!;
      const badgeId = new mongoose.Types.ObjectId(req.params.badgeId);
      const { progress } = req.body;

      const userBadge = await BadgeService.updateBadgeProgress(user._id, badgeId, progress);

      if (!userBadge) {
        return res.status(404).json({
          message: 'User badge not found',
        });
      }

      res.status(200).json({
        message: 'Badge progress updated successfully',
        data: { userBadge },
      });
    } catch (error) {
      logger.error('Failed to update badge progress:', error);

      if (error instanceof Error) {
        return res.status(400).json({
          message: error.message || 'Failed to update badge progress',
        });
      }

      next(error);
    }
  }

  // Remove a badge from user (admin endpoint)
  async removeUserBadge(
    req: Request<{ badgeId: string }>,
    res: Response<BadgeResponse>,
    next: NextFunction
  ) {
    try {
      const user = req.user!;
      const badgeId = new mongoose.Types.ObjectId(req.params.badgeId);

      await badgeModel.removeUserBadge(user._id, badgeId);

      res.status(200).json({
        message: 'Badge removed from user successfully',
      });
    } catch (error) {
      logger.error('Failed to remove user badge:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          message: error.message || 'Failed to remove user badge',
        });
      }

      next(error);
    }
  }
}
