import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest, describe, test, beforeEach, expect } from '@jest/globals';

import { debugController } from '../../src/controllers/debug.controller';
import { userModel } from '../../src/models/user.model';
import { notificationService } from '../../src/services/notification.service';
import { firebaseService } from '../../src/config/firebase';

// Mock all external dependencies
jest.mock('../../src/models/user.model');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/config/firebase');
jest.mock('../../src/utils/logger.util');

const mockUserModel = userModel as jest.Mocked<typeof userModel>;
const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;
const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;

const app = express();
app.use(express.json());

// Mock authentication middleware
const authenticateToken = (req: unknown, res: any, next: any) => {
  req.user = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    name: 'Test User',
    email: 'test@example.com',
    username: 'testuser',
  };
  next();
};

// Set up routes with authentication middleware
app.post('/debug/notification/test', authenticateToken, debugController.sendTestNotification);
app.post('/debug/notification/friend-request', authenticateToken, debugController.sendTestFriendRequest);
app.get('/debug/users/tokens', authenticateToken, debugController.listUsersWithTokens);

describe('Mocked: POST /debug/notification/test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: User found with FCM token, notification sent successfully
  // Input: valid userId, title, and message in request body
  // Expected status code: 200
  // Expected behavior: sends test notification via Firebase service
  // Expected output: success message with user details and notification info
  test('Send test notification successfully', async () => {
    const testUserId = '507f1f77bcf86cd799439012';
    const testUser = {
      _id: new mongoose.Types.ObjectId(testUserId),
      name: 'Test User',
      email: 'test@example.com',
      fcmToken: 'test-fcm-token-12345678901234567890',
    };

    mockUserModel.findById.mockResolvedValue(testUser as unknown);
    mockFirebaseService.sendNotification.mockResolvedValue(true);

    const response = await request(app)
      .post('/debug/notification/test')
      .send({
        userId: testUserId,
        title: 'Test Title',
        message: 'Test Message'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Test notification sent successfully');
    expect(response.body.data.userId).toBe(testUserId);
    expect(response.body.data.title).toBe('Test Title');
    expect(response.body.data.message).toBe('Test Message');
    expect(mockFirebaseService.sendNotification).toHaveBeenCalledWith(
      'test-fcm-token-12345678901234567890',
      'Test Title',
      'Test Message',
      expect.any(Object)
    );
  });

  // Mocked behavior: missing userId validation
  // Input: request body without userId
  // Expected status code: 400
  // Expected behavior: returns validation error
  // Expected output: error message about missing userId
  test('Reject request without userId', async () => {
    const response = await request(app)
      .post('/debug/notification/test')
      .send({
        title: 'Test Title',
        message: 'Test Message'
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('userId is required');
  });

  // Mocked behavior: user not found
  // Input: valid userId that doesn't exist
  // Expected status code: 404
  // Expected behavior: returns user not found error
  // Expected output: error message about user not found
  test('Handle user not found', async () => {
    const testUserId = '507f1f77bcf86cd799439999';
    mockUserModel.findById.mockResolvedValue(null);

    const response = await request(app)
      .post('/debug/notification/test')
      .send({ userId: testUserId })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('User not found');
  });

  // Mocked behavior: user has no FCM token
  // Input: valid userId for user without FCM token
  // Expected status code: 400
  // Expected behavior: returns error about missing FCM token
  // Expected output: error message about no FCM token registered
  test('Handle user without FCM token', async () => {
    const testUserId = '507f1f77bcf86cd799439012';
    const testUser = {
      _id: new mongoose.Types.ObjectId(testUserId),
      name: 'Test User',
      email: 'test@example.com',
      fcmToken: null,
    };

    mockUserModel.findById.mockResolvedValue(testUser as any);

    const response = await request(app)
      .post('/debug/notification/test')
      .send({ userId: testUserId })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('has no FCM token registered');
  });

  // Mocked behavior: Firebase service fails to send notification
  // Input: valid request with user that has FCM token
  // Expected status code: 500
  // Expected behavior: notification service returns false
  // Expected output: error message about failed notification
  test('Handle Firebase service failure', async () => {
    const testUserId = '507f1f77bcf86cd799439012';
    const testUser = {
      _id: new mongoose.Types.ObjectId(testUserId),
      name: 'Test User',
      email: 'test@example.com',
      fcmToken: 'test-fcm-token-12345678901234567890',
    };

    mockUserModel.findById.mockResolvedValue(testUser as any);
    mockFirebaseService.sendNotification.mockResolvedValue(false);

    const response = await request(app)
      .post('/debug/notification/test')
      .send({ userId: testUserId })
      .expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Failed to send notification - check server logs for details');
  });
});

describe('Mocked: POST /debug/notification/friend-request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: Both users found, friend request notification sent successfully
  // Input: valid toUserId and fromUserId in request body
  // Expected status code: 200
  // Expected behavior: sends friend request notification
  // Expected output: success message with both user details
  test('Send friend request notification successfully', async () => {
    const toUserId = '507f1f77bcf86cd799439012';
    const fromUserId = '507f1f77bcf86cd799439013';
    const toUser = {
      _id: new mongoose.Types.ObjectId(toUserId),
      name: 'To User',
      email: 'to@example.com',
      fcmToken: 'to-user-token',
    };
    const fromUser = {
      _id: new mongoose.Types.ObjectId(fromUserId),
      name: 'From User',
      email: 'from@example.com',
    };

    mockUserModel.findById
      .mockResolvedValueOnce(toUser as unknown)
      .mockResolvedValueOnce(fromUser as unknown);
    mockNotificationService.sendFriendRequestNotification.mockResolvedValue();

    const response = await request(app)
      .post('/debug/notification/friend-request')
      .send({
        toUserId,
        fromUserId
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Test friend request notification sent');
    expect(response.body.data.toUser.name).toBe('To User');
    expect(response.body.data.fromUser.name).toBe('From User');
    expect(mockNotificationService.sendFriendRequestNotification).toHaveBeenCalledWith(
      toUserId,
      fromUserId,
      'From User'
    );
  });

  // Mocked behavior: missing required fields validation
  // Input: request body without toUserId or fromUserId
  // Expected status code: 400
  // Expected behavior: returns validation error
  // Expected output: error message about missing required fields
  test('Reject request without required fields', async () => {
    const response = await request(app)
      .post('/debug/notification/friend-request')
      .send({ toUserId: '507f1f77bcf86cd799439012' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('toUserId and fromUserId are required');
  });

  // Mocked behavior: one or both users not found
  // Input: valid userIds but one user doesn't exist
  // Expected status code: 404
  // Expected behavior: returns user not found error
  // Expected output: error message about users not found
  test('Handle users not found', async () => {
    const toUserId = '507f1f77bcf86cd799439012';
    const fromUserId = '507f1f77bcf86cd799439999';

    mockUserModel.findById
      .mockResolvedValueOnce({ _id: toUserId } as unknown)
      .mockResolvedValueOnce(null);

    const response = await request(app)
      .post('/debug/notification/friend-request')
      .send({ toUserId, fromUserId })
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('One or both users not found');
  });
});

describe('Mocked: GET /debug/users/tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: User model returns list of users with token information
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns all users with FCM token status
  // Expected output: user list with token info and statistics
  test('List users with token information successfully', async () => {
    const mockUsers = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        name: 'User One',
        email: 'user1@example.com',
        username: 'user1',
        fcmToken: 'token-12345',
        lastActiveAt: new Date(),
        createdAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        name: 'User Two',
        email: 'user2@example.com',
        username: 'user2',
        fcmToken: null,
        lastActiveAt: new Date(),
        createdAt: new Date(),
      },
    ];

    mockUserModel.findAll.mockResolvedValue(mockUsers as unknown);

    const response = await request(app)
      .get('/debug/users/tokens')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Users retrieved successfully');
    expect(response.body.data.stats.totalUsers).toBe(2);
    expect(response.body.data.stats.usersWithTokens).toBe(1);
    expect(response.body.data.stats.usersWithoutTokens).toBe(1);
    expect(response.body.data.users).toHaveLength(2);
    expect(response.body.data.users[0].hasToken).toBe(true);
    expect(response.body.data.users[1].hasToken).toBe(false);
  });

  // Mocked behavior: User model returns empty list
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns empty user list
  // Expected output: empty user list with zero statistics
  test('Handle empty user list', async () => {
    mockUserModel.findAll.mockResolvedValue([]);

    const response = await request(app)
      .get('/debug/users/tokens')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.stats.totalUsers).toBe(0);
    expect(response.body.data.stats.usersWithTokens).toBe(0);
    expect(response.body.data.stats.usersWithoutTokens).toBe(0);
    expect(response.body.data.users).toHaveLength(0);
  });
});