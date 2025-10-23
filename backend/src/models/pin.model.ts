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

  async findById(pinId: mongoose.Types.ObjectId): Promise<IPin | null> {
    try {
      return await this.pin.findById(pinId).populate('createdBy', 'name profilePicture');
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

  async delete(pinId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<boolean> {
    try {
      const result = await this.pin.deleteOne({ _id: pinId, createdBy: userId });
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
      const query: any = { status: PinStatus.ACTIVE };
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      if (filters.category) {
        query.category = filters.category;
      }
      if (filters.search) {
        query.$text = { $search: filters.search };
      }

      let pins = await this.pin
        .find(query)
        .populate('createdBy', 'name profilePicture')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      logger.info(`Search pins: Found ${pins.length} pins. UserId: ${filters.userId || 'NOT PROVIDED'}`);

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
            
            // User can always see their own pins
            if (pin.createdBy._id.equals(filters.userId!)) {
              logger.info(`Pin "${pin.name}" belongs to current user, showing`);
              return pin;
            }
            
            // Default to PUBLIC if visibility is not set (for backward compatibility)
            const visibility = pin.visibility || PinVisibility.PUBLIC;
            logger.info(`Pin "${pin.name}" visibility: ${visibility}, creator: ${pin.createdBy._id}`);
            
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
        
        pins = filteredPins.filter((p) => p !== null) as typeof pins;
        logger.info(`Visibility filtering complete. Original: ${filteredPins.length}, Visible: ${pins.length}`);
      }

      if (filters.latitude && filters.longitude && filters.radius) {
        pins = pins.filter(p => this.calculateDistance(filters.latitude!, filters.longitude!, p.location.latitude, p.location.longitude) <= filters.radius!);
      }

      const total = await this.pin.countDocuments(query);
      return { pins, total };
    } catch (error) {
      logger.error('Error searching pins:', error);
      throw new Error('Failed to search pins');
    }
  }

  async reportPin(pinId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, reason: string): Promise<IPin | null> {
    try {
      const pin = await this.pin.findByIdAndUpdate(
        pinId,
        { $push: { reports: { reportedBy: userId, reason, timestamp: new Date() } } },
        { new: true }
      );

      if (pin && pin.reports.length >= 5) {
        pin.status = PinStatus.REPORTED;
        await pin.save();
      }

      return pin;
    } catch (error) {
      logger.error('Error reporting pin:', error);
      throw new Error('Failed to report pin');
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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


