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

// Index for efficiently querying latest location per user
locationSchema.index({ userId: 1, createdAt: -1 });

export class LocationModel {
  private location: mongoose.Model<ILocation>;

  constructor() {
    this.location = mongoose.model<ILocation>('Location', locationSchema);
  }

  async create(
    userId: mongoose.Types.ObjectId,
    lat: number,
    lng: number,
    accuracyM = 0,
    shared = false,
    expiresAt: Date
  ): Promise<ILocation> {
    try {
      return await this.location.create({
        userId,
        lat,
        lng,
        accuracyM,
        shared,
        expiresAt,
      });
    } catch (error) {
      logger.error('Error creating location:', error);
      throw new Error('Failed to create location');
    }
  }

  async findByUserId(userId: mongoose.Types.ObjectId): Promise<ILocation | null> {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours
      
      return await this.location.findOne({ 
        userId, 
        expiresAt: { $gt: new Date() },
        createdAt: { $gt: twoHoursAgo }, // Last 2 hours (was 5 minutes)
        shared: true 
      }).sort({ createdAt: -1 }); // Get the latest location
    } catch (error) {
      logger.error('Error finding location by user ID:', error);
      throw new Error('Failed to find location');
    }
  }

  async findFriendsLocations(
    friendIds: mongoose.Types.ObjectId[]
  ): Promise<ILocation[]> {
    try {
      // Use aggregation to get the latest location for each friend
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      return await this.location.aggregate([
        {
          $match: {
            userId: { $in: friendIds },
            expiresAt: { $gt: new Date() },
            createdAt: { $gt: fiveMinutesAgo }, // Only locations within last 5 minutes
            shared: true,
          }
        },
        {
          $sort: { userId: 1, createdAt: -1 }
        },
        {
          $group: {
            _id: '$userId',
            latestLocation: { $first: '$$ROOT' }
          }
        },
        {
          $replaceRoot: { newRoot: '$latestLocation' }
        }
      ]);
    } catch (error) {
      logger.error('Error finding friends locations:', error);
      throw new Error('Failed to find friends locations');
    }
  }
}

export const locationModel = new LocationModel();