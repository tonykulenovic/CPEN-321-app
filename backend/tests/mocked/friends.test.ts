import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

import friendsRoutes from '../../src/routes/friends.routes';
import { friendshipModel } from '../../src/models/friendship.model';
import { userModel } from '../../src/models/user.model';
import { notificationService } from '../../src/services/notification.service';
import { BadgeService } from '../../src/services/badge.service';

// Mock all external dependencies
jest.mock('../../src/models/friendship.model');
jest.mock('../../src/models/user.model');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/services/badge.service');
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req: unknown, res: any, next: any) => {
    req.user = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser'
    };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/friends', friendsRoutes);

const mockFriendshipModel = friendshipModel as jest.Mocked<typeof friendshipModel>;
const mockUserModel = userModel as jest.Mocked<typeof userModel>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockBadgeService = BadgeService as jest.Mocked<typeof BadgeService>;

describe('Mocked: POST /friends/requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: userModel.findById returns valid user
  // Input: valid toUserId in request body
  // Expected status code: 201
  // Expected behavior: friendship request is created
  // Expected output: friendship request data
  test('Valid friend request', async () => {
    const mockTargetUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Target User',
      privacy: { allowFriendRequestsFrom: 'everyone' }
    };
    
    const mockFriendship = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      friendId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      status: 'pending'
    };
    
    mockUserModel.findById.mockResolvedValueOnce(mockTargetUser as unknown);
    mockFriendshipModel.findByUserAndFriend.mockResolvedValueOnce(null);
    mockFriendshipModel.findByUserAndFriend.mockResolvedValueOnce(null);
    mockFriendshipModel.create.mockResolvedValueOnce(mockFriendship as unknown);
    mockNotificationService.sendFriendRequestNotification.mockResolvedValueOnce(undefined);

    const response = await request(app)
      .post('/friends/requests')
      .send({ toUserId: '507f1f77bcf86cd799439012' });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('requestId');
    expect(mockUserModel.findById).toHaveBeenCalledTimes(1);
    expect(mockFriendshipModel.create).toHaveBeenCalledTimes(1);
    expect(mockNotificationService.sendFriendRequestNotification).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: userModel.findById returns null
  // Input: non-existent toUserId
  // Expected status code: 404
  // Expected behavior: user not found
  // Expected output: error message
  test('Target user not found', async () => {
    mockUserModel.findById.mockResolvedValueOnce(null);

    const response = await request(app)
      .post('/friends/requests')
      .send({ toUserId: '507f1f77bcf86cd799439012' });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message');
    expect(mockUserModel.findById).toHaveBeenCalledTimes(1);
    expect(mockFriendshipModel.create).not.toHaveBeenCalled();
  });

  // Mocked behavior: friendshipModel.findByUserAndFriend returns existing friendship
  // Input: duplicate friend request
  // Expected status code: 400
  // Expected behavior: duplicate request rejected
  // Expected output: error message
  test('Duplicate friend request', async () => {
    const mockTargetUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Target User',
      privacy: { allowFriendRequestsFrom: 'everyone' }
    };
    
    const existingFriendship = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      status: 'pending'
    };
    
    mockUserModel.findById.mockResolvedValueOnce(mockTargetUser as unknown);
    mockFriendshipModel.findByUserAndFriend.mockResolvedValueOnce(existingFriendship as unknown);

    const response = await request(app)
      .post('/friends/requests')
      .send({ toUserId: '507f1f77bcf86cd799439012' });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('message');
    expect(mockFriendshipModel.create).not.toHaveBeenCalled();
  });

  // Mocked behavior: missing toUserId in request body
  // Input: request without toUserId
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: validation error message
  test('Missing toUserId', async () => {
    const response = await request(app)
      .post('/friends/requests')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(mockUserModel.findById).not.toHaveBeenCalled();
  });

  // Mocked behavior: friendshipModel throws error during friend request creation
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Send friend request service error', async () => {
    mockUserModel.findById.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .post('/friends/requests')
      .send({ toUserId: '507f1f77bcf86cd799439012' });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    expect(mockUserModel.findById).toHaveBeenCalledTimes(1);
  });
});

describe('Mocked: GET /friends/requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: friendshipModel.findOutgoingRequests returns friend requests
  // Input: authenticated user request (default is outgoing)
  // Expected status code: 200
  // Expected behavior: returns list of outgoing friend requests
  // Expected output: array of friend requests
  test('Get outgoing friend requests', async () => {
    const mockRequests = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        friendId: {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          name: 'Friend User',
          username: 'frienduser'
        },
        status: 'pending',
        createdAt: new Date()
      }
    ];

    mockFriendshipModel.findOutgoingRequests.mockResolvedValueOnce(mockRequests as unknown);

    const response = await request(app).get('/friends/requests');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(mockFriendshipModel.findOutgoingRequests).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: friendshipModel.findIncomingRequests returns friend requests
  // Input: authenticated user request with inbox=true
  // Expected status code: 200
  // Expected behavior: returns list of incoming friend requests
  // Expected output: array of friend requests
  test('Get incoming friend requests', async () => {
    const mockRequests = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        userId: {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          name: 'Friend User',
          username: 'frienduser'
        },
        status: 'pending',
        createdAt: new Date()
      }
    ];

    mockFriendshipModel.findIncomingRequests.mockResolvedValueOnce(mockRequests as unknown);

    const response = await request(app).get('/friends/requests?inbox=true');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(mockFriendshipModel.findIncomingRequests).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: friendshipModel.findOutgoingRequests returns empty array
  // Input: authenticated user with no pending requests
  // Expected status code: 200
  // Expected behavior: returns empty list
  // Expected output: empty array
  test('No pending friend requests', async () => {
    mockFriendshipModel.findOutgoingRequests.mockResolvedValueOnce([]);

    const response = await request(app).get('/friends/requests');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
    expect(mockFriendshipModel.findOutgoingRequests).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: friendshipModel throws error during request processing
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Get friend requests service error', async () => {
    mockFriendshipModel.findOutgoingRequests.mockRejectedValueOnce(new Error('Database query failed'));

    const response = await request(app).get('/friends/requests');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    expect(mockFriendshipModel.findOutgoingRequests).toHaveBeenCalledTimes(1);
  });


});

describe('Mocked: POST /friends/requests/:id/accept', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: friendshipModel.findById returns valid friend request
  // Input: valid request ID from target user
  // Expected status code: 200
  // Expected behavior: friendship is accepted
  // Expected output: success message
  test('Accept valid friend request', async () => {
    const mockFriendRequest = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      friendId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      status: 'pending'
    };
    
    const mockUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Friend User'
    };
    
    mockFriendshipModel.findById.mockResolvedValueOnce(mockFriendRequest as unknown);
    mockFriendshipModel.updateStatus.mockResolvedValueOnce(mockFriendRequest as unknown);
    mockFriendshipModel.create.mockResolvedValueOnce({} as unknown);
    mockUserModel.findById.mockResolvedValueOnce(mockUser as unknown);
    mockBadgeService.processBadgeEvent.mockResolvedValueOnce([]);

    const response = await request(app)
      .post('/friends/requests/507f1f77bcf86cd799439013/accept');

    expect(response.status).toBe(200);
    expect(mockFriendshipModel.updateStatus).toHaveBeenCalledTimes(1);
    expect(mockFriendshipModel.create).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: friendshipModel.findById returns null
  // Input: non-existent request ID
  // Expected status code: 404
  // Expected behavior: request not found
  // Expected output: error message
  test('Friend request not found', async () => {
    mockFriendshipModel.findById.mockResolvedValueOnce(null);

    const response = await request(app)
      .post('/friends/requests/507f1f77bcf86cd799439013/accept');

    expect(response.status).toBe(404);
    expect(mockFriendshipModel.findById).toHaveBeenCalledTimes(1);
    expect(mockFriendshipModel.updateStatus).not.toHaveBeenCalled();
  });

  // Mocked behavior: friendshipModel.findById returns request not for current user
  // Input: request ID for someone else's friend request
  // Expected status code: 403
  // Expected behavior: unauthorized to accept
  // Expected output: permission error
  test('Cannot accept others friend request', async () => {
    const mockFriendRequest = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'), // Different user
      friendId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439015'), // Different user
      status: 'pending'
    };
    
    mockFriendshipModel.findById.mockResolvedValueOnce(mockFriendRequest as unknown);

    const response = await request(app)
      .post('/friends/requests/507f1f77bcf86cd799439013/accept');

    expect(response.status).toBe(403);
    expect(mockFriendshipModel.updateStatus).not.toHaveBeenCalled();
  });

  // Mocked behavior: friendshipModel throws error during processing
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Accept friend request service error', async () => {
    mockFriendshipModel.findById.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .post('/friends/requests/507f1f77bcf86cd799439013/accept');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    expect(mockFriendshipModel.findById).toHaveBeenCalledTimes(1);
  });
});

describe('Mocked: POST /friends/requests/:id/decline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: friendshipModel.findById returns valid pending friend request
  // Input: valid request ID to decline from authorized user (recipient)
  // Expected status code: 200
  // Expected behavior: friend request is deleted (not just marked declined)
  // Expected output: success message with deleted status
  test('Decline valid friend request', async () => {
    const mockFriendRequest = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      friendId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Current user is recipient
      status: 'pending'
    };
    
    mockFriendshipModel.findById.mockResolvedValueOnce(mockFriendRequest as any);
    mockFriendshipModel.deleteById.mockResolvedValueOnce(undefined); // deleteById returns void

    const response = await request(app)
      .post('/friends/requests/507f1f77bcf86cd799439013/decline');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Friend request declined successfully');
    expect(response.body.data.status).toBe('deleted'); // Request is deleted, not just marked declined
    expect(mockFriendshipModel.findById).toHaveBeenCalledWith(mockFriendRequest._id);
    expect(mockFriendshipModel.deleteById).toHaveBeenCalledWith(mockFriendRequest._id);
  });

  // Mocked behavior: friendshipModel throws error during decline processing
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Decline friend request service error', async () => {
    mockFriendshipModel.findById.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .post('/friends/requests/507f1f77bcf86cd799439013/decline');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    expect(mockFriendshipModel.findById).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: friend request has invalid status (not pending)
  // Input: request ID with already processed request
  // Expected status code: 400
  // Expected behavior: cannot decline non-pending request
  // Expected output: status error message
  test('Cannot decline non-pending friend request', async () => {
    const mockFriendRequest = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      friendId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      status: 'accepted' // Already accepted, not pending
    };
    
    mockFriendshipModel.findById.mockResolvedValueOnce(mockFriendRequest as any);

    const response = await request(app)
      .post('/friends/requests/507f1f77bcf86cd799439013/decline');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Friend request is already accepted');
    expect(mockFriendshipModel.updateStatus).not.toHaveBeenCalled();
  });

  // Mocked behavior: friendshipModel.findById returns null
  // Input: non-existent request ID
  // Expected status code: 404
  // Expected behavior: request not found
  // Expected output: error message
  test('Decline non-existent friend request', async () => {
    mockFriendshipModel.findById.mockResolvedValueOnce(null);

    const response = await request(app)
      .post('/friends/requests/507f1f77bcf86cd799439013/decline');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Friend request not found');
    expect(mockFriendshipModel.updateStatus).not.toHaveBeenCalled();
  });

  // Mocked behavior: invalid request ID format
  // Input: malformed request ID
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: format error message
  test('Decline with invalid request ID format', async () => {
    const response = await request(app)
      .post('/friends/requests/invalid-id/decline');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid friend request ID format');
    expect(mockFriendshipModel.findById).not.toHaveBeenCalled();
  });
});

describe('Mocked: GET /friends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: friendshipModel.findUserFriendships returns friends list
  // Input: valid request for friends list
  // Expected status code: 200
  // Expected behavior: returns list of friends
  // Expected output: array of friends
  test('Get friends list successfully', async () => {
    const mockFriendships = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        friendId: {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          name: 'Friend User',
          username: 'frienduser'
        },
        shareLocation: true
      }
    ];
    
    const mockOnlineStatus = new Map();
    mockOnlineStatus.set('507f1f77bcf86cd799439012', true);
    
    mockFriendshipModel.findUserFriendships.mockResolvedValueOnce(mockFriendships as unknown);
    mockUserModel.getOnlineStatus.mockResolvedValueOnce(mockOnlineStatus);

    const response = await request(app).get('/friends');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(mockFriendshipModel.findUserFriendships).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: friendshipModel.findUserFriendships returns empty array
  // Input: user with no friends
  // Expected status code: 200
  // Expected behavior: returns empty list
  // Expected output: empty array
  test('No friends', async () => {
    const mockOnlineStatus = new Map();
    
    mockFriendshipModel.findUserFriendships.mockResolvedValueOnce([]);
    mockUserModel.getOnlineStatus.mockResolvedValueOnce(mockOnlineStatus);

    const response = await request(app).get('/friends');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
    expect(mockFriendshipModel.findUserFriendships).toHaveBeenCalledTimes(1);
  });
});

describe('Mocked: PATCH /friends/:friendId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: friendshipModel.findByUserAndFriend returns accepted friendship, updateSettings succeeds
  // Input: valid friend settings update for existing accepted friend
  // Expected status code: 200
  // Expected behavior: friendship settings are updated and returned
  // Expected output: success message with updated settings
  test('Update friend settings successfully', async () => {
    const mockFriendship = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      friendId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      status: 'accepted'
    };

    const mockUpdatedFriendship = {
      ...mockFriendship,
      shareLocation: true,
      closeFriend: false
    };

    mockFriendshipModel.findByUserAndFriend.mockResolvedValueOnce(mockFriendship as unknown);
    mockFriendshipModel.updateSettings.mockResolvedValueOnce(mockUpdatedFriendship as unknown);

    const response = await request(app)
      .patch('/friends/507f1f77bcf86cd799439012')
      .send({ shareLocation: true });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Friend settings updated successfully');
    expect(response.body.data.success).toBe(true);
    expect(response.body.data.settings.shareLocation).toBe(true);
    expect(mockFriendshipModel.findByUserAndFriend).toHaveBeenCalledTimes(1);
    expect(mockFriendshipModel.updateSettings).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: friendshipModel throws error during settings update
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Update friend settings service error', async () => {
    mockFriendshipModel.findByUserAndFriend.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .patch('/friends/507f1f77bcf86cd799439012')
      .send({ shareLocation: true });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    expect(mockFriendshipModel.findByUserAndFriend).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: invalid friend ID format
  // Input: malformed friend ID
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: format error message
  test('Update friend settings with invalid ID format', async () => {
    const response = await request(app)
      .patch('/friends/invalid-id')
      .send({ shareLocation: true });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid friend ID format');
    expect(mockFriendshipModel.findByUserAndFriend).not.toHaveBeenCalled();
  });

  // Mocked behavior: invalid request body
  // Input: invalid settings data
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: validation error message
  test('Update friend settings with invalid body', async () => {
    const response = await request(app)
      .patch('/friends/507f1f77bcf86cd799439012')
      .send({}); // Empty body

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('At least one setting must be provided');
    expect(mockFriendshipModel.findByUserAndFriend).not.toHaveBeenCalled();
  });
});

describe('Mocked: DELETE /friends/:friendId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: friendshipModel.findByUserAndFriend returns accepted friendships in both directions
  // Input: valid friend ID to remove from existing accepted friendship
  // Expected status code: 200
  // Expected behavior: friendship records are deleted, friends count decremented for both users
  // Expected output: success message
  test('Remove friendship successfully', async () => {
    const mockFriendship = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      friendId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      status: 'accepted'
    };

    const mockReverseFriendship = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      friendId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      status: 'accepted'
    };

    // Mock both directions of friendship lookup (Promise.all in controller)
    mockFriendshipModel.findByUserAndFriend.mockResolvedValueOnce(mockFriendship as unknown);
    mockFriendshipModel.findByUserAndFriend.mockResolvedValueOnce(mockReverseFriendship as unknown);
    mockFriendshipModel.deleteFriendship.mockResolvedValueOnce(undefined);
    mockUserModel.incrementFriendsCount.mockResolvedValueOnce(undefined);

    const response = await request(app)
      .delete('/friends/507f1f77bcf86cd799439012');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Friend removed successfully');
    expect(response.body.data.success).toBe(true);
    expect(mockFriendshipModel.findByUserAndFriend).toHaveBeenCalledTimes(2); // Called twice for both directions
    expect(mockFriendshipModel.deleteFriendship).toHaveBeenCalledTimes(1);
    expect(mockUserModel.incrementFriendsCount).toHaveBeenCalledTimes(2); // Called twice for both users (decrement by -1)
  });

  // Mocked behavior: friendshipModel throws error during friendship removal
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Remove friendship service error', async () => {
    // The controller makes parallel calls for both directions, so both will be rejected
    mockFriendshipModel.findByUserAndFriend.mockRejectedValueOnce(new Error('Database connection failed'));
    mockFriendshipModel.findByUserAndFriend.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .delete('/friends/507f1f77bcf86cd799439012');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    expect(mockFriendshipModel.findByUserAndFriend).toHaveBeenCalledTimes(2); // Called twice for both directions
  });

  // Mocked behavior: invalid friend ID format
  // Input: malformed friend ID
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: format error message
  test('Remove friendship with invalid ID format', async () => {
    const response = await request(app)
      .delete('/friends/invalid-id');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid friend ID format');
    expect(mockFriendshipModel.findByUserAndFriend).not.toHaveBeenCalled();
  });

  // Mocked behavior: non-accepted friendship in updateFriend
  // Input: friendship with pending status
  // Expected status code: 400
  // Expected behavior: reject update for non-accepted friendship
  // Expected output: error message
  test('Update friend settings - non-accepted friendship', async () => {
    const pendingFriendship = {
      _id: '507f1f77bcf86cd799439013',
      userId: '507f1f77bcf86cd799439011',
      friendId: '507f1f77bcf86cd799439012',
      status: 'pending',
      requestedBy: '507f1f77bcf86cd799439011',
      shareLocation: false,
      closeFriend: false,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown;

    mockFriendshipModel.findByUserAndFriend.mockResolvedValue(pendingFriendship);

    const response = await request(app)
      .patch('/friends/507f1f77bcf86cd799439012')
      .send({ shareLocation: true });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Can only update settings for accepted friends');
  });

  // Mocked behavior: failed friendship settings update
  // Input: valid friendship but updateSettings fails
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: failure message
  test('Update friend settings - updateSettings failure', async () => {
    const acceptedFriendship = {
      _id: '507f1f77bcf86cd799439013',
      userId: '507f1f77bcf86cd799439011',
      friendId: '507f1f77bcf86cd799439012',
      status: 'accepted',
      requestedBy: '507f1f77bcf86cd799439011',
      shareLocation: false,
      closeFriend: false,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    mockFriendshipModel.findByUserAndFriend.mockResolvedValue(acceptedFriendship);
    mockFriendshipModel.updateSettings.mockResolvedValue(null); // Simulate failure

    const response = await request(app)
      .patch('/friends/507f1f77bcf86cd799439012')
      .send({ shareLocation: true });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Failed to update friendship settings');
  });

  // Mocked behavior: self-removal prevention
  // Input: user trying to remove themselves
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: self-removal error message
  test('Remove friendship - prevent self removal', async () => {
    const response = await request(app)
      .delete('/friends/507f1f77bcf86cd799439011'); // Same as current user ID

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Cannot remove yourself as a friend');
    expect(mockFriendshipModel.findByUserAndFriend).not.toHaveBeenCalled();
  });

  // Mocked behavior: non-existent friendship in removeFriend
  // Input: friendship that doesn't exist
  // Expected status code: 404
  // Expected behavior: error handling
  // Expected output: not found message
  test('Remove friendship - non-existent friendship', async () => {
    mockFriendshipModel.findByUserAndFriend
      .mockResolvedValueOnce(null) // userToFriendship
      .mockResolvedValueOnce(null); // friendToUsershipship

    const response = await request(app)
      .delete('/friends/507f1f77bcf86cd799439012');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Friendship not found or not accepted');
  });

  // Mocked behavior: non-accepted friendship in removeFriend
  // Input: friendship with non-accepted status
  // Expected status code: 404
  // Expected behavior: error handling
  // Expected output: not found message
  test('Remove friendship - non-accepted friendship', async () => {
    const pendingFriendship = {
      _id: '507f1f77bcf86cd799439013',
      userId: '507f1f77bcf86cd799439011',
      friendId: '507f1f77bcf86cd799439012',
      status: 'pending',
      requestedBy: '507f1f77bcf86cd799439011',
      shareLocation: false,
      closeFriend: false,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    mockFriendshipModel.findByUserAndFriend
      .mockResolvedValueOnce(pendingFriendship) // userToFriendship
      .mockResolvedValueOnce(null); // friendToUsershipship

    const response = await request(app)
      .delete('/friends/507f1f77bcf86cd799439012');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Friendship not found or not accepted');
  });
});