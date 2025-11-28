import mongoose, { Schema } from 'mongoose';
import { z } from 'zod';
import {
  IPin,
  IPinVote,
  PinCategory,
  PinStatus,
  PinVisibility,
  CreatePinRequest,
  UpdatePinRequest,
  createPinSchema,
  updatePinSchema,
} from '../types/pins.types';
import logger from '../utils/logger.util';

const pinSchema = new Schema<IPin>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, index: 'text' },
    category: { type: String, enum: Object.values(PinCategory), required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    location: {
      latitude: { type: Number, required: true, min: -90, max: 90 },
      longitude: { type: Number, required: true, min: -180, max: 180 },
      address: { type: String, trim: true },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    metadata: {
      subtype: String, // 'cafe' or 'restaurant' for SHOPS_SERVICES category
      capacity: Number,
      openingHours: String,
      amenities: [String],
      crowdLevel: { type: String, enum: ['quiet', 'moderate', 'busy'] },
    },
    rating: {
      upvotes: { type: Number, default: 0 },
      downvotes: { type: Number, default: 0 },
      voters: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    reports: [
      {
        reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reason: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    status: { type: String, enum: Object.values(PinStatus), default: PinStatus.ACTIVE, index: true },
    visibility: { type: String, enum: Object.values(PinVisibility), default: PinVisibility.PUBLIC, index: true },
    isPreSeeded: { type: Boolean, default: false },
    expiresAt: { type: Date },
    imageUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

pinSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
pinSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export class PinModel {
  private pin: mongoose.Model<IPin>;

  constructor() {
    this.pin = mongoose.model<IPin>('Pin', pinSchema);
  }

  async create(userId: mongoose.Types.ObjectId, pinData: CreatePinRequest): Promise<IPin> {
    try {
      const validatedData = createPinSchema.parse(pinData);
      const pin = await this.pin.create({ ...validatedData, createdBy: userId, status: PinStatus.ACTIVE });
      
      // Populate the createdBy field before returning
      const populatedPin = await this.pin.findById(pin._id).populate('createdBy', 'name profilePicture');
      
      if (!populatedPin) {
        throw new Error('Failed to retrieve created pin');
      }
      
      return populatedPin;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Validation error:', error.issues);
        throw new Error('Invalid pin data');
      }
      logger.error('Error creating pin:', error);
      throw new Error('Failed to create pin');
    }
  }

  async findById(pinId: mongoose.Types.ObjectId, userId?: mongoose.Types.ObjectId): Promise<IPin | null> {
    try {
      const pin = await this.pin.findById(pinId).populate('createdBy', 'name profilePicture');
      
      if (!pin) {
        return null;
      }

      // Add user's vote if userId is provided
      if (userId) {
        // Query vote directly to avoid circular dependency
        const PinVote = mongoose.model('PinVote');
        const vote = await PinVote.findOne({ userId, pinId: pin._id });
        const userVote = vote ? (vote as IPinVote).voteType : null;
        return {
          ...pin.toObject(),
          userVote
        } as IPin;
      }

      return pin;
    } catch (error) {
      logger.error('Error finding pin:', error);
      throw new Error('Failed to find pin');
    }
  }

  async update(pinId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, updates: UpdatePinRequest): Promise<IPin | null> {
    try {
      const validatedData = updatePinSchema.parse(updates);
      const pin = await this.pin.findOneAndUpdate(
        { _id: pinId, createdBy: userId }, 
        { $set: validatedData }, 
        { new: true }
      );
      
      if (!pin) {
        return null;
      }
      
      // Populate the createdBy field before returning
      const populatedPin = await this.pin.findById(pin._id).populate('createdBy', 'name profilePicture');
      
      return populatedPin;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Validation error:', error.issues);
        throw new Error('Invalid update data');
      }
      logger.error('Error updating pin:', error);
      throw new Error('Failed to update pin');
    }
  }

  async delete(pinId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, isAdmin = false): Promise<boolean> {
    try {
      // Admins can delete any pin, regular users can only delete their own pins
      const query = isAdmin 
        ? { _id: pinId } 
        : { _id: pinId, createdBy: userId };
      
      const result = await this.pin.deleteOne(query);
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting pin:', error);
      throw new Error('Failed to delete pin');
    }
  }

  /**
   * Delete all pins created by a specific user (used when deleting user account)
   */
  async deleteAllByUser(userId: mongoose.Types.ObjectId): Promise<number> {
    try {
      const result = await this.pin.deleteMany({ createdBy: userId });
      logger.info(`🗑️ Deleted ${result.deletedCount} pins for user ${userId.toString()}`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error deleting user pins:', error);
      throw new Error('Failed to delete user pins');
    }
  }

  async search(filters: {
    category?: PinCategory;
    latitude?: number;
    longitude?: number;
    radius?: number;
    search?: string;
    page?: number;
    limit?: number;
    userId?: mongoose.Types.ObjectId;
  }): Promise<{ pins: IPin[]; total: number }> {
    try {
      const query: Record<string, unknown> = { status: PinStatus.ACTIVE };
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const skip = (page - 1) * limit;

      if (filters.category) {
        query.category = filters.category;
      }

      // Simple case-insensitive search using regex (frontend does the heavy lifting)
      if (filters.search && filters.search.trim() !== '') {
        // Limit search length to prevent ReDoS attacks
        const searchTerm = filters.search.trim().slice(0, 100);
        if (searchTerm.length === 0) {
          // Skip if search term is empty after trimming and limiting
        } else {
          // Escape special regex characters to prevent injection
          const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Use MongoDB $regex with escaped pattern - length limit prevents ReDoS
          const searchPattern = escapedSearch;
          query.$or = [
            { name: { $regex: searchPattern, $options: 'i' } },
            { description: { $regex: searchPattern, $options: 'i' } },
            { 'location.address': { $regex: searchPattern, $options: 'i' } }
          ];
        }
      }

      // OPTIMIZATION: Limit query to prevent fetching all pins
      let pins = await this.pin
        .find(query)
        .populate('createdBy', 'name profilePicture')
        .sort({ isPreSeeded: -1, createdAt: -1 }) // Pre-seeded pins first, then by date
        .limit(500) // Reasonable limit to prevent fetching thousands of pins
        .lean(); // Use lean() for faster queries - returns plain JS objects

      // OPTIMIZATION: Reduced logging for performance
      logger.debug(`Search pins: Found ${pins.length} pins`);

      // DEFENSIVE: Clean up orphaned pins (pins with null/invalid createdBy)
      const orphanedPinIds = pins
        .filter(pin => !pin.createdBy?._id)
        .map(pin => pin._id);
      
      if (orphanedPinIds.length > 0) {
        logger.warn(`⚠️ Found ${orphanedPinIds.length} orphaned pins - deleting...`);
        // Delete in background (don't await)
        this.pin.deleteMany({ _id: { $in: orphanedPinIds } })
          .then(result => {
            logger.info(`✅ Cleaned up ${result.deletedCount} orphaned pins`);
          })
          .catch((error: unknown) => {
            logger.error('❌ Error cleaning up orphaned pins:', error);
          });
        
        // Filter out orphaned pins from results
        pins = pins.filter(pin => pin.createdBy?._id);
      }

      // Apply visibility filtering
      if (filters.userId) {
        const friendshipModel = mongoose.model('Friendship');
        
        // OPTIMIZATION: Fetch all friendships once instead of querying for each pin
        const friendships = await friendshipModel.find({
          $or: [
            { userId: filters.userId, status: 'accepted' },
            { friendId: filters.userId, status: 'accepted' },
          ],
        }).lean();
        
        // Create a Set of friend IDs for O(1) lookup
        const friendIds = new Set(
          friendships
            .map(f => {
              // DEFENSIVE: Skip friendships with null/invalid IDs
              if (!f.userId || !f.friendId) return null;
              return (f.userId.toString() === filters.userId?.toString()) 
                ? f.friendId.toString() 
                : f.userId.toString();
            })
            .filter((id): id is string => id !== null) // Filter out nulls with type guard
        );
        
        // Filter pins based on visibility (no async needed now)
        // Note: Orphaned pins already filtered out earlier
        pins = pins.filter((pin) => {
          // Pre-seeded pins are always visible
          if (pin.isPreSeeded) {
            return true;
          }
          
          // User can always see their own pins
          if (pin.createdBy._id.toString() === filters.userId?.toString()) {
            return true;
          }
          
          // Default to PUBLIC if visibility is not set
          const visibility = pin.visibility || PinVisibility.PUBLIC;
          
          // Hide private pins from others
          if (visibility === PinVisibility.PRIVATE) {
            return false;
          }
          
          // For friends-only pins, check if they're friends (O(1) lookup)
          if (visibility === PinVisibility.FRIENDS_ONLY) {
            return friendIds.has(pin.createdBy._id.toString());
          }
          
          // Public pins are visible to everyone
          return true;
        });
        
        logger.debug(`Visibility filtering: ${pins.length} pins visible`);
      }

      if (filters.latitude && filters.longitude && filters.radius) {
        // Apply geolocation filter
        pins = pins.filter(p => {
          if (!filters.latitude || !filters.longitude || !filters.radius) {
            return false;
          }
          const distance = this.calculateDistance(filters.latitude, filters.longitude, p.location.latitude, p.location.longitude);
          return distance <= filters.radius;
        });
      }

      // Apply pagination after all filtering
      const total = pins.length;
      const paginatedPins = pins.slice(skip, skip + limit);

      // Add user's vote to each pin if userId is provided
      if (filters.userId) {
        // OPTIMIZATION: Fetch all votes at once instead of querying for each pin
        const PinVote = mongoose.model('PinVote');
        const pinIds = paginatedPins.map(p => p._id);
        const votes = await PinVote.find({ 
          userId: filters.userId, 
          pinId: { $in: pinIds } 
        }).lean();
        
        // Create a Map for O(1) vote lookup
        const voteMap = new Map(
          votes.map((vote: unknown) => {
            const v = vote as { pinId: { toString: () => string }; voteType: string };
            return [v.pinId.toString(), v.voteType];
          })
        );
        
        // Add userVote to each pin
        const pinsWithVotes = paginatedPins.map(pin => ({
          ...pin,
          userVote: voteMap.get(pin._id.toString()) || null
        }));
        
        return { pins: pinsWithVotes as IPin[], total };
      }

      return { pins: paginatedPins, total };
    } catch (error) {
      logger.error('Error searching pins:', error);
      throw new Error('Failed to search pins');
    }
  }

  async reportPin(pinId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, reason: string): Promise<IPin | null> {
    try {
      // Simply add the report (allow multiple reports from same user)
      const pin = await this.pin.findByIdAndUpdate(
        pinId,
        { $push: { reports: { reportedBy: userId, reason: reason || 'No reason provided', timestamp: new Date() } } },
        { new: true }
      );

      if (!pin) {
        throw new Error('Pin not found');
      }

      // Mark as reported if 5+ reports
      if (pin.reports.length >= 5 && pin.status !== PinStatus.REPORTED) {
        pin.status = PinStatus.REPORTED;
        await pin.save();
      }

      logger.info(`Pin ${pinId.toString()} reported by user ${userId.toString()}. Total reports: ${pin.reports.length}`);
      return pin;
    } catch (error) {
      logger.error('Error reporting pin:', error);
      throw error;
    }
  }

  async getReportedPins(): Promise<IPin[]> {
    try {
      logger.info('Fetching reported pins...');
      
      const reportedPins = await this.pin
        .find({ 
          $or: [
            { status: PinStatus.REPORTED },
            { 'reports.0': { $exists: true } } // Has at least one report
          ]
        })
        .populate('createdBy', 'name profilePicture email')
        .populate('reports.reportedBy', 'name email')
        .sort({ 'reports.0.timestamp': -1 }) // Most recent reports first
        .lean();
      
      logger.info(`Found ${reportedPins.length} reported pins`);
      reportedPins.forEach(pin => {
        logger.info(`  - Pin ${pin._id.toString()}: ${pin.name}, Reports: ${pin.reports.length}, Status: ${pin.status}`);
      });
      
      return reportedPins as IPin[];
    } catch (error) {
      logger.error('Error fetching reported pins:', error);
      throw new Error('Failed to fetch reported pins');
    }
  }

  async clearReports(pinId: mongoose.Types.ObjectId): Promise<IPin | null> {
    try {
      logger.info(`Clearing reports for pin ${pinId.toString()}...`);
      
      const pin = await this.pin.findByIdAndUpdate(
        pinId,
        { 
          reports: [], // Clear all reports
          status: PinStatus.ACTIVE // Reset status to active
        },
        { new: true }
      );
      
      if (pin) {
        logger.info(`Successfully cleared reports for pin ${pinId.toString()}. New status: ${pin.status}, Reports: ${pin.reports.length}`);
      } else {
        logger.warn(`Pin ${pinId.toString()} not found when trying to clear reports`);
      }
      
      return pin;
    } catch (error) {
      logger.error('Error clearing reports:', error);
      throw new Error('Failed to clear reports');
    }
  }

  async findNearbyForMeal(
    lat: number,
    lng: number,
    maxDistance: number,
    mealKeywords: string[],
    limit: number
  ): Promise<IPin[]> {
    try {
      // Create case-insensitive regex pattern for meal keywords
      // Escape special regex characters to prevent injection
      const escapedKeywords = mealKeywords.map(keyword => 
        keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      );
      const keywordPattern = escapedKeywords.join('|');
      const regex = new RegExp(keywordPattern, 'i');
      
      // Find pins that match meal keywords and are within distance
      const pins = await this.pin.find({
        status: PinStatus.ACTIVE,
        visibility: PinVisibility.PUBLIC,
        $or: [
          { name: { $regex: regex } },
          { description: { $regex: regex } },
          { category: PinCategory.SHOPS_SERVICES } // Include general food establishments
        ]
      })
      .populate('createdBy', 'name profilePicture')
      .lean();

      // Filter by distance and return closest ones
      const nearbyPins = pins
        .map(pin => ({
          ...pin,
          distance: this.calculateDistance(lat, lng, pin.location.latitude, pin.location.longitude)
        }))
        .filter(pin => pin.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit)
        .map(({ distance: _distance, ...pin }) => pin); // Remove distance field from result

      logger.info(`Found ${nearbyPins.length} nearby pins for meal keywords: ${mealKeywords.join(', ')}`);
      return nearbyPins as IPin[];
    } catch (error) {
      logger.error('Error finding nearby pins for meal:', error);
      throw new Error('Failed to find nearby pins for meal');
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters (not kilometers!)
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const pinModel = new PinModel();