import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, beforeEach, expect } from '@jest/globals';

import badgeRoutes from '../../src/routes/badge.routes';
import { userModel } from '../../src/models/user.model';
import { badgeModel } from '../../src/models/badge.model';
import { BadgeService } from '../../src/services/badge.service';
import { BadgeCategory, BadgeRequirementType, BadgeRarity } from '../../src/types/badge.types';
import { SignUpRequest } from '../../src/types/user.types';

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
      const user = await userModel['user'].findById(new mongoose.Types.ObjectId(userId));
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
  app.use('/badges', badgeRoutes);

  return app;
}

// Helper function to add authentication to requests
const withAuth = (user: any) => (requestBuilder: any) => {
  return requestBuilder
    .set('Authorization', 'Bearer test-token-12345')
    .set('x-dev-user-id', user._id.toString());
};

// Test data
let testUser1: any;
let testUser2: any;
let testBadge1: any;
let testBadge2: any;

// Helper function to create test users
async function createTestUser(
  name: string,
  username: string,
  email: string
) {
  const userData: SignUpRequest = {
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
  const badge = await badgeModel.create({
    name,
    description,
    icon: name.toLowerCase().replace(/\s+/g, '_'),
    category,
    rarity: BadgeRarity.COMMON,
    requirements: {
      type: requirementType,
      target,
    },
    isActive: true,
  });

  return badge;
}

describe('Unmocked Integration: GET /badges (getAllBadges)', () => {
  beforeEach(async () => {
    // Clear collections before each test
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});

    // Create test badges
    testBadge1 = await createTestBadge(
      'Early Bird',
      'Log in for 5 consecutive days',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      5
    );

    testBadge2 = await createTestBadge(
      'Pin Creator',
      'Create your first pin',
      BadgeCategory.EXPLORATION,
      BadgeRequirementType.PINS_CREATED,
      1
    );
  });

  // No mocking: badgeModel.findAll uses real database
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns all badges from database
  // Expected output: badges array
  test('Get all badges successfully', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');

    const response = await withAuth(testUser1)(
      request(app).get('/badges')
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Badges fetched successfully');
    expect(response.body.data.badges).toHaveLength(2);
    expect(response.body.data.badges.some((b: any) => b.name === 'Early Bird')).toBe(true);
    expect(response.body.data.badges.some((b: any) => b.name === 'Pin Creator')).toBe(true);
  });

  // No mocking: badgeModel.findAll filters by category
  // Input: authenticated request with category query param
  // Expected status code: 200
  // Expected behavior: returns badges filtered by category
  // Expected output: filtered badges array
  test('Get badges filtered by category', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');

    const response = await withAuth(testUser1)(
      request(app).get('/badges?category=activity')
    );

    expect(response.status).toBe(200);
    expect(response.body.data.badges).toHaveLength(1);
    expect(response.body.data.badges[0].category).toBe(BadgeCategory.ACTIVITY);
    expect(response.body.data.badges[0].name).toBe('Early Bird');
  });

  // No mocking: badgeModel.findAll filters by isActive
  // Input: authenticated request with isActive query param
  // Expected status code: 200
  // Expected behavior: returns badges filtered by active status
  // Expected output: filtered badges array
  test('Get badges filtered by isActive status', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');

    // Create an inactive badge
    await createTestBadge(
      'Inactive Badge',
      'This badge is inactive',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      10
    );
    await badgeModel['badge'].updateOne(
      { name: 'Inactive Badge' },
      { isActive: false }
    );

    const response = await withAuth(testUser1)(
      request(app).get('/badges?isActive=true')
    );

    expect(response.status).toBe(200);
    expect(response.body.data.badges.every((b: any) => b.isActive === true)).toBe(true);
    expect(response.body.data.badges.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Unmocked Integration: GET /badges/user/earned (getUserBadges)', () => {
  beforeEach(async () => {
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});

    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');
    testBadge1 = await createTestBadge(
      'Early Bird',
      'Log in for 5 consecutive days',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      5
    );

    // Assign badge to user
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });
  });

  // No mocking: badgeModel.getUserBadges uses real database
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns badges earned by authenticated user
  // Expected output: userBadges array
  test('Get user badges successfully', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).get('/badges/user/earned')
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User badges fetched successfully');
    expect(response.body.data.userBadges).toHaveLength(1);
    expect(response.body.data.userBadges[0].badgeId.name).toBe('Early Bird');
    expect(response.body.data.userBadges[0].userId.toString()).toBe(testUser1._id.toString());
  });

  // No mocking: returns empty array when user has no badges
  // Input: authenticated request for user with no badges
  // Expected status code: 200
  // Expected behavior: returns empty array
  // Expected output: empty userBadges array
  test('Get empty badges for user with no badges', async () => {
    const app = createAuthenticatedApp();
    testUser2 = await createTestUser('Test User 2', 'testuser2', 'test2@example.com');

    const response = await withAuth(testUser2)(
      request(app).get('/badges/user/earned')
    );

    expect(response.status).toBe(200);
    expect(response.body.data.userBadges).toHaveLength(0);
  });
});

describe('Unmocked Integration: GET /badges/user/available (getAvailableBadges)', () => {
  beforeEach(async () => {
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});

    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');
    testBadge1 = await createTestBadge(
      'Early Bird',
      'Log in for 5 consecutive days',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      5
    );

    testBadge2 = await createTestBadge(
      'Pin Creator',
      'Create your first pin',
      BadgeCategory.EXPLORATION,
      BadgeRequirementType.PINS_CREATED,
      1
    );

    // Assign only one badge to user
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });
  });

  // No mocking: badgeModel.getAvailableBadges uses real database
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns badges not yet earned by user
  // Expected output: badges array
  test('Get available badges successfully', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).get('/badges/user/available')
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Available badges fetched successfully');
    expect(response.body.data.badges).toHaveLength(1);
    expect(response.body.data.badges[0].name).toBe('Pin Creator');
    expect(response.body.data.badges[0]._id.toString()).not.toBe(testBadge1._id.toString());
  });
});

describe('Unmocked Integration: GET /badges/user/progress (getBadgeProgress)', () => {
  beforeEach(async () => {
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});

    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');
    testBadge1 = await createTestBadge(
      'Early Bird',
      'Log in for 5 consecutive days',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      5
    );

    testBadge2 = await createTestBadge(
      'Pin Creator',
      'Create your first pin',
      BadgeCategory.EXPLORATION,
      BadgeRequirementType.PINS_CREATED,
      1
    );

    // Assign one badge to user
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });
  });

  // No mocking: BadgeService.getUserBadgeProgress uses real database
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns earned badges, available badges, and progress for each
  // Expected output: progress object with earned, available, and progress arrays
  test('Get badge progress successfully', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).get('/badges/user/progress')
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Badge progress fetched successfully');
    expect(response.body.data.progress).toBeDefined();
    expect(response.body.data.progress.earned).toHaveLength(1);
    expect(response.body.data.progress.available).toHaveLength(1);
    expect(response.body.data.progress.progress).toBeDefined();
  });
});

describe('Unmocked Integration: GET /badges/user/stats (getBadgeStats)', () => {
  beforeEach(async () => {
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});

    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');
    testBadge1 = await createTestBadge(
      'Early Bird',
      'Log in for 5 consecutive days',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      5
    );

    // Assign badge to user
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });
  });

  // No mocking: BadgeService.getUserBadgeStats uses real database
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns badge statistics for user
  // Expected output: stats object with totalBadges, earnedBadges, categoryBreakdown, recentBadges
  test('Get badge stats successfully', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).get('/badges/user/stats')
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Badge statistics fetched successfully');
    expect(response.body.data.totalBadges).toBeGreaterThanOrEqual(1);
    expect(response.body.data.earnedBadges).toBe(1);
    expect(response.body.data.categoryBreakdown).toBeDefined();
    expect(response.body.data.recentBadges).toBeDefined();
  });
});

describe('Unmocked Integration: POST /badges/user/event (processBadgeEvent)', () => {
  beforeEach(async () => {
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});

    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');

    // Initialize default badges so event processing can work
    await BadgeService.initializeDefaultBadges();
  });

  // No mocking: BadgeService.processBadgeEvent uses real database
  // Input: authenticated request with eventType, value, and optional metadata
  // Expected status code: 200
  // Expected behavior: processes badge event and returns earned badges
  // Expected output: userBadges array
  test('Process badge event successfully', async () => {
    const app = createAuthenticatedApp();

    // Update user stats to qualify for badge
    await userModel['user'].updateOne(
      { _id: testUser1._id },
      { $set: { 'stats.pinsCreated': 1 } }
    );

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
      metadata: {
        pinId: '507f1f77bcf86cd799439017',
      },
    };

    const response = await withAuth(testUser1)(
      request(app).post('/badges/user/event').send(eventData)
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Badge event processed successfully');
    expect(response.body.data.userBadges).toBeDefined();
  });
});

