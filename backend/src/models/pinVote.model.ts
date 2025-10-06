import mongoose, { Schema } from 'mongoose';
import { IPinVote } from '../types/pins.types';
import { pinModel } from './pin.model';
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
  ): Promise<boolean> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existingVote = await this.voteCollection.findOne({ userId, pinId });

      let upvoteChange = 0;
      let downvoteChange = 0;

      if (existingVote) {
        if (existingVote.voteType !== voteType) {
          existingVote.voteType = voteType;
          await existingVote.save({ session });
          if (voteType === 'upvote') {
            upvoteChange = 1;
            downvoteChange = -1;
          } else {
            upvoteChange = -1;
            downvoteChange = 1;
          }
        }
      } else {
        await this.voteCollection.create([{ userId, pinId, voteType }], { session });
        if (voteType === 'upvote') {
          upvoteChange = 1;
        } else {
          downvoteChange = 1;
        }
      }

      if (upvoteChange !== 0 || downvoteChange !== 0) {
        // Access the underlying model to update rating
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pinCollection = (pinModel as any)['pin'] as mongoose.Model<any>;
        await pinCollection.findByIdAndUpdate(
          pinId,
          {
            $inc: { 'rating.upvotes': upvoteChange, 'rating.downvotes': downvoteChange },
            $addToSet: { 'rating.voters': userId },
          },
          { session }
        );
      }

      await session.commitTransaction();
      return true;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error voting on pin:', error);
      throw new Error('Failed to vote on pin');
    } finally {
      session.endSession();
    }
  }
}

export const pinVoteModel = new PinVoteModel();


