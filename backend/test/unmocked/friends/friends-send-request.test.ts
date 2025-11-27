import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach } from '@jest/globals';

import friendsRoutes from '../../../src/routes/friends.routes';
import { userModel } from '../../../src/models/user.model';
import { friendshipModel } from '../../../src/models/friendship.model';

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
      const user = await (userModel as any).user.findById(new mongoose.Types.ObjectId(userId as string));
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

  // Add friends routes
  app.use('/api/friends', friendsRoutes);

  return app;
}

// Helper to add auth headers
const withAuth = (user: any) => (req: request.Test) => {
  return req
    .set('Authorization', 'Bearer test-token-12345')
    .set('x-dev-user-id', user._id.toString());
};

describe('POST /api/friends/requests - Send friend request', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;

  beforeEach(async () => {
    app = createAuthenticatedApp();

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

    testUser3 = await (userModel as any).user.create({
      name: `User Three ${Date.now()}`,
      username: `user3_${Date.now()}`,
      email: `user3_${Date.now()}@example.com`,
      googleId: `google3_${Date.now()}`,
      password: 'password123',
      privacy: {
        allowFriendRequestsFrom: 'noOne',
      },
    });
  });

  // Input: Valid friend request to another user
  // Expected status code: 201
  // Expected behavior: Creates pending friendship record and sends notification
  // Expected output: Request ID and pending status
  test('Successfully send friend request', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: testUser2._id.toString() })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Friend request sent successfully');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('requestId');
    expect(res.body.data).toHaveProperty('status', 'pending');

    // Verify friendship record was created
    const friendship = await friendshipModel.findByUserAndFriend(testUser1._id, testUser2._id);
    expect(friendship).toBeDefined();
    expect(friendship?.status).toBe('pending');
    expect(friendship?.requestedBy.toString()).toBe(testUser1._id.toString());
  });

  // Input: Missing toUserId in request body
  // Expected status code: 400
  // Expected behavior: Validation fails
  // Expected output: Error message about invalid request body
  test('Reject request with missing toUserId', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({})
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: Invalid toUserId format
  // Expected status code: 500
  // Expected behavior: ObjectId conversion fails with BSON error
  // Expected output: Internal server error
  test('Reject request with invalid toUserId format', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: 'invalid-id' })
    ).expect(500);

    expect(res.body).toHaveProperty('message', 'Internal server error');
  });

  // Input: User tries to send friend request to themselves
  // Expected status code: 400
  // Expected behavior: Prevents self-friending
  // Expected output: Error message
  test('Prevent sending friend request to self', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: testUser1._id.toString() })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Cannot send friend request to yourself');
  });

  // Input: Friend request to non-existent user
  // Expected status code: 404
  // Expected behavior: Target user not found
  // Expected output: User not found error
  test('Handle friend request to non-existent user', async () => {
    const fakeUserId = new mongoose.Types.ObjectId();

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: fakeUserId.toString() })
    ).expect(404);

    expect(res.body).toHaveProperty('message', 'User not found');
  });

  // Input: Duplicate friend request (already pending)
  // Expected status code: 409
  // Expected behavior: Prevents duplicate pending requests
  // Expected output: Friend request already sent error
  test('Prevent duplicate friend requests', async () => {
    // Send first request
    await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: testUser2._id.toString() })
    ).expect(201);

    // Try to send again
    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: testUser2._id.toString() })
    ).expect(409);

    expect(res.body).toHaveProperty('message', 'Friend request already sent');
  });

  // Input: Friend request when already friends
  // Expected status code: 409
  // Expected behavior: Prevents request to existing friend
  // Expected output: Already friends error
  test('Prevent friend request when already friends', async () => {
    // Create accepted friendship
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: testUser2._id.toString() })
    ).expect(409);

    expect(res.body).toHaveProperty('message', 'You are already friends with this user');
  });

  // Input: Friend request when target user has pending request to sender
  // Expected status code: 409
  // Expected behavior: Notifies sender that target already sent request
  // Expected output: Error about existing reverse request
  test('Handle reverse pending friend request', async () => {
    // User 2 sends request to User 1 first
    await friendshipModel.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'pending',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    // User 1 tries to send request to User 2
    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: testUser2._id.toString() })
    ).expect(409);

    expect(res.body).toHaveProperty('message', 'This user has already sent you a friend request');
  });

  // Input: Friend request to user who doesn't accept requests (privacy: noOne)
  // Expected status code: 403
  // Expected behavior: Respects privacy settings
  // Expected output: Privacy restriction error
  test('Respect privacy settings - noOne', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: testUser3._id.toString() })
    ).expect(403);

    expect(res.body).toHaveProperty('message', 'This user is not accepting friend requests');
  });

  // Input: Friend request after declined request (cleanup old record)
  // Expected status code: 201
  // Expected behavior: Cleans up old declined record and creates new request
  // Expected output: New friend request created successfully
  test('Allow new request after declined request', async () => {
    // Create declined friendship
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'declined',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: testUser2._id.toString() })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Friend request sent successfully');
    expect(res.body.data).toHaveProperty('status', 'pending');

    // Verify new friendship is pending
    const friendship = await friendshipModel.findByUserAndFriend(testUser1._id, testUser2._id);
    expect(friendship?.status).toBe('pending');
  });

  // Input: Friend request after blocked friendship (cleanup)
  // Expected status code: 201
  // Expected behavior: Cleans up old blocked record and creates new request
  // Expected output: New friend request created successfully
  test('Allow new request after blocked friendship cleanup', async () => {
    // Create blocked friendship
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'blocked',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: testUser2._id.toString() })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Friend request sent successfully');
    expect(res.body.data).toHaveProperty('status', 'pending');
  });

  // Input: Friend request to user with friendsOfFriends privacy (no mutual friends)
  // Expected status code: 403
  // Expected behavior: Checks mutual friends and rejects
  // Expected output: Privacy restriction error
  test('Respect privacy settings - friendsOfFriends without mutual friends', async () => {
    // Update user2 privacy to friendsOfFriends
    await (userModel as any).user.findByIdAndUpdate(testUser2._id, {
      $set: { 'privacy.allowFriendRequestsFrom': 'friendsOfFriends' }
    });

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: testUser2._id.toString() })
    ).expect(403);

    expect(res.body).toHaveProperty('message', 'This user only accepts friend requests from friends of friends');
  });

  // Input: Friend request to user with friendsOfFriends privacy (with mutual friend)
  // Expected status code: 201
  // Expected behavior: Allows request when users have mutual friend
  // Expected output: Friend request sent successfully
  test('Respect privacy settings - friendsOfFriends with mutual friend', async () => {
    // Create User 4 as mutual friend
    const testUser4 = await (userModel as any).user.create({
      name: `User Four ${Date.now()}`,
      username: `user4_${Date.now()}`,
      email: `user4_${Date.now()}@example.com`,
      googleId: `google4_${Date.now()}`,
      password: 'password123',
    });

    // User1 and User4 are friends
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser4._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // User2 and User4 are friends
    await friendshipModel.create({
      userId: testUser2._id,
      friendId: testUser4._id,
      status: 'accepted',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Update user2 privacy to friendsOfFriends
    await (userModel as any).user.findByIdAndUpdate(testUser2._id, {
      $set: { 'privacy.allowFriendRequestsFrom': 'friendsOfFriends' }
    });

    const res = await withAuth(testUser1)(
      request(app)
        .post('/api/friends/requests')
        .send({ toUserId: testUser2._id.toString() })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Friend request sent successfully');
    expect(res.body.data).toHaveProperty('status', 'pending');
  });
});

describe('GET /api/friends/requests - List friend requests', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;

  beforeEach(async () => {
    app = createAuthenticatedApp();

    // Create test users
    testUser1 = await (userModel as any).user.create({
      name: `User One ${Date.now()}`,
      username: `user1_${Date.now()}`,
      email: `user1_${Date.now()}@example.com`,
      googleId: `google1_${Date.now()}`,
      password: 'password123',
    });

    testUser2 = await (userModel as any).user.create({
      name: `User Two ${Date.now()}`,
      username: `user2_${Date.now()}`,
      email: `user2_${Date.now()}@example.com`,
      googleId: `google2_${Date.now()}`,
      password: 'password123',
    });

    testUser3 = await (userModel as any).user.create({
      name: `User Three ${Date.now()}`,
      username: `user3_${Date.now()}`,
      email: `user3_${Date.now()}@example.com`,
      googleId: `google3_${Date.now()}`,
      password: 'password123',
    });
  });

  // Input: Get incoming friend requests (inbox=true)
  // Expected status code: 200
  // Expected behavior: Returns pending requests where user is recipient
  // Expected output: Array of incoming requests with sender info
  test('Get incoming friend requests', async () => {
    // User2 sends request to User1
    await friendshipModel.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'pending',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    // User3 sends request to User1
    await friendshipModel.create({
      userId: testUser3._id,
      friendId: testUser1._id,
      status: 'pending',
      requestedBy: testUser3._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/requests?inbox=true')
    ).expect(200);

    expect(res.body).toHaveProperty('message', 'Incoming friend requests retrieved successfully');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);

    // Check first request structure
    expect(res.body.data[0]).toHaveProperty('_id');
    expect(res.body.data[0]).toHaveProperty('from');
    expect(res.body.data[0].from).toHaveProperty('userId');
    expect(res.body.data[0].from).toHaveProperty('displayName');
    expect(res.body.data[0]).toHaveProperty('createdAt');

    // Verify sender IDs are User2 and User3
    const senderIds = res.body.data.map((req: any) => req.from.userId);
    expect(senderIds).toContain(testUser2._id.toString());
    expect(senderIds).toContain(testUser3._id.toString());
  });

  // Input: Get outgoing friend requests (inbox not set or false)
  // Expected status code: 200
  // Expected behavior: Returns pending requests where user is sender
  // Expected output: Array of outgoing requests with recipient info
  test('Get outgoing friend requests', async () => {
    // User1 sends request to User2
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // User1 sends request to User3
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser3._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/requests')
    ).expect(200);

    expect(res.body).toHaveProperty('message', 'Outgoing friend requests retrieved successfully');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);

    // Check first request structure
    expect(res.body.data[0]).toHaveProperty('_id');
    expect(res.body.data[0]).toHaveProperty('to');
    expect(res.body.data[0].to).toHaveProperty('userId');
    expect(res.body.data[0].to).toHaveProperty('displayName');
    expect(res.body.data[0]).toHaveProperty('createdAt');

    // Verify recipient IDs are User2 and User3
    const recipientIds = res.body.data.map((req: any) => req.to.userId);
    expect(recipientIds).toContain(testUser2._id.toString());
    expect(recipientIds).toContain(testUser3._id.toString());
  });

  // Input: Get requests with no pending requests
  // Expected status code: 200
  // Expected behavior: Returns empty array
  // Expected output: Empty data array
  test('Get requests when no pending requests exist', async () => {
    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/requests?inbox=true')
    ).expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveLength(0);
  });

  // Input: Get requests with custom limit
  // Expected status code: 200
  // Expected behavior: Respects limit parameter
  // Expected output: Limited number of results
  test('Respect limit parameter', async () => {
    // Create 5 incoming requests
    for (let i = 0; i < 5; i++) {
      const sender = await (userModel as any).user.create({
        name: `Sender ${i} ${Date.now()}`,
        username: `sender${i}_${Date.now()}`,
        email: `sender${i}_${Date.now()}@example.com`,
        googleId: `google_sender${i}_${Date.now()}`,
        password: 'password123',
      });

      await friendshipModel.create({
        userId: sender._id,
        friendId: testUser1._id,
        status: 'pending',
        requestedBy: sender._id,
        shareLocation: true,
        closeFriend: false,
      });
    }

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/requests?inbox=true&limit=3')
    ).expect(200);

    expect(res.body.data).toHaveLength(3);
  });

  // Input: Invalid query parameters
  // Expected status code: 200
  // Expected behavior: Non-'true' inbox values treated as outbox
  // Expected output: Outgoing friend requests (inbox parameter is permissive)
  test('Treat non-true inbox values as outbox', async () => {
    // User1 sends request to User2
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/requests?inbox=invalid')
    ).expect(200);

    // Should return outgoing requests since inbox != 'true'
    expect(res.body).toHaveProperty('message', 'Outgoing friend requests retrieved successfully');
    expect(res.body.data).toHaveLength(1);
  });

  // Input: Get requests when only accepted friendships exist
  // Expected status code: 200
  // Expected behavior: Only returns pending requests, not accepted
  // Expected output: Empty array
  test('Exclude accepted friendships from results', async () => {
    // Create accepted friendship
    await friendshipModel.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'accepted',
      requestedBy: testUser2._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/requests?inbox=true')
    ).expect(200);

    expect(res.body.data).toHaveLength(0);
  });

  // Input: Get requests with default limit
  // Expected status code: 200
  // Expected behavior: Uses default limit of 20 when not specified
  // Expected output: Maximum 20 results
  test('Use default limit when not specified', async () => {
    // Create 25 incoming requests
    for (let i = 0; i < 25; i++) {
      const sender = await (userModel as any).user.create({
        name: `Sender ${i} ${Date.now()}`,
        username: `sender${i}_${Date.now()}`,
        email: `sender${i}_${Date.now()}@example.com`,
        googleId: `google_sender${i}_${Date.now()}`,
        password: 'password123',
      });

      await friendshipModel.create({
        userId: sender._id,
        friendId: testUser1._id,
        status: 'pending',
        requestedBy: sender._id,
        shareLocation: true,
        closeFriend: false,
      });
    }

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/requests?inbox=true')
    ).expect(200);

    expect(res.body.data.length).toBeLessThanOrEqual(20);
  });
});
