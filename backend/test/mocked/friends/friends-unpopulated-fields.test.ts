import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

import * as friendsController from '../../../src/controllers/friends.controller';
import { userModel } from '../../../src/models/user.model';
import { friendshipModel } from '../../../src/models/friendship.model';

describe('Friends Routes - Unpopulated Field Handling (Mocked)', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create test users
    testUser1 = await (userModel as any).user.create({
      name: `User One ${Date.now()}`,
      username: `user1_${Date.now()}`,
      email: `user1_${Date.now()}@example.com`,
      googleId: `google1_${Date.now()}`,
      password: 'password123',
      privacy: {
        allowFriendRequestsFrom: 'friendsOfFriends',
      },
    });

    testUser2 = await (userModel as any).user.create({
      name: `User Two ${Date.now()}`,
      username: `user2_${Date.now()}`,
      email: `user2_${Date.now()}@example.com`,
      googleId: `google2_${Date.now()}`,
      password: 'password123',
      privacy: {
        allowFriendRequestsFrom: 'everyone',
      },
    });

    testUser3 = await (userModel as any).user.create({
      name: `User Three ${Date.now()}`,
      username: `user3_${Date.now()}`,
      email: `user3_${Date.now()}@example.com`,
      googleId: `google3_${Date.now()}`,
      password: 'password123',
      privacy: {
        allowFriendRequestsFrom: 'everyone',
      },
    });

    // Create app with mocked auth middleware
    app = express();
    app.use(express.json());
    
    app.use((req: any, res: any, next: any) => {
      req.user = testUser2;
      next();
    });

    app.post('/api/friends/requests', (req, res) => void friendsController.sendFriendRequest(req, res));
    app.get('/api/friends/requests', (req, res) => void friendsController.listFriendRequests(req, res));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Input: friendsOfFriends privacy check with unpopulated friendId fields
  // Expected status code: 403
  // Expected behavior: Handles ObjectId fields in getUserId helper
  // Expected output: Privacy restriction error when no mutual friends
  test('sendFriendRequest handles unpopulated friendId in mutual friend check', async () => {
    // Mock findUserFriendships to return unpopulated friendId (ObjectId instead of IUser)
    const originalFindUserFriendships = friendshipModel.findUserFriendships.bind(friendshipModel);
    
    jest.spyOn(friendshipModel, 'findUserFriendships').mockImplementation(async (userId) => {
      // Call original but return with unpopulated friendId
      const friendships = await originalFindUserFriendships(userId, 'accepted');
      // Simulate unpopulated fields by replacing populated friendId with ObjectId
      return friendships.map(f => ({
        ...f.toObject(),
        friendId: new mongoose.Types.ObjectId(
          typeof f.friendId === 'object' && '_id' in f.friendId 
            ? (f.friendId as any)._id.toString() 
            : f.friendId.toString()
        ),
      })) as any;
    });

    // User2 tries to send request to User1 (who requires friendsOfFriends)
    const res = await request(app)
      .post('/api/friends/requests')
      .send({ toUserId: testUser1._id.toString() })
      .expect(403);

    expect(res.body).toHaveProperty('message', 'This user only accepts friend requests from friends of friends');
  });

  // Input: friendsOfFriends privacy check with unpopulated friendId and mutual friends
  // Expected status code: 201
  // Expected behavior: Handles ObjectId fields and finds mutual friends
  // Expected output: Friend request sent successfully
  test('sendFriendRequest handles unpopulated friendId with mutual friend present', async () => {
    // Create mutual friend (User3 is friends with both User1 and User2)
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser3._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    await friendshipModel.create({
      userId: testUser2._id,
      friendId: testUser3._id,
      status: 'accepted',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Mock findUserFriendships to return unpopulated friendId
    const originalFindUserFriendships = friendshipModel.findUserFriendships.bind(friendshipModel);
    
    jest.spyOn(friendshipModel, 'findUserFriendships').mockImplementation(async (userId) => {
      const friendships = await originalFindUserFriendships(userId, 'accepted');
      // Return with unpopulated friendId (ObjectId)
      return friendships.map(f => ({
        ...f.toObject(),
        friendId: new mongoose.Types.ObjectId(
          typeof f.friendId === 'object' && '_id' in f.friendId 
            ? (f.friendId as any)._id.toString() 
            : f.friendId.toString()
        ),
      })) as any;
    });

    // User2 sends request to User1 (should succeed due to mutual friend User3)
    const res = await request(app)
      .post('/api/friends/requests')
      .send({ toUserId: testUser1._id.toString() })
      .expect(201);

    expect(res.body).toHaveProperty('message', 'Friend request sent successfully');
  });

  // Input: listFriendRequests with unpopulated userId/friendId fields
  // Expected status code: 200
  // Expected behavior: Handles ObjectId fields in getUserData helper
  // Expected output: Returns minimal user data (empty username)
  test('listFriendRequests handles unpopulated user fields', async () => {
    // Create a friend request
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Mock to return unpopulated fields
    const originalFindIncomingRequests = friendshipModel.findIncomingRequests.bind(friendshipModel);
    
    jest.spyOn(friendshipModel, 'findIncomingRequests').mockImplementation(async (userId, limit) => {
      const requests = await originalFindIncomingRequests(userId, limit);
      // Return with unpopulated userId (ObjectId)
      return requests.map(r => ({
        ...r.toObject(),
        userId: new mongoose.Types.ObjectId(
          typeof r.userId === 'object' && '_id' in r.userId 
            ? (r.userId as any)._id.toString() 
            : r.userId.toString()
        ),
      })) as any;
    });

    const res = await request(app)
      .get('/api/friends/requests')
      .query({ inbox: 'true' })
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    
    // Should have minimal user data when unpopulated
    if (res.body.data.length > 0) {
      const firstRequest = res.body.data[0];
      expect(firstRequest).toHaveProperty('from');
      expect(firstRequest.from).toHaveProperty('userId');
      expect(firstRequest.from).toHaveProperty('displayName');
      // displayName will be empty string for unpopulated fields (username fallback)
      expect(firstRequest.from.displayName).toBe('');
    }
  });

  // Input: listFriendRequests with invalid query parameters
  // Expected status code: 400
  // Expected behavior: Validation fails for non-string query params
  // Expected output: Invalid query parameters error
  test('listFriendRequests handles invalid query parameters', async () => {
    // Send request with invalid limit (object instead of string)
    const res = await request(app)
      .get('/api/friends/requests')
      .query('inbox=true&limit[invalid]=value')
      .expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid query parameters');
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  // Input: listFriendRequests with database error
  // Expected status code: 500
  // Expected behavior: Catches error and returns internal server error
  // Expected output: Internal server error message
  test('listFriendRequests handles database errors', async () => {
    // Mock findIncomingRequests to throw an error
    jest.spyOn(friendshipModel, 'findIncomingRequests').mockRejectedValueOnce(
      new Error('Database connection failed')
    );

    const res = await request(app)
      .get('/api/friends/requests')
      .query({ inbox: 'true' })
      .expect(500);

    expect(res.body).toHaveProperty('message', 'Internal server error');
  });

  // Input: listFriendRequests successful outbox request
  // Expected status code: 200
  // Expected behavior: Returns formatted outgoing requests
  // Expected output: Success message with data array
  test('listFriendRequests returns successful outbox response', async () => {
    // Create outgoing request
    await friendshipModel.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'pending',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await request(app)
      .get('/api/friends/requests')
      .query({ inbox: 'false', limit: '10' })
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Outgoing friend requests retrieved successfully');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    
    if (res.body.data.length > 0) {
      const firstRequest = res.body.data[0];
      expect(firstRequest).toHaveProperty('_id');
      expect(firstRequest).toHaveProperty('to');
      expect(firstRequest).toHaveProperty('createdAt');
    }
  });
});
