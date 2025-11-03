import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest, describe, test, beforeEach, expect } from '@jest/globals';

import friendsRoutes from '../../src/routes/friends.routes';
import { userModel } from '../../src/models/user.model';
import { friendshipModel } from '../../src/models/friendship.model';
import { IUser, SignUpRequest } from '../../src/types/user.types';

// Helper function to create authenticated requests
const createAuthenticatedApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/friends', friendsRoutes);
  return app;
};

const withAuth = (user: IUser) => (requestBuilder: any) => {
  return requestBuilder
    .set('Authorization', 'Bearer test-token-12345')
    .set('x-dev-user-id', user._id.toString());
};

// Test user variables for consistent testing
let testUser1: IUser;
let testUser2: IUser;
let testUser3: IUser;

describe('Unmocked Integration: Friends API', () => {
  beforeEach(async () => {
    // Clear collections before each test (matches setup.ts approach)
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    // Create test users using proper SignUpRequest format
    const testUser1Data: SignUpRequest = {
      googleId: 'test-google-id-1',
      name: 'Test User 1',
      email: 'testuser1@example.com',
      username: 'testuser1'
    };

    const testUser2Data: SignUpRequest = {
      googleId: 'test-google-id-2',
      name: 'Test User 2',
      email: 'testuser2@example.com', 
      username: 'testuser2'
    };

    const testUser3Data: SignUpRequest = {
      googleId: 'test-google-id-3',
      name: 'Test User 3',
      email: 'testuser3@example.com',
      username: 'testuser3'
    };

    testUser1 = await userModel.create(testUser1Data);
    testUser2 = await userModel.create(testUser2Data);
    testUser3 = await userModel.create(testUser3Data);
  });

  describe('POST /friends/requests', () => {
    test('Send friend request successfully', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).post('/friends/requests')
      ).send({ toUserId: testUser2._id.toString() });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Friend request sent successfully');
      expect(response.body.data).toHaveProperty('requestId');

      // Verify friendship was created in database
      const friendship = await friendshipModel.findById(new mongoose.Types.ObjectId(response.body.data.requestId));
      expect(friendship).toBeTruthy();
      expect(friendship!.userId._id?.toString() || friendship!.userId.toString()).toBe(testUser1._id.toString());
      expect(friendship!.friendId._id?.toString() || friendship!.friendId.toString()).toBe(testUser2._id.toString());
      expect(friendship!.status).toBe('pending');
      expect(friendship!.requestedBy._id?.toString() || friendship!.requestedBy.toString()).toBe(testUser1._id.toString());
    });

    test('Cannot send friend request to non-existent user', async () => {
      const tempApp = createAuthenticatedApp();
      const nonExistentUserId = new mongoose.Types.ObjectId();

      const response = await withAuth(testUser1)(
        request(tempApp).post('/friends/requests')
      ).send({ toUserId: nonExistentUserId.toString() });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');

      // Verify no friendship was created
      const friendships = await friendshipModel.findUserFriendships(testUser1._id);
      expect(friendships).toHaveLength(0);
    });

    test('Cannot send duplicate friend request', async () => {
      const tempApp = createAuthenticatedApp();

      // Create an existing friendship
      await friendshipModel.create({
        userId: testUser1._id,
        friendId: testUser2._id,
        status: 'pending',
        requestedBy: testUser1._id
      });

      const response = await withAuth(testUser1)(
        request(tempApp).post('/friends/requests')
      ).send({ toUserId: testUser2._id.toString() });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Friend request already sent');

      // Verify only one friendship exists
      const friendships = await friendshipModel.findUserFriendships(testUser1._id);
      expect(friendships).toHaveLength(1);
    });

    test('Cannot send friend request to self', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).post('/friends/requests')
      ).send({ toUserId: testUser1._id.toString() });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Cannot send friend request to yourself');

      // Verify no friendship was created
      const friendships = await friendshipModel.findUserFriendships(testUser1._id);
      expect(friendships).toHaveLength(0);
    });

    test('Missing toUserId validation', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).post('/friends/requests')
      ).send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid request body');

      // Verify no friendship was created
      const friendships = await friendshipModel.findUserFriendships(testUser1._id);
      expect(friendships).toHaveLength(0);
    });
  });

  describe('GET /friends/requests', () => {
    beforeEach(async () => {
      // Create some test friendships for request listing
      await friendshipModel.create({
        userId: testUser1._id,
        friendId: testUser2._id,
        status: 'pending',
        requestedBy: testUser1._id
      });

      await friendshipModel.create({
        userId: testUser3._id,
        friendId: testUser1._id,
        status: 'pending',
        requestedBy: testUser3._id
      });
    });

    test('Get outgoing friend requests', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).get('/friends/requests')
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Outgoing friend requests retrieved successfully');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].from.displayName).toBe('Test User 2');
    });

    test('Get incoming friend requests', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).get('/friends/requests?inbox=true')
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Incoming friend requests retrieved successfully');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].from.displayName).toBe('Test User 3');
    });

    test('No pending requests returns empty array', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser2)(
        request(tempApp).get('/friends/requests')
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('POST /friends/requests/:id/accept', () => {
    let friendRequest: any;

    beforeEach(async () => {
      // Create a pending friend request
      friendRequest = await friendshipModel.create({
        userId: testUser2._id,
        friendId: testUser1._id,
        status: 'pending',
        requestedBy: testUser2._id
      });
    });

    test('Accept friend request successfully', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).post(`/friends/requests/${friendRequest._id}/accept`)
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Friend request accepted successfully');

      // Verify the friendship status was updated
      const updatedFriendship = await friendshipModel.findById(friendRequest._id);
      expect(updatedFriendship!.status).toBe('accepted');

      // Verify reverse friendship was created
      const reverseFriendship = await friendshipModel.findByUserAndFriend(testUser1._id, testUser2._id);
      expect(reverseFriendship).toBeTruthy();
      expect(reverseFriendship!.status).toBe('accepted');

      // Verify friends count was incremented for both users
      const updatedUser1 = await userModel.findById(testUser1._id);
      const updatedUser2 = await userModel.findById(testUser2._id);
      expect(updatedUser1!.friendsCount).toBe(1);
      expect(updatedUser2!.friendsCount).toBe(1);
    });

    test('Cannot accept non-existent friend request', async () => {
      const tempApp = createAuthenticatedApp();
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await withAuth(testUser1)(
        request(tempApp).post(`/friends/requests/${nonExistentId}/accept`)
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Friend request not found');
    });

    test('Cannot accept others friend request', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser3)( // Different user
        request(tempApp).post(`/friends/requests/${friendRequest._id}/accept`)
      );

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('not authorized');

      // Verify friendship status was not changed
      const unchangedFriendship = await friendshipModel.findById(friendRequest._id);
      expect(unchangedFriendship!.status).toBe('pending');
    });

    test('Cannot accept already accepted request', async () => {
      // Update friendship to accepted first using proper method
      await friendshipModel.updateStatus(friendRequest._id, 'accepted');

      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).post(`/friends/requests/${friendRequest._id}/accept`)
      );

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Friend request is already accepted');
    });
  });

  describe('GET /friends', () => {
    beforeEach(async () => {
      // Create accepted friendships for friends list testing
      await friendshipModel.create({
        userId: testUser1._id,
        friendId: testUser2._id,
        status: 'accepted',
        requestedBy: testUser1._id,
        shareLocation: true
      });

      await friendshipModel.create({
        userId: testUser2._id,
        friendId: testUser1._id,
        status: 'accepted',
        requestedBy: testUser1._id,
        shareLocation: false
      });

      await friendshipModel.create({
        userId: testUser1._id,
        friendId: testUser3._id,
        status: 'accepted',
        requestedBy: testUser3._id,
        shareLocation: false
      });

      await friendshipModel.create({
        userId: testUser3._id,
        friendId: testUser1._id,
        status: 'accepted',
        requestedBy: testUser3._id,
        shareLocation: true
      });

      // Update friends count manually for this test
      await userModel.incrementFriendsCount(testUser1._id, 2);
      await userModel.incrementFriendsCount(testUser2._id, 1);
      await userModel.incrementFriendsCount(testUser3._id, 1);
    });

    test('Get friends list successfully', async () => {
      const tempApp = createAuthenticatedApp();

      const response = await withAuth(testUser1)(
        request(tempApp).get('/friends')
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Friends list retrieved successfully');
      expect(response.body.data).toHaveLength(2);

      // Verify friend data structure
      const friends = response.body.data;
      expect(friends.some((f: any) => f.userId === testUser2._id.toString())).toBe(true);
      expect(friends.some((f: any) => f.userId === testUser3._id.toString())).toBe(true);

      // Verify shareLocation settings
      const friend2 = friends.find((f: any) => f.userId === testUser2._id.toString());
      expect(friend2.shareLocation).toBe(true);
    });

    test('Empty friends list', async () => {
      const tempApp = createAuthenticatedApp();

      // Remove all friendships for testUser2
      await friendshipModel.deleteFriendship(testUser2._id, testUser1._id);

      const response = await withAuth(testUser2)(
        request(tempApp).get('/friends')
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });
});