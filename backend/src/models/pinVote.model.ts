import mongoose, { Schema } from 'mongoose';
import { IPinVote } from '../types/pins.types';
import logger from '../utils/logger.util';

const pinVoteSchema = new Schema<IPinVote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pinId: { type: Schema.Types.ObjectId, ref: 'Pin', required: true },
    voteType: { type: String, enum: ['upvote', 'downvote'], required: true },
  },
  { timestamps: true }
);

pinVoteSchema.index({ userId: 1, pinId: 1 }, { unique: true });

export class PinVoteModel {
  private voteCollection: mongoose.Model<IPinVote>;

  constructor() {
    this.voteCollection = mongoose.model<IPinVote>('PinVote', pinVoteSchema);
  }

  async vote(
    userId: mongoose.Types.ObjectId,
    pinId: mongoose.Types.ObjectId,
    voteType: 'upvote' | 'downvote'
  ): Promise<{ success: boolean; action: 'added' | 'removed' | 'changed'; upvotes: number; downvotes: number }> {
    // Skip transactions in test environment (MongoMemoryServer doesn't support replica sets by default)
    // This follows the same pattern as auth.middleware.ts which checks NODE_ENV
    const useTransactions = process.env.NODE_ENV !== 'test';
    const session = useTransactions ? await mongoose.startSession() : null;
    if (session) {
      session.startTransaction();
    }

    try {
      const existingVote = await this.voteCollection.findOne({ userId, pinId });

      let upvoteChange = 0;
      let downvoteChange = 0;
      let action: 'added' | 'removed' | 'changed' = 'added';

      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // User clicked the same vote button - remove the vote (undo)
          await this.voteCollection.deleteOne({ userId, pinId }, session ? { session } : {});
          
          if (voteType === 'upvote') {
            upvoteChange = -1;
          } else {
            downvoteChange = -1;
          }
          action = 'removed';
        } else {
          // User switched vote type
          existingVote.voteType = voteType;
          await existingVote.save(session ? { session } : {});
          
          if (voteType === 'upvote') {
            upvoteChange = 1;
            downvoteChange = -1;
          } else {
            upvoteChange = -1;
            downvoteChange = 1;
          }
          action = 'changed';
        }
      } else {
        // New vote
        await this.voteCollection.create([{ userId, pinId, voteType }], session ? { session } : {});
        
        if (voteType === 'upvote') {
          upvoteChange = 1;
        } else {
          downvoteChange = 1;
        }
        action = 'added';
      }

      // Access the Pin model directly to avoid circular dependency
      const pinCollection = mongoose.model('Pin');
      
      const updateOperations: any = {
        $inc: { 'rating.upvotes': upvoteChange, 'rating.downvotes': downvoteChange }
      };

      // Add or remove user from voters list
      if (action === 'removed') {
        updateOperations.$pull = { 'rating.voters': userId };
      } else if (action === 'added') {
        updateOperations.$addToSet = { 'rating.voters': userId };
      }

      const updatedPin = await pinCollection.findByIdAndUpdate(
        pinId,
        updateOperations,
        session ? { session, new: true } : { new: true }
      );

      if (session) {
        await session.commitTransaction();
      }
      
      return {
        success: true,
        action,
        upvotes: updatedPin.rating.upvotes,
        downvotes: updatedPin.rating.downvotes
      };
    } catch (error) {
      if (session) {
        await session.abortTransaction();
      }
      logger.error('Error voting on pin:', error);
      throw new Error('Failed to vote on pin');
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  async getUserVote(
    userId: mongoose.Types.ObjectId,
    pinId: mongoose.Types.ObjectId
  ): Promise<'upvote' | 'downvote' | null> {
    const vote = await this.voteCollection.findOne({ userId, pinId });
    return vote ? vote.voteType : null;
  }
}

export const pinVoteModel = new PinVoteModel();


