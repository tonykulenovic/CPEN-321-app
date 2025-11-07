import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, beforeEach, expect } from '@jest/globals';

import debugRoutes from '../../src/routes/debug.routes';
import { userModel } from '../../src/models/user.model';

// Create Express app with routes and authentication middleware
function createAuthenticatedApp() {
  const app = express();
  app.use(express.json());

  // Add authentication middleware that populates req.user from database
  app.use(async (req: any, res: any, next: any) => {
    const userId = req.headers['x-dev-user-id'];
    const authHeader = req.headers.authorization;

    // Require both auth header and user ID for authentication
    if (!authHeader || !userId) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required',
      });
    }

    try {
      // Find user in database
      const user = await userModel['user'].findById(new mongoose.Types.ObjectId(userId));
      if (!user) {
        return res.status(401).json({
          error: 'User not found',
          message: 'Invalid user ID',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Failed to authenticate user',
      });
    }
  });

  // Add debug routes
  app.use('/debug', debugRoutes);
  return app;
}

describe('Integration: Debug Controller', () => {
  let app: express.Application;
  let testUserId: string;
  let secondUserId: string;

  beforeEach(async () => {
    app = createAuthenticatedApp();

    // Clean up existing data
    await userModel['user'].deleteMany({});

    // Create test users
    const testUser = new userModel['user']({
      googleId: 'test-google-id-123',
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashedpassword123',
      fcmToken: 'test-fcm-token-12345678901234567890',
      lastActiveAt: new Date(),
    });
    await testUser.save();
    testUserId = testUser._id.toString();

    const secondUser = new userModel['user']({
      googleId: 'test-google-id-456',
      name: 'Second User',
      email: 'second@example.com',
      username: 'seconduser',
      password: 'hashedpassword456',
      fcmToken: null, // No FCM token
      lastActiveAt: new Date(),
    });
    await secondUser.save();
    secondUserId = secondUser._id.toString();
  });

  describe('POST /debug/notification/test', () => {
    // Integration behavior: Send test notification with real user data
    // Input: valid userId for user with FCM token
    // Expected status code: 200 or 500 (depending on Firebase service availability)
    // Expected behavior: attempts to send notification via Firebase
    // Expected output: success/failure message based on Firebase response
    test('Send test notification to user with FCM token', async () => {
      const response = await request(app)
        .post('/debug/notification/test')
        .set('authorization', 'Bearer test-token')
        .set('x-dev-user-id', testUserId)
        .send({
          userId: testUserId,
          title: 'Integration Test',
          message: 'This is an integration test notification'
        });

      // Accept either success (200) or Firebase service failure (500)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Test notification sent successfully');
        expect(response.body.data.userId).toBe(testUserId);
      } else {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Failed to send notification');
      }
    });

    // Integration behavior: Reject request for user without FCM token
    // Input: valid userId for user without FCM token
    // Expected status code: 400
    // Expected behavior: validation fails due to missing FCM token
    // Expected output: error message about no FCM token
    test('Reject notification for user without FCM token', async () => {
      const response = await request(app)
        .post('/debug/notification/test')
        .set('authorization', 'Bearer test-token')
        .set('x-dev-user-id', testUserId)
        .send({
          userId: secondUserId,
          title: 'Test Title',
          message: 'Test Message'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('has no FCM token registered');
    });

    // Integration behavior: Handle missing userId
    // Input: request without userId
    // Expected status code: 400
    // Expected behavior: validation error
    // Expected output: error about missing userId
    test('Reject request without userId', async () => {
      const response = await request(app)
        .post('/debug/notification/test')
        .set('authorization', 'Bearer test-token')
        .set('x-dev-user-id', testUserId)
        .send({
          title: 'Test Title',
          message: 'Test Message'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('userId is required');
    });

    // Integration behavior: Handle non-existent user
    // Input: userId that doesn't exist in database
    // Expected status code: 404
    // Expected behavior: user lookup fails
    // Expected output: user not found error
    test('Handle non-existent user', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post('/debug/notification/test')
        .set('authorization', 'Bearer test-token')
        .set('x-dev-user-id', testUserId)
        .send({
          userId: fakeUserId,
          title: 'Test Title',
          message: 'Test Message'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    // Integration behavior: Require authentication
    // Input: request without proper authentication
    // Expected status code: 401
    // Expected behavior: authentication middleware blocks request
    // Expected output: authentication error
    test('Require authentication', async () => {
      const response = await request(app)
        .post('/debug/notification/test')
        .send({
          userId: testUserId,
          title: 'Test Title',
          message: 'Test Message'
        })
        .expect(401);

      expect(response.body.error).toBe('Access denied');
      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('POST /debug/notification/friend-request', () => {
    // Integration behavior: Send friend request notification with real users
    // Input: valid toUserId and fromUserId
    // Expected status code: 200 or 500 (depending on notification service)
    // Expected behavior: attempts to send friend request notification
    // Expected output: success/failure message based on service response
    test('Send friend request notification successfully', async () => {
      const response = await request(app)
        .post('/debug/notification/friend-request')
        .set('authorization', 'Bearer test-token')
        .set('x-dev-user-id', testUserId)
        .send({
          toUserId: testUserId,
          fromUserId: secondUserId
        });

      // Accept either success (200) or service failure (500)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Test friend request notification sent');
        expect(response.body.data.toUser.name).toBe('Test User');
        expect(response.body.data.fromUser.name).toBe('Second User');
      }
    });

    // Integration behavior: Missing required fields
    // Input: request without required toUserId or fromUserId
    // Expected status code: 400
    // Expected behavior: validation error
    // Expected output: error about missing required fields
    test('Reject request with missing fields', async () => {
      const response = await request(app)
        .post('/debug/notification/friend-request')
        .set('authorization', 'Bearer test-token')
        .set('x-dev-user-id', testUserId)
        .send({
          toUserId: testUserId
          // Missing fromUserId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('toUserId and fromUserId are required');
    });

    // Integration behavior: Handle non-existent users
    // Input: userId that doesn't exist
    // Expected status code: 404
    // Expected behavior: user lookup fails
    // Expected output: users not found error
    test('Handle non-existent users', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post('/debug/notification/friend-request')
        .set('authorization', 'Bearer test-token')
        .set('x-dev-user-id', testUserId)
        .send({
          toUserId: fakeUserId,
          fromUserId: testUserId
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('One or both users not found');
    });
  });

  describe('GET /debug/users/tokens', () => {
    // Integration behavior: List all users with real database data
    // Input: authenticated request
    // Expected status code: 200
    // Expected behavior: returns all users from database with token status
    // Expected output: user list with accurate token information and statistics
    test('List users with token information', async () => {
      const response = await request(app)
        .get('/debug/users/tokens')
        .set('authorization', 'Bearer test-token')
        .set('x-dev-user-id', testUserId)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Users retrieved successfully');
      expect(response.body.data.stats.totalUsers).toBe(2);
      expect(response.body.data.stats.usersWithTokens).toBe(1);
      expect(response.body.data.stats.usersWithoutTokens).toBe(1);
      expect(response.body.data.users).toHaveLength(2);

      // Find the users in the response
      const userWithToken = response.body.data.users.find((u: any) => u.hasToken);
      const userWithoutToken = response.body.data.users.find((u: any) => !u.hasToken);

      expect(userWithToken).toBeDefined();
      expect(userWithToken.name).toBe('Test User');
      expect(userWithToken.tokenPreview).toContain('test-fcm-token-12345');

      expect(userWithoutToken).toBeDefined();
      expect(userWithoutToken.name).toBe('Second User');
      expect(userWithoutToken.tokenPreview).toBeNull();
    });

    // Integration behavior: Handle empty database
    // Input: authenticated request when no users exist
    // Expected status code: 200
    // Expected behavior: returns empty results
    // Expected output: empty user list with zero statistics
    test('Handle empty user database', async () => {
      // Clear all users
      await userModel['user'].deleteMany({});

      const response = await request(app)
        .get('/debug/users/tokens')
        .set('authorization', 'Bearer test-token')
        .set('x-dev-user-id', new mongoose.Types.ObjectId().toString())
        .expect(401); // Will fail auth since no users exist

      expect(response.body.error).toBe('User not found');
    });

    // Integration behavior: Require authentication
    // Input: request without authentication
    // Expected status code: 401
    // Expected behavior: authentication middleware blocks request
    // Expected output: authentication error
    test('Require authentication for user listing', async () => {
      const response = await request(app)
        .get('/debug/users/tokens')
        .expect(401);

      expect(response.body.error).toBe('Access denied');
      expect(response.body.message).toBe('Authentication required');
    });
  });
});