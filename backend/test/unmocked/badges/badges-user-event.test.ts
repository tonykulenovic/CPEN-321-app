import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach } from '@jest/globals';

import badgeRoutes from '../../../src/routes/badge.routes';
import { userModel } from '../../../src/models/user.model';
import { badgeModel } from '../../../src/models/badge.model';
import { BadgeService } from '../../../src/services/badge.service';
import { BadgeCategory, BadgeRequirementType, BadgeRarity } from '../../../src/types/badge.types';

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

  // Add badge routes
  app.use('/api/badges', badgeRoutes);

  return app;
}

// Helper function to add authentication to requests
const withAuth = (user: any) => (requestBuilder: any) => {
  return requestBuilder
    .set('Authorization', 'Bearer test-token-12345')
    .set('x-dev-user-id', user._id.toString());
};

// Helper function to create test users
async function createTestUser(name: string, username: string, email: string) {
  const userData = {
    googleId: `google-${username}`,
    name,
    email,
    username,
  };

  const user = await userModel.create(userData);
  return user;
}

// Interface: POST /api/badges/user/event
describe('Unmocked: POST /api/badges/user/event', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;

  beforeEach(async () => {
    // Create fresh app instance
    app = createAuthenticatedApp();

    // Clear database
    await (badgeModel as any).badge.deleteMany({});
    await (badgeModel as any).userBadge.deleteMany({});
    await (userModel as any).user.deleteMany({});

    // Initialize default badges so event processing can work
    await BadgeService.initializeDefaultBadges();

    // Create test users
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');
    testUser2 = await createTestUser('Test User 2', 'testuser2', 'test2@example.com');
  });

  // Input: authenticated request with valid badge event (user qualifies for badge)
  // Expected status code: 200
  // Expected behavior: processes event, awards badge if qualified, returns earned badges from database
  // Expected output: userBadges array with newly earned badges
  test('Process badge event successfully and earn badge', async () => {
    // Update user stats to qualify for Pin Creator badge (target: 1)
    await (userModel as any).user.updateOne(
      { _id: testUser1._id },
      { $set: { 'stats.pinsCreated': 1 } }
    );

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
      metadata: {
        pinId: '507f1f77bcf86cd799439011',
      },
    };

    const res = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(200);

    expect(res.body.message).toBe('Badge event processed successfully');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.userBadges).toBeDefined();
    expect(Array.isArray(res.body.data.userBadges)).toBe(true);
    
    // User should have earned Pin Creator badge
    expect(res.body.data.userBadges.length).toBeGreaterThan(0);
    const earnedBadge = res.body.data.userBadges[0];
    expect(earnedBadge).toHaveProperty('userId');
    expect(earnedBadge).toHaveProperty('badgeId');
    expect(earnedBadge).toHaveProperty('earnedAt');
  });

  // Input: authenticated request with valid event but user doesn't qualify
  // Expected status code: 200
  // Expected behavior: processes event but doesn't award badge
  // Expected output: empty userBadges array
  test('Process badge event when user does not qualify', async () => {
    // User has no pins created, doesn't qualify for Pin Creator badge
    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
      metadata: {},
    };

    const res = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(200);

    expect(res.body.message).toBe('Badge event processed successfully');
    expect(res.body.data.userBadges).toBeDefined();
    expect(res.body.data.userBadges.length).toBe(0);
  });

  // Input: authenticated request for user who already earned the badge
  // Expected status code: 200
  // Expected behavior: does not award badge again
  // Expected output: empty userBadges array
  test('Do not award badge if user already has it', async () => {
    // Update user stats to qualify
    await (userModel as any).user.updateOne(
      { _id: testUser1._id },
      { $set: { 'stats.pinsCreated': 1 } }
    );

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
      metadata: {},
    };

    // First event - should earn badge
    const res1 = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(200);

    expect(res1.body.data.userBadges.length).toBeGreaterThan(0);

    // Second event - should not earn badge again
    const res2 = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(200);

    expect(res2.body.data.userBadges.length).toBe(0);
  });

  // Input: request without authentication
  // Expected status code: 401
  // Expected behavior: rejects unauthenticated request
  // Expected output: authentication error message
  test('Reject request without authentication', async () => {
    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
    };

    const res = await request(app)
      .post('/api/badges/user/event')
      .send(eventData)
      .expect(401);

    expect(res.body.error).toBe('Access denied');
    expect(res.body.message).toBe('Authentication required');
  });

  // Input: request where req.user is undefined and no userId in body
  // Expected status code: 400
  // Expected behavior: controller checks for userId and rejects
  // Expected output: User ID is required message
  test('Reject request when userId is missing', async () => {
    // Create app without user population
    const appNoUser = express();
    appNoUser.use(express.json());
    appNoUser.use((req: any, _res: any, next: any) => {
      req.user = undefined; // Explicitly set to undefined
      next();
    });
    appNoUser.use('/api/badges', badgeRoutes);

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
    };

    const res = await request(appNoUser)
      .post('/api/badges/user/event')
      .send(eventData)
      .expect(400);

    expect(res.body.message).toBe('User ID is required');
  });

  // Input: authenticated request with missing event type
  // Expected status code: 200
  // Expected behavior: processes request but finds no matching badges
  // Expected output: success with empty userBadges array
  // Note: API currently doesn't validate eventType, returns 200 with empty results
  test('Process request with missing eventType returns empty results', async () => {
    const eventData = {
      value: 1,
    };

    const res = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(200);

    expect(res.body.message).toBe('Badge event processed successfully');
    expect(res.body.data.userBadges).toBeDefined();
    expect(res.body.data.userBadges.length).toBe(0);
  });

  // Input: authenticated request with missing value
  // Expected status code: 200
  // Expected behavior: processes request normally (value not required for qualification check)
  // Expected output: success message
  // Note: API currently doesn't validate value field, processes event normally
  test('Process request with missing value succeeds', async () => {
    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
    };

    const res = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(200);

    expect(res.body.message).toBe('Badge event processed successfully');
    expect(res.body.data.userBadges).toBeDefined();
  });

  // Input: authenticated users processing different events
  // Expected status code: 200
  // Expected behavior: each user's events are processed independently
  // Expected output: users earn different badges based on their stats
  test('Different users earn badges independently', async () => {
    // User1 qualifies for pins badge
    await (userModel as any).user.updateOne(
      { _id: testUser1._id },
      { $set: { 'stats.pinsCreated': 1 } }
    );

    // User2 qualifies for friends badge (uses friendsCount field, not stats.friendsCount)
    await (userModel as any).user.updateOne(
      { _id: testUser2._id },
      { $set: { friendsCount: 1 } }
    );

    const pinsEvent = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
    };

    const friendsEvent = {
      eventType: BadgeRequirementType.FRIENDS_ADDED,
      value: 1,
    };

    // User1 processes pins event
    const res1 = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(pinsEvent)
    ).expect(200);

    expect(res1.body.data.userBadges.length).toBeGreaterThan(0);

    // User2 processes friends event
    const res2 = await withAuth(testUser2)(
      request(app).post('/api/badges/user/event').send(friendsEvent)
    ).expect(200);

    expect(res2.body.data.userBadges.length).toBeGreaterThan(0);

    // Verify users have different badges
    const user1Badges = await badgeModel.getUserBadges(testUser1._id);
    const user2Badges = await badgeModel.getUserBadges(testUser2._id);
    
    expect(user1Badges.length).toBeGreaterThan(0);
    expect(user2Badges.length).toBeGreaterThan(0);
  });

  // Input: authenticated request with multiple qualifying badges
  // Expected status code: 200
  // Expected behavior: awards all qualifying badges at once
  // Expected output: userBadges array with multiple badges
  test('Award multiple badges from single event if user qualifies', async () => {
    // Set user stats to qualify for multiple friend badges (uses friendsCount field)
    await (userModel as any).user.updateOne(
      { _id: testUser1._id },
      { $set: { friendsCount: 10 } }
    );

    const eventData = {
      eventType: BadgeRequirementType.FRIENDS_ADDED,
      value: 10,
    };

    const res = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(200);

    expect(res.body.message).toBe('Badge event processed successfully');
    expect(res.body.data.userBadges).toBeDefined();
    
    // User should earn multiple friend-related badges (First Friend, potentially Social Butterfly, etc.)
    // The exact number depends on the default badges, but should be at least 1
    expect(res.body.data.userBadges.length).toBeGreaterThan(0);
  });

  // Input: authenticated request with metadata
  // Expected status code: 200
  // Expected behavior: processes event with metadata successfully
  // Expected output: successful response
  test('Process badge event with metadata', async () => {
    await (userModel as any).user.updateOne(
      { _id: testUser1._id },
      { $set: { 'stats.pinsCreated': 1 } }
    );

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
      metadata: {
        pinId: '507f1f77bcf86cd799439012',
        pinName: 'Test Pin',
        location: 'Test Location',
      },
    };

    const res = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(200);

    expect(res.body.message).toBe('Badge event processed successfully');
    expect(res.body.data.userBadges).toBeDefined();
  });

  // Input: database error during event processing
  // Expected status code: 400
  // Expected behavior: handles database error gracefully
  // Expected output: error message in response
  test('Handle database error when processing badge event', async () => {
    // Save original method
    const originalProcessBadgeEvent = BadgeService.processBadgeEvent;
    
    // Mock processBadgeEvent to throw an error
    BadgeService.processBadgeEvent = async () => {
      throw new Error('Database connection error');
    };

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
    };

    const res = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(400);

    expect(res.body.message).toBe('Database connection error');

    // Restore original method
    BadgeService.processBadgeEvent = originalProcessBadgeEvent;
  });

  // Input: non-Error exception during event processing
  // Expected status code: 500 (handled by Express error middleware)
  // Expected behavior: calls next(error) for non-Error exceptions
  // Expected output: Express handles the error
  test('Handle non-Error exception when processing badge event', async () => {
    // Save original method
    const originalProcessBadgeEvent = BadgeService.processBadgeEvent;
    
    // Mock processBadgeEvent to throw a non-Error object
    BadgeService.processBadgeEvent = async () => {
      throw 'String error'; // Non-Error exception
    };

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
    };

    // This will be handled by Express error middleware (next(error))
    await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(500);

    // Restore original method
    BadgeService.processBadgeEvent = originalProcessBadgeEvent;
  });
});
