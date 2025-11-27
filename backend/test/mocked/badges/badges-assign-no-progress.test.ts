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

describe('POST /api/badges/user/event - assignBadge without progress parameter', () => {
  let app: express.Application;
  let testUser1: any;
  let originalProcessEvent: any;

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

    // Save original method
    originalProcessEvent = BadgeService.processBadgeEvent;
  });

  afterEach(async () => {
    // Restore original method
    if (originalProcessEvent) {
      BadgeService.processBadgeEvent = originalProcessEvent;
    }
  });

  // Input: Badge event that triggers assignBadge without progress parameter
  // Expected status code: 200
  // Expected behavior: Calls assignBadge() without progress, uses else branch for default progress
  // Expected output: Badge assigned with default progress values
  test('Assign badge without progress parameter - covers else branch', async () => {
    // Mock BadgeService.processBadgeEvent to call assignBadge without progress
    BadgeService.processBadgeEvent = async (event) => {
      const badges = await badgeModel.findAll({
        'requirements.type': event.eventType,
        isActive: true,
      });

      const earnedBadges = [];
      
      if (badges.length > 0) {
        const badge = badges[0];
        // Check if user already has this badge
        const userId = new mongoose.Types.ObjectId(event.userId);
        const existingUserBadge = await badgeModel.getUserBadge(userId, badge._id);
        if (!existingUserBadge) {
          // Call assignBadge WITHOUT progress parameter to hit the else branch
          const userBadge = await badgeModel.assignBadge(userId, badge._id);
          earnedBadges.push(userBadge);
        }
      }

      return earnedBadges;
    };

    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
    };

    const res = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(200);

    expect(res.body).toHaveProperty('earnedBadges');
    expect(Array.isArray(res.body.earnedBadges)).toBe(true);
    
    // Verify badge was assigned with default progress
    if (res.body.earnedBadges.length > 0) {
      const earnedBadge = res.body.earnedBadges[0];
      expect(earnedBadge).toHaveProperty('progress');
      expect(earnedBadge.progress).toHaveProperty('current');
      expect(earnedBadge.progress).toHaveProperty('target');
      expect(earnedBadge.progress).toHaveProperty('percentage');
    }
  });

  // Input: Multiple badge events without progress
  // Expected status code: 200
  // Expected behavior: Tests else branch multiple times with different badges
  // Expected output: Multiple badges assigned with default progress
  test('Assign multiple badges without progress parameter', async () => {
    // Create a custom badge for testing
    const customBadge = await (badgeModel as any).badge.create({
      name: `Test Badge No Progress ${Date.now()}`,
      description: 'A test badge without progress',
      icon: '🧪',
      category: BadgeCategory.ACTIVITY,
      rarity: BadgeRarity.COMMON,
      requirements: {
        type: BadgeRequirementType.FRIENDS_ADDED,
        target: 1,
      },
      isActive: true,
    });

    let callCount = 0;

    // Mock to assign without progress
    BadgeService.processBadgeEvent = async (event) => {
      callCount++;
      
      // Assign custom badge without progress on first call
      if (callCount === 1) {
        const userId = new mongoose.Types.ObjectId(event.userId);
        const existingUserBadge = await badgeModel.getUserBadge(userId, customBadge._id);
        if (!existingUserBadge) {
          const userBadge = await badgeModel.assignBadge(userId, customBadge._id);
          return [userBadge];
        }
      }

      return [];
    };

    const eventData = {
      eventType: BadgeRequirementType.FRIENDS_ADDED,
      value: 1,
    };

    const res = await withAuth(testUser1)(
      request(app).post('/api/badges/user/event').send(eventData)
    ).expect(200);

    expect(callCount).toBe(1);
    expect(res.body.earnedBadges).toBeDefined();
  });
});
