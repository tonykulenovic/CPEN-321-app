import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { pinModel } from '../models/pin.model';
import { pinVoteModel } from '../models/pinVote.model';
import {
  CreatePinRequest,
  UpdatePinRequest,
  RatePinRequest,
  ReportPinRequest,
  SearchPinsRequest,
  PinResponse,
  PinsListResponse,
  PinCategory,
} from '../types/pins.types';
import logger from '../utils/logger.util';
import { BadgeService } from '../services/badge.service';
import { BadgeRequirementType } from '../types/badge.types';

export class PinsController {
  async createPin(
    req: Request<unknown, unknown, CreatePinRequest>,
    res: Response<PinResponse>,
    next: NextFunction
  ) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const pin = await pinModel.create(userId, req.body);
      
      // Increment user's cumulative pins created counter
      try {
        const User = mongoose.model('User');
        await User.findByIdAndUpdate(userId, {
          $inc: { 'stats.pinsCreated': 1 },
        });
      } catch (statsError) {
        logger.error('Error updating user stats:', statsError);
      }
      
      // Process badge event for pin creation
      try {
        const earnedBadges = await BadgeService.processBadgeEvent({
          userId: userId.toString(),
          eventType: BadgeRequirementType.PINS_CREATED,
          value: 1,
          timestamp: new Date(),
          metadata: {
            pinId: pin._id.toString(),
            category: pin.category,
          },
        });
        
        if (earnedBadges.length > 0) {
          logger.info(`User ${userId.toString()} earned ${earnedBadges.length} badge(s) from creating a pin`);
        }
      } catch (badgeError) {
        // Log badge processing error but don't fail the pin creation
        logger.error('Error processing badge event for pin creation:', badgeError);
      }
      
      res.status(201).json({ message: 'Pin created successfully', data: { pin } });
    } catch (error) {
      logger.error('Failed to create pin:', error as Error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message || 'Failed to create pin' });
      }
      next(error);
    }
  }

  async getPin(
    req: Request<{ id: string }>,
    res: Response<PinResponse>,
    next: NextFunction
  ) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const userId = req.user?._id; // Get current user's ID
      const pin = await pinModel.findById(pinId, userId);
      if (!pin) return res.status(404).json({ message: 'Pin not found' });
      res.status(200).json({ message: 'Pin fetched successfully', data: { pin } });
    } catch (error) {
      logger.error('Failed to get pin:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to get pin' });
      }
      next(error);
    }
  }

  async updatePin(
    req: Request<{ id: string }, unknown, UpdatePinRequest>,
    res: Response<PinResponse>,
    next: NextFunction
  ) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const pin = await pinModel.update(pinId, userId, req.body);
      if (!pin) return res.status(404).json({ message: 'Pin not found or unauthorized' });
      res.status(200).json({ message: 'Pin updated successfully', data: { pin } });
    } catch (error) {
      logger.error('Failed to update pin:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to update pin' });
      }
      next(error);
    }
  }

  async deletePin(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const isAdmin = req.user?.isAdmin || false;
      const deleted = await pinModel.delete(pinId, userId, isAdmin);
      if (!deleted) return res.status(404).json({ message: 'Pin not found or unauthorized' });
      res.status(200).json({ message: 'Pin deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete pin:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to delete pin' });
      }
      next(error);
    }
  }

  async searchPins(
    req: Request<unknown, unknown, unknown, SearchPinsRequest>,
    res: Response<PinsListResponse>,
    next: NextFunction
  ) {
    try {
      const userId = req.user?._id; // Get userId from auth middleware
      const { pins, total } = await pinModel.search({
        category: req.query.category,
        latitude: req.query.latitude,
        longitude: req.query.longitude,
        radius: req.query.radius,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit,
        userId, // Pass userId for visibility filtering
      });
      res.status(200).json({ message: 'Pins fetched successfully', data: { pins, total, page: req.query.page || 1, limit: req.query.limit || 20 } });
    } catch (error) {
      logger.error('Failed to search pins:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to search pins' });
      }
      next(error);
    }
  }

  async ratePin(
    req: Request<{ id: string }, unknown, RatePinRequest>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const { voteType } = req.body;
      
      const result = await pinVoteModel.vote(userId, pinId, voteType);
      
      // Get the user's current vote status after the action
      const currentVote = await pinVoteModel.getUserVote(userId, pinId);
      
      res.status(200).json({ 
        message: result.action === 'removed' 
          ? `${voteType} removed successfully` 
          : `Pin ${voteType}d successfully`,
        data: {
          action: result.action,
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          userVote: currentVote
        }
      });
    } catch (error) {
      logger.error('Failed to rate pin:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to rate pin' });
      }
      next(error);
    }
  }

  async getUserVote(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userVote = await pinVoteModel.getUserVote(userId, pinId);
      
      res.status(200).json({ 
        data: {
          userVote
        }
      });
    } catch (error) {
      logger.error('Failed to get user vote:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to get user vote' });
      }
      next(error);
    }
  }

  async reportPin(
    req: Request<{ id: string }, unknown, ReportPinRequest>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const { reason } = req.body;
      
      // Check if user has already reported this pin
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('reportedPins');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const alreadyReported = user.reportedPins?.some((id: mongoose.Types.ObjectId) => 
        id.toString() === pinId.toString()
      );

      // Report the pin (adds to pin's reports array)
      await pinModel.reportPin(pinId, userId, reason);

      // Only increment counter and trigger badge if this is a new unique pin being reported
      if (!alreadyReported) {
        // Add pin to reported list and increment counter
        try {
          await User.findByIdAndUpdate(userId, {
            $push: { reportedPins: pinId },
            $inc: { 'stats.reportsMade': 1 },
          });
          logger.info(`📝 User ${userId.toString()} reported pin ${pinId.toString()} (unique report #${(user.stats?.reportsMade || 0) + 1})`);
        } catch (statsError) {
          logger.error('Error updating user stats:', statsError);
        }

        // Process badge event for reporting a pin
        try {
          const earnedBadges = await BadgeService.processBadgeEvent({
            userId: userId.toString(),
            eventType: BadgeRequirementType.REPORTS_MADE,
            value: 1,
            timestamp: new Date(),
            metadata: {
              pinId: pinId.toString(),
              reason: reason,
            },
          });

          if (earnedBadges.length > 0) {
            logger.info(`User ${userId.toString()} earned ${earnedBadges.length} badge(s) from reporting a pin`);
            return res.status(200).json({ 
              message: 'Pin reported successfully',
              data: { earnedBadges, firstReport: true }
            });
          }
        } catch (badgeError) {
          // Log badge processing error but don't fail the report
          logger.error('Error processing badge event for pin report:', badgeError);
        }

        return res.status(200).json({ 
          message: 'Pin reported successfully',
          data: { firstReport: true }
        });
      } else {
        logger.info(`📝 User ${userId.toString()} reported pin ${pinId.toString()} again (duplicate report, not counted)`);
        return res.status(200).json({ 
          message: 'Pin reported successfully (already reported by you)',
          data: { firstReport: false }
        });
      }
    } catch (error) {
      logger.error('Failed to report pin:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to report pin' });
      }
      next(error);
    }
  }

  // ==================== ADMIN METHODS ====================

  async getReportedPins(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: 'Unauthorized: Admin access required' });
      }

      const reportedPins = await pinModel.getReportedPins();
      
      res.status(200).json({ 
        message: 'Reported pins fetched successfully',
        data: { pins: reportedPins, total: reportedPins.length }
      });
    } catch (error) {
      logger.error('Failed to fetch reported pins:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to fetch reported pins' });
      }
      next(error);
    }
  }

  async clearPinReports(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: 'Unauthorized: Admin access required' });
      }

      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const pin = await pinModel.clearReports(pinId);
      
      if (!pin) {
        return res.status(404).json({ message: 'Pin not found' });
      }
      
      res.status(200).json({ 
        message: 'Reports cleared successfully',
        data: { pin }
      });
    } catch (error) {
      logger.error('Failed to clear reports:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to clear reports' });
      }
      next(error);
    }
  }

  async visitPin(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify pin exists
      const pin = await pinModel.findById(pinId);
      if (!pin) {
        return res.status(404).json({ message: 'Pin not found' });
      }

      // Check if user has already visited this pin
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('visitedPins');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const alreadyVisited = user.visitedPins.some((id: mongoose.Types.ObjectId) => 
        id.toString() === pinId.toString()
      );

      if (alreadyVisited) {
        return res.status(200).json({ 
          message: 'Pin already visited',
          data: { alreadyVisited: true }
        });
      }

      // Prepare increments based on pin category
      const increments: Record<string, number> = { 'stats.pinsVisited': 1 };
      
      // Track category-specific visits (only for pre-seeded pins)
      if (pin.isPreSeeded) {
        if (pin.category === PinCategory.STUDY) {
          increments['stats.librariesVisited'] = 1;
          logger.info(`📚 User ${userId.toString()} visited pre-seeded library: ${pin.name}`);
        } else if (pin.category === 'shops_services') {
          // Check subtype to distinguish cafes from restaurants
          const subtype = pin.metadata?.subtype;
          if (subtype === 'cafe') {
            increments['stats.cafesVisited'] = 1;
            logger.info(`☕ User ${userId.toString()} visited pre-seeded cafe: ${pin.name}`);
          } else if (subtype === 'restaurant') {
            increments['stats.restaurantsVisited'] = 1;
            logger.info(`🍽️  User ${userId.toString()} visited pre-seeded restaurant: ${pin.name}`);
          }
        }
      }

      // Add pin to visited list and increment counters
      await User.findByIdAndUpdate(userId, {
        $push: { visitedPins: pinId },
        $inc: increments,
      });

      // Process badge events for pin visit
      try {
        let allEarnedBadges: any[] = [];

        // General pin visit event
        const visitBadges = await BadgeService.processBadgeEvent({
          userId: userId.toString(),
          eventType: BadgeRequirementType.PINS_VISITED,
          value: 1,
          timestamp: new Date(),
          metadata: {
            pinId: pinId.toString(),
            pinName: pin.name,
            category: pin.category,
          },
        });
        allEarnedBadges = allEarnedBadges.concat(visitBadges);

        // Category-specific badge events (only for pre-seeded pins)
        logger.info(`🔍 Pin visit - isPreSeeded: ${pin.isPreSeeded}, category: ${pin.category}, subtype: ${pin.metadata?.subtype}`);
        
        if (pin.isPreSeeded) {
          if (pin.category === 'study') {
            logger.info(`📚 Processing library badge event for: ${pin.name}`);
            const libraryBadges = await BadgeService.processBadgeEvent({
              userId: userId.toString(),
              eventType: BadgeRequirementType.LIBRARIES_VISITED,
              value: 1,
              timestamp: new Date(),
              metadata: {
                pinId: pinId.toString(),
                pinName: pin.name,
              },
            });
            allEarnedBadges = allEarnedBadges.concat(libraryBadges);
          } else if (pin.category === 'shops_services') {
            // Check subtype for specific badge events
            const subtype = pin.metadata?.subtype;
            logger.info(`🏪 Shops/services pin - subtype: ${subtype}`);
            
            if (subtype === 'cafe') {
              logger.info(`☕ Processing cafe badge event for: ${pin.name}`);
              const cafeBadges = await BadgeService.processBadgeEvent({
                userId: userId.toString(),
                eventType: BadgeRequirementType.CAFES_VISITED,
                value: 1,
                timestamp: new Date(),
                metadata: {
                  pinId: pinId.toString(),
                  pinName: pin.name,
                },
              });
              logger.info(`☕ Cafe badge event returned ${cafeBadges.length} badges`);
              allEarnedBadges = allEarnedBadges.concat(cafeBadges);
            } else if (subtype === 'restaurant') {
              logger.info(`🍽️  Processing restaurant badge event for: ${pin.name}`);
              const restaurantBadges = await BadgeService.processBadgeEvent({
                userId: userId.toString(),
                eventType: BadgeRequirementType.RESTAURANTS_VISITED,
                value: 1,
                timestamp: new Date(),
                metadata: {
                  pinId: pinId.toString(),
                  pinName: pin.name,
                },
              });
              allEarnedBadges = allEarnedBadges.concat(restaurantBadges);
            } else {
              logger.warn(`⚠️  Shops/services pin with missing or unknown subtype: ${subtype}`);
            }
          }
        } else {
          logger.info(`ℹ️  Pin is not pre-seeded, skipping category-specific badge events`);
        }

        if (allEarnedBadges.length > 0) {
          logger.info(`User ${userId.toString()} earned ${allEarnedBadges.length} badge(s) from visiting a pin`);
          return res.status(200).json({ 
            message: 'Pin visited successfully', 
            data: { 
              earnedBadges: allEarnedBadges,
              alreadyVisited: false 
            }
          });
        }
      } catch (badgeError) {
        logger.error('Error processing badge event for pin visit:', badgeError);
      }

      res.status(200).json({ 
        message: 'Pin visited successfully',
        data: { alreadyVisited: false }
      });
    } catch (error) {
      logger.error('Failed to visit pin:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to visit pin' });
      }
      next(error);
    }
  }
}

export const pinsController = new PinsController();


