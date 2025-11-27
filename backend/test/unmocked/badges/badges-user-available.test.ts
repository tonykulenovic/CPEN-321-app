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

// Interface: GET /api/badges/user/available
describe('Unmocked: GET /api/badges/user/available', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;
  let testBadge1: any;
  let testBadge2: any;
  let testBadge3: any;

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

    // Create test badges with unique names to avoid conflicts with default badges
    testBadge1 = await createTestBadge(
      'Test Badge Alpha',
      'Test badge for testing available badges',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      5
    );
    testBadge2 = await createTestBadge(
      'Test Badge Beta',
      'Another test badge for testing',
      BadgeCategory.EXPLORATION,
      BadgeRequirementType.PINS_CREATED,
      1
    );
    testBadge3 = await createTestBadge(
      'Test Badge Gamma',
      'Third test badge for testing',
      BadgeCategory.SOCIAL,
      BadgeRequirementType.FRIENDS_ADDED,
      10
    );
  });

  // Input: authenticated user with some earned badges
  // Expected status code: 200
  // Expected behavior: returns badges user hasn't earned yet from database
  // Expected output: badges array excluding earned badges
  test('Get available badges successfully', async () => {
    // Assign one badge to user
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });

    const res = await withAuth(testUser1)(
      request(app).get('/api/badges/user/available')
    ).expect(200);

    expect(res.body.message).toBe('Available badges fetched successfully');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.badges).toBeDefined();
    expect(Array.isArray(res.body.data.badges)).toBe(true);

    // Should not include the earned badge
    const badgeNames = res.body.data.badges.map((b: any) => b.name);
    expect(badgeNames).not.toContain('Test Badge Alpha');

    // Should include the unearned badges
    expect(badgeNames).toContain('Test Badge Beta');
    expect(badgeNames).toContain('Test Badge Gamma');
  });

  // Input: authenticated user with no earned badges
  // Expected status code: 200
  // Expected behavior: returns all active badges from database
  // Expected output: badges array with all available badges
  test('Get all badges when user has earned none', async () => {
    const res = await withAuth(testUser1)(
      request(app).get('/api/badges/user/available')
    ).expect(200);

    expect(res.body.message).toBe('Available badges fetched successfully');
    expect(res.body.data.badges).toBeDefined();
    expect(Array.isArray(res.body.data.badges)).toBe(true);

    // Should include all our test badges plus default badges
    const badgeNames = res.body.data.badges.map((b: any) => b.name);
    expect(badgeNames).toContain('Test Badge Alpha');
    expect(badgeNames).toContain('Test Badge Beta');
    expect(badgeNames).toContain('Test Badge Gamma');
  });

  // Input: authenticated user who has earned all badges
  // Expected status code: 200
  // Expected behavior: returns empty array from database
  // Expected output: empty badges array
  test('Get empty array when user has earned all badges', async () => {
    // Assign all test badges to user
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });
    await badgeModel.assignBadge(testUser1._id, testBadge2._id, {
      current: 1,
      target: 1,
      percentage: 100,
      lastUpdated: new Date(),
    });
    await badgeModel.assignBadge(testUser1._id, testBadge3._id, {
      current: 10,
      target: 10,
      percentage: 100,
      lastUpdated: new Date(),
    });

    // Assign all default badges
    const allBadges = await (badgeModel as any).badge.find({});
    for (const badge of allBadges) {
      if (
        badge._id.toString() !== testBadge1._id.toString() &&
        badge._id.toString() !== testBadge2._id.toString() &&
        badge._id.toString() !== testBadge3._id.toString()
      ) {
        await badgeModel.assignBadge(testUser1._id, badge._id, {
          current: badge.requirements.target,
          target: badge.requirements.target,
          percentage: 100,
          lastUpdated: new Date(),
        });
      }
    }

    const res = await withAuth(testUser1)(
      request(app).get('/api/badges/user/available')
    ).expect(200);

    expect(res.body.data.badges).toBeDefined();
    expect(Array.isArray(res.body.data.badges)).toBe(true);
    expect(res.body.data.badges.length).toBe(0);
  });

  // Input: request without authentication
  // Expected status code: 401
  // Expected behavior: rejects unauthenticated request
  // Expected output: authentication error message
  test('Reject request without authentication', async () => {
    const res = await request(app)
      .get('/api/badges/user/available')
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
      .get('/api/badges/user/available')
      .set('Authorization', 'Bearer test-token-12345')
      .set('x-dev-user-id', new mongoose.Types.ObjectId().toString())
      .expect(401);

    expect(res.body.error).toBe('User not found');
    expect(res.body.message).toBe('Invalid user ID');
  });

  // Input: authenticated users with different earned badges
  // Expected status code: 200
  // Expected behavior: each user sees different available badges based on their progress
  // Expected output: user1 and user2 have different available badge sets
  test('Different users see different available badges', async () => {
    // User1 has earned badge1
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });

    // User2 has earned badge2
    await badgeModel.assignBadge(testUser2._id, testBadge2._id, {
      current: 1,
      target: 1,
      percentage: 100,
      lastUpdated: new Date(),
    });

    // Check user1's available badges
    const res1 = await withAuth(testUser1)(
      request(app).get('/api/badges/user/available')
    ).expect(200);

    const badgeNames1 = res1.body.data.badges.map((b: any) => b.name);
    expect(badgeNames1).not.toContain('Test Badge Alpha'); // earned
    expect(badgeNames1).toContain('Test Badge Beta'); // available

    // Check user2's available badges
    const res2 = await withAuth(testUser2)(
      request(app).get('/api/badges/user/available')
    ).expect(200);

    const badgeNames2 = res2.body.data.badges.map((b: any) => b.name);
    expect(badgeNames2).toContain('Test Badge Alpha'); // available
    expect(badgeNames2).not.toContain('Test Badge Beta'); // earned
  });

  // Input: authenticated user with inactive badges in database
  // Expected status code: 200
  // Expected behavior: only returns active badges from database
  // Expected output: inactive badges excluded from results
  test('Only return active badges', async () => {
    // Create an inactive badge
    const inactiveBadge = await (badgeModel as any).badge.create({
      name: 'Inactive Badge',
      description: 'This badge is inactive',
      icon: 'inactive',
      category: BadgeCategory.ACTIVITY,
      rarity: BadgeRarity.COMMON,
      requirements: {
        type: BadgeRequirementType.LOGIN_STREAK,
        target: 1,
        timeframe: 'all-time',
      },
      isActive: false,
    });

    const res = await withAuth(testUser1)(
      request(app).get('/api/badges/user/available')
    ).expect(200);

    const badgeNames = res.body.data.badges.map((b: any) => b.name);
    expect(badgeNames).not.toContain('Inactive Badge');
  });
});
