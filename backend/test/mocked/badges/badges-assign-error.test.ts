import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

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

// Helper to add auth headers
const withAuth = (user: any) => (req: request.Test) => {
  return req
    .set('Authorization', 'Bearer test-token')
    .set('x-dev-user-id', user._id.toString());
};

describe('POST /api/badges/user/event - assignBadge non-duplicate error handling', () => {
  let app: express.Application;
  let testUser1: any;
  let originalCreate: any;

  beforeEach(async () => {
    app = createAuthenticatedApp();

    // Create test user
    testUser1 = await (userModel as any).user.create({
      name: `Test User ${Date.now()}`,
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      googleId: `google_${Date.now()}`,
      password: 'password123',
      stats: {
        pinsCreated: 0,
        friendsCount: 0,
      },
    });

    // Initialize default badges
    await BadgeService.initializeDefaultBadges();
  });

  afterEach(async () => {
    // Restore original method if mocked
    if (originalCreate && (badgeModel as any).userBadge) {
      (badgeModel as any).userBadge.create = originalCreate;
    }
  });

  // Input: Badge assignment that causes non-duplicate MongoDB error
  // Expected status code: 400 (error from BadgeService)
  // Expected behavior: assignBadge catches non-duplicate error and throws generic error
  // Expected output: Error message about failed badge assignment
  test('Handle non-duplicate database error in assignBadge', async () => {
    // Create a new user with qualifying stats for Pin Creator badge
    const qualifyingUser = await (userModel as any).user.create({
      name: `Qualifying User ${Date.now()}`,
      username: `qualuser_${Date.now()}`,
      email: `qual_${Date.now()}@example.com`,
      googleId: `google_qual_${Date.now()}`,
      password: 'password123',
      stats: {
        pinsCreated: 1, // Qualifies for Pin Creator (target: 1)
        friendsCount: 0,
      },
    });

    // Save original create method
    originalCreate = (badgeModel as any).userBadge.create;

    let mockCallCount = 0;

    // Mock userBadge.create to throw a non-duplicate MongoDB error
    (badgeModel as any).userBadge.create = async (data: any) => {
      mockCallCount++;
      // Throw a non-duplicate MongoDB error (e.g., connection timeout)
      const error = new Error('Database connection timeout') as any;
      error.code = 999; // Non-11000 error code
      throw error;
    };

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
    };

    const res = await withAuth(qualifyingUser)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(400);

    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('Failed to assign badge');
    expect(mockCallCount).toBeGreaterThan(0);
  });

  // Input: Badge assignment with validation error from MongoDB
  // Expected status code: 400
  // Expected behavior: Triggers the non-duplicate error path in assignBadge
  // Expected output: Generic error message
  test('Handle MongoDB validation error in assignBadge', async () => {
    // Create a new user with qualifying stats
    const qualifyingUser = await (userModel as any).user.create({
      name: `Qualifying User 2 ${Date.now()}`,
      username: `qualuser2_${Date.now()}`,
      email: `qual2_${Date.now()}@example.com`,
      googleId: `google_qual2_${Date.now()}`,
      password: 'password123',
      stats: {
        pinsCreated: 1,
        friendsCount: 0,
      },
    });

    // Save original create method
    originalCreate = (badgeModel as any).userBadge.create;

    // Mock userBadge.create to throw a validation error
    (badgeModel as any).userBadge.create = async (data: any) => {
      const error = new Error('Validation failed') as any;
      error.name = 'ValidationError';
      // No error.code property, so won't match duplicate check
      throw error;
    };

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
    };

    const res = await withAuth(qualifyingUser)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(400);

    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('Failed to assign badge');
  });

  // Input: Badge assignment with generic JavaScript error (no code property)
  // Expected status code: 400
  // Expected behavior: Falls through to generic error handling
  // Expected output: Failed to assign badge message
  test('Handle generic error without code property in assignBadge', async () => {
    // Create a new user with qualifying stats
    const qualifyingUser = await (userModel as any).user.create({
      name: `Qualifying User 3 ${Date.now()}`,
      username: `qualuser3_${Date.now()}`,
      email: `qual3_${Date.now()}@example.com`,
      googleId: `google_qual3_${Date.now()}`,
      password: 'password123',
      stats: {
        pinsCreated: 1,
        friendsCount: 0,
      },
    });

    // Save original create method
    originalCreate = (badgeModel as any).userBadge.create;

    // Mock userBadge.create to throw a plain Error
    (badgeModel as any).userBadge.create = async (data: any) => {
      throw new Error('Something went wrong');
    };

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
    };

    const res = await withAuth(qualifyingUser)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(400);

    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('Failed to assign badge');
  });

  // Input: Badge assignment with non-Error exception (string)
  // Expected status code: 400
  // Expected behavior: Handles non-Error thrown values
  // Expected output: Generic error message
  test('Handle non-Error exception in assignBadge', async () => {
    // Create a new user with qualifying stats
    const qualifyingUser = await (userModel as any).user.create({
      name: `Qualifying User 4 ${Date.now()}`,
      username: `qualuser4_${Date.now()}`,
      email: `qual4_${Date.now()}@example.com`,
      googleId: `google_qual4_${Date.now()}`,
      password: 'password123',
      stats: {
        pinsCreated: 1,
        friendsCount: 0,
      },
    });

    // Save original create method
    originalCreate = (badgeModel as any).userBadge.create;

    // Mock userBadge.create to throw a non-Error object
    (badgeModel as any).userBadge.create = async (data: any) => {
      throw 'String error thrown'; // Non-Error exception
    };

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
    };

    const res = await withAuth(qualifyingUser)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(400);

    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('Failed to assign badge');
  });
});
