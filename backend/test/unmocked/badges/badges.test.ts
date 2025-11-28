import request from 'supertest';
import express from 'express';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

import badgeRoutes from '../../../src/routes/badge.routes';
import { badgeModel } from '../../../src/models/badge.model';
import { BadgeService } from '../../../src/services/badge.service';
import { BadgeCategory } from '../../../src/types/badge.types';

// Create Express app with routes
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/badges', badgeRoutes);
  return app;
}

// Interface: GET /api/badges
describe('Unmocked: GET /api/badges', () => {
  let app: express.Application;

  beforeEach(async () => {
    // Create fresh app instance for each test
    app = createApp();
    
    // Initialize default badges for each test
    await BadgeService.initializeDefaultBadges();
  });

  // Input: no query parameters
  // Expected status code: 200
  // Expected behavior: returns all active badges from database
  // Expected output: array of all badges with complete badge information
  test('Get all badges successfully', async () => {
    const res = await request(app)
      .get('/api/badges')
      .expect(200);

    expect(res.body.message).toBe('Badges fetched successfully');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.badges).toBeDefined();
    expect(Array.isArray(res.body.data.badges)).toBe(true);
    expect(res.body.data.badges.length).toBeGreaterThan(0);
    
    // Verify badge structure
    const badge = res.body.data.badges[0];
    expect(badge).toHaveProperty('_id');
    expect(badge).toHaveProperty('name');
    expect(badge).toHaveProperty('description');
    expect(badge).toHaveProperty('icon');
    expect(badge).toHaveProperty('category');
    expect(badge).toHaveProperty('rarity');
    expect(badge).toHaveProperty('requirements');
    expect(badge).toHaveProperty('isActive');
  });

  // Input: query parameter category=activity
  // Expected status code: 200
  // Expected behavior: returns only badges with activity category
  // Expected output: filtered array of badges where all have category 'activity'
  test('Filter badges by category successfully', async () => {
    const res = await request(app)
      .get('/api/badges')
      .query({ category: BadgeCategory.ACTIVITY })
      .expect(200);

    expect(res.body.message).toBe('Badges fetched successfully');
    expect(res.body.data.badges).toBeDefined();
    expect(Array.isArray(res.body.data.badges)).toBe(true);
    
    // Verify all returned badges have the correct category
    res.body.data.badges.forEach((badge: any) => {
      expect(badge.category).toBe(BadgeCategory.ACTIVITY);
    });
  });

  // Input: query parameter isActive=true
  // Expected status code: 200
  // Expected behavior: returns only active badges
  // Expected output: filtered array of badges where all have isActive true
  test('Filter badges by isActive=true successfully', async () => {
    const res = await request(app)
      .get('/api/badges')
      .query({ isActive: 'true' })
      .expect(200);

    expect(res.body.message).toBe('Badges fetched successfully');
    expect(res.body.data.badges).toBeDefined();
    expect(Array.isArray(res.body.data.badges)).toBe(true);
    
    // Verify all returned badges are active
    res.body.data.badges.forEach((badge: any) => {
      expect(badge.isActive).toBe(true);
    });
  });

  // Input: query parameters category=social and isActive=true
  // Expected status code: 200
  // Expected behavior: returns only social badges that are active
  // Expected output: filtered array of badges matching both criteria
  test('Filter badges by multiple criteria successfully', async () => {
    const res = await request(app)
      .get('/api/badges')
      .query({ 
        category: BadgeCategory.SOCIAL,
        isActive: 'true' 
      })
      .expect(200);

    expect(res.body.message).toBe('Badges fetched successfully');
    expect(res.body.data.badges).toBeDefined();
    expect(Array.isArray(res.body.data.badges)).toBe(true);
    
    // Verify all returned badges match both criteria
    res.body.data.badges.forEach((badge: any) => {
      expect(badge.category).toBe(BadgeCategory.SOCIAL);
      expect(badge.isActive).toBe(true);
    });
  });

  // Input: query parameter with invalid category value
  // Expected status code: 200
  // Expected behavior: returns badges with the provided filter (may be empty if no match)
  // Expected output: empty array or badges matching the filter
  test('Get badges with non-existent category filter', async () => {
    const res = await request(app)
      .get('/api/badges')
      .query({ category: 'nonexistent_category' })
      .expect(200);

    expect(res.body.message).toBe('Badges fetched successfully');
    expect(res.body.data.badges).toBeDefined();
    expect(Array.isArray(res.body.data.badges)).toBe(true);
    // Should return empty array since no badges match this category
    expect(res.body.data.badges.length).toBe(0);
  });

  // Input: database error during badge fetch
  // Expected status code: 500
  // Expected behavior: handles database error gracefully
  // Expected output: error message in response
  test('Handle database error when fetching badges', async () => {
    // Save original method
    const originalFindAll = badgeModel.findAll;
    
    // Mock findAll to throw an error
    badgeModel.findAll = async () => {
      throw new Error('Database connection error');
    };

    const res = await request(app)
      .get('/api/badges')
      .expect(500);

    expect(res.body.message).toBe('Database connection error');

    // Restore original method
    badgeModel.findAll = originalFindAll;
  });

  // Input: non-Error exception during badge fetch
  // Expected status code: 500 (handled by Express error middleware)
  // Expected behavior: calls next(error) for non-Error exceptions
  // Expected output: Express handles the error
  test('Handle non-Error exception when fetching badges', async () => {
    // Save original method
    const originalFindAll = badgeModel.findAll;
    
    // Mock findAll to throw a non-Error object
    badgeModel.findAll = async () => {
      throw 'String error'; // Non-Error exception
    };

    // This will be handled by Express error middleware (next(error))
    await request(app)
      .get('/api/badges')
      .expect(500);

    // Restore original method
    badgeModel.findAll = originalFindAll;
  });
});
