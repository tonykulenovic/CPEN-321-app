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

// Interface: GET /api/badges/user/progress
describe('Unmocked: GET /api/badges/user/progress', () => {
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

    // Create test badges with unique names
    testBadge1 = await createTestBadge(
      'Test Progress Badge 1',
      'Test badge for progress tracking',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      5
    );
    testBadge2 = await createTestBadge(
      'Test Progress Badge 2',
      'Another test badge for progress',
      BadgeCategory.EXPLORATION,
      BadgeRequirementType.PINS_CREATED,
      10
    );
    testBadge3 = await createTestBadge(
      'Test Progress Badge 3',
      'Third test badge for progress',
      BadgeCategory.SOCIAL,
      BadgeRequirementType.FRIENDS_ADDED,
      20
    );
  });

  // Input: authenticated user with some earned badges
  // Expected status code: 200
  // Expected behavior: returns earned badges, available badges, and progress for each from database
  // Expected output: progress object with earned, available, and progress arrays
  test('Get badge progress successfully with earned and available badges', async () => {
    // Assign one badge to user
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });

    const res = await withAuth(testUser1)(
      request(app).get('/api/badges/user/progress')
    ).expect(200);

    expect(res.body.message).toBe('Badge progress fetched successfully');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.progress).toBeDefined();
    
    // Check structure
    expect(res.body.data.progress.earned).toBeDefined();
    expect(res.body.data.progress.available).toBeDefined();
    expect(res.body.data.progress.progress).toBeDefined();
    
    // Check arrays
    expect(Array.isArray(res.body.data.progress.earned)).toBe(true);
    expect(Array.isArray(res.body.data.progress.available)).toBe(true);
    expect(Array.isArray(res.body.data.progress.progress)).toBe(true);
    
    // User should have 1 earned badge
    expect(res.body.data.progress.earned.length).toBe(1);
    expect(res.body.data.progress.earned[0].badgeId.name).toBe('Test Progress Badge 1');
    
    // Available badges should not include the earned badge
    const availableNames = res.body.data.progress.available.map((b: any) => b.name);
    expect(availableNames).not.toContain('Test Progress Badge 1');
    
    // Progress array should have entries for available badges
    expect(res.body.data.progress.progress.length).toBeGreaterThan(0);
    const progressEntry = res.body.data.progress.progress[0];
    expect(progressEntry).toHaveProperty('badge');
    expect(progressEntry).toHaveProperty('progress');
  });

  // Input: authenticated user with no earned badges
  // Expected status code: 200
  // Expected behavior: returns empty earned array, all badges as available, with progress data
  // Expected output: empty earned array, populated available and progress arrays
  test('Get badge progress for user with no earned badges', async () => {
    const res = await withAuth(testUser1)(
      request(app).get('/api/badges/user/progress')
    ).expect(200);

    expect(res.body.message).toBe('Badge progress fetched successfully');
    expect(res.body.data.progress.earned).toHaveLength(0);
    expect(res.body.data.progress.available.length).toBeGreaterThan(0);
    expect(res.body.data.progress.progress.length).toBeGreaterThan(0);
    
    // All our test badges should be available
    const availableNames = res.body.data.progress.available.map((b: any) => b.name);
    expect(availableNames).toContain('Test Progress Badge 1');
    expect(availableNames).toContain('Test Progress Badge 2');
    expect(availableNames).toContain('Test Progress Badge 3');
  });

  // Input: authenticated user who has earned all badges
  // Expected status code: 200
  // Expected behavior: returns all earned badges, empty available array, empty progress array
  // Expected output: populated earned array, empty available and progress arrays
  test('Get badge progress for user who earned all badges', async () => {
    // Assign all test badges
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
    await badgeModel.assignBadge(testUser1._id, testBadge3._id, {
      current: 20,
      target: 20,
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
      request(app).get('/api/badges/user/progress')
    ).expect(200);

    expect(res.body.data.progress.earned.length).toBeGreaterThan(0);
    expect(res.body.data.progress.available.length).toBe(0);
    expect(res.body.data.progress.progress.length).toBe(0);
  });

  // Input: request without authentication
  // Expected status code: 401
  // Expected behavior: rejects unauthenticated request
  // Expected output: authentication error message
  test('Reject request without authentication', async () => {
    const res = await request(app)
      .get('/api/badges/user/progress')
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
      .get('/api/badges/user/progress')
      .set('Authorization', 'Bearer test-token-12345')
      .set('x-dev-user-id', new mongoose.Types.ObjectId().toString())
      .expect(401);

    expect(res.body.error).toBe('User not found');
    expect(res.body.message).toBe('Invalid user ID');
  });

  // Input: authenticated users with different progress
  // Expected status code: 200
  // Expected behavior: each user sees their own progress independently
  // Expected output: user1 and user2 have different earned/available badge sets
  test('Different users see different badge progress', async () => {
    // User1 has earned badge1
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });

    // User2 has earned badge2
    await badgeModel.assignBadge(testUser2._id, testBadge2._id, {
      current: 10,
      target: 10,
      percentage: 100,
      lastUpdated: new Date(),
    });

    // Check user1's progress
    const res1 = await withAuth(testUser1)(
      request(app).get('/api/badges/user/progress')
    ).expect(200);

    expect(res1.body.data.progress.earned.length).toBe(1);
    expect(res1.body.data.progress.earned[0].badgeId.name).toBe('Test Progress Badge 1');

    const available1 = res1.body.data.progress.available.map((b: any) => b.name);
    expect(available1).not.toContain('Test Progress Badge 1');
    expect(available1).toContain('Test Progress Badge 2');

    // Check user2's progress
    const res2 = await withAuth(testUser2)(
      request(app).get('/api/badges/user/progress')
    ).expect(200);

    expect(res2.body.data.progress.earned.length).toBe(1);
    expect(res2.body.data.progress.earned[0].badgeId.name).toBe('Test Progress Badge 2');

    const available2 = res2.body.data.progress.available.map((b: any) => b.name);
    expect(available2).toContain('Test Progress Badge 1');
    expect(available2).not.toContain('Test Progress Badge 2');
  });

  // Input: authenticated user with partial progress on available badges
  // Expected status code: 200
  // Expected behavior: returns progress data with current/target/percentage for available badges
  // Expected output: progress array contains progress objects with numeric values
  test('Progress array contains progress data for available badges', async () => {
    const res = await withAuth(testUser1)(
      request(app).get('/api/badges/user/progress')
    ).expect(200);

    const progressArray = res.body.data.progress.progress;
    expect(progressArray.length).toBeGreaterThan(0);

    // Each progress entry should have badge and progress data
    progressArray.forEach((entry: any) => {
      expect(entry).toHaveProperty('badge');
      expect(entry).toHaveProperty('progress');
      expect(entry.badge).toHaveProperty('name');
      expect(entry.badge).toHaveProperty('requirements');
      
      // Progress can be null or an object with current/target/percentage
      if (entry.progress !== null) {
        expect(entry.progress).toHaveProperty('current');
        expect(entry.progress).toHaveProperty('target');
        expect(entry.progress).toHaveProperty('percentage');
        expect(typeof entry.progress.current).toBe('number');
        expect(typeof entry.progress.target).toBe('number');
        expect(typeof entry.progress.percentage).toBe('number');
      }
    });
  });
});
