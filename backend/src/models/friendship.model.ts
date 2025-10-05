import mongoose, { Schema } from 'mongoose';
import { IFriendship, FriendshipStatus } from '../types/friends.types';
import logger from '../utils/logger.util';

const friendshipSchema = new Schema<IFriendship>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    friendId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'blocked'],
      default: 'pending',
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shareLocation: {
      type: Boolean,
      default: true,
    },
    closeFriend: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
friendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true });
friendshipSchema.index({ userId: 1, status: 1 });
friendshipSchema.index({ friendId: 1, status: 1 });

export class FriendshipModel {
  private friendship: mongoose.Model<IFriendship>;

  constructor() {
    this.friendship = mongoose.model<IFriendship>('Friendship', friendshipSchema);
  }

  async create(friendshipData: Partial<IFriendship>): Promise<IFriendship> {
    try {
      return await this.friendship.create(friendshipData);
    } catch (error) {
      logger.error('Error creating friendship:', error);
      throw new Error('Failed to create friendship');
    }
  }

  async findById(_id: mongoose.Types.ObjectId): Promise<IFriendship | null> {
    try {
      return await this.friendship.findById(_id).populate('userId friendId', 'name username profilePicture');
    } catch (error) {
      logger.error('Error finding friendship by ID:', error);
      throw new Error('Failed to find friendship');
    }
  }

  async findByUserAndFriend(
    userId: mongoose.Types.ObjectId,
    friendId: mongoose.Types.ObjectId
  ): Promise<IFriendship | null> {
    try {
      return await this.friendship.findOne({ userId, friendId });
    } catch (error) {
      logger.error('Error finding friendship:', error);
      throw new Error('Failed to find friendship');
    }
  }

  async findUserFriendships(
    userId: mongoose.Types.ObjectId,
    status?: FriendshipStatus,
    limit = 50,
    cursor?: mongoose.Types.ObjectId
  ): Promise<IFriendship[]> {
    try {
      const query: any = { userId };
      if (status) query.status = status;
      if (cursor) query._id = { $gt: cursor };

      return await this.friendship
        .find(query)
        .populate('friendId', 'name username profilePicture bio')
        .sort({ _id: 1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error finding user friendships:', error);
      throw new Error('Failed to find friendships');
    }
  }

  async findIncomingRequests(
    userId: mongoose.Types.ObjectId,
    limit = 20,
    cursor?: mongoose.Types.ObjectId
  ): Promise<IFriendship[]> {
    try {
      const query: any = { friendId: userId, status: 'pending' };
      if (cursor) query._id = { $gt: cursor };

      return await this.friendship
        .find(query)
        .populate('userId', 'name username profilePicture')
        .sort({ _id: 1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error finding incoming requests:', error);
      throw new Error('Failed to find incoming requests');
    }
  }

  async findOutgoingRequests(
    userId: mongoose.Types.ObjectId,
    limit = 20,
    cursor?: mongoose.Types.ObjectId
  ): Promise<IFriendship[]> {
    try {
      const query: any = { userId, status: 'pending' };
      if (cursor) query._id = { $gt: cursor };

      return await this.friendship
        .find(query)
        .populate('friendId', 'name username profilePicture')
        .sort({ _id: 1 })
        .limit(limit);
    } catch (error) {
      logger.error('Error finding outgoing requests:', error);
      throw new Error('Failed to find outgoing requests');
    }
  }

  async updateStatus(
    _id: mongoose.Types.ObjectId,
    status: FriendshipStatus
  ): Promise<IFriendship | null> {
    try {
      return await this.friendship.findByIdAndUpdate(
        _id,
        { status },
        { new: true }
      );
    } catch (error) {
      logger.error('Error updating friendship status:', error);
      throw new Error('Failed to update friendship status');
    }
  }

  async updateSettings(
    userId: mongoose.Types.ObjectId,
    friendId: mongoose.Types.ObjectId,
    settings: Partial<Pick<IFriendship, 'shareLocation' | 'closeFriend'>>
  ): Promise<IFriendship | null> {
    try {
      return await this.friendship.findOneAndUpdate(
        { userId, friendId, status: 'accepted' },
        settings,
        { new: true }
      );
    } catch (error) {
      logger.error('Error updating friendship settings:', error);
      throw new Error('Failed to update friendship settings');
    }
  }

  async deleteFriendship(
    userId: mongoose.Types.ObjectId,
    friendId: mongoose.Types.ObjectId
  ): Promise<void> {
    try {
      await this.friendship.deleteOne({ userId, friendId });
    } catch (error) {
      logger.error('Error deleting friendship:', error);
      throw new Error('Failed to delete friendship');
    }
  }

  async deleteById(_id: mongoose.Types.ObjectId): Promise<void> {
    try {
      await this.friendship.findByIdAndDelete(_id);
    } catch (error) {
      logger.error('Error deleting friendship by ID:', error);
      throw new Error('Failed to delete friendship');
    }
  }
}

export const friendshipModel = new FriendshipModel();