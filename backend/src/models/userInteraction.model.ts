import mongoose, { Schema } from 'mongoose';
import logger from '../utils/logger.util';

export interface IUserInteraction {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  pinId: mongoose.Types.ObjectId;
  interactionType: 'view' | 'like' | 'visit' | 'share' | 'save';
  interactionData?: {
    viewDuration?: number; // seconds
    visitConfirmed?: boolean;
    weatherCondition?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  };
  timestamp: Date;
}

const userInteractionSchema = new Schema<IUserInteraction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pinId: { type: Schema.Types.ObjectId, ref: 'Pin', required: true, index: true },
    interactionType: { 
      type: String, 
      enum: ['view', 'like', 'visit', 'share', 'save'],
      required: true,
      index: true
    },
    interactionData: {
      viewDuration: { type: Number, min: 0 },
      visitConfirmed: { type: Boolean },
      weatherCondition: { type: String },
      timeOfDay: { type: String, enum: ['morning', 'afternoon', 'evening', 'night'] },
    },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false } // We're managing timestamp manually
);

// Compound indexes for efficient queries
userInteractionSchema.index({ userId: 1, interactionType: 1, timestamp: -1 });
userInteractionSchema.index({ userId: 1, pinId: 1, interactionType: 1 }, { unique: true });

export class UserInteractionModel {
  private userInteraction: mongoose.Model<IUserInteraction>;

  constructor() {
    this.userInteraction = mongoose.model<IUserInteraction>('UserInteraction', userInteractionSchema);
  }

  /**
   * Record a user interaction with a pin
   */
  async recordInteraction(
    userId: mongoose.Types.ObjectId,
    pinId: mongoose.Types.ObjectId,
    interactionType: IUserInteraction['interactionType'],
    interactionData?: IUserInteraction['interactionData']
  ): Promise<IUserInteraction> {
    try {
      // Determine time of day
      const hour = new Date().getHours();
      let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      if (hour >= 5 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
      else timeOfDay = 'night';

      const interaction = await this.userInteraction.findOneAndUpdate(
        { userId, pinId, interactionType },
        {
          userId,
          pinId,
          interactionType,
          interactionData: {
            ...interactionData,
            timeOfDay,
          },
          timestamp: new Date(),
        },
        { upsert: true, new: true }
      );

      logger.info(`Recorded ${interactionType} interaction for user ${userId} on pin ${pinId}`);
      return interaction;
    } catch (error) {
      logger.error('Error recording user interaction:', error);
      throw new Error('Failed to record interaction');
    }
  }

  /**
   * Get user's interaction patterns for recommendations
   */
  async getUserPreferences(userId: mongoose.Types.ObjectId): Promise<{
    likedPins: mongoose.Types.ObjectId[];
    visitedPins: mongoose.Types.ObjectId[];
    preferredMealTimes: {
      breakfast: number; // hours when user is most active for breakfast
      lunch: number;
      dinner: number;
    };
    preferredWeatherConditions: string[];
  }> {
    try {
      // Get liked and visited pins
      const [likedInteractions, visitedInteractions] = await Promise.all([
        this.userInteraction.find({ userId, interactionType: 'like' }).select('pinId'),
        this.userInteraction.find({ userId, interactionType: 'visit' }).select('pinId'),
      ]);

      const likedPins = likedInteractions.map(i => i.pinId);
      const visitedPins = visitedInteractions.map(i => i.pinId);

      // Analyze time patterns (simplified - just get most common interaction times)
      const timePatterns = await this.userInteraction.aggregate([
        { $match: { userId, interactionType: { $in: ['like', 'visit'] } } },
        {
          $group: {
            _id: '$interactionData.timeOfDay',
            count: { $sum: 1 },
          },
        },
      ]);

      // Convert to preferred meal times (rough mapping)
      const preferredMealTimes = {
        breakfast: timePatterns.find(p => p._id === 'morning')?.count || 0,
        lunch: timePatterns.find(p => p._id === 'afternoon')?.count || 0,
        dinner: timePatterns.find(p => p._id === 'evening')?.count || 0,
      };

      // Get preferred weather conditions
      const weatherPatterns = await this.userInteraction.aggregate([
        { 
          $match: { 
            userId, 
            interactionType: { $in: ['like', 'visit'] },
            'interactionData.weatherCondition': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$interactionData.weatherCondition',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);

      const preferredWeatherConditions = weatherPatterns.map(p => p._id).filter(Boolean);

      return {
        likedPins,
        visitedPins,
        preferredMealTimes,
        preferredWeatherConditions,
      };
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      throw new Error('Failed to get user preferences');
    }
  }

  /**
   * Get recent interactions for a user (for debugging/analytics)
   */
  async getRecentInteractions(
    userId: mongoose.Types.ObjectId,
    limit: number = 50
  ): Promise<IUserInteraction[]> {
    try {
      return await this.userInteraction
        .find({ userId })
        .populate('pinId', 'name category location')
        .sort({ timestamp: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error getting recent interactions:', error);
      throw new Error('Failed to get recent interactions');
    }
  }
}

export const userInteractionModel = new UserInteractionModel();