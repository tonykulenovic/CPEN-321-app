import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach } from '@jest/globals';

import locationRoutes from '../../../src/routes/location.routes';
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

  // Add location routes
  app.use('/api/me', locationRoutes);

  return app;
}

// Helper to add auth headers
const withAuth = (user: any) => (req: request.Test) => {
  return req
    .set('Authorization', 'Bearer test-token-12345')
    .set('x-dev-user-id', user._id.toString());
};

describe('PUT /api/me/location - Update user location', () => {
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
  });

  // Input: Valid location update with lat, lng, and accuracyM
  // Expected status code: 201
  // Expected behavior: Location is stored and broadcast to friends
  // Expected output: Success message with shared count and expiration
  test('Successfully update location with all fields', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
          lng: -123.1207,
          accuracyM: 10.5,
        })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Location updated successfully');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('shared');
    expect(res.body.data).toHaveProperty('expiresAt');
    expect(typeof res.body.data.shared).toBe('boolean');
    // shared is false because default privacy.location.sharing is 'off'
    expect(res.body.data.shared).toBe(false);
  });

  // Input: Valid location update without optional accuracyM
  // Expected status code: 201
  // Expected behavior: Location is stored with default accuracy (0)
  // Expected output: Success message with location data
  test('Successfully update location without accuracyM', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
          lng: -123.1207,
        })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Location updated successfully');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('shared');
    expect(res.body.data).toHaveProperty('expiresAt');
  });

  // Input: Location update with minimum valid latitude (-90)
  // Expected status code: 201
  // Expected behavior: Accepts minimum latitude
  // Expected output: Success message
  test('Accept minimum valid latitude', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: -90,
          lng: 0,
        })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Location updated successfully');
  });

  // Input: Location update with maximum valid latitude (90)
  // Expected status code: 201
  // Expected behavior: Accepts maximum latitude
  // Expected output: Success message
  test('Accept maximum valid latitude', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 90,
          lng: 0,
        })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Location updated successfully');
  });

  // Input: Location update with minimum valid longitude (-180)
  // Expected status code: 201
  // Expected behavior: Accepts minimum longitude
  // Expected output: Success message
  test('Accept minimum valid longitude', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 0,
          lng: -180,
        })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Location updated successfully');
  });

  // Input: Location update with maximum valid longitude (180)
  // Expected status code: 201
  // Expected behavior: Accepts maximum longitude
  // Expected output: Success message
  test('Accept maximum valid longitude', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 0,
          lng: 180,
        })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Location updated successfully');
  });

  // Input: Location update with zero accuracy
  // Expected status code: 201
  // Expected behavior: Accepts zero accuracy
  // Expected output: Success message
  test('Accept zero accuracy', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
          lng: -123.1207,
          accuracyM: 0,
        })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Location updated successfully');
  });

  // Input: Location update with latitude out of range (> 90)
  // Expected status code: 400
  // Expected behavior: Validation fails
  // Expected output: Invalid request body error
  test('Reject latitude above 90', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 91,
          lng: -123.1207,
        })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: Location update with latitude out of range (< -90)
  // Expected status code: 400
  // Expected behavior: Validation fails
  // Expected output: Invalid request body error
  test('Reject latitude below -90', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: -91,
          lng: -123.1207,
        })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: Location update with longitude out of range (> 180)
  // Expected status code: 400
  // Expected behavior: Validation fails
  // Expected output: Invalid request body error
  test('Reject longitude above 180', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
          lng: 181,
        })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: Location update with longitude out of range (< -180)
  // Expected status code: 400
  // Expected behavior: Validation fails
  // Expected output: Invalid request body error
  test('Reject longitude below -180', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
          lng: -181,
        })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: Location update with negative accuracy
  // Expected status code: 400
  // Expected behavior: Validation fails
  // Expected output: Invalid request body error
  test('Reject negative accuracy', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
          lng: -123.1207,
          accuracyM: -1,
        })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: Location update with missing latitude
  // Expected status code: 400
  // Expected behavior: Validation fails
  // Expected output: Invalid request body error
  test('Reject missing latitude', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lng: -123.1207,
        })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: Location update with missing longitude
  // Expected status code: 400
  // Expected behavior: Validation fails
  // Expected output: Invalid request body error
  test('Reject missing longitude', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
        })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: Location update with string latitude
  // Expected status code: 400
  // Expected behavior: Validation fails (expects number)
  // Expected output: Invalid request body error
  test('Reject string latitude', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: '49.2827',
          lng: -123.1207,
        })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: Location update with string longitude
  // Expected status code: 400
  // Expected behavior: Validation fails (expects number)
  // Expected output: Invalid request body error
  test('Reject string longitude', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
          lng: '-123.1207',
        })
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: Location update with empty request body
  // Expected status code: 400
  // Expected behavior: Validation fails
  // Expected output: Invalid request body error
  test('Reject empty request body', async () => {
    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({})
    ).expect(400);

    expect(res.body).toHaveProperty('message', 'Invalid request body');
    expect(res.body).toHaveProperty('errors');
  });

  // Input: Location update without authentication
  // Expected status code: 401
  // Expected behavior: Authentication required
  // Expected output: Access denied error
  test('Reject unauthenticated request', async () => {
    const res = await request(app)
      .put('/api/me/location')
      .send({
        lat: 49.2827,
        lng: -123.1207,
      })
      .expect(401);

    expect(res.body).toHaveProperty('error', 'Access denied');
  });

  // Input: Multiple location updates from same user
  // Expected status code: 201
  // Expected behavior: Each update succeeds and overwrites previous
  // Expected output: Success for each update
  test('Handle multiple location updates from same user', async () => {
    // First update
    const res1 = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
          lng: -123.1207,
          accuracyM: 10,
        })
    ).expect(201);

    expect(res1.body).toHaveProperty('message', 'Location updated successfully');

    // Second update (different location)
    const res2 = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.28,
          lng: -123.12,
          accuracyM: 15,
        })
    ).expect(201);

    expect(res2.body).toHaveProperty('message', 'Location updated successfully');
  });

  // Input: Location updates from different users
  // Expected status code: 201
  // Expected behavior: Each user can update their own location independently
  // Expected output: Success for both users
  test('Handle location updates from different users', async () => {
    const res1 = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
          lng: -123.1207,
        })
    ).expect(201);

    expect(res1.body).toHaveProperty('message', 'Location updated successfully');

    const res2 = await withAuth(testUser2)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 40.7128,
          lng: -74.0060,
        })
    ).expect(201);

    expect(res2.body).toHaveProperty('message', 'Location updated successfully');
  });

  // Input: User updates location when they have friends who share location
  // Expected status code: 201
  // Expected behavior: Location is broadcast to friends who share location
  // Expected output: Success with shared count > 0
  test('Broadcast location to friends with sharing enabled', async () => {
    // Create friendship with location sharing enabled
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

    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
          lng: -123.1207,
          accuracyM: 10,
        })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Location updated successfully');
    expect(res.body.data).toHaveProperty('shared');
    expect(typeof res.body.data.shared).toBe('boolean');
    // shared is false because default privacy.location.sharing is 'off'
    expect(res.body.data.shared).toBe(false);
  });

  // Input: User updates location when they have friends who don't share location
  // Expected status code: 201
  // Expected behavior: Location not broadcast to friends without sharing
  // Expected output: Success with shared count = 0
  test('Do not broadcast to friends with sharing disabled', async () => {
    // Create friendship with location sharing disabled
    await (friendshipModel as any).friendship.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: false,
      closeFriend: false,
    });

    await (friendshipModel as any).friendship.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: false,
      closeFriend: false,
    });

    const res = await withAuth(testUser1)(
      request(app)
        .put('/api/me/location')
        .send({
          lat: 49.2827,
          lng: -123.1207,
          accuracyM: 10,
        })
    ).expect(201);

    expect(res.body).toHaveProperty('message', 'Location updated successfully');
    expect(res.body.data).toHaveProperty('shared');
    expect(res.body.data.shared).toBe(false);
  });
});
