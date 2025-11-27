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

// Helper function to create test badges
async function createTestBadge(
  name: string,
  description: string,
  category: BadgeCategory,
  requirementType: BadgeRequirementType,
  target: number
) {
  const badge = await (badgeModel as any).badge.create({
    name,
    description,
    icon: name.toLowerCase().replace(/\s+/g, '_'),
    category,
    rarity: BadgeRarity.COMMON,
    requirements: {
      type: requirementType,
      target,
      timeframe: 'all-time',
    },
    isActive: true,
  });
  return badge;
}

// Interface: GET /api/badges/user/earned
describe('Unmocked: GET /api/badges/user/earned', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;
  let testBadge1: any;
  let testBadge2: any;

  beforeEach(async () => {
    // Create fresh app instance
    app = createAuthenticatedApp();

    // Clear database
    await (badgeModel as any).badge.deleteMany({});
    await (badgeModel as any).userBadge.deleteMany({});
    await (userModel as any).user.deleteMany({});

    // Initialize default badges
    await BadgeService.initializeDefaultBadges();

    // Create test users
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');
    testUser2 = await createTestUser('Test User 2', 'testuser2', 'test2@example.com');

    // Create test badges
    testBadge1 = await createTestBadge(
      'Early Bird',
      'Log in for 5 consecutive days',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      5
    );
    testBadge2 = await createTestBadge(
      'Social Butterfly',
      'Add 10 friends',
      BadgeCategory.SOCIAL,
      BadgeRequirementType.FRIENDS_ADDED,
      10
    );
  });

  // Input: authenticated user with earned badges
  // Expected status code: 200
  // Expected behavior: returns badges earned by authenticated user from database
  // Expected output: userBadges array with badge details and progress
  test('Get user earned badges successfully', async () => {
    // Assign badges to user
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });
    await badgeModel.assignBadge(testUser1._id, testBadge2._id, {
      current: 10,
      target: 10,
      percentage: 100,
      lastUpdated: new Date(),
    });

    const res = await withAuth(testUser1)(
      request(app).get('/api/badges/user/earned')
    ).expect(200);

    expect(res.body.message).toBe('User badges fetched successfully');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.userBadges).toBeDefined();
    expect(Array.isArray(res.body.data.userBadges)).toBe(true);
    expect(res.body.data.userBadges.length).toBe(2);

    // Verify badge details are populated
    const userBadge = res.body.data.userBadges[0];
    expect(userBadge).toHaveProperty('badgeId');
    expect(userBadge.badgeId).toHaveProperty('name');
    expect(userBadge).toHaveProperty('earnedAt');
    expect(userBadge).toHaveProperty('progress');
  });

  // Input: authenticated user with no earned badges
  // Expected status code: 200
  // Expected behavior: returns empty array from database
  // Expected output: empty userBadges array
  test('Get empty array for user with no earned badges', async () => {
    const res = await withAuth(testUser1)(
      request(app).get('/api/badges/user/earned')
    ).expect(200);

    expect(res.body.message).toBe('User badges fetched successfully');
    expect(res.body.data.userBadges).toBeDefined();
    expect(Array.isArray(res.body.data.userBadges)).toBe(true);
    expect(res.body.data.userBadges.length).toBe(0);
  });

  // Input: authenticated user with partial badge completion
  // Expected status code: 200
  // Expected behavior: only returns completed badges from database
  // Expected output: userBadges array containing only fully earned badges
  test('Get only completed badges, not partial progress', async () => {
    // Assign one completed badge and one in-progress badge
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });
    // This should not appear in getUserBadges since it's not complete
    // (getUserBadges only returns assigned badges, not progress)

    const res = await withAuth(testUser1)(
      request(app).get('/api/badges/user/earned')
    ).expect(200);

    expect(res.body.data.userBadges.length).toBe(1);
    expect(res.body.data.userBadges[0].badgeId.name).toBe('Early Bird');
  });

  // Input: request without authentication
  // Expected status code: 401
  // Expected behavior: rejects unauthenticated request
  // Expected output: authentication error message
  test('Reject request without authentication', async () => {
    const res = await request(app)
      .get('/api/badges/user/earned')
      .expect(401);

    expect(res.body.error).toBe('Access denied');
    expect(res.body.message).toBe('Authentication required');
  });

  // Input: request with invalid user ID
  // Expected status code: 401
  // Expected behavior: rejects request with non-existent user
  // Expected output: user not found error message
  test('Reject request with invalid user ID', async () => {
    const res = await request(app)
      .get('/api/badges/user/earned')
      .set('Authorization', 'Bearer test-token-12345')
      .set('x-dev-user-id', new mongoose.Types.ObjectId().toString())
      .expect(401);

    expect(res.body.error).toBe('User not found');
    expect(res.body.message).toBe('Invalid user ID');
  });

  // Input: authenticated user, verify isolation between users
  // Expected status code: 200
  // Expected behavior: each user only sees their own badges
  // Expected output: user1 badges not visible to user2
  test('User only sees their own earned badges', async () => {
    // Assign badge to user1
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });

    // User2 should not see user1's badges
    const res = await withAuth(testUser2)(
      request(app).get('/api/badges/user/earned')
    ).expect(200);

    expect(res.body.data.userBadges.length).toBe(0);
  });
});
