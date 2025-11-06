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

describe('Unmocked Integration: GET /badges/:id (getBadgeById)', () => {
  beforeEach(async () => {
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});

    testBadge1 = await createTestBadge(
      'Early Bird',
      'Log in for 5 consecutive days',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      5
    );
  });

  // No mocking: badgeModel.findById uses real database
  // Input: authenticated request with valid badge ID
  // Expected status code: 200
  // Expected behavior: returns badge details from database
  // Expected output: badge object
  test('Get badge by ID successfully', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');

    const response = await withAuth(testUser1)(
      request(app).get(`/badges/${testBadge1._id.toString()}`)
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Badge fetched successfully');
    expect(response.body.data.badge.name).toBe('Early Bird');
    expect(response.body.data.badge.description).toBe('Log in for 5 consecutive days');
    expect(response.body.data.badge.category).toBe(BadgeCategory.ACTIVITY);
  });

  // No mocking: badgeModel.findById returns null for non-existent badge
  // Input: authenticated request with non-existent badge ID
  // Expected status code: 404
  // Expected behavior: returns not found error
  // Expected output: error message
  test('Return 404 when badge not found', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');
    const nonExistentId = new mongoose.Types.ObjectId();

    const response = await withAuth(testUser1)(
      request(app).get(`/badges/${nonExistentId.toString()}`)
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Badge not found');
  });
});

describe('Unmocked Integration: POST /badges (createBadge)', () => {
  beforeEach(async () => {
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});
  });

  // No mocking: badgeModel.create uses real database
  // Input: authenticated request with valid badge data
  // Expected status code: 201
  // Expected behavior: creates new badge in database
  // Expected output: created badge object
  test('Create badge successfully', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');

    const newBadgeData = {
      name: 'Campus Explorer',
      description: 'Create 10 pins',
      icon: 'campus_explorer',
      category: BadgeCategory.EXPLORATION,
      rarity: BadgeRarity.UNCOMMON,
      requirements: {
        type: BadgeRequirementType.PINS_CREATED,
        target: 10,
      },
      isActive: true,
    };

    const response = await withAuth(testUser1)(
      request(app).post('/badges').send(newBadgeData)
    );

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Badge created successfully');
    expect(response.body.data.badge.name).toBe('Campus Explorer');
    expect(response.body.data.badge.description).toBe('Create 10 pins');

    // Verify badge was created in database
    const createdBadge = await badgeModel.findById(new mongoose.Types.ObjectId(response.body.data.badge._id));
    expect(createdBadge).toBeTruthy();
    expect(createdBadge!.name).toBe('Campus Explorer');
  });

  // No mocking: validation fails for invalid data
  // Input: authenticated request with invalid badge data (empty name)
  // Expected status code: 400
  // Expected behavior: returns validation error
  // Expected output: error message
  test('Return 400 for invalid badge data', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');

    const invalidBadgeData = {
      name: '', // Empty name should fail validation
      description: 'Invalid badge',
      icon: 'invalid',
      category: BadgeCategory.ACTIVITY,
      rarity: BadgeRarity.COMMON,
      requirements: {
        type: BadgeRequirementType.LOGIN_STREAK,
        target: 5,
      },
    };

    const response = await withAuth(testUser1)(
      request(app).post('/badges').send(invalidBadgeData)
    );

    expect(response.status).toBe(400);
  });
});

describe('Unmocked Integration: PUT /badges/:id (updateBadge)', () => {
  beforeEach(async () => {
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});

    testBadge1 = await createTestBadge(
      'Early Bird',
      'Log in for 5 consecutive days',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      5
    );
  });

  // No mocking: badgeModel.update uses real database
  // Input: authenticated request with badge ID and update data
  // Expected status code: 200
  // Expected behavior: updates badge in database
  // Expected output: updated badge object
  test('Update badge successfully', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');

    const updateData = {
      name: 'Updated Badge Name',
      description: 'Updated description',
    };

    const response = await withAuth(testUser1)(
      request(app).put(`/badges/${testBadge1._id.toString()}`).send(updateData)
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Badge updated successfully');
    expect(response.body.data.badge.name).toBe('Updated Badge Name');
    expect(response.body.data.badge.description).toBe('Updated description');

    // Verify badge was updated in database
    const updatedBadge = await badgeModel.findById(testBadge1._id);
    expect(updatedBadge!.name).toBe('Updated Badge Name');
  });

  // No mocking: badgeModel.update returns null for non-existent badge
  // Input: authenticated request with non-existent badge ID
  // Expected status code: 404
  // Expected behavior: returns not found error
  // Expected output: error message
  test('Return 404 when badge not found for update', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');
    const nonExistentId = new mongoose.Types.ObjectId();

    const updateData = {
      name: 'Updated Badge Name',
    };

    const response = await withAuth(testUser1)(
      request(app).put(`/badges/${nonExistentId.toString()}`).send(updateData)
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Badge not found');
  });
});

describe('Unmocked Integration: DELETE /badges/:id (deleteBadge)', () => {
  beforeEach(async () => {
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});

    testBadge1 = await createTestBadge(
      'Early Bird',
      'Log in for 5 consecutive days',
      BadgeCategory.ACTIVITY,
      BadgeRequirementType.LOGIN_STREAK,
      5
    );
  });

  // No mocking: badgeModel.delete uses real database
  // Input: authenticated request with badge ID
  // Expected status code: 200
  // Expected behavior: deletes badge from database
  // Expected output: success message
  test('Delete badge successfully', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');

    const response = await withAuth(testUser1)(
      request(app).delete(`/badges/${testBadge1._id.toString()}`)
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Badge deleted successfully');

    // Verify badge was deleted from database
    const deletedBadge = await badgeModel.findById(testBadge1._id);
    expect(deletedBadge).toBeNull();
  });
});

describe('Unmocked Integration: GET /badges/category/:category (getBadgesByCategory)', () => {
  beforeEach(async () => {
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});

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

  // No mocking: badgeModel.findByCategory uses real database
  // Input: authenticated request with category param
  // Expected status code: 200
  // Expected behavior: returns badges filtered by category
  // Expected output: badges array
  test('Get badges by category successfully', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');

    const response = await withAuth(testUser1)(
      request(app).get('/badges/category/activity')
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Badges by category fetched successfully');
    expect(response.body.data.badges).toHaveLength(1);
    expect(response.body.data.badges[0].category).toBe(BadgeCategory.ACTIVITY);
    expect(response.body.data.badges[0].name).toBe('Early Bird');
  });
});

describe('Unmocked Integration: POST /badges/initialize (initializeDefaultBadges)', () => {
  beforeEach(async () => {
    await badgeModel['badge'].deleteMany({});
    await badgeModel['userBadge'].deleteMany({});
    await userModel['user'].deleteMany({});
  });

  // No mocking: BadgeService.initializeDefaultBadges uses real database
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: initializes default badges in database
  // Expected output: success message
  test('Initialize default badges successfully', async () => {
    const app = createAuthenticatedApp();
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');

    const response = await withAuth(testUser1)(
      request(app).post('/badges/initialize')
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Default badges initialized successfully');

    // Verify badges were created in database
    const badges = await badgeModel.findAll({});
    expect(badges.length).toBeGreaterThan(0);
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

describe('Unmocked Integration: POST /badges/user/assign (assignBadge)', () => {
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
  });

  // No mocking: BadgeService.assignBadgeToUser uses real database
  // Input: authenticated request with badgeId and optional progress
  // Expected status code: 201
  // Expected behavior: assigns badge to user and returns userBadge
  // Expected output: userBadge object
  test('Assign badge successfully', async () => {
    const app = createAuthenticatedApp();

    const assignData = {
      badgeId: testBadge1._id.toString(),
      progress: {
        current: 5,
        target: 5,
        percentage: 100,
      },
    };

    const response = await withAuth(testUser1)(
      request(app).post('/badges/user/assign').send(assignData)
    );

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Badge assigned successfully');
    expect(response.body.data.userBadge).toBeDefined();
    expect(response.body.data.userBadge.userId.toString()).toBe(testUser1._id.toString());
    expect(response.body.data.userBadge.badgeId.toString()).toBe(testBadge1._id.toString());

    // Verify badge was assigned in database
    const userBadge = await badgeModel.getUserBadge(testUser1._id, testBadge1._id);
    expect(userBadge).toBeTruthy();
  });

  // No mocking: returns error when badge already assigned
  // Input: authenticated request with already assigned badge
  // Expected status code: 400
  // Expected behavior: returns error message
  // Expected output: error response
  test('Return 400 when badge already assigned', async () => {
    const app = createAuthenticatedApp();

    // First assignment via API with progress
    const firstAssignData = {
      badgeId: testBadge1._id.toString(),
      progress: {
        current: 5,
        target: 5,
        percentage: 100,
      },
    };

    const firstResponse = await withAuth(testUser1)(
      request(app).post('/badges/user/assign').send(firstAssignData)
    );
    expect(firstResponse.status).toBe(201); // Ensure first assignment succeeded

    // Second assignment attempt via API
    const assignData = {
      badgeId: testBadge1._id.toString(),
      progress: {
        current: 5,
        target: 5,
        percentage: 100,
      },
    };

    const response = await withAuth(testUser1)(
      request(app).post('/badges/user/assign').send(assignData)
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('User already has this badge');
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

describe('Unmocked Integration: PUT /badges/user/:badgeId/progress (updateBadgeProgress)', () => {
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

    // Assign badge to user first
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 3,
      target: 5,
      percentage: 60,
      lastUpdated: new Date(),
    });
  });

  // No mocking: BadgeService.updateBadgeProgress uses real database
  // Input: authenticated request with badgeId and progress data
  // Expected status code: 200
  // Expected behavior: updates badge progress and returns updated userBadge
  // Expected output: userBadge object
  test('Update badge progress successfully', async () => {
    const app = createAuthenticatedApp();

    const progressData = {
      progress: {
        current: 4,
        target: 5,
        percentage: 80,
      },
    };

    const response = await withAuth(testUser1)(
      request(app).put(`/badges/user/${testBadge1._id.toString()}/progress`).send(progressData)
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Badge progress updated successfully');
    expect(response.body.data.userBadge.progress.current).toBe(4);
    expect(response.body.data.userBadge.progress.percentage).toBe(80);

    // Verify progress was updated in database
    const userBadge = await badgeModel.getUserBadge(testUser1._id, testBadge1._id);
    expect(userBadge!.progress!.current).toBe(4);
  });

  // No mocking: returns 404 when userBadge not found
  // Input: authenticated request with non-existent badgeId
  // Expected status code: 404
  // Expected behavior: returns not found error
  // Expected output: error message
  test('Return 404 when user badge not found', async () => {
    const app = createAuthenticatedApp();
    const nonExistentId = new mongoose.Types.ObjectId();

    const progressData = {
      progress: {
        current: 4,
        target: 5,
        percentage: 80,
      },
    };

    const response = await withAuth(testUser1)(
      request(app).put(`/badges/user/${nonExistentId.toString()}/progress`).send(progressData)
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('User badge not found');
  });
});

describe('Unmocked Integration: DELETE /badges/user/:badgeId (removeUserBadge)', () => {
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

    // Assign badge to user first
    await badgeModel.assignBadge(testUser1._id, testBadge1._id, {
      current: 5,
      target: 5,
      percentage: 100,
      lastUpdated: new Date(),
    });
  });

  // No mocking: badgeModel.removeUserBadge uses real database
  // Input: authenticated request with badgeId
  // Expected status code: 200
  // Expected behavior: removes badge from user
  // Expected output: success message
  test('Remove user badge successfully', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).delete(`/badges/user/${testBadge1._id.toString()}`)
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Badge removed from user successfully');

    // Verify badge was removed from user
    const userBadge = await badgeModel.getUserBadge(testUser1._id, testBadge1._id);
    expect(userBadge).toBeNull();
  });
});

