import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

import * as friendsController from '../../../src/controllers/friends.controller';
import * as locationController from '../../../src/controllers/location.controller';
import { userModel } from '../../../src/models/user.model';
import { friendshipModel } from '../../../src/models/friendship.model';

describe('Friends Routes - Authentication Edge Cases (Mocked)', () => {
  let app: express.Application;
  let testUser: any;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create test user
    testUser = await (userModel as any).user.create({
      name: `Test User ${Date.now()}`,
      username: `testuser_${Date.now()}`,
      email: `testuser_${Date.now()}@example.com`,
      googleId: `google_${Date.now()}`,
      password: 'password123',
      privacy: {
        allowFriendRequestsFrom: 'everyone',
      },
    });

    // Create app with routes that skip auth middleware (to test controller defensive checks)
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware that doesn't set req.user
    app.use((req: any, res: any, next: any) => {
      // Intentionally don't set req.user to test defensive checks
      next();
    });

    // Add routes directly calling controllers (bypassing the router's auth middleware)
    app.post('/api/friends/requests', (req, res) => void friendsController.sendFriendRequest(req, res));
    app.get('/api/friends/requests', (req, res) => void friendsController.listFriendRequests(req, res));
    app.post('/api/friends/requests/:id/accept', (req, res) => void friendsController.acceptFriendRequest(req, res));
    app.post('/api/friends/requests/:id/decline', (req, res) => void friendsController.declineFriendRequest(req, res));
    app.get('/api/friends', (req, res) => void friendsController.listFriends(req, res));
    app.patch('/api/friends/:friendId', (req, res) => void friendsController.updateFriend(req, res));
    app.delete('/api/friends/:friendId', (req, res) => void friendsController.removeFriend(req, res));
    app.get('/api/friends/locations', (req, res) => void locationController.getFriendsLocations(req, res));
  });

  // Input: Request where middleware doesn't populate req.user
  // Expected status code: 401
  // Expected behavior: Controller defensive check catches missing user
  // Expected output: Unauthorized error
  test('sendFriendRequest handles missing req.user', async () => {
    const res = await request(app)
      .post('/api/friends/requests')
      .send({ toUserId: new mongoose.Types.ObjectId().toString() })
      .expect(401);

    expect(res.body).toHaveProperty('message', 'Unauthorized');
  });

  // Input: acceptFriendRequest without authenticated user
  // Expected status code: 401
  // Expected behavior: Controller defensive check catches missing user
  // Expected output: Unauthorized error
  test('acceptFriendRequest handles missing req.user', async () => {
    const requestId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/friends/requests/${requestId}/accept`)
      .expect(401);

    expect(res.body).toHaveProperty('message', 'Unauthorized');
  });

  // Input: declineFriendRequest without authenticated user
  // Expected status code: 401
  // Expected behavior: Controller defensive check catches missing user
  // Expected output: Unauthorized error
  test('declineFriendRequest handles missing req.user', async () => {
    const requestId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/friends/requests/${requestId}/decline`)
      .expect(401);

    expect(res.body).toHaveProperty('message', 'Unauthorized');
  });

  // Input: getFriends without authenticated user
  // Expected status code: 401
  // Expected behavior: Controller defensive check catches missing user
  // Expected output: Unauthorized error
  test('getFriends handles missing req.user', async () => {
    const res = await request(app)
      .get('/api/friends')
      .expect(401);

    expect(res.body).toHaveProperty('message', 'Unauthorized');
  });

  // Input: updateFriendSettings without authenticated user
  // Expected status code: 401
  // Expected behavior: Controller defensive check catches missing user
  // Expected output: Unauthorized error
  test('updateFriendSettings handles missing req.user', async () => {
    const friendId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/api/friends/${friendId}`)
      .send({ shareLocation: true })
      .expect(401);

    expect(res.body).toHaveProperty('message', 'Unauthorized');
  });

  // Input: removeFriend without authenticated user
  // Expected status code: 401
  // Expected behavior: Controller defensive check catches missing user
  // Expected output: Unauthorized error
  test('removeFriend handles missing req.user', async () => {
    const friendId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/friends/${friendId}`)
      .expect(401);

    expect(res.body).toHaveProperty('message', 'Unauthorized');
  });

  // Input: getFriendRequests without authenticated user
  // Expected status code: 401
  // Expected behavior: Controller defensive check catches missing user
  // Expected output: Unauthorized error
  test('getFriendRequests handles missing req.user', async () => {
    const res = await request(app)
      .get('/api/friends/requests')
      .expect(401);

    expect(res.body).toHaveProperty('message', 'Unauthorized');
  });

  // Input: getFriendsLocations without authenticated user
  // Expected status code: 401
  // Expected behavior: Controller defensive check catches missing user
  // Expected output: Unauthorized error
  test('getFriendsLocations handles missing req.user', async () => {
    const res = await request(app)
      .get('/api/friends/locations')
      .expect(401);

    expect(res.body).toHaveProperty('message', 'Unauthorized');
  });
});
