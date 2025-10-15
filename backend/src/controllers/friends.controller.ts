import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  SendFriendRequestRequest,
  FriendRequestsQuery,
  UpdateFriendSettingsRequest,
  sendFriendRequestSchema,
  friendRequestsQuerySchema,
  updateFriendSettingsSchema,
  SendFriendRequestResponse,
  FriendRequestsResponse,
  FriendsListResponse,
} from '../types/friends.types';
import { friendshipModel } from '../models/friendship.model';
import { userModel } from '../models/user.model';
import logger from '../utils/logger.util';

/**
 * POST /friends/requests — Send friend request.
 * @param body.toUserId string - Target user id.
 * @return 201 { requestId, status: "pending" }
 */
export async function sendFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validate request body
    const validation = sendFriendRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: validation.error.issues,
      });
      return;
    }

    const { toUserId } = validation.data;
    const fromUser = req.user!; // Authenticated user from middleware
    const fromUserId = fromUser._id;

    // Check if user is trying to send request to themselves
    if (fromUserId.toString() === toUserId) {
      res.status(400).json({
        message: 'Cannot send friend request to yourself',
      });
      return;
    }

    // 2. Check if target user exists
    const targetUser = await userModel.findById(new mongoose.Types.ObjectId(toUserId));
    if (!targetUser) {
      res.status(404).json({
        message: 'User not found',
      });
      return;
    }

    // 3. Check if friendship already exists
    const existingFriendship = await friendshipModel.findByUserAndFriend(
      fromUserId,
      targetUser._id
    );

    if (existingFriendship) {
      let message = 'Friend request already exists';
      if (existingFriendship.status === 'accepted') {
        message = 'You are already friends with this user';
      } else if (existingFriendship.status === 'pending') {
        message = 'Friend request already sent';
      } else if (existingFriendship.status === 'declined') {
        message = 'Friend request was previously declined';
      } else if (existingFriendship.status === 'blocked') {
        message = 'Unable to send friend request';
      }
      
      res.status(409).json({ message });
      return;
    }

    // Check for reverse friendship (if target user already sent a request)
    const reverseFriendship = await friendshipModel.findByUserAndFriend(
      targetUser._id,
      fromUserId
    );

    if (reverseFriendship?.status === 'pending') {
      res.status(409).json({
        message: 'This user has already sent you a friend request',
      });
      return;
    }

    // 4. Check privacy settings (allowFriendRequestsFrom)
    const { allowFriendRequestsFrom } = targetUser.privacy;
    
    if (allowFriendRequestsFrom === 'noOne') {
      res.status(403).json({
        message: 'This user is not accepting friend requests',
      });
      return;
    }

    if (allowFriendRequestsFrom === 'friendsOfFriends') {
      // TODO: Implement mutual friends check when we have that logic
      // For now, we'll allow all requests
      logger.info('Friends of friends check not implemented yet, allowing request');
    }

    // 5. Create friendship record
    const friendshipData = {
      userId: fromUserId,
      friendId: targetUser._id,
      status: 'pending' as const,
      requestedBy: fromUserId,
      shareLocation: true,
      closeFriend: false,
    };

    const newFriendship = await friendshipModel.create(friendshipData);

    // 6. Return response
    const response: SendFriendRequestResponse = {
      message: 'Friend request sent successfully',
      data: {
        requestId: newFriendship._id.toString(),
        status: 'pending',
      },
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error in sendFriendRequest:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * GET /friends/requests — List pending (inbox/outbox).
 * @param query.inbox string - "true" incoming, else outgoing.
 * @param query.limit number - Max results.
 * @param query.cursor string - Optional last id.
 * @return 200 FriendRequestSummary[]
 */
export async function listFriendRequests(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Implement list friend requests logic
    // 1. Validate query parameters
    // 2. Get user ID from auth middleware
    // 3. Fetch pending requests (inbox or outbox)
    // 4. Format response data
    // 5. Return paginated results

    res.status(501).json({
      message: 'List friend requests not implemented yet',
    });
  } catch (error) {
    logger.error('Error in listFriendRequests:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * POST /friends/requests/:id/accept — Accept request.
 * @param params.id string - Request id.
 * @return 200 { status: "accepted" }
 */
export async function acceptFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Implement accept friend request logic
    // 1. Validate request ID parameter
    // 2. Get user ID from auth middleware
    // 3. Find the pending friendship request
    // 4. Verify user is the recipient
    // 5. Update status to 'accepted'
    // 6. Create reciprocal friendship record
    // 7. Update friends count for both users
    // 8. Return success response

    res.status(501).json({
      message: 'Accept friend request not implemented yet',
    });
  } catch (error) {
    logger.error('Error in acceptFriendRequest:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * POST /friends/requests/:id/decline — Decline request.
 * @param params.id string - Request id.
 * @return 200 { status: "declined" }
 */
export async function declineFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Implement decline friend request logic
    // 1. Validate request ID parameter
    // 2. Get user ID from auth middleware
    // 3. Find the pending friendship request
    // 4. Verify user is the recipient
    // 5. Update status to 'declined'
    // 6. Return success response

    res.status(501).json({
      message: 'Decline friend request not implemented yet',
    });
  } catch (error) {
    logger.error('Error in declineFriendRequest:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * GET /friends — List accepted friends.
 * @param query.limit number - Max.
 * @param query.cursor string - Optional last id.
 * @return 200 FriendSummary[]
 */
export async function listFriends(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Implement list friends logic
    // 1. Validate query parameters
    // 2. Get user ID from auth middleware
    // 3. Fetch accepted friendships
    // 4. Format friend summary data
    // 5. Return paginated results

    res.status(501).json({
      message: 'List friends not implemented yet',
    });
  } catch (error) {
    logger.error('Error in listFriends:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * PATCH /friends/:friendId — Update per-friend settings.
 * @param params.friendId string - Friend user id.
 * @param body.shareLocation boolean? - Allow live location.
 * @param body.closeFriend boolean? - Flag.
 * @return 200 { success: true }
 */
export async function updateFriend(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Implement update friend settings logic
    // 1. Validate friend ID parameter
    // 2. Validate request body
    // 3. Get user ID from auth middleware
    // 4. Find the accepted friendship
    // 5. Update friendship settings
    // 6. Return success response

    res.status(501).json({
      message: 'Update friend settings not implemented yet',
    });
  } catch (error) {
    logger.error('Error in updateFriend:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * DELETE /friends/:friendId — Remove friend (both directions).
 * @param params.friendId string - Friend user id.
 * @return 200 { success: true }
 */
export async function removeFriend(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Implement remove friend logic
    // 1. Validate friend ID parameter
    // 2. Get user ID from auth middleware
    // 3. Find both directional friendship records
    // 4. Delete both friendship records
    // 5. Update friends count for both users
    // 6. Clean up location sharing
    // 7. Return success response

    res.status(501).json({
      message: 'Remove friend not implemented yet',
    });
  } catch (error) {
    logger.error('Error in removeFriend:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}