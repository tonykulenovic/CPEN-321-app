import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, beforeEach, expect } from '@jest/globals';

import recommendationsRoutes from '../../src/routes/recommendations.routes';
import { userModel } from '../../src/models/user.model';
import { pinModel } from '../../src/models/pin.model';
import { SignUpRequest } from '../../src/types/user.types';
import { PinCategory, PinVisibility } from '../../src/types/pins.types';

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

  // Add recommendations routes
  app.use('/recommendations', recommendationsRoutes);

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
let testPin1: any;
let testPin2: any;

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

// Helper function to create test pins
async function createTestPin(
  name: string,
  category: PinCategory,
  userId: string
) {
  const pinData = {
    name,
    description: `Test ${name} description`,
    category,
    location: {
      latitude: 49.2827 + Math.random() * 0.01,
      longitude: -123.1207 + Math.random() * 0.01,
    },
    visibility: PinVisibility.PUBLIC,
  };

  const pin = await pinModel.create(new mongoose.Types.ObjectId(userId), pinData);
  return pin;
}

describe('Unmocked Integration: GET /recommendations/:mealType', () => {
  beforeEach(async () => {
    // Clear collections before each test
    await userModel['user'].deleteMany({});
    await pinModel['pin'].deleteMany({});

    // Create test users
    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');
    testUser2 = await createTestUser('Test User 2', 'testuser2', 'test2@example.com');

    // Create test pins
    testPin1 = await createTestPin(
      'Test Cafe',
      PinCategory.SHOPS_SERVICES,
      testUser1._id
    );

    testPin2 = await createTestPin(
      'Test Restaurant',
      PinCategory.SHOPS_SERVICES,
      testUser2._id
    );
  });

  // No mocking: recommendationService.getMealRecommendations uses real database
  // Input: authenticated request with valid meal type
  // Expected status code: 200
  // Expected behavior: returns meal recommendations from database
  // Expected output: recommendations array
  test('Get breakfast recommendations successfully', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).get('/recommendations/breakfast')
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('breakfast recommendations retrieved successfully');
    expect(response.body.data.recommendations).toBeDefined();
    expect(response.body.data.mealType).toBe('breakfast');
  });

  // No mocking: validation fails for invalid meal type
  // Input: authenticated request with invalid meal type
  // Expected status code: 400
  // Expected behavior: returns validation error
  // Expected output: error message
  test('Reject invalid meal type', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).get('/recommendations/invalid-meal')
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid meal type. Allowed values: breakfast, lunch, dinner');
  });

  // No mocking: recommendationService.getMealRecommendations works for lunch
  // Input: authenticated request with lunch meal type
  // Expected status code: 200
  // Expected behavior: returns lunch recommendations from database
  // Expected output: recommendations array
  test('Get lunch recommendations successfully', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).get('/recommendations/lunch')
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('lunch recommendations retrieved successfully');
    expect(response.body.data.mealType).toBe('lunch');
  });

  // No mocking: recommendationService.getMealRecommendations works for dinner
  // Input: authenticated request with dinner meal type
  // Expected status code: 200
  // Expected behavior: returns dinner recommendations from database
  // Expected output: recommendations array
  test('Get dinner recommendations successfully', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).get('/recommendations/dinner')
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('dinner recommendations retrieved successfully');
    expect(response.body.data.mealType).toBe('dinner');
  });
});

describe('Unmocked Integration: POST /recommendations/notify/:mealType', () => {
  beforeEach(async () => {
    await userModel['user'].deleteMany({});
    await pinModel['pin'].deleteMany({});

    testUser1 = await createTestUser('Test User 1', 'testuser1', 'test1@example.com');
  });

  // No mocking: notificationService.sendRecommendationNotification uses real database
  // Input: authenticated request with valid meal type
  // Expected status code: 204
  // Expected behavior: attempts to send notification but no recommendations available
  // Expected output: 204 status with no body
  test('Send breakfast notification successfully', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).post('/recommendations/notify/breakfast')
    );

    expect(response.status).toBe(204);
  });

  // No mocking: validation fails for invalid meal type
  // Input: authenticated request with invalid meal type
  // Expected status code: 400
  // Expected behavior: returns validation error
  // Expected output: error message
  test('Reject invalid meal type for notification', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).post('/recommendations/notify/invalid-meal')
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid meal type. Must be breakfast, lunch, or dinner');
  });

  // No mocking: notificationService.sendRecommendationNotification works for lunch
  // Input: authenticated request with lunch meal type
  // Expected status code: 204
  // Expected behavior: attempts to send lunch notification
  // Expected output: 204 status
  test('Send lunch notification successfully', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).post('/recommendations/notify/lunch')
    );

    expect(response.status).toBe(204);
  });

  // No mocking: notificationService.sendRecommendationNotification works for dinner
  // Input: authenticated request with dinner meal type
  // Expected status code: 204
  // Expected behavior: attempts to send dinner notification
  // Expected output: 204 status
  test('Send dinner notification successfully', async () => {
    const app = createAuthenticatedApp();

    const response = await withAuth(testUser1)(
      request(app).post('/recommendations/notify/dinner')
    );

    expect(response.status).toBe(204);
  });
});