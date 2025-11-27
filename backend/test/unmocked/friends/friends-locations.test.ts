import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import friendsRoutes from '../../../src/routes/friends.routes';
import { authenticateToken } from '../../../src/middleware/auth.middleware';
import { friendshipModel } from '../../../src/models/friendship.model';
import { userModel } from '../../../src/models/user.model';
import { locationModel } from '../../../src/models/location.model';

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

describe('GET /api/friends/locations - Get friends locations', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;

  beforeEach(async () => {
    app = createAuthenticatedApp();

    // Create test users with location sharing enabled
    testUser1 = await (userModel as any).user.create({
      name: `User One ${Date.now()}`,
      username: `user1_${Date.now()}`,
      email: `user1_${Date.now()}@example.com`,
      googleId: `google1_${Date.now()}`,
      password: 'password123',
      privacy: {
        location: {
          sharing: 'live',
          precisionMeters: 30,
        },
      },
    });

    testUser2 = await (userModel as any).user.create({
      name: `User Two ${Date.now()}`,
      username: `user2_${Date.now()}`,
      email: `user2_${Date.now()}@example.com`,
      googleId: `google2_${Date.now()}`,
      password: 'password123',
      privacy: {
        location: {
          sharing: 'live',
          precisionMeters: 30,
        },
      },
    });

    testUser3 = await (userModel as any).user.create({
      name: `User Three ${Date.now()}`,
      username: `user3_${Date.now()}`,
      email: `user3_${Date.now()}@example.com`,
      googleId: `google3_${Date.now()}`,
      password: 'password123',
      privacy: {
        location: {
          sharing: 'live',
          precisionMeters: 30,
        },
      },
    });
  });

  // Input: Get locations of friends with location sharing enabled
  // Expected status code: 200
  // Expected behavior: Returns locations of friends who have shared them
  // Expected output: Array of friend locations with userId, lat, lng, accuracyM, ts
  test('Get locations of friends with location sharing', async () => {
    // Create accepted friendships with location sharing (bidirectional)
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

    // Create location for testUser2 (within last 5 minutes)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await locationModel.create(
      testUser2._id,
      37.7749,
      -122.4194,
      10,
      true,
      expiresAt
    );

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/locations')
    ).expect(200);

    expect(res.body).toHaveProperty('message', 'Friends locations retrieved successfully');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);

    // Check location structure
    expect(res.body.data[0]).toHaveProperty('userId', testUser2._id.toString());
    expect(res.body.data[0]).toHaveProperty('lat');
    expect(res.body.data[0]).toHaveProperty('lng');
    expect(res.body.data[0]).toHaveProperty('accuracyM');
    expect(res.body.data[0]).toHaveProperty('ts');

    // Verify coordinates are close to original
    expect(res.body.data[0].lat).toBeCloseTo(37.7749, 1);
    expect(res.body.data[0].lng).toBeCloseTo(-122.4194, 1);
  });

  // Input: Get locations when no friends exist
  // Expected status code: 200
  // Expected behavior: Returns empty array
  // Expected output: Empty data array
  test('Get locations when no friends exist', async () => {
    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/locations')
    ).expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveLength(0);
  });

  // Input: Get locations when friends exist but location sharing is disabled
  // Expected status code: 200
  // Expected behavior: Returns empty array (no locations shared)
  // Expected output: Empty data array
  test('Exclude friends with location sharing disabled', async () => {
    // Create friendship with location sharing disabled
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: false, // Location sharing disabled
      closeFriend: false,
    });

    await friendshipModel.create({
      userId: testUser2._id,
      friendId: testUser1._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: false,
      closeFriend: false,
    });

    // Create location for testUser2
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await locationModel.create(
      testUser2._id,
      37.7749,
      -122.4194,
      10,
      true,
      expiresAt
    );

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/locations')
    ).expect(200);

    expect(res.body.data).toHaveLength(0);
  });

  // Input: Get locations when friend has privacy set to 'off'
  // Expected status code: 200
  // Expected behavior: Filters out friends with location sharing off in privacy settings
  // Expected output: Empty array
  test('Exclude friends with privacy location sharing off', async () => {
    // Update testUser2 privacy to turn off location sharing
    await (userModel as any).user.findByIdAndUpdate(testUser2._id, {
      $set: {
        'privacy.location.sharing': 'off',
      },
    });

    // Create friendship with location sharing enabled
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

    // Create location for testUser2
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await locationModel.create(
      testUser2._id,
      37.7749,
      -122.4194,
      10,
      true,
      expiresAt
    );

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/locations')
    ).expect(200);

    expect(res.body.data).toHaveLength(0);
  });

  // Input: Get locations from multiple friends
  // Expected status code: 200
  // Expected behavior: Returns all friends' locations
  // Expected output: Array with multiple friend locations
  test('Get locations from multiple friends', async () => {
    // Create friendships (bidirectional) for User1 with User2 and User3
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
      shareLocation: true,
      closeFriend: false,
    });

    await friendshipModel.create({
      userId: testUser3._id,
      friendId: testUser1._id,
      status: 'accepted',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Create locations for both friends
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await locationModel.create(testUser2._id, 37.7749, -122.4194, 10, true, expiresAt);
    await locationModel.create(testUser3._id, 40.7128, -74.0060, 15, true, expiresAt);

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/locations')
    ).expect(200);

    expect(res.body.data).toHaveLength(2);

    const userIds = res.body.data.map((loc: any) => loc.userId);
    expect(userIds).toContain(testUser2._id.toString());
    expect(userIds).toContain(testUser3._id.toString());
  });

  // Input: Get locations when friend has pending request (not accepted)
  // Expected status code: 200
  // Expected behavior: Only returns locations from accepted friends
  // Expected output: Empty array
  test('Exclude pending friend requests from locations', async () => {
    // Create pending friendship
    await friendshipModel.create({
      userId: testUser1._id,
      friendId: testUser2._id,
      status: 'pending',
      requestedBy: testUser1._id,
      shareLocation: true,
      closeFriend: false,
    });

    // Create location for testUser2
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await locationModel.create(
      testUser2._id,
      37.7749,
      -122.4194,
      10,
      true,
      expiresAt
    );

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/locations')
    ).expect(200);

    expect(res.body.data).toHaveLength(0);
  });

  // Input: Get locations when friend's location privacy is 'approximate'
  // Expected status code: 200
  // Expected behavior: Returns location with approximation applied
  // Expected output: Location with reduced precision
  test('Apply approximation for friends with approximate privacy', async () => {
    // Update testUser2 privacy to approximate
    await (userModel as any).user.findByIdAndUpdate(testUser2._id, {
      $set: {
        'privacy.location.sharing': 'approximate',
        'privacy.location.precisionMeters': 1000, // 1km precision
      },
    });

    // Create friendship
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

    // Create location for testUser2
    const exactLat = 37.7749;
    const exactLng = -122.4194;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await locationModel.create(testUser2._id, exactLat, exactLng, 10, true, expiresAt);

    const res = await withAuth(testUser1)(
      request(app).get('/api/friends/locations')
    ).expect(200);

    expect(res.body.data).toHaveLength(1);

    // Location should be approximated (not exact)
    const location = res.body.data[0];
    
    // Should be within reasonable range but not exact
    // With 1km precision, should be within ~0.01 degrees but not exactly the same
    const latDiff = Math.abs(location.lat - exactLat);
    const lngDiff = Math.abs(location.lng - exactLng);
    
    // Should have some offset applied (not exact)
    const hasOffset = latDiff > 0.0001 || lngDiff > 0.0001;
    expect(hasOffset).toBe(true);
    
    // But should still be relatively close (within approximation range)
    expect(latDiff).toBeLessThan(0.02); // ~2km
    expect(lngDiff).toBeLessThan(0.02);
    
    // Accuracy should be at least the precision setting
    expect(location.accuracyM).toBeGreaterThanOrEqual(1000);
  });
});
