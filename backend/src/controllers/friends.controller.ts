import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  sendFriendRequestSchema,
  friendRequestsQuerySchema,
  updateFriendSettingsSchema,
  SendFriendRequestResponse,
  FriendRequestsResponse,
  FriendsListResponse,
} from '../types/friends.types';
import { friendshipModel } from '../models/friendship.model';
import { userModel } from '../models/user.model';
import { notificationService } from '../services/notification.service';
import logger from '../utils/logger.util';
import { BadgeService } from '../services/badge.service';
import { BadgeRequirementType } from '../types/badge.types';
import { IUser } from '../types/user.types';

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
    const toUserIdStr = String(toUserId);
    const fromUser = req.user; // Authenticated user from middleware
    if (!fromUser) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const fromUserId = fromUser._id;

    // Check if user is trying to send request to themselves
    if (fromUserId.toString() === toUserIdStr) {
      res.status(400).json({
        message: 'Cannot send friend request to yourself',
      });
      return;
    }

    // 2. Check if target user exists
    const targetUser = await userModel.findById(new mongoose.Types.ObjectId(toUserIdStr));
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
      if (existingFriendship.status === 'accepted') {
        res.status(409).json({ message: 'You are already friends with this user' });
        return;
      } else if (existingFriendship.status === 'pending') {
        res.status(409).json({ message: 'Friend request already sent' });
        return;
      } else if (existingFriendship.status === 'declined' || existingFriendship.status === 'blocked') {
        // Status check is necessary for business logic
        // Clean up old declined/blocked records to allow fresh start
        logger.info(`Cleaning up old ${existingFriendship.status} friendship record between ${fromUserId.toString()} and ${targetUser._id.toString()}`);
        await friendshipModel.deleteFriendship(fromUserId, targetUser._id);
      }
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
    } else if (reverseFriendship && (reverseFriendship.status === 'declined' || reverseFriendship.status === 'blocked')) {
      // Clean up old reverse records as well
      logger.info(`Cleaning up old reverse ${reverseFriendship.status} friendship record from ${targetUser._id.toString()} to ${fromUserId.toString()}`);
      await friendshipModel.deleteFriendship(targetUser._id, fromUserId);
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
      // Check if users have mutual friends
      const fromUserFriends = await friendshipModel.findUserFriendships(fromUserId, 'accepted');
      const targetUserFriends = await friendshipModel.findUserFriendships(targetUser._id, 'accepted');
      
      // Helper to extract user ID from populated or unpopulated field
      const getUserId = (field: mongoose.Types.ObjectId | IUser): string => {
        if (field instanceof mongoose.Types.ObjectId) {
          return field.toString();
        }
        return (field as IUser)._id.toString();
      };
      
      const fromUserFriendIds = new Set(
        fromUserFriends.map(f => getUserId(f.friendId))
      );
      
      const hasMutualFriend = targetUserFriends.some(f => {
        const friendId = getUserId(f.friendId);
        return fromUserFriendIds.has(friendId);
      });
      
      if (!hasMutualFriend) {
        res.status(403).json({
          message: 'This user only accepts friend requests from friends of friends',
        });
        return;
      }
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

    // 6. Send notification to target user
    await notificationService.sendFriendRequestNotification(
      toUserIdStr,
      fromUserId.toString(),
      fromUser.name
    );

    // 7. Return response
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
    const requestLimit = limit ? parseInt(String(limit), 10) : 20; // Default limit of 20

    // 2. Get user ID from auth middleware
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
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

    // Helper to extract user data from populated or unpopulated field
    const getUserData = (field: mongoose.Types.ObjectId | IUser): { _id: string; name?: string; username: string; profilePicture?: string } => {
      if (field instanceof mongoose.Types.ObjectId) {
        // If not populated, we can't get name/profilePicture, so return minimal data
        return {
          _id: field.toString(),
          username: '',
        };
      }
      const user = field as IUser;
      return {
        _id: user._id.toString(),
        name: user.name,
        username: user.username,
        profilePicture: user.profilePicture,
      };
    };

    // 4. Format response data
    const formattedRequests = friendRequests.map((request) => {
      if (isInbox) {
        // For incoming requests, show the sender (userId)
        const sender = getUserData(request.userId);
        return {
          _id: request._id.toString(),
          from: {
            userId: sender._id,
            displayName: sender.name ?? sender.username,
            photoUrl: sender.profilePicture,
          },
          createdAt: request.createdAt.toISOString(),
        };
      } else {
        // For outgoing requests, show the recipient (friendId)
        const recipient = getUserData(request.friendId);
        return {
          _id: request._id.toString(),
          to: {
            userId: recipient._id,
            displayName: recipient.name ?? recipient.username,
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
    
    logger.info(`🔍 Raw requestId: "${requestId}" (type: ${typeof requestId}, length: ${requestId.length})`);
    
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
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
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

    // Helper to extract ObjectId from populated or unpopulated field
    const getObjectId = (field: mongoose.Types.ObjectId | IUser): mongoose.Types.ObjectId => {
      if (field instanceof mongoose.Types.ObjectId) {
        return field;
      }
      return (field as IUser)._id;
    };

    // 4. Verify user is the recipient (friendId) and request is still pending
    logger.info(`🔍 Accept request debug: requestId=${requestId}, currentUserId=${currentUserId.toString()}, friendRequest.friendId=${getObjectId(friendshipRequest.friendId).toString()}, friendRequest.userId=${getObjectId(friendshipRequest.userId).toString()}, status=${friendshipRequest.status}`);
    
    // Extract the actual ObjectId from the populated or unpopulated friendId field
    const friendId = getObjectId(friendshipRequest.friendId);
    
    if (friendId.toString() !== currentUserId.toString()) {
      logger.error(`❌ Authorization failed: friendId=${friendId.toString()} !== currentUserId=${currentUserId.toString()}`);
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
    // Extract the actual ObjectId from the populated or unpopulated userId field
    const userId = getObjectId(friendshipRequest.userId);
    
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

    // 8. Send notification to the original requester
    const acceptingUser = await userModel.findById(currentUserId);
    if (acceptingUser) {
      await notificationService.sendFriendRequestAcceptedNotification(
        userId.toString(),
        currentUserId.toString(),
        acceptingUser.name
      );
    }

    // 9. Process badge events for both users who gained a friend
    try {
      const badgePromises = [
        BadgeService.processBadgeEvent({
          userId: currentUserId.toString(),
          eventType: BadgeRequirementType.FRIENDS_ADDED,
          value: 1,
          timestamp: new Date(),
          metadata: {
            friendId: userId.toString(),
          },
        }),
        BadgeService.processBadgeEvent({
          userId: userId.toString(),
          eventType: BadgeRequirementType.FRIENDS_ADDED,
          value: 1,
          timestamp: new Date(),
          metadata: {
            friendId: currentUserId.toString(),
          },
        }),
      ];

      const [currentUserBadges, friendUserBadges] = await Promise.all(badgePromises);

      if (currentUserBadges.length > 0) {
        logger.info(`User ${currentUserId.toString()} earned ${currentUserBadges.length} badge(s) from adding a friend`);
      }
      if (friendUserBadges.length > 0) {
        logger.info(`User ${userId.toString()} earned ${friendUserBadges.length} badge(s) from adding a friend`);
      }

      // If current user earned badges, include them in response
      if (currentUserBadges.length > 0) {
        res.status(200).json({
          message: 'Friend request accepted successfully',
          data: {
            status: 'accepted',
            earnedBadges: currentUserBadges,
          },
        });
        return;
      }
    } catch (badgeError) {
      // Log badge processing error but don't fail the friend acceptance
      logger.error('Error processing badge event for friend added:', badgeError);
    }

    // 9. Return success response
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
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const currentUserId = currentUser._id;

    // 3. Find the pending friendship request
    const friendshipRequest = await friendshipModel.findById(new mongoose.Types.ObjectId(requestId));
    
    if (!friendshipRequest) {
      res.status(404).json({
        message: 'Friend request not found',
      });
      return;
    }

    // Helper to extract ObjectId from populated or unpopulated field
    const getObjectId = (field: mongoose.Types.ObjectId | IUser): mongoose.Types.ObjectId => {
      if (field instanceof mongoose.Types.ObjectId) {
        return field;
      }
      return (field as IUser)._id;
    };

    // 4. Verify user is the recipient (friendId) and request is still pending
    // Extract the actual ObjectId from the populated or unpopulated friendId field
    const friendId = getObjectId(friendshipRequest.friendId);
    
    if (friendId.toString() !== currentUserId.toString()) {
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

    // 5. Delete the friend request (no need to keep declined requests)
    await friendshipModel.deleteById(friendshipRequest._id);

    // 6. Return success response
    res.status(200).json({
      message: 'Friend request declined successfully',
      data: {
        status: 'deleted',
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
    const friendLimit = limit ? parseInt(String(limit), 10) : 50; // Default limit of 50 for friends list

    // 2. Get user ID from auth middleware
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const currentUserId = currentUser._id;

    // 3. Fetch accepted friendships
    const acceptedFriendships = await friendshipModel.findUserFriendships(
      currentUserId,
      'accepted', // Only get accepted friendships
      friendLimit
    );

    // Helper to extract user ID from populated or unpopulated field
    const getFriendUserId = (field: mongoose.Types.ObjectId | IUser): mongoose.Types.ObjectId => {
      if (field instanceof mongoose.Types.ObjectId) {
        return field;
      }
      return (field as IUser)._id;
    };

    // Helper to extract user data from populated or unpopulated field
    const getFriendData = (field: mongoose.Types.ObjectId | IUser): IUser | null => {
      if (field instanceof mongoose.Types.ObjectId) {
        return null; // Not populated
      }
      return field as IUser;
    };

    // 4. Get online status for all friends (based on recent location activity)
    const friendUserIds = acceptedFriendships.map(friendship => 
      getFriendUserId(friendship.friendId)
    );
    
    const onlineStatusMap = await userModel.getOnlineStatus(friendUserIds, 10); // 10 minutes threshold

    // 5. Format friend summary data with online status
    const formattedFriends = acceptedFriendships.map((friendship) => {
      const friend = getFriendData(friendship.friendId);
      if (!friend) {
        // If friend data is not populated, we can't return full info
        // This shouldn't happen if populate is working correctly
        const friendId = getFriendUserId(friendship.friendId);
        return {
          userId: friendId.toString(),
          displayName: '',
          photoUrl: undefined,
          bio: undefined,
          shareLocation: friendship.shareLocation,
          isOnline: onlineStatusMap.get(friendId.toString()) ?? false
        };
      }
      
      const isOnline = onlineStatusMap.get(friend._id.toString()) ?? false;
      
      return {
        userId: friend._id.toString(),
        displayName: friend.name || friend.username,
        photoUrl: friend.profilePicture,
        bio: friend.bio,
        shareLocation: friendship.shareLocation,
        isOnline
      };
    });

    // 6. Return results
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
    if (Object.keys(settings as Record<string, unknown>).length === 0) {
      res.status(400).json({
        message: 'At least one setting must be provided',
      });
      return;
    }

    // 3. Get user ID from auth middleware
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
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
      settings as Partial<Pick<import('../types/friends.types').IFriendship, 'shareLocation' | 'closeFriend'>>
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
    const currentUser = req.user;
    if (!currentUser) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
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
      logger.warn(`Reciprocal friendship missing for users ${currentUserId.toString()} and ${friendId.toString()}`);
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