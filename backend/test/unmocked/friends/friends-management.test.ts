import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import friendsRoutes from '../../../src/routes/friends.routes';
import { authenticateToken } from '../../../src/middleware/auth.middleware';
import { friendshipModel } from '../../../src/models/friendship.model';
import { userModel } from '../../../src/models/user.model';

// Helper to add auth header
const withAuth = (user: any) => (req: request.Test) => {
  return req
    .set('Authorization', 'Bearer test-token-12345')
    .set('x-dev-user-id', user._id.toString());
};

// Create Express app for testing
function createAuthenticatedApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/api/friends', friendsRoutes);
  return app;
}

describe('GET /api/friends - List friends', () => {
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

  // Input: Get list of accepted friends
  // Expected status code: 200
  // Expected behavior: Returns accepted friendships with user details
  // Expected output: Array of friends with displayName, photoUrl, shareLocation, isOnline
  test('Get list of accepted friends', async () => {
    // Create accepted friendships (bidirectional)
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

    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser3._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: false,
      closeFriend: false,
    });

    await friendshipModel.create({
      userId: testUser3._id,
      friendId: testUser1._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: false,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends')
    ).expect(200);

    expect(res.body).toHaveProperty('message', 'Friends list retrieved successfully');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);

    // Check friend structure
    expect(res.body.data[0]).toHaveProperty('userId');
    expect(res.body.data[0]).toHaveProperty('displayName');
    expect(res.body.data[0]).toHaveProperty('shareLocation');
    expect(res.body.data[0]).toHaveProperty('isOnline');

    // Verify friend IDs
    const friendIds = res.body.data.map((friend: any) => friend.userId);
    expect(friendIds).toContain(testUser2._id.toString());
    expect(friendIds).toContain(testUser3._id.toString());
  });

  // Input: Get friends when no friends exist
  // Expected status code: 200
  // Expected behavior: Returns empty array
  // Expected output: Empty data array
  test('Get friends when no friends exist', async () => {
    const res = await withAuth(testUser1)(
      request(app).get('/api/friends')
    ).expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveLength(0);
  });

  // Input: Get friends with custom limit
  // Expected status code: 200
  // Expected behavior: Respects limit parameter
  // Expected output: Limited number of results
  test('Respect limit parameter', async () => {
    // Create 5 friends
    for (let i = 0; i < 5; i++) {
      const friend = await (userModel as any).user.create({
        name: `Friend ${i} ${Date.now()}`,
        username: `friend${i}_${Date.now()}`,
        email: `friend${i}_${Date.now()}@example.com`,
        googleId: `google_friend${i}_${Date.now()}`,
        password: 'password123',
      });

      await friendshipModel.create({
        userId: testUser1._id,
        friendId: friend._id,
        status: 'accepted',
        requestedBy: testUser1._id,
        shareLocation: true,
        closeFriend: false,
      });

      await friendshipModel.create({
        userId: friend._id,
        friendId: testUser1._id,
        status: 'accepted',
        requestedBy: testUser1._id,
        shareLocation: true,
        closeFriend: false,
      });
    }

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends?limit=3')
    ).expect(200);

    expect(res.body.data).toHaveLength(3);
  });

  // Input: Get friends excludes pending requests
  // Expected status code: 200
  // Expected behavior: Only returns accepted friendships
  // Expected output: Empty array (only pending exists)
  test('Exclude pending friend requests from friends list', async () => {
    // Create pending friendship (not accepted)
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends')
    ).expect(200);

    expect(res.body.data).toHaveLength(0);
  });

  // Input: Get friends with default limit
  // Expected status code: 200
  // Expected behavior: Uses default limit of 50 when not specified
  // Expected output: Maximum 50 results
  test('Use default limit when not specified', async () => {
    // Create 60 friends (over default limit)
    for (let i = 0; i < 60; i++) {
      const friend = await (userModel as any).user.create({
        name: `Friend ${i} ${Date.now()}`,
        username: `friend${i}_${Date.now()}`,
        email: `friend${i}_${Date.now()}@example.com`,
        googleId: `google_friend${i}_${Date.now()}`,
        password: 'password123',
      });

      await friendshipModel.create({
        userId: testUser1._id,
        friendId: friend._id,
        status: 'accepted',
        requestedBy: testUser1._id,
        shareLocation: true,
        closeFriend: false,
      });

      await friendshipModel.create({
        userId: friend._id,
        friendId: testUser1._id,
        status: 'accepted',
        requestedBy: testUser1._id,
        shareLocation: true,
        closeFriend: false,
      });
    }

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends')
    ).expect(200);

    expect(res.body.data.length).toBeLessThanOrEqual(50);
  });
});

describe('PATCH /api/friends/:friendId - Update friend settings', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;

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

    // Create accepted friendship (bidirectional)
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

  // Input: Update shareLocation setting
  // Expected status code: 200
  // Expected behavior: Updates friendship settings
  // Expected output: Success with updated settings
  test('Update shareLocation setting', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .patch(`/api/friends/${testUser2._id.toString()}`)
        .send({ shareLocation: false })
    ).expect(200);

    expect(res.body).toHaveProperty('message', 'Friend settings updated successfully');
    expect(res.body.data).toHaveProperty('success', true);
    expect(res.body.data.settings).toHaveProperty('shareLocation', false);

    // Verify setting was updated in database
    const friendship = await friendshipModel.findByUserAndFriend(testUser1._id, testUser2._id);
    expect(friendship?.shareLocation).toBe(false);
  });

  // Input: Update closeFriend setting
  // Expected status code: 200
  // Expected behavior: Updates friendship settings
  // Expected output: Success with updated settings
  test('Update closeFriend setting', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .patch(`/api/friends/${testUser2._id.toString()}`)
        .send({ closeFriend: true })
    ).expect(200);

    expect(res.body).toHaveProperty('message', 'Friend settings updated successfully');
    expect(res.body.data).toHaveProperty('success', true);
    expect(res.body.data.settings).toHaveProperty('closeFriend', true);

    // Verify setting was updated in database
    const friendship = await friendshipModel.findByUserAndFriend(testUser1._id, testUser2._id);
    expect(friendship?.closeFriend).toBe(true);
  });

  // Input: Update multiple settings at once
  // Expected status code: 200
  // Expected behavior: Updates all provided settings
  // Expected output: Success with all updated settings
  test('Update multiple settings at once', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .patch(`/api/friends/${testUser2._id.toString()}`)
        .send({ shareLocation: false, closeFriend: true })
    ).expect(200);

    expect(res.body).toHaveProperty('message', 'Friend settings updated successfully');
    expect(res.body.data.settings).toHaveProperty('shareLocation', false);
    expect(res.body.data.settings).toHaveProperty('closeFriend', true);
  });

  // Input: Invalid friend ID format
  // Expected status code: 400
  // Expected behavior: Rejects invalid ObjectId
  // Expected output: Error message about invalid ID
  test('Reject invalid friend ID format', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .patch('/api/friends/invalid-id')
        .send({ shareLocation: false })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid friend ID format');
  });

  // Input: Empty request body
  // Expected status code: 400
  // Expected behavior: Requires at least one setting
  // Expected output: Error message about missing settings
  test('Reject empty request body', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .patch(`/api/friends/${testUser2._id.toString()}`)
        .send({})
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'At least one setting must be provided');
  });

  // Input: Update settings for non-friend
  // Expected status code: 404
  // Expected behavior: Friendship not found
  // Expected output: Error message about friendship not found
  test('Reject updating settings for non-friend', async () => {
    const testUser3 = await (userModel as any).user.create({
      name: `User Three ${Date.now()}`,
      username: `user3_${Date.now()}`,
      email: `user3_${Date.now()}@example.com`,
      googleId: `google3_${Date.now()}`,
      password: 'password123',
    });

    const res = await withAuth(testUser1)(
      request(app)
        .patch(`/api/friends/${testUser3._id.toString()}`)
        .send({ shareLocation: false })
    ).expect(404);

    expect(res.body).toHaveProperty('message', 'Friendship not found');
  });

  // Input: Update settings for pending friend request
  // Expected status code: 400
  // Expected behavior: Rejects updating non-accepted friendship
  // Expected output: Error message about only accepted friends
  test('Reject updating settings for pending request', async () => {
    const testUser3 = await (userModel as any).user.create({
      name: `User Three ${Date.now()}`,
      username: `user3_${Date.now()}`,
      email: `user3_${Date.now()}@example.com`,
      googleId: `google3_${Date.now()}`,
      password: 'password123',
    });

    // Create pending friendship
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser3._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app)
        .patch(`/api/friends/${testUser3._id.toString()}`)
        .send({ shareLocation: false })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Can only update settings for accepted friends');
  });

  // Input: Update settings for self
  // Expected status code: 400
  // Expected behavior: Prevents updating self
  // Expected output: Error message about updating self
  test('Prevent updating settings for self', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .patch(`/api/friends/${testUser1._id.toString()}`)
        .send({ shareLocation: false })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Cannot update settings for yourself');
  });
});

describe('DELETE /api/friends/:friendId - Remove friend', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;

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
  });

  // Input: Remove an accepted friend
  // Expected status code: 200
  // Expected behavior: Deletes both directional friendships, decrements friends count
  // Expected output: Success message
  test('Successfully remove friend', async () => {
    // Create accepted friendship (bidirectional)
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

    const res = await withAuth(testUser1)(
      request(app).delete(`/api/friends/${testUser2._id.toString()}`)
    ).expect(200);

    expect(res.body).toHaveProperty('message', 'Friend removed successfully');
    expect(res.body.data).toHaveProperty('success', true);

    // Verify both friendships deleted
    const friendship1 = await friendshipModel.findByUserAndFriend(testUser1._id, testUser2._id);
    const friendship2 = await friendshipModel.findByUserAndFriend(testUser2._id, testUser1._id);
    expect(friendship1).toBeNull();
    expect(friendship2).toBeNull();
  });

  // Input: Invalid friend ID format
  // Expected status code: 400
  // Expected behavior: Rejects invalid ObjectId
  // Expected output: Error message about invalid ID
  test('Reject invalid friend ID format', async () => {
    const res = await withAuth(testUser1)(
      request(app).delete('/api/friends/invalid-id')
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid friend ID format');
  });

  // Input: Remove non-existent friend
  // Expected status code: 404
  // Expected behavior: Friendship not found
  // Expected output: Error message about friendship not found
  test('Handle removing non-existent friend', async () => {
    const testUser3 = await (userModel as any).user.create({
      name: `User Three ${Date.now()}`,
      username: `user3_${Date.now()}`,
      email: `user3_${Date.now()}@example.com`,
      googleId: `google3_${Date.now()}`,
      password: 'password123',
    });

    const res = await withAuth(testUser1)(
      request(app).delete(`/api/friends/${testUser3._id.toString()}`)
    ).expect(404);

    expect(res.body).toHaveProperty('message', 'Friendship not found or not accepted');
  });

  // Input: Remove pending friend request (not accepted)
  // Expected status code: 404
  // Expected behavior: Rejects removing non-accepted friendship
  // Expected output: Error message about friendship not accepted
  test('Reject removing pending friend request', async () => {
    // Create pending friendship
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app).delete(`/api/friends/${testUser2._id.toString()}`)
    ).expect(404);

    expect(res.body).toHaveProperty('message', 'Friendship not found or not accepted');
  });

  // Input: Remove self as friend
  // Expected status code: 400
  // Expected behavior: Prevents removing self
  // Expected output: Error message about removing self
  test('Prevent removing self as friend', async () => {
    const res = await withAuth(testUser1)(
      request(app).delete(`/api/friends/${testUser1._id.toString()}`)
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Cannot remove yourself as a friend');
  });
});
