import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

import { UserController } from '../../src/controllers/user.controller';
import { userModel } from '../../src/models/user.model';
import { friendshipModel } from '../../src/models/friendship.model';
import { badgeModel } from '../../src/models/badge.model';

// Mock all external dependencies
jest.mock('../../src/models/user.model');
jest.mock('../../src/models/friendship.model');
jest.mock('../../src/models/badge.model');
jest.mock('../../src/services/media.service');

const app = express();
app.use(express.json());

// Mock authentication middleware directly in routes
const authenticateToken = (req: unknown, res: any, next: any) => {
  req.user = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    name: 'Test User',
    email: 'test@example.com',
    username: 'testuser',
    privacy: {
      profileVisibleTo: 'everyone',
      allowFriendRequestsFrom: 'everyone'
    }
  };
  next();
};

// Set up routes with authentication
const userController = new UserController();
app.get('/users/profile', authenticateToken, (req, res) => userController.getProfile(req, res));
app.post('/users/profile', authenticateToken, (req, res, next) => void userController.updateProfile(req, res, next));
app.delete('/users/profile', authenticateToken, (req, res, next) => void userController.deleteProfile(req, res, next));
app.get('/users/search', authenticateToken, (req, res) => void userController.searchUsers(req, res));
app.get('/users/me', authenticateToken, (req, res) => userController.getMe(req, res));
app.patch('/users/me/privacy', authenticateToken, (req, res) => void userController.updatePrivacy(req, res));
app.put('/users/me/fcm-token', authenticateToken, (req, res) => void userController.updateFcmToken(req, res));
app.delete('/users/me/fcm-token', authenticateToken, (req, res) => void userController.removeFcmToken(req, res));
app.get('/users/:userId/profile', authenticateToken, (req, res, next) => void userController.getUserProfile(req, res, next));

const mockUserModel = userModel as jest.Mocked<typeof userModel>;
const mockFriendshipModel = friendshipModel as jest.Mocked<typeof friendshipModel>;
const mockBadgeModel = badgeModel as jest.Mocked<typeof badgeModel>;

describe('Mocked: GET /users/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: authenticated user gets their own profile
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns user profile from req.user
  // Expected output: user profile data
  test('Get own profile successfully', async () => {
    const response = await request(app)
      .get('/users/profile')
      .expect(200);

    expect(response.body.message).toBe('Profile fetched successfully');
    expect(response.body.data.user).toHaveProperty('_id');
    expect(response.body.data.user.name).toBe('Test User');
    expect(response.body.data.user.username).toBe('testuser');
  });
});

describe('Mocked: GET /users/:userId/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: userModel.findById returns target user, friendshipModel.areFriends returns true, badgeModel.getUserBadges returns badges
  // Input: valid userId for friend's profile
  // Expected status code: 200
  // Expected behavior: returns friend's profile with badges
  // Expected output: friend profile data with badges
  test('Get friend profile successfully', async () => {
    const mockTargetUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Friend User',
      username: 'frienduser',
      email: 'friend@example.com',
      campus: 'UBC',
      bio: 'Hello world',
      profilePicture: null,
      friendsCount: 5,
      stats: {
        pinsCreated: 10,
        pinsVisited: 20,
        locationsExplored: 15,
        librariesVisited: 5,
        cafesVisited: 8,
        restaurantsVisited: 7
      },
      privacy: {
        profileVisibleTo: 'friends'
      }
    };

    const mockBadges = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        name: 'Explorer',
        description: 'Visit 10 locations',
        iconUrl: 'https://example.com/explorer.png'
      }
    ];

    const mockOnlineStatus = new Map();
    mockOnlineStatus.set('507f1f77bcf86cd799439012', true);

    mockFriendshipModel.areFriends.mockResolvedValueOnce(true);
    mockUserModel.findById.mockResolvedValueOnce(mockTargetUser as unknown);
    mockUserModel.getOnlineStatus.mockResolvedValueOnce(mockOnlineStatus);
    mockBadgeModel.getUserBadges.mockResolvedValueOnce(mockBadges as unknown);

    const response = await request(app)
      .get('/users/507f1f77bcf86cd799439012/profile')
      .expect(200);

    expect(response.body.message).toBe('Friend profile fetched successfully');
    expect(response.body.data.name).toBe('Friend User');
    expect(response.body.data.badges).toHaveLength(1);
    expect(mockFriendshipModel.areFriends).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439012')
    );
    expect(mockUserModel.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'));
    expect(mockBadgeModel.getUserBadges).toHaveBeenCalled();
  });

  // Mocked behavior: userModel.findById returns null
  // Input: non-existent userId
  // Expected status code: 404
  // Expected behavior: user not found
  // Expected output: error message
  test('Get profile for non-existent user', async () => {
    mockUserModel.findById.mockResolvedValueOnce(null);

    const response = await request(app)
      .get('/users/507f1f77bcf86cd799439012/profile')
      .expect(404);

    expect(response.body.message).toBe('User not found');
    expect(mockFriendshipModel.areFriends).toHaveBeenCalledTimes(0); // Not called because user doesn't exist
    expect(mockUserModel.findById).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: friendshipModel.areFriends returns false
  // Input: userId for non-friend user
  // Expected status code: 403
  // Expected behavior: access denied for non-friend
  // Expected output: permission error
  test('Cannot access non-friend profile', async () => {
    const mockTargetUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Stranger User',
      privacy: {
        profileVisibleTo: 'friends'
      }
    };

    mockUserModel.findById.mockResolvedValueOnce(mockTargetUser as any);
    mockFriendshipModel.areFriends.mockResolvedValueOnce(false);
    mockUserModel.getOnlineStatus.mockResolvedValueOnce(new Map()); // Add missing mock

    const response = await request(app)
      .get('/users/507f1f77bcf86cd799439012/profile')
      .expect(403);

    expect(response.body.message).toBe('You can only view profiles of your friends');
    expect(mockFriendshipModel.areFriends).toHaveBeenCalled();
    expect(mockBadgeModel.getUserBadges).not.toHaveBeenCalled();
  });

  // Mocked behavior: invalid userId format
  // Input: malformed userId
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: format error message
  test('Get profile with invalid user ID format', async () => {
    const response = await request(app)
      .get('/users/invalid-id/profile')
      .expect(400);

    expect(response.body.message).toBe('Invalid user ID format');
    expect(mockUserModel.findById).not.toHaveBeenCalled();
  });

  // Mocked behavior: database error during profile fetch
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Get profile database error', async () => {
    mockUserModel.findById.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .get('/users/507f1f77bcf86cd799439012/profile')
      .expect(500);

    expect(response.body.message).toBe('Database connection failed');
    expect(mockUserModel.findById).toHaveBeenCalledTimes(1);
    expect(mockFriendshipModel.areFriends).toHaveBeenCalledTimes(0); // Not reached due to user lookup error
  });
});

describe('Mocked: POST /users/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: userModel.updateProfile returns updated user
  // Input: valid profile update data
  // Expected status code: 200
  // Expected behavior: profile is updated
  // Expected output: updated profile data
  test('Update profile successfully', async () => {
    const updateData = {
      name: 'Updated User',
      bio: 'Updated bio'
    };

    const mockUpdatedUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Updated User',
      username: 'testuser',
      email: 'test@example.com',
      bio: 'Updated bio'
    };

    mockUserModel.update.mockResolvedValueOnce(mockUpdatedUser as unknown);

    const response = await request(app)
      .post('/users/profile')
      .send(updateData)
      .expect(200);

    expect(response.body.message).toBe('User info updated successfully');
    expect(response.body.data.user.name).toBe('Updated User');
    expect(response.body.data.user.bio).toBe('Updated bio');
    expect(mockUserModel.update).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      updateData
    );
  });

  // Mocked behavior: userModel.updateProfile throws error
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Update profile database error', async () => {
    const updateData = {
      name: 'Updated User'
    };

    mockUserModel.update.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .post('/users/profile')
      .send(updateData)
      .expect(500);

    expect(response.body.message).toBe('Database connection failed');
    expect(mockUserModel.update).toHaveBeenCalledTimes(1);
  });
});

describe('Mocked: DELETE /users/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: userModel.deleteUser successfully deletes user
  // Input: authenticated user deletion request
  // Expected status code: 200
  // Expected behavior: user account is deleted
  // Expected output: success message
  test('Delete profile successfully', async () => {
    mockUserModel.delete.mockResolvedValueOnce(undefined);

    const response = await request(app)
      .delete('/users/profile')
      .expect(200);

    expect(response.body.message).toBe('User deleted successfully');
    expect(mockUserModel.delete).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
    );
  });

  // Mocked behavior: userModel.deleteUser throws error
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Delete profile database error', async () => {
    mockUserModel.delete.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .delete('/users/profile')
      .expect(500);

    expect(response.body.message).toBe('Database connection failed');
    expect(mockUserModel.delete).toHaveBeenCalledTimes(1);
  });
});

describe('Mocked: GET /users/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: userModel.searchUsers returns filtered results
  // Input: search query with username
  // Expected status code: 200
  // Expected behavior: returns matching users based on privacy settings
  // Expected output: array of user search results
  test('Search users successfully', async () => {
    const mockSearchResults = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        name: 'Friend User',
        username: 'frienduser',
        privacy: {
          profileVisibleTo: 'everyone'
        }
      },
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        name: 'Another User',
        username: 'anotheruser',
        privacy: {
          profileVisibleTo: 'friends'
        }
      }
    ];

    mockUserModel.searchUsers.mockResolvedValueOnce(mockSearchResults as unknown);
    mockFriendshipModel.areFriends.mockResolvedValueOnce(false); // First user - not friends
    mockFriendshipModel.areFriends.mockResolvedValueOnce(true);  // Second user - are friends

    const response = await request(app)
      .get('/users/search?q=user')
      .expect(200);

    expect(response.body.message).toBe('Users search completed successfully');
    expect(response.body.data).toHaveLength(2); // Both users should be included based on privacy
    expect(mockUserModel.searchUsers).toHaveBeenCalledWith('user', 70); // searchLimit + 50 extra
    expect(mockFriendshipModel.areFriends).not.toHaveBeenCalled(); // Not called for friend discovery
  });

  // Mocked behavior: userModel.searchUsers returns empty array
  // Input: search query with no matches
  // Expected status code: 200
  // Expected behavior: returns empty results
  // Expected output: empty array
  test('Search users no results', async () => {
    mockUserModel.searchUsers.mockResolvedValueOnce([]);

    const response = await request(app)
      .get('/users/search?q=nonexistent')
      .expect(200);

    expect(response.body.message).toBe('Users search completed successfully');
    expect(response.body.data).toHaveLength(0);
    expect(mockUserModel.searchUsers).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: missing search query parameter
  // Input: request without query parameter
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: validation error message
  test('Search users missing query parameter', async () => {
    const response = await request(app)
      .get('/users/search')
      .expect(400);

    expect(response.body.message).toBe('Invalid query parameters');
    expect(mockUserModel.searchUsers).not.toHaveBeenCalled();
  });

  // Mocked behavior: userModel.searchUsers throws error
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Search users database error', async () => {
    mockUserModel.searchUsers.mockRejectedValueOnce(new Error('Database query failed'));

    const response = await request(app)
      .get('/users/search?q=user')
      .expect(500);

    expect(response.body.message).toBe('Internal server error');
    expect(mockUserModel.searchUsers).toHaveBeenCalledTimes(1);
  });
});

describe('Mocked: GET /users/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: userModel.findById returns current user with full details
  // Input: authenticated request for detailed user info
  // Expected status code: 200
  // Expected behavior: returns complete user profile including privacy settings
  // Expected output: detailed user data
  test('Get detailed current user info successfully', async () => {
    const response = await request(app)
      .get('/users/me')
      .expect(200);

    expect(response.body.message).toBe('Profile fetched successfully');
    expect(response.body.data.user).toHaveProperty('privacy');
    expect(response.body.data.user.name).toBe('Test User');
    expect(response.body.data.user.username).toBe('testuser');
    // This endpoint just returns req.user from auth middleware, no database call needed
    expect(mockUserModel.findById).not.toHaveBeenCalled();
  });

});

describe('Mocked: PATCH /users/me/privacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: userModel.updatePrivacySettings returns updated user
  // Input: valid privacy settings update
  // Expected status code: 200
  // Expected behavior: privacy settings are updated
  // Expected output: updated privacy settings
  test('Update privacy settings successfully', async () => {
    const privacyUpdate = {
      profileVisibleTo: 'friends' as const,
      allowFriendRequestsFrom: 'everyone' as const
    };

    const mockUpdatedUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      privacy: {
        profileVisibleTo: 'friends',
        allowFriendRequestsFrom: 'everyone'
      }
    };

    mockUserModel.updatePrivacy.mockResolvedValueOnce(mockUpdatedUser as any);

    const response = await request(app)
      .patch('/users/me/privacy')
      .send(privacyUpdate)
      .expect(200);

    expect(response.body.message).toBe('Privacy settings updated successfully');
    expect(response.body.data.user.privacy.profileVisibleTo).toBe('friends');
    expect(response.body.data.user.privacy.allowFriendRequestsFrom).toBe('everyone');
    expect(mockUserModel.updatePrivacy).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      privacyUpdate
    );
  });

  // Mocked behavior: userModel.updatePrivacySettings throws error
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Update privacy settings database error', async () => {
    const privacyUpdate = {
      profileVisibleTo: 'friends' as const
    };

    mockUserModel.updatePrivacy.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .patch('/users/me/privacy')
      .send(privacyUpdate)
      .expect(500);

    expect(response.body.message).toBe('Internal server error');
    expect(mockUserModel.updatePrivacy).toHaveBeenCalledTimes(1);
  });
});

describe('Mocked: PUT /users/me/fcm-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: userModel.updateFcmToken successfully updates token
  // Input: valid FCM token
  // Expected status code: 200
  // Expected behavior: FCM token is updated for push notifications
  // Expected output: success message
  test('Update FCM token successfully', async () => {
    const fcmTokenData = {
      fcmToken: 'new-fcm-token-12345'
    };

    const mockUpdatedUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Test User',
      email: 'test@example.com',
      fcmToken: 'new-fcm-token-12345'
    };

    mockUserModel.updateFcmToken.mockResolvedValueOnce(mockUpdatedUser as unknown);

    const response = await request(app)
      .put('/users/me/fcm-token')
      .send(fcmTokenData)
      .expect(200);

    expect(response.body.message).toBe('FCM token updated successfully');
    expect(mockUserModel.updateFcmToken).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      'new-fcm-token-12345'
    );
  });

  // Mocked behavior: missing FCM token in request body
  // Input: request without FCM token
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: validation error message
  test('Update FCM token missing token', async () => {
    const response = await request(app)
      .put('/users/me/fcm-token')
      .send({})
      .expect(400);

    expect(response.body.message).toBe('FCM token is required and must be a string');
    expect(mockUserModel.updateFcmToken).not.toHaveBeenCalled();
  });

  // Mocked behavior: userModel.updateFcmToken throws error
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Update FCM token database error', async () => {
    const fcmTokenData = {
      fcmToken: 'new-fcm-token-12345'
    };

    mockUserModel.updateFcmToken.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .put('/users/me/fcm-token')
      .send(fcmTokenData)
      .expect(500);

    expect(response.body.message).toBe('Internal server error');
    expect(mockUserModel.updateFcmToken).toHaveBeenCalledTimes(1);
  });
});

describe('Mocked: DELETE /users/me/fcm-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: userModel.removeFcmToken successfully removes token
  // Input: authenticated request to remove FCM token
  // Expected status code: 200
  // Expected behavior: FCM token is removed
  // Expected output: success message
  test('Remove FCM token successfully', async () => {
    const mockUpdatedUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Test User',
      email: 'test@example.com',
      fcmToken: null
    };

    mockUserModel.removeFcmToken.mockResolvedValueOnce(mockUpdatedUser as any);

    const response = await request(app)
      .delete('/users/me/fcm-token')
      .expect(200);

    expect(response.body.message).toBe('FCM token removed successfully');
    expect(mockUserModel.removeFcmToken).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
    );
  });

  // Mocked behavior: userModel.removeFcmToken throws error
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Remove FCM token database error', async () => {
    mockUserModel.removeFcmToken.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .delete('/users/me/fcm-token')
      .expect(500);

    expect(response.body.message).toBe('Internal server error');
    expect(mockUserModel.removeFcmToken).toHaveBeenCalledTimes(1);
  });
});