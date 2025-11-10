import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

import userRoutes from '../../src/routes/user.routes';
import { userModel } from '../../src/models/user.model';
import { friendshipModel } from '../../src/models/friendship.model';
import { badgeModel } from '../../src/models/badge.model';
import { PrivacySettings } from '../../src/types/friends.types';

// Create Express app with routes and authentication middleware
function createAuthenticatedApp() {
  const app = express();
  app.use(express.json());
  
  // Add authentication middleware that populates req.user from database
  app.use(async (req: unknown, res: any, next: any) => {
    const userId = req.headers['x-dev-user-id'];
    const authHeader = req.headers.authorization;
    
    // Require both auth header and user ID for authentication
    if (!authHeader || !userId) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }
    
    try {
      // Find user in database
      const user = await userModel['user'].findById(new mongoose.Types.ObjectId(userId));
      if (!user) {
        return res.status(401).json({
          error: 'User not found',
          message: 'Invalid user ID'
        });
      }
      
      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Failed to authenticate user'
      });
    }
  });
  
  // Add user routes 
  app.use('/users', userRoutes);
  
  return app;
}

// Helper function to add authentication to requests
const withAuth = (user: unknown) => (requestBuilder: any) => {
  return requestBuilder
    .set('Authorization', 'Bearer test-token-12345')
    .set('x-dev-user-id', user._id.toString());
};

// Test data
let testUser1: unknown;
let testUser2: unknown;
let testUser3: unknown;

// Helper function to create test users
async function createTestUser(
  name: string,
  username: string,
  email: string,
  privacyOverrides: Partial<PrivacySettings> = {}
) {
  const defaultPrivacy: PrivacySettings = {
    profileVisibleTo: 'everyone',
    showBadgesTo: 'everyone',
    allowFriendRequestsFrom: 'everyone',
    location: {
      sharing: 'off',
      precisionMeters: 100,
    },
  };

  const privacy = { ...defaultPrivacy, ...privacyOverrides };

  // Create user using direct mongoose model to avoid validation issues
  const user = await (userModel as any).user.create({
    name,
    username,
    email,
    googleId: `google-${username}`,
    profilePicture: `https://example.com/${username}.jpg`,
    bio: `Bio for ${name}`,
    campus: 'UBC Vancouver',
    privacy,
  });

  return user;
}

describe('Unmocked User Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await (userModel as any).user.deleteMany({});
    await (friendshipModel as any).friendship.deleteMany({});
    await (badgeModel as any).badge.deleteMany({});

    // Create test users
    testUser1 = await createTestUser(
      'Test User 1',
      'testuser1',
      'testuser1@example.com',
      { profileVisibleTo: 'everyone' }
    );

    testUser2 = await createTestUser(
      'Test User 2', 
      'testuser2',
      'testuser2@example.com',
      { profileVisibleTo: 'friends' }
    );

    testUser3 = await createTestUser(
      'Test User 3',
      'testuser3', 
      'testuser3@example.com',
      { profileVisibleTo: 'private' }
    );

    // Create a friendship between user1 and user2
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    await friendshipModel.create({
      userId: testUser2._id,
      friendId: testUser1._id, 
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await userModel['user'].deleteMany({});
    await friendshipModel['friendship'].deleteMany({});
    await badgeModel['badge'].deleteMany({});
  });

  describe('Profile Management', () => {
    test('Get own profile (GET /users/profile)', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).get('/users/profile')
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile fetched successfully');
      expect(response.body.data.user).toHaveProperty('_id');
      expect(response.body.data.user.name).toBe('Test User 1');
      expect(response.body.data.user.username).toBe('testuser1');
      expect(response.body.data.user.email).toBe('testuser1@example.com');
    });

    test('Get detailed current user info (GET /users/me)', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).get('/users/me')
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile fetched successfully');
      expect(response.body.data.user).toHaveProperty('privacy');
      expect(response.body.data.user.privacy.profileVisibleTo).toBe('everyone');
      expect(response.body.data.user.name).toBe('Test User 1');
    });

    test('Update profile successfully (POST /users/profile)', async () => {
      const tempApp = createAuthenticatedApp();
      
      const updateData = {
        name: 'Updated Test User 1',
        bio: 'Updated bio for testing',
        campus: 'UBC Okanagan'
      };

      const response = await withAuth(testUser1)(
        request(tempApp).post('/users/profile').send(updateData)
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User info updated successfully');
      expect(response.body.data.user.name).toBe('Updated Test User 1');
      expect(response.body.data.user.bio).toBe('Updated bio for testing');
      expect(response.body.data.user.campus).toBe('UBC Okanagan');

      // Verify in database
      const updatedUser = await userModel.findById(testUser1._id);
      expect(updatedUser?.name).toBe('Updated Test User 1');
      expect(updatedUser?.bio).toBe('Updated bio for testing');
    });

    test('Update profile with invalid data returns validation error', async () => {
      const tempApp = createAuthenticatedApp();
      
      const invalidData = {
        name: '', // Empty name should be invalid
        bio: 'x'.repeat(600) // Bio too long (max 500 characters)
      };

      const response = await withAuth(testUser1)(
        request(tempApp).post('/users/profile').send(invalidData)
      );

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Friend Profile Access', () => {
    test('Get friend profile successfully with badges (GET /users/:userId/profile)', async () => {
      const tempApp = createAuthenticatedApp();

      // Create some test badges for testUser2
      const badge = await (badgeModel as any).badge.create({
        name: 'Explorer',
        description: 'Visit 10 locations',
        icon: 'explore',
        category: 'exploration',
        rarity: 'common',
        requirements: {
          type: 'libraries_visited',
          target: 10,
          timeframe: 'all_time',
          conditions: {}
        },
        isActive: true
      });

      // Assign the badge to testUser2
      await (badgeModel as any).userBadge.create({
        userId: testUser2._id,
        badgeId: badge._id,
        earnedAt: new Date(),
        progress: {
          current: 10,
          target: 10,
          percentage: 100,
          lastUpdated: new Date()
        },
        isDisplayed: true
      });

      const response = await withAuth(testUser1)(
        request(tempApp).get(`/users/${testUser2._id}/profile`)
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Friend profile fetched successfully');
      expect(response.body.data.name).toBe('Test User 2');
      expect(response.body.data.username).toBe('testuser2');
      expect(response.body.data).toHaveProperty('badges');
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data).toHaveProperty('isOnline');
      expect(response.body.data.badges).toBeInstanceOf(Array);
      expect(response.body.data.badges.length).toBeGreaterThanOrEqual(0);
    });

    test('Cannot access non-friend profile', async () => {
      const tempApp = createAuthenticatedApp();

      // testUser1 and testUser3 are not friends
      const response = await withAuth(testUser1)(
        request(tempApp).get(`/users/${testUser3._id}/profile`)
      );

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('You can only view profiles of your friends');
    });

    test('Get profile for non-existent user returns 404', async () => {
      const tempApp = createAuthenticatedApp();
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await withAuth(testUser1)(
        request(tempApp).get(`/users/${nonExistentId}/profile`)
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    test('Invalid user ID format returns 400', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).get('/users/invalid-id/profile')
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid user ID format');
    });
  });

  describe('User Search', () => {
    test('Search users successfully', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).get('/users/search?q=test')
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Users search completed successfully');
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Should find other test users but not self
      const usernames = response.body.data.map((user: unknown) => user.username);
      expect(usernames).not.toContain('testuser1'); // Current user excluded
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('Search users with username query', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).get('/users/search?q=testuser2')
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Should find testuser2
      const foundUser = response.body.data.find((user: unknown) => user.username === 'testuser2');
      expect(foundUser).toBeDefined();
      expect(foundUser.displayName).toBe('Test User 2');
    });

    test('Search users with limit parameter', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).get('/users/search?q=test&limit=1')
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    test('Search users missing query parameter returns 400', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).get('/users/search')
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters');
    });

    test('Search with no results returns empty array', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).get('/users/search?q=nonexistentuser123456')
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('Privacy Settings', () => {
    test('Update privacy settings successfully (PATCH /users/me/privacy)', async () => {
      const tempApp = createAuthenticatedApp();
      
      const privacyUpdate = {
        profileVisibleTo: 'friends' as const,
        allowFriendRequestsFrom: 'everyone' as const
      };

      const response = await withAuth(testUser1)(
        request(tempApp).patch('/users/me/privacy').send(privacyUpdate)
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Privacy settings updated successfully');
      expect(response.body.data.user.privacy.profileVisibleTo).toBe('friends');
      expect(response.body.data.user.privacy.allowFriendRequestsFrom).toBe('everyone');

      // Verify in database
      const updatedUser = await userModel.findById(testUser1._id);
      expect(updatedUser?.privacy.profileVisibleTo).toBe('friends');
      expect(updatedUser?.privacy.allowFriendRequestsFrom).toBe('everyone');
    });

    test('Update location privacy settings', async () => {
      const tempApp = createAuthenticatedApp();
      
      const privacyUpdate = {
        location: {
          sharing: 'live' as const,
          precisionMeters: 50
        }
      };

      const response = await withAuth(testUser2)(
        request(tempApp).patch('/users/me/privacy').send(privacyUpdate)
      );

      expect(response.status).toBe(200);
      expect(response.body.data.user.privacy.location.sharing).toBe('live');
      expect(response.body.data.user.privacy.location.precisionMeters).toBe(50);
    });

    test('Update privacy with invalid settings returns 400', async () => {
      const tempApp = createAuthenticatedApp();
      
      const invalidPrivacy = {
        profileVisibleTo: 'invalid_value' // Invalid enum value
      };

      const response = await withAuth(testUser1)(
        request(tempApp).patch('/users/me/privacy').send(invalidPrivacy)
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid request body');
    });

    test('Update privacy with empty body returns 400', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).patch('/users/me/privacy').send({})
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('At least one privacy setting must be provided');
    });
  });

  describe('FCM Token Management', () => {
    test('Update FCM token successfully (PUT /users/me/fcm-token)', async () => {
      const tempApp = createAuthenticatedApp();
      
      const fcmTokenData = {
        fcmToken: 'test-fcm-token-12345abcdef'
      };

      const response = await withAuth(testUser1)(
        request(tempApp).put('/users/me/fcm-token').send(fcmTokenData)
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('FCM token updated successfully');
      expect(response.body.data.hasToken).toBe(true);
      expect(response.body.data.userId).toBe(testUser1._id.toString());

      // Verify in database
      const updatedUser = await userModel.findById(testUser1._id);
      expect(updatedUser?.fcmToken).toBe('test-fcm-token-12345abcdef');
    });

    test('Update FCM token with whitespace gets trimmed', async () => {
      const tempApp = createAuthenticatedApp();
      
      const fcmTokenData = {
        fcmToken: '  test-fcm-token-with-whitespace  '
      };

      const response = await withAuth(testUser2)(
        request(tempApp).put('/users/me/fcm-token').send(fcmTokenData)
      );

      expect(response.status).toBe(200);
      
      // Verify token was trimmed in database
      const updatedUser = await userModel.findById(testUser2._id);
      expect(updatedUser?.fcmToken).toBe('test-fcm-token-with-whitespace');
    });

    test('Update FCM token missing token returns 400', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).put('/users/me/fcm-token').send({})
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('FCM token is required and must be a string');
    });

    test('Update FCM token with invalid type returns 400', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).put('/users/me/fcm-token').send({ fcmToken: 123 })
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('FCM token is required and must be a string');
    });

    test('Remove FCM token successfully (DELETE /users/me/fcm-token)', async () => {
      const tempApp = createAuthenticatedApp();

      // First set a token
      await userModel.updateFcmToken(testUser1._id, 'token-to-remove');

      const response = await withAuth(testUser1)(
        request(tempApp).delete('/users/me/fcm-token')
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('FCM token removed successfully');
      expect(response.body.data.hasToken).toBe(false);
      expect(response.body.data.userId).toBe(testUser1._id.toString());

      // Verify in database
      const updatedUser = await userModel.findById(testUser1._id);
      expect(updatedUser?.fcmToken).toBeUndefined();
    });
  });

  describe('Account Deletion', () => {
    test('Delete profile successfully (DELETE /users/profile)', async () => {
      const tempApp = createAuthenticatedApp();

      // Create a temporary user for deletion test
      const tempUser = await createTestUser(
        'Temp User',
        'tempuser',
        'temp@example.com'
      );

      expect(tempUser).not.toBeNull();

      const response = await withAuth(tempUser)(
        request(tempApp).delete('/users/profile')
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is deleted from database
      const deletedUser = await userModel.findById(tempUser?._id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('Authentication required for all endpoints', async () => {
      const tempApp = createAuthenticatedApp();

      // Test without authentication headers
      const response = await request(tempApp).get('/users/profile');
      
      // Should be handled by auth middleware (typically 401)
      expect(response.status).not.toBe(200);
    });

    test('Non-existent user ID in friend profile access', async () => {
      const tempApp = createAuthenticatedApp();
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await withAuth(testUser1)(
        request(tempApp).get(`/users/${nonExistentId}/profile`)
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    test('Database integration works correctly', async () => {
      // Verify our test users exist and have correct data
      const user1 = await userModel.findById(testUser1._id);
      const user2 = await userModel.findById(testUser2._id);
      
      expect(user1).not.toBeNull();
      expect(user2).not.toBeNull();
      expect(user1?.username).toBe('testuser1');
      expect(user2?.username).toBe('testuser2');
      
      // Verify friendship exists
      const areFriends = await friendshipModel.areFriends(testUser1._id, testUser2._id);
      expect(areFriends).toBe(true);
    });
  });
});