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

describe('POST /api/friends/requests/:id/accept - Accept friend request', () => {
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

  // Input: Valid friend request acceptance
  // Expected status code: 200
  // Expected behavior: Updates request to accepted, creates reciprocal friendship, increments friends count
  // Expected output: Success message with accepted status
  test('Successfully accept friend request', async () => {
    // User1 sends request to User2
    const friendRequest = await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // User2 accepts the request
    const res = await withAuth(testUser2)(
      request(app).post(`/api/friends/requests/${friendRequest._id.toString()}/accept`)
    ).expect(200);

    expect(res.body).toHaveProperty('message', 'Friend request accepted successfully');
    expect(res.body.data).toHaveProperty('status', 'accepted');

    // Verify friendship status updated
    const updatedRequest = await friendshipModel.findById(friendRequest._id);
    expect(updatedRequest?.status).toBe('accepted');

    // Verify reciprocal friendship created
    const reciprocal = await friendshipModel.findByUserAndFriend(testUser2._id, testUser1._id);
    expect(reciprocal).toBeDefined();
    expect(reciprocal?.status).toBe('accepted');

    // Verify friends count incremented
    const user1 = await (userModel as any).user.findById(testUser1._id);
    const user2 = await (userModel as any).user.findById(testUser2._id);
    expect(user1.friendsCount).toBeGreaterThanOrEqual(1);
    expect(user2.friendsCount).toBeGreaterThanOrEqual(1);
  });

  // Input: Invalid request ID format
  // Expected status code: 400
  // Expected behavior: Rejects invalid ObjectId format
  // Expected output: Error message about invalid ID
  test('Reject invalid request ID format', async () => {
    const res = await withAuth(testUser2)(
      request(app).post('/api/friends/requests/invalid-id/accept')
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid friend request ID format');
  });

  // Input: Non-existent request ID
  // Expected status code: 404
  // Expected behavior: Request not found
  // Expected output: Error message about request not found
  test('Handle non-existent friend request', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await withAuth(testUser2)(
      request(app).post(`/api/friends/requests/${fakeId.toString()}/accept`)
    ).expect(404);

    expect(res.body).toHaveProperty('message', 'Friend request not found');
  });

  // Input: User tries to accept request they sent
  // Expected status code: 403
  // Expected behavior: Authorization check fails
  // Expected output: Error message about not being authorized
  test('Prevent sender from accepting their own request', async () => {
    // User1 sends request to User2
    const friendRequest = await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // User1 tries to accept (should fail)
    const res = await withAuth(testUser1)(
      request(app).post(`/api/friends/requests/${friendRequest._id.toString()}/accept`)
    ).expect(403);

    expect(res.body).toHaveProperty('message', 'You are not authorized to accept this friend request');
  });

  // Input: Accept already accepted request
  // Expected status code: 400
  // Expected behavior: Rejects already processed request
  // Expected output: Error message about request already being accepted
  test('Reject accepting already accepted request', async () => {
    // Create accepted friendship
    const friendRequest = await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser2)(
      request(app).post(`/api/friends/requests/${friendRequest._id.toString()}/accept`)
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Friend request is already accepted');
  });

  // Input: Accept already declined request
  // Expected status code: 400
  // Expected behavior: Rejects already processed request
  // Expected output: Error message about request already being declined
  test('Reject accepting already declined request', async () => {
    // Create declined friendship
    const friendRequest = await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'declined',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser2)(
      request(app).post(`/api/friends/requests/${friendRequest._id.toString()}/accept`)
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Friend request is already declined');
  });

  // Input: Third party user tries to accept request
  // Expected status code: 403
  // Expected behavior: Authorization check fails
  // Expected output: Error message about not being authorized
  test('Prevent third party from accepting request', async () => {
    const testUser3 = await (userModel as any).user.create({
      name: `User Three ${Date.now()}`,
      username: `user3_${Date.now()}`,
      email: `user3_${Date.now()}@example.com`,
      googleId: `google3_${Date.now()}`,
      password: 'password123',
    });

    // User1 sends request to User2
    const friendRequest = await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // User3 tries to accept (should fail)
    const res = await withAuth(testUser3)(
      request(app).post(`/api/friends/requests/${friendRequest._id.toString()}/accept`)
    ).expect(403);

    expect(res.body).toHaveProperty('message', 'You are not authorized to accept this friend request');
  });
});

describe('POST /api/friends/requests/:id/decline - Decline friend request', () => {
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

  // Input: Valid friend request decline
  // Expected status code: 200
  // Expected behavior: Deletes the friend request
  // Expected output: Success message with deleted status
  test('Successfully decline friend request', async () => {
    // User1 sends request to User2
    const friendRequest = await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // User2 declines the request
    const res = await withAuth(testUser2)(
      request(app).post(`/api/friends/requests/${friendRequest._id.toString()}/decline`)
    ).expect(200);

    expect(res.body).toHaveProperty('message', 'Friend request declined successfully');
    expect(res.body.data).toHaveProperty('status', 'deleted');

    // Verify friendship request was deleted
    const deletedRequest = await friendshipModel.findById(friendRequest._id);
    expect(deletedRequest).toBeNull();
  });

  // Input: Invalid request ID format
  // Expected status code: 400
  // Expected behavior: Rejects invalid ObjectId format
  // Expected output: Error message about invalid ID
  test('Reject invalid request ID format', async () => {
    const res = await withAuth(testUser2)(
      request(app).post('/api/friends/requests/invalid-id/decline')
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid friend request ID format');
  });

  // Input: Non-existent request ID
  // Expected status code: 404
  // Expected behavior: Request not found
  // Expected output: Error message about request not found
  test('Handle non-existent friend request', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await withAuth(testUser2)(
      request(app).post(`/api/friends/requests/${fakeId.toString()}/decline`)
    ).expect(404);

    expect(res.body).toHaveProperty('message', 'Friend request not found');
  });

  // Input: User tries to decline request they sent
  // Expected status code: 403
  // Expected behavior: Authorization check fails
  // Expected output: Error message about not being authorized
  test('Prevent sender from declining their own request', async () => {
    // User1 sends request to User2
    const friendRequest = await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // User1 tries to decline (should fail)
    const res = await withAuth(testUser1)(
      request(app).post(`/api/friends/requests/${friendRequest._id.toString()}/decline`)
    ).expect(403);

    expect(res.body).toHaveProperty('message', 'You are not authorized to decline this friend request');
  });

  // Input: Decline already accepted request
  // Expected status code: 400
  // Expected behavior: Rejects already processed request
  // Expected output: Error message about request already being accepted
  test('Reject declining already accepted request', async () => {
    // Create accepted friendship
    const friendRequest = await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser2)(
      request(app).post(`/api/friends/requests/${friendRequest._id.toString()}/decline`)
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Friend request is already accepted');
  });

  // Input: Decline already declined request
  // Expected status code: 400
  // Expected behavior: Rejects already processed request
  // Expected output: Error message about request already being declined
  test('Reject declining already declined request', async () => {
    // Create declined friendship
    const friendRequest = await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'declined',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    const res = await withAuth(testUser2)(
      request(app).post(`/api/friends/requests/${friendRequest._id.toString()}/decline`)
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Friend request is already declined');
  });
});
