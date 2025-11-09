import mongoose, { Schema } from 'mongoose';
import { z } from 'zod';
import {
  IPin,
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
    expiresAt: { type: Date, index: true },
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
        const userVote = vote ? (vote as any).voteType : null;
        return {
          ...(pin as any).toObject(),
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
      const query: Record<string, any> = { status: PinStatus.ACTIVE };
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const skip = (page - 1) * limit;

      if (filters.category) {
        query.category = filters.category;
      }

      // Simple case-insensitive search using regex (frontend does the heavy lifting)
      if (filters.search && filters.search.trim() !== '') {
        const searchRegex = new RegExp(filters.search.trim(), 'i');
        query.$or = [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { 'location.address': { $regex: searchRegex } }
        ];
      }

      let pins = await this.pin
        .find(query)
        .populate('createdBy', 'name profilePicture')
        .sort({ isPreSeeded: -1, createdAt: -1 }); // Pre-seeded pins first, then by date

      logger.info(`Search pins: Found ${pins.length} pins. UserId: ${filters.userId ?? 'NOT PROVIDED'}`);
      // Log pin details for debugging
      pins.forEach(pin => {
        logger.info(`  - Pin: "${pin.name}" | Category: ${pin.category} | PreSeeded: ${pin.isPreSeeded}`);
      });

      // Apply visibility filtering
      if (filters.userId) {
        logger.info(`Applying visibility filtering for user: ${filters.userId}`);
        const friendshipModel = mongoose.model('Friendship');
        
        const filteredPins = await Promise.all(
          pins.map(async (pin) => {
            // Pre-seeded pins are always visible
            if (pin.isPreSeeded) {
              logger.info(`Pin "${pin.name}" is pre-seeded, showing to all users`);
              return pin;
            }
            
            // Check if createdBy is populated
            if (!pin.createdBy?._id) {
              logger.warn(`Pin "${pin.name}" has no creator, hiding it`);
              return null;
            }
            
            // User can always see their own pins
            if (pin.createdBy._id.equals(filters.userId!)) {
              logger.info(`Pin "${pin.name}" belongs to current user, showing`);
              return pin;
            }
            
            // Default to PUBLIC if visibility is not set (for backward compatibility)
            const visibility = pin.visibility || PinVisibility.PUBLIC;
            logger.info(`Pin "${pin.name}" visibility: ${visibility}, creator: ${pin.createdBy._id.toString()}`);
            
            // Check visibility
            if (visibility === PinVisibility.PRIVATE) {
              logger.info(`Pin "${pin.name}" is PRIVATE, hiding from other users`);
              return null; // Hide private pins from others
            }
            
            if (visibility === PinVisibility.FRIENDS_ONLY) {
              // Check if they are friends (Friendship schema uses userId/friendId, not user1/user2)
              const areFriends = await friendshipModel.exists({
                $or: [
                  { userId: filters.userId, friendId: pin.createdBy._id, status: 'accepted' },
                  { userId: pin.createdBy._id, friendId: filters.userId, status: 'accepted' },
                ],
              });
              
              if (!areFriends) {
                logger.info(`Pin "${pin.name}" is FRIENDS_ONLY and users are not friends, hiding`);
                return null; // Hide friends-only pins from non-friends
              }
              logger.info(`Pin "${pin.name}" is FRIENDS_ONLY and users are friends, showing`);
            }
            
            // Public pins are visible to everyone
            return pin;
          })
        );
        
        pins = filteredPins.filter((p) => p !== null);
        logger.info(`Visibility filtering complete. Original: ${filteredPins.length}, Visible: ${pins.length}`);
      }

      if (filters.latitude && filters.longitude && filters.radius) {
        logger.info(`📍 Applying geolocation filter: center=(${filters.latitude}, ${filters.longitude}), radius=${filters.radius}m`);
        logger.info(`📍 Pins before distance filter: ${pins.length} (${pins.filter(p => p.category === 'study').length} libraries)`);
        
        pins = pins.filter(p => {
          const distance = this.calculateDistance(filters.latitude!, filters.longitude!, p.location.latitude, p.location.longitude);
          const withinRadius = distance <= filters.radius!;
          
          // Log library filtering for debugging
          if (p.category === PinCategory.STUDY) {
            logger.info(`📚 Library "${p.name}": distance=${distance.toFixed(2)}m, within=${withinRadius}`);
          }
          
          return withinRadius;
        });
        
        logger.info(`📍 Pins after distance filter: ${pins.length} (${pins.filter(p => p.category === 'study').length} libraries)`);
      }

      // Apply pagination after all filtering
      const total = pins.length;
      const paginatedPins = pins.slice(skip, skip + limit);

      // Add user's vote to each pin if userId is provided
      if (filters.userId) {
        // Query votes directly to avoid circular dependency
        const PinVote = mongoose.model('PinVote');
        const pinsWithVotes = await Promise.all(
          paginatedPins.map(async (pin) => {
            const vote = await PinVote.findOne({ userId: filters.userId, pinId: pin._id });
            const userVote = vote ? (vote as any).voteType : null;
            return {
              ...pin.toObject(),
              userVote
            };
          })
        );
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


