import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

import * as friendsController from '../../../src/controllers/friends.controller';
import { BadgeService } from '../../../src/services/badge.service';
import * as notificationService from '../../../src/services/notification.service';
import { userModel } from '../../../src/models/user.model';
import { friendshipModel } from '../../../src/models/friendship.model';

describe('Friends Routes - Additional Edge Cases (Mocked)', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;

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
        allowFriendRequestsFrom: 'everyone',
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

    // Create app with auth middleware
    app = express();
    app.use(express.json());
    
    app.use((req: any, res: any, next: any) => {
      req.user = testUser1;
      next();
    });

    app.post('/api/friends/requests/:id/accept', (req, res) => void friendsController.acceptFriendRequest(req, res));
    app.post('/api/friends/requests/:id/decline', (req, res) => void friendsController.declineFriendRequest(req, res));
    app.get('/api/friends', (req, res) => void friendsController.listFriends(req, res));
    app.patch('/api/friends/:friendId', (req, res) => void friendsController.updateFriend(req, res));
    app.delete('/api/friends/:friendId', (req, res) => void friendsController.removeFriend(req, res));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Input: acceptFriendRequest with badge earning
  // Expected status code: 200
  // Expected behavior: Returns earned badges in response
  // Expected output: Success with earnedBadges array
  test('acceptFriendRequest returns earned badges', async () => {
    const friendRequest = await friendshipModel.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'pending',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Mock badge service to return earned badges
    jest.spyOn(BadgeService, 'processBadgeEvent').mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Social Butterfly',
        description: 'Added first friend',
        imageUrl: 'badge.png',
        category: 'social' as any,
        earnedAt: new Date(),
      },
    ] as any);

    const res = await request(app)
      .post(`/api/friends/requests/${friendRequest._id.toString()}/accept`)
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Friend request accepted successfully');
    expect(res.body.data).toHaveProperty('earnedBadges');
    expect(Array.isArray(res.body.data.earnedBadges)).toBe(true);
  });

  // Input: acceptFriendRequest with badge processing error
  // Expected status code: 200
  // Expected behavior: Accepts request despite badge error
  // Expected output: Success without badges
  test('acceptFriendRequest handles badge processing errors gracefully', async () => {
    const friendRequest = await friendshipModel.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'pending',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Mock badge service to throw error
    jest.spyOn(BadgeService, 'processBadgeEvent').mockRejectedValue(
      new Error('Badge service unavailable')
    );

    const res = await request(app)
      .post(`/api/friends/requests/${friendRequest._id.toString()}/accept`)
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Friend request accepted successfully');
    expect(res.body.data).toHaveProperty('status', 'accepted');
  });

  // Input: acceptFriendRequest with general database error
  // Expected status code: 500
  // Expected behavior: Catches error and returns 500
  // Expected output: Internal server error
  test('acceptFriendRequest handles database errors in main flow', async () => {
    const friendRequest = await (friendshipModel as any).friendship.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'pending',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Mock friendshipModel.findById to throw error
    jest.spyOn(friendshipModel, 'findById').mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const res = await request(app)
      .post(`/api/friends/requests/${friendRequest._id.toString()}/accept`)
      .expect(500);

    expect(res.body).toHaveProperty('message', 'Internal server error');
  });

  // Input: declineFriendRequest with database error
  // Expected status code: 500
  // Expected behavior: Catches error and returns 500
  // Expected output: Internal server error
  test('declineFriendRequest handles database errors', async () => {
    const friendRequest = await (friendshipModel as any).friendship.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'pending',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Mock deleteById to throw error
    jest.spyOn(friendshipModel, 'deleteById').mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const res = await request(app)
      .post(`/api/friends/requests/${friendRequest._id.toString()}/decline`)
      .expect(500);

    expect(res.body).toHaveProperty('message', 'Internal server error');
  });

  // Input: listFriends with invalid query parameters
  // Expected status code: 400
  // Expected behavior: Validation fails
  // Expected output: Invalid query parameters error
  test('listFriends handles invalid query parameters', async () => {
    const res = await request(app)
      .get('/api/friends')
      .query('limit[invalid]=value')
      .expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid query parameters');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: listFriends with database error
  // Expected status code: 500
  // Expected behavior: Catches error and returns 500
  // Expected output: Internal server error
  test('listFriends handles database errors', async () => {
    jest.spyOn(friendshipModel, 'findUserFriendships').mockRejectedValueOnce(
      new Error('Database error')
    );

    const res = await request(app)
      .get('/api/friends')
      .expect(500);

    expect(res.body).toHaveProperty('message', 'Internal server error');
  });

  // Input: updateFriend with no settings provided
  // Expected status code: 400
  // Expected behavior: Rejects empty update
  // Expected output: Error about missing settings
  test('updateFriend rejects empty settings', async () => {
    const res = await request(app)
      .patch(`/api/friends/${testUser2._id.toString()}`)
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty('message', 'At least one setting must be provided');
  });

  // Input: updateFriend trying to update self
  // Expected status code: 400
  // Expected behavior: Rejects self-update
  // Expected output: Error about updating yourself
  test('updateFriend prevents updating yourself', async () => {
    const res = await request(app)
      .patch(`/api/friends/${testUser1._id.toString()}`)
      .send({ shareLocation: false })
      .expect(400);

    expect(res.body).toHaveProperty('message', 'Cannot update settings for yourself');
  });

  // Input: updateFriend with invalid request body
  // Expected status code: 400
  // Expected behavior: Validation fails
  // Expected output: Invalid request body error
  test('updateFriend handles invalid request body', async () => {
    const res = await request(app)
      .patch(`/api/friends/${testUser2._id.toString()}`)
      .send({ invalidField: 'value' })
      .expect(400);

    expect(res.body).toHaveProperty('message', 'At least one setting must be provided');
  });

  // Input: updateFriend when updateSettings returns null
  // Expected status code: 500
  // Expected behavior: Returns error when update fails
  // Expected output: Failed to update error
  test('updateFriend handles update failure', async () => {
    // Create friendship first
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Mock updateSettings to return null
    jest.spyOn(friendshipModel, 'updateSettings').mockResolvedValueOnce(null);

    const res = await request(app)
      .patch(`/api/friends/${testUser2._id.toString()}`)
      .send({ shareLocation: false })
      .expect(500);

    expect(res.body).toHaveProperty('message', 'Failed to update friendship settings');
  });

  // Input: updateFriend with database error
  // Expected status code: 500
  // Expected behavior: Catches error and returns 500
  // Expected output: Internal server error
  test('updateFriend handles database errors', async () => {
    jest.spyOn(friendshipModel, 'findByUserAndFriend').mockRejectedValueOnce(
      new Error('Database error')
    );

    const res = await request(app)
      .patch(`/api/friends/${testUser2._id.toString()}`)
      .send({ shareLocation: false })
      .expect(500);

    expect(res.body).toHaveProperty('message', 'Internal server error');
  });

  // Input: removeFriend trying to remove self
  // Expected status code: 400
  // Expected behavior: Rejects self-removal
  // Expected output: Error about removing yourself
  test('removeFriend prevents removing yourself', async () => {
    const res = await request(app)
      .delete(`/api/friends/${testUser1._id.toString()}`)
      .expect(400);

    expect(res.body).toHaveProperty('message', 'Cannot remove yourself as a friend');
  });

  // Input: removeFriend with missing reciprocal friendship
  // Expected status code: 200
  // Expected behavior: Logs warning and continues
  // Expected output: Success despite missing reciprocal
  test('removeFriend handles missing reciprocal friendship', async () => {
    // Create only one direction of friendship
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await request(app)
      .delete(`/api/friends/${testUser2._id.toString()}`)
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Friend removed successfully');
    expect(res.body.data).toHaveProperty('success', true);
  });

  // Input: removeFriend with database error
  // Expected status code: 500
  // Expected behavior: Catches error and returns 500
  // Expected output: Internal server error
  test('removeFriend handles database errors', async () => {
    jest.spyOn(friendshipModel, 'findByUserAndFriend').mockRejectedValueOnce(
      new Error('Database error')
    );

    const res = await request(app)
      .delete(`/api/friends/${testUser2._id.toString()}`)
      .expect(500);

    expect(res.body).toHaveProperty('message', 'Internal server error');
  });
});
