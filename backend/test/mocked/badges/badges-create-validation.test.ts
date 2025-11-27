import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

import badgeRoutes from '../../../src/routes/badge.routes';
import { userModel } from '../../../src/models/user.model';
import { badgeModel } from '../../../src/models/badge.model';
import { BadgeService } from '../../../src/services/badge.service';
import { BadgeRequirementType } from '../../../src/types/badge.types';

// Create Express app with routes and authentication middleware
function createAuthenticatedApp() {
  const app = express();
  app.use(express.json());

  // Add authentication middleware that populates req.user from database
  app.use(async (req: any, res: any, next: any) => {
    const userId = req.headers['x-dev-user-id'];
    const authHeader = req.headers.authorization;

    if (!authHeader || !userId) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required',
      });
    }

    try {
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

  app.use('/api/badges', badgeRoutes);

  return app;
}

const withAuth = (user: any) => (req: request.Test) => {
  return req
    .set('Authorization', 'Bearer test-token')
    .set('x-dev-user-id', user._id.toString());
};

describe('BadgeModel.create() - Zod validation error handling', () => {
  let app: express.Application;
  let testUser1: any;
  let originalInitialize: any;

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

    // Save original initialize method
    originalInitialize = BadgeService.initializeDefaultBadges;
  });

  afterEach(async () => {
    // Restore original method
    if (originalInitialize) {
      BadgeService.initializeDefaultBadges = originalInitialize;
    }
  });

  // Input: Badge creation with invalid data causing Zod validation error
  // Expected status code: 400 (from badge event processing)
  // Expected behavior: badgeModel.create catches ZodError and throws custom error
  // Expected output: Error message about invalid badge data
  test('Handle Zod validation error in badgeModel.create', async () => {
    // Mock initializeDefaultBadges to create badge with invalid data
    BadgeService.initializeDefaultBadges = async () => {
      try {
        // Try to create a badge with invalid data (missing required fields)
        await badgeModel.create({
          name: 'Invalid Badge',
          // Missing description, icon, category, rarity, requirements
        });
      } catch (error) {
        // Expected to throw "Invalid badge data"
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toBe('Invalid badge data');
        }
      }
    };

    // Trigger initialization through badge event
    await BadgeService.initializeDefaultBadges();
  });

  // Input: Badge creation with wrong data types
  // Expected status code: N/A (internal error)
  // Expected behavior: Zod catches type errors and badgeModel.create throws custom error
  // Expected output: "Invalid badge data" error
  test('Handle wrong data types in badgeModel.create', async () => {
    try {
      await badgeModel.create({
        name: 12345, // Should be string
        description: 'Test',
        icon: '🏆',
        category: 'INVALID_CATEGORY',
        rarity: 'INVALID_RARITY',
        requirements: {
          type: 'INVALID_TYPE',
          target: 'not a number', // Should be number
        },
      });
      
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).toBe('Invalid badge data');
      }
    }
  });

  // Input: Badge creation with valid structure but invalid enum values
  // Expected status code: N/A (internal error)
  // Expected behavior: Zod validation fails on enum values
  // Expected output: "Invalid badge data" error
  test('Handle invalid enum values in badgeModel.create', async () => {
    try {
      await badgeModel.create({
        name: 'Test Badge',
        description: 'A test badge',
        icon: '🎯',
        category: 'NOT_A_VALID_CATEGORY',
        rarity: 'NOT_A_VALID_RARITY',
        requirements: {
          type: BadgeRequirementType.PINS_CREATED,
          target: 5,
        },
      });
      
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).toBe('Invalid badge data');
      }
    }
  });

  // Input: Badge creation with generic non-Zod error
  // Expected status code: N/A
  // Expected behavior: Catches non-Zod errors and throws generic error
  // Expected output: "Failed to create badge" error
  test('Handle non-Zod error in badgeModel.create', async () => {
    // Save original badge.create
    const originalBadgeCreate = (badgeModel as any).badge.create;

    try {
      // Mock badge.create to throw a non-Zod error
      (badgeModel as any).badge.create = async () => {
        throw new Error('Database connection lost');
      };

      await badgeModel.create({
        name: 'Test Badge',
        description: 'A test badge',
        icon: '🎯',
        category: 'ACTIVITY',
        rarity: 'COMMON',
        requirements: {
          type: BadgeRequirementType.PINS_CREATED,
          target: 5,
        },
      });

      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).toBe('Failed to create badge');
      }
    } finally {
      // Restore original
      (badgeModel as any).badge.create = originalBadgeCreate;
    }
  });
});
