import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest, describe, test, beforeEach, expect } from '@jest/globals';

import recommendationsRoutes from '../../src/routes/recommendations.routes';
import { recommendationService } from '../../src/services/recommendation.service';
import { weatherService } from '../../src/services/weather.service';
import { locationModel } from '../../src/models/location.model';

// Mock all external dependencies
jest.mock('../../src/services/recommendation.service');
jest.mock('../../src/services/weather.service');
jest.mock('../../src/models/location.model');
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req: unknown, res: any, next: any) => {
    req.user = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser'
    };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/recommendations', recommendationsRoutes);

const mockRecommendationService = recommendationService as jest.Mocked<typeof recommendationService>;
const mockWeatherService = weatherService as jest.Mocked<typeof weatherService>;
const mockLocationModel = locationModel as jest.Mocked<typeof locationModel>;

describe('Mocked: GET /recommendations/:mealType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: recommendationService.generateRecommendations returns recommendations
  // Input: valid mealType parameter (breakfast)
  // Expected status code: 200
  // Expected behavior: returns meal recommendations
  // Expected output: recommendations data with mealType and recommendations array
  test('Get breakfast recommendations successfully', async () => {
    const mockRecommendations = [
      {
        pin: {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          name: 'Great Coffee Shop'
        },
        score: 85,
        distance: 150,
        reason: 'Perfect for breakfast',
        factors: {
          proximity: 20,
          mealRelevance: 25,
          userPreference: 15,
          weather: 15,
          popularity: 10
        },
        source: 'database'
      }
    ];

    mockRecommendationService.generateRecommendations.mockResolvedValue(mockRecommendations as any);

    const response = await request(app)
      .get('/recommendations/breakfast')
      .expect(200);

    expect(response.body.message).toBe('breakfast recommendations retrieved successfully');
    expect(response.body.data.mealType).toBe('breakfast');
    expect(response.body.data.recommendations).toHaveLength(1);
    expect(response.body.data.count).toBe(1);
  });

  // Mocked behavior: invalid meal type validation
  // Input: invalid mealType parameter (snack)
  // Expected status code: 400
  // Expected behavior: returns validation error
  // Expected output: error message about invalid meal type
  test('Reject invalid meal type', async () => {
    const response = await request(app)
      .get('/recommendations/snack')
      .expect(400);

    expect(response.body.message).toBe('Invalid meal type. Must be breakfast, lunch, or dinner');
  });
});

describe('Mocked: POST /recommendations/notify/:mealType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: recommendationService.sendRecommendationNotification returns true
  // Input: valid mealType parameter (lunch)
  // Expected status code: 200
  // Expected behavior: sends notification successfully
  // Expected output: success message with sent: true
  test('Send notification successfully', async () => {
    mockRecommendationService.sendRecommendationNotification.mockResolvedValue(true);

    const response = await request(app)
      .post('/recommendations/notify/lunch')
      .expect(200);

    expect(response.body.message).toBe('lunch recommendation notification sent successfully');
    expect(response.body.data.sent).toBe(true);
  });

  // Mocked behavior: invalid meal type validation
  // Input: invalid mealType parameter (brunch)
  // Expected status code: 400
  // Expected behavior: returns validation error
  // Expected output: error message about invalid meal type
  test('Reject invalid meal type', async () => {
    const response = await request(app)
      .post('/recommendations/notify/brunch')
      .expect(400);

    expect(response.body.message).toBe('Invalid meal type. Must be breakfast, lunch, or dinner');
  });
});
