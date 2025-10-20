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
    // 1. Validate query parameters
    const validation = friendRequestsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        message: 'Invalid query parameters',
        errors: validation.error.issues,
      });
      return;
    }

    const { inbox, limit } = validation.data;
    const isInbox = inbox === 'true';
    const requestLimit = limit ? parseInt(limit, 10) : 20; // Default limit of 20

    // 2. Get user ID from auth middleware
    const currentUser = req.user!;
    const currentUserId = currentUser._id;

    // 3. Fetch pending requests (inbox or outbox)
    let friendRequests;
    if (isInbox) {
      // Incoming requests - where current user is the friendId (recipient)
      friendRequests = await friendshipModel.findIncomingRequests(currentUserId, requestLimit);
    } else {
      // Outgoing requests - where current user is the userId (sender)
      friendRequests = await friendshipModel.findOutgoingRequests(currentUserId, requestLimit);
    }

    // 4. Format response data
    const formattedRequests = friendRequests.map((request) => {
      if (isInbox) {
        // For incoming requests, show the sender (userId)
        const sender = request.userId as any; // populated by the model
        return {
          _id: request._id.toString(),
          from: {
            userId: sender._id.toString(),
            displayName: sender.name || sender.username,
            photoUrl: sender.profilePicture,
          },
          createdAt: request.createdAt.toISOString(),
        };
      } else {
        // For outgoing requests, show the recipient (friendId)
        const recipient = request.friendId as any; // populated by the model
        return {
          _id: request._id.toString(),
          from: {
            userId: recipient._id.toString(),
            displayName: recipient.name || recipient.username,
            photoUrl: recipient.profilePicture,
          },
          createdAt: request.createdAt.toISOString(),
        };
      }
    });

    // 5. Return results
    const response: FriendRequestsResponse = {
      message: `${isInbox ? 'Incoming' : 'Outgoing'} friend requests retrieved successfully`,
      data: formattedRequests,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error in listFriendRequests:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * POST /friends/requests/:id/accept — Accept request.
 * @param params.id string - Friend Request id.
 * @return 200 { status: "accepted" }
 */
export async function acceptFriendRequest(req: Request, res: Response): Promise<void> {
  try {
    logger.info(`🔍 Accept request - Raw params:`, req.params);
    logger.info(`🔍 Accept request - Raw URL:`, req.url);
    logger.info(`🔍 Accept request - Method:`, req.method);
    
    // 1. Validate friend request ID parameter format (sanitize and validate)
    let requestId = req.params.id;
    
    logger.info(`🔍 Raw requestId: "${requestId}" (type: ${typeof requestId}, length: ${requestId?.length})`);
    
    // Sanitize the parameter - remove any potential CRLF characters
    if (typeof requestId === 'string') {
      requestId = requestId.trim().replace(/[\r\n\t]/g, '');
    }
    
    logger.info(`🔍 Sanitized requestId: "${requestId}"`);
    
    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      logger.error(`❌ Invalid request ID format: "${requestId}"`);
      res.status(400).json({
        message: 'Invalid friend request ID format',
      });
      return;
    }

    // 2. Get user ID from auth middleware
    const currentUser = req.user!;
    const currentUserId = currentUser._id;

    // 3. Find the pending friendship request
    const objectId = new mongoose.Types.ObjectId(requestId);
    const friendshipRequest = await friendshipModel.findById(objectId);
    
    if (!friendshipRequest) {
      logger.error(`❌ Friend request not found: ${requestId}`);
      res.status(404).json({
        message: 'Friend request not found',
      });
      return;
    }

    // 4. Verify user is the recipient (friendId) and request is still pending
    logger.info(`🔍 Accept request debug: requestId=${requestId}, currentUserId=${currentUserId}, friendRequest.friendId=${friendshipRequest.friendId}, friendRequest.userId=${friendshipRequest.userId}, status=${friendshipRequest.status}`);
    
    // Extract the actual ObjectId from the populated friendId field
    const friendId = friendshipRequest.friendId._id || friendshipRequest.friendId;
    
    if (friendId.toString() !== currentUserId.toString()) {
      logger.error(`❌ Authorization failed: friendId=${friendId} !== currentUserId=${currentUserId}`);
      res.status(403).json({
        message: 'You are not authorized to accept this friend request',
      });
      return;
    }

    if (friendshipRequest.status !== 'pending') {
      res.status(400).json({
        message: `Friend request is already ${friendshipRequest.status}`,
      });
      return;
    }

    // 5. Update status to 'accepted'
    await friendshipModel.updateStatus(friendshipRequest._id, 'accepted');

    // 6. Create reciprocal friendship record
    // Extract the actual ObjectId from the populated userId field
    const userId = friendshipRequest.userId._id || friendshipRequest.userId;
    
    const reciprocalFriendshipData = {
      userId: currentUserId,
      friendId: userId,
      status: 'accepted' as const,
      requestedBy: friendshipRequest.requestedBy,
      shareLocation: true,
      closeFriend: false,
    };

    await friendshipModel.create(reciprocalFriendshipData);

    // 7. Update friends count for both users
    await Promise.all([
      userModel.incrementFriendsCount(currentUserId, 1),
      userModel.incrementFriendsCount(userId, 1),
    ]);

    // 8. Return success response
    res.status(200).json({
      message: 'Friend request accepted successfully',
      data: {
        status: 'accepted',
      },
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
    // 1. Validate friend request ID parameter format (not checking database yet)
    const requestId = req.params.id;
    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      res.status(400).json({
        message: 'Invalid friend request ID format',
      });
      return;
    }

    // 2. Get user ID from auth middleware
    const currentUser = req.user!;
    const currentUserId = currentUser._id;

    // 3. Find the pending friendship request
    const friendshipRequest = await friendshipModel.findById(new mongoose.Types.ObjectId(requestId));
    
    if (!friendshipRequest) {
      res.status(404).json({
        message: 'Friend request not found',
      });
      return;
    }

    // 4. Verify user is the recipient (friendId) and request is still pending
    if (friendshipRequest.friendId.toString() !== currentUserId.toString()) {
      res.status(403).json({
        message: 'You are not authorized to decline this friend request',
      });
      return;
    }

    if (friendshipRequest.status !== 'pending') {
      res.status(400).json({
        message: `Friend request is already ${friendshipRequest.status}`,
      });
      return;
    }

    // 5. Update status to 'declined'
    await friendshipModel.updateStatus(friendshipRequest._id, 'declined');

    // 6. Return success response
    res.status(200).json({
      message: 'Friend request declined successfully',
      data: {
        status: 'declined',
      },
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
    // 1. Validate query parameters (reusing friendRequestsQuerySchema for limit/cursor)
    const validation = friendRequestsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        message: 'Invalid query parameters',
        errors: validation.error.issues,
      });
      return;
    }

    const { limit } = validation.data;
    const friendLimit = limit ? parseInt(limit, 10) : 50; // Default limit of 50 for friends list

    // 2. Get user ID from auth middleware
    const currentUser = req.user!;
    const currentUserId = currentUser._id;

    // 3. Fetch accepted friendships
    const acceptedFriendships = await friendshipModel.findUserFriendships(
      currentUserId,
      'accepted', // Only get accepted friendships
      friendLimit
    );

    // 4. Format friend summary data
    const formattedFriends = acceptedFriendships.map((friendship) => {
      const friend = friendship.friendId as any; // populated by the model
      return {
        userId: friend._id.toString(),
        displayName: friend.name || friend.username,
        photoUrl: friend.profilePicture,
        bio: friend.bio,
        shareLocation: friendship.shareLocation,
      };
    });

    // 5. Return results
    const response: FriendsListResponse = {
      message: 'Friends list retrieved successfully',
      data: formattedFriends,
    };

    res.status(200).json(response);
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
    // 1. Validate friend ID parameter format (not checking database yet)
    const friendId = req.params.friendId;
    if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
      res.status(400).json({
        message: 'Invalid friend ID format',
      });
      return;
    }

    // 2. Validate request body
    const validation = updateFriendSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: validation.error.issues,
      });
      return;
    }

    const settings = validation.data;

    // Check if at least one setting is provided
    if (Object.keys(settings).length === 0) {
      res.status(400).json({
        message: 'At least one setting must be provided',
      });
      return;
    }

    // 3. Get user ID from auth middleware
    const currentUser = req.user!;
    const currentUserId = currentUser._id;

    // Check if user is trying to update themselves
    if (currentUserId.toString() === friendId) {
      res.status(400).json({
        message: 'Cannot update settings for yourself',
      });
      return;
    }

    // 4. Find the accepted friendship
    const friendship = await friendshipModel.findByUserAndFriend(
      currentUserId,
      new mongoose.Types.ObjectId(friendId)
    );

    if (!friendship) {
      res.status(404).json({
        message: 'Friendship not found',
      });
      return;
    }

    if (friendship.status !== 'accepted') {
      res.status(400).json({
        message: 'Can only update settings for accepted friends',
      });
      return;
    }

    // 5. Update friendship settings
    const updatedFriendship = await friendshipModel.updateSettings(
      currentUserId,
      new mongoose.Types.ObjectId(friendId),
      settings
    );

    if (!updatedFriendship) {
      res.status(500).json({
        message: 'Failed to update friendship settings',
      });
      return;
    }

    // 6. Return success response
    res.status(200).json({
      message: 'Friend settings updated successfully',
      data: {
        success: true,
        settings: {
          shareLocation: updatedFriendship.shareLocation,
          closeFriend: updatedFriendship.closeFriend,
        },
      },
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
    // 1. Validate friend ID parameter format (not checking database yet)
    const friendId = req.params.friendId;
    if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
      res.status(400).json({
        message: 'Invalid friend ID format',
      });
      return;
    }

    // 2. Get user ID from auth middleware
    const currentUser = req.user!;
    const currentUserId = currentUser._id;
    const friendObjectId = new mongoose.Types.ObjectId(friendId);

    // Check if user is trying to remove themselves
    if (currentUserId.toString() === friendId) {
      res.status(400).json({
        message: 'Cannot remove yourself as a friend',
      });
      return;
    }

    // 3. Find both directional friendship records
    const [userToFriendship, friendToUsershipship] = await Promise.all([
      friendshipModel.findByUserAndFriend(currentUserId, friendObjectId),
      friendshipModel.findByUserAndFriend(friendObjectId, currentUserId),
    ]);

    // Check if friendship exists
    if (!userToFriendship || userToFriendship.status !== 'accepted') {
      res.status(404).json({
        message: 'Friendship not found or not accepted',
      });
      return;
    }

    // Verify that the reciprocal friendship exists
    if (!friendToUsershipship || friendToUsershipship.status !== 'accepted') {
      logger.warn(`Reciprocal friendship missing for users ${currentUserId} and ${friendId}`);
    }

    // 4. Delete both friendship records
    await friendshipModel.deleteFriendship(currentUserId, friendObjectId);

    // 5. Update friends count for both users (decrement by 1)
    await Promise.all([
      userModel.incrementFriendsCount(currentUserId, -1),
      userModel.incrementFriendsCount(friendObjectId, -1),
    ]);

    // 6. Clean up location sharing - this is handled automatically when friendship records are deleted
    // Future: Could add specific location cleanup logic here if needed

    // 7. Return success response
    res.status(200).json({
      message: 'Friend removed successfully',
      data: {
        success: true,
      },
    });
  } catch (error) {
    logger.error('Error in removeFriend:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}