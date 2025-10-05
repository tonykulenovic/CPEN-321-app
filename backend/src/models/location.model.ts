import mongoose, { Schema } from 'mongoose';
import { ILocation } from '../types/friends.types';
import logger from '../utils/logger.util';

const locationSchema = new Schema<ILocation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracyM: {
      type: Number,
      default: 0,
      min: 0,
    },
    shared: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index to automatically remove expired locations
locationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export class LocationModel {
  private location: mongoose.Model<ILocation>;

  constructor() {
    this.location = mongoose.model<ILocation>('Location', locationSchema);
  }

  async upsert(
    userId: mongoose.Types.ObjectId,
    lat: number,
    lng: number,
    accuracyM = 0,
    shared = false,
    expiresAt: Date
  ): Promise<ILocation> {
    try {
      return await this.location.findOneAndUpdate(
        { userId },
        {
          lat,
          lng,
          accuracyM,
          shared,
          expiresAt,
        },
        {
          upsert: true,
          new: true,
        }
      );
    } catch (error) {
      logger.error('Error upserting location:', error);
      throw new Error('Failed to upsert location');
    }
  }

  async findByUserId(userId: mongoose.Types.ObjectId): Promise<ILocation | null> {
    try {
      return await this.location.findOne({ 
        userId, 
        expiresAt: { $gt: new Date() },
        shared: true 
      });
    } catch (error) {
      logger.error('Error finding location by user ID:', error);
      throw new Error('Failed to find location');
    }
  }

  async findFriendsLocations(
    friendIds: mongoose.Types.ObjectId[]
  ): Promise<ILocation[]> {
    try {
      return await this.location.find({
        userId: { $in: friendIds },
        expiresAt: { $gt: new Date() },
        shared: true,
      }).populate('userId', 'name username');
    } catch (error) {
      logger.error('Error finding friends locations:', error);
      throw new Error('Failed to find friends locations');
    }
  }

  async deleteExpired(): Promise<void> {
    try {
      await this.location.deleteMany({
        expiresAt: { $lt: new Date() },
      });
    } catch (error) {
      logger.error('Error deleting expired locations:', error);
      throw new Error('Failed to delete expired locations');
    }
  }

  async deleteByUserId(userId: mongoose.Types.ObjectId): Promise<void> {
    try {
      await this.location.deleteMany({ userId });
    } catch (error) {
      logger.error('Error deleting user locations:', error);
      throw new Error('Failed to delete user locations');
    }
  }
}

export const locationModel = new LocationModel();