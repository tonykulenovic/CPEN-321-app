import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

import * as friendsController from '../../../src/controllers/friends.controller';
import { userModel } from '../../../src/models/user.model';
import { friendshipModel } from '../../../src/models/friendship.model';

describe('Friends Routes - Final Coverage Tests (Mocked)', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;

  beforeEach(async () => {
    // Create custom Express app with mock auth middleware
    app = express();
    app.use(express.json());

    // Create test users first
    testUser1 = await (userModel as any).user.create({
      name: `Test User 1 ${Date.now()}`,
      username: `testuser1_${Date.now()}`,
      email: `test1_${Date.now()}@example.com`,
      googleId: `google1_${Date.now()}`,
      password: 'password123',
      privacy: {
        allowFriendRequestsFrom: 'everyone',
      },
    });

    testUser2 = await (userModel as any).user.create({
      name: `Test User 2 ${Date.now()}`,
      username: `testuser2_${Date.now()}`,
      email: `test2_${Date.now()}@example.com`,
      googleId: `google2_${Date.now()}`,
      password: 'password123',
      privacy: {
        allowFriendRequestsFrom: 'everyone',
      },
    });

    // Mock auth middleware that sets req.user
    app.use((req: any, _res, next) => {
      req.user = testUser1;
      next();
    });

    // Setup routes
    app.post('/api/friends/requests/:id/accept', friendsController.acceptFriendRequest);
    app.post('/api/friends/requests/:id/decline', friendsController.declineFriendRequest);
    app.get('/api/friends', friendsController.listFriends);
    app.put('/api/friends/:friendId', friendsController.updateFriend);
  });

  afterEach(async () => {
    // Restore all mocks
    jest.restoreAllMocks();
  });

  // Input: acceptFriendRequest with unpopulated friendId field (ObjectId instead of IUser)
  // Expected: Covers line 334 - getObjectId returns ObjectId branch
  test('acceptFriendRequest handles unpopulated friendId field', async () => {
    const friendRequest = await (friendshipModel as any).friendship.create({
      userId: testUser2._id,
      friendId: testUser1._id, // Will be ObjectId, not populated
      status: 'pending',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Mock findById to return document WITHOUT populating friendId/userId
    const originalFindById = friendshipModel.findById.bind(friendshipModel);
    jest.spyOn(friendshipModel, 'findById').mockImplementation(async (id: any) => {
      const doc = await originalFindById(id);
      if (doc) {
        // Ensure fields are ObjectIds, not populated
        return {
          ...doc.toObject(),
          friendId: doc.friendId instanceof mongoose.Types.ObjectId ? doc.friendId : (doc.friendId as any)._id,
          userId: doc.userId instanceof mongoose.Types.ObjectId ? doc.userId : (doc.userId as any)._id,
          _id: doc._id,
          status: doc.status,
          shareLocation: doc.shareLocation,
          closeFriend: doc.closeFriend,
        } as any;
      }
      return doc;
    });

    const res = await request(app)
      .post(`/api/friends/requests/${friendRequest._id.toString()}/accept`)
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Friend request accepted successfully');
  });

  // Input: declineFriendRequest with unpopulated friendId field
  // Expected: Covers line 494 - getObjectId returns ObjectId branch
  test('declineFriendRequest handles unpopulated friendId field', async () => {
    const friendRequest = await (friendshipModel as any).friendship.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'pending',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Mock findById to return document WITHOUT populating friendId/userId
    const originalFindById = friendshipModel.findById.bind(friendshipModel);
    jest.spyOn(friendshipModel, 'findById').mockImplementation(async (id: any) => {
      const doc = await originalFindById(id);
      if (doc) {
        return {
          ...doc.toObject(),
          friendId: doc.friendId instanceof mongoose.Types.ObjectId ? doc.friendId : (doc.friendId as any)._id,
          userId: doc.userId instanceof mongoose.Types.ObjectId ? doc.userId : (doc.userId as any)._id,
          _id: doc._id,
          status: doc.status,
          shareLocation: doc.shareLocation,
          closeFriend: doc.closeFriend,
        } as any;
      }
      return doc;
    });

    const res = await request(app)
      .post(`/api/friends/requests/${friendRequest._id.toString()}/decline`)
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Friend request declined successfully');
  });

  // Input: listFriends with unpopulated friendId field in friendships
  // Expected: Covers lines 574, 582, 600-601 - unpopulated data fallback
  test('listFriends handles unpopulated friendId fields', async () => {
    // Create accepted friendship
    await (friendshipModel as any).friendship.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Mock findUserFriendships to return friendships with ObjectId instead of populated IUser
    jest.spyOn(friendshipModel, 'findUserFriendships').mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(),
        userId: testUser1._id,
        friendId: testUser2._id, // ObjectId, not populated
        status: 'accepted',
        shareLocation: true,
        closeFriend: false,
      } as any,
    ]);

    const res = await request(app)
      .get('/api/friends')
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Friends list retrieved successfully');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    // Should return empty displayName when not populated
    expect(res.body.data[0].displayName).toBe('');
  });

  // Input: updateFriend with validation error (malformed body)
  // Expected: Covers lines 659-663 - validation error response
  test('updateFriend handles zod validation errors', async () => {
    // Create accepted friendship
    await (friendshipModel as any).friendship.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });
    await (friendshipModel as any).friendship.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Send request with invalid data type for shareLocation
    const res = await request(app)
      .put(`/api/friends/${testUser2._id.toString()}`)
      .send({ shareLocation: 'invalid-not-boolean' }) // Should be boolean
      .expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: acceptFriendRequest when userModel.findById returns null
  // Expected: Covers line 450-451 - skip notification if user not found
  test('acceptFriendRequest handles missing accepting user during notification', async () => {
    const friendRequest = await (friendshipModel as any).friendship.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'pending',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Mock userModel.findById to return null for the accepting user
    const originalFindById = userModel.findById.bind(userModel);
    jest.spyOn(userModel, 'findById').mockImplementation(async (id: any) => {
      // Return null for current user (testUser1), real user for others
      if (id.toString() === testUser1._id.toString()) {
        return null;
      }
      return originalFindById(id);
    });

    const res = await request(app)
      .post(`/api/friends/requests/${friendRequest._id.toString()}/accept`)
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Friend request accepted successfully');
  });
});
