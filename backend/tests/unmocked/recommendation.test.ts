import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import { describe, test, beforeEach, afterEach, expect, jest, beforeAll, afterAll } from '@jest/globals';

import { recommendationService } from '../../src/services/recommendation.service';
import { weatherService } from '../../src/services/weather.service';
import { notificationService } from '../../src/services/notification.service';
import { placesApiService } from '../../src/services/places.service';
import { locationModel } from '../../src/models/location.model';
import { pinModel } from '../../src/models/pin.model';
import { userModel } from '../../src/models/user.model';
import { pinVoteModel } from '../../src/models/pinVote.model';
import recommendationsRoutes from '../../src/routes/recommendations.routes';
import { PinCategory, PinVisibility } from '../../src/types/pins.types';
import { GoogleUserInfo } from '../../src/types/user.types';

// Mock external services only (keep database models unmocked for integration testing)
jest.mock('../../src/services/weather.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/services/places.service');

const mockedWeatherService = jest.mocked(weatherService);
const mockedNotificationService = jest.mocked(notificationService);
const mockedPlacesApiService = jest.mocked(placesApiService);

// Create Express app for integration tests
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Simple auth middleware for testing
  app.use(async (req: any, res: any, next: any) => {
    const userId = req.headers['x-dev-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Authentication failed' });
    }
  });

  app.use('/recommendations', recommendationsRoutes);
  return app;
}

describe('RecommendationService Tests', () => {
  let testUserId: mongoose.Types.ObjectId;
  let testUser: any;
  let testPins: any[] = [];
  let app: express.Application;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create test user (cast to any to bypass TypeScript validation but satisfy Zod schema)
    testUserId = new mongoose.Types.ObjectId();
    const userInfo = {
      googleId: 'test-google-id-' + testUserId.toString(),
      name: 'Test User', 
      email: 'test-' + testUserId.toString() + '@example.com',
      username: 'testuser-' + testUserId.toString()
    } as any;
    testUser = await userModel.create(userInfo);
    testUserId = testUser._id;

    // Create test location for user (Vancouver coordinates) - expires in 1 hour
    await locationModel.create(
      testUserId,
      49.2827, // lat
      -123.1207, // lng
      10, // accuracy
      true, // shared
      new Date(Date.now() + 60 * 60 * 1000) // expires in 1 hour
    );

    // Create test pins with various categories and distances
    testPins = [];

    // Close breakfast place (50m away)
    const breakfastPin = await pinModel.create(testUserId, {
      name: 'Morning Brew Cafe',
      description: 'Excellent breakfast and coffee',
      category: 'shops_services' as PinCategory,
      location: {
        latitude: 49.2831, // ~50m north
        longitude: -123.1207
      },
      visibility: 'public' as PinVisibility
    });
    testPins.push(breakfastPin);

    // Medium distance lunch place (200m away)
    const lunchPin = await pinModel.create(testUserId, {
      name: 'Quick Lunch Spot',
      description: 'Fast and tasty lunch options',
      category: 'shops_services' as PinCategory,
      location: {
        latitude: 49.2845, // ~200m north
        longitude: -123.1207
      },
      visibility: 'public' as PinVisibility
    });
    testPins.push(lunchPin);

    // Dinner restaurant (300m away)
    const dinnerPin = await pinModel.create(testUserId, {
      name: 'Fine Dining Restaurant',
      description: 'Elegant dinner experience',
      category: 'shops_services' as PinCategory,
      location: {
        latitude: 49.2854, // ~300m north
        longitude: -123.1207
      },
      visibility: 'public' as PinVisibility
    });
    testPins.push(dinnerPin);

    // Study location (100m away)
    const studyPin = await pinModel.create(testUserId, {
      name: 'Central Library',
      description: 'Quiet study space with wifi',
      category: 'study' as PinCategory,
      location: {
        latitude: 49.2836, // ~100m north
        longitude: -123.1207
      },
      visibility: 'public' as PinVisibility
    });
    testPins.push(studyPin);

    // Setup mock responses for external services
    mockedWeatherService.getCurrentWeather.mockResolvedValue({
      condition: 'clear',
      temperature: 22,
      humidity: 60,
      description: 'Clear and sunny',
      isGoodForOutdoor: true
    });

    mockedWeatherService.getWeatherRecommendations.mockReturnValue({
      preferOutdoor: true,
      suggestions: ['Perfect weather for outdoor dining!']
    });

    mockedNotificationService.sendLocationRecommendationNotification.mockResolvedValue(true);

    mockedPlacesApiService.getNearbyDiningOptions.mockResolvedValue([
      {
        id: 'test-place-1',
        name: 'Google Places Cafe',
        address: '123 Test Street',
        location: { latitude: 49.2840, longitude: -123.1210 },
        distance: 75,
        rating: 4.2,
        priceLevel: 2,
        types: ['cafe', 'restaurant'],
        isOpen: true,
        mealSuitability: {
          breakfast: 9,
          lunch: 6,
          dinner: 4
        }
      }
    ]);
  });

  afterEach(async () => {
    // Clean up test data after each test
    try {
      await userModel.deleteMany({});
      await pinModel.deleteMany({});
      await locationModel.deleteMany({});
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Service Unit Tests - generateRecommendations', () => {
    test('should generate breakfast recommendations successfully', async () => {
      const recommendations = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        1000, // maxDistance
        5     // limit
      );

      expect(recommendations).toHaveLength(4); // 3 database + 1 places API
      
      // Check database recommendations
      const dbRecs = recommendations.filter(r => r.source === 'database');
      expect(dbRecs).toHaveLength(3);
      
      // Check the highest-scored database recommendation
      const topDbRec = dbRecs[0]; // Should be "Morning Brew Cafe"
      expect(topDbRec).toBeDefined();
      expect(topDbRec.pin?.name).toBe('Morning Brew Cafe');
      expect(topDbRec.score).toBeGreaterThan(50); // Good score
      expect(topDbRec.distance).toBeLessThan(100);
      expect(topDbRec.factors.proximity).toBeGreaterThan(0);
      expect(topDbRec.factors.mealRelevance).toBeGreaterThan(0);

      // Check Places API recommendation
      const placesRec = recommendations.find(r => r.source === 'places_api');
      expect(placesRec).toBeDefined();
      expect(placesRec!.place?.name).toBe('Google Places Cafe');
    });

    test('should generate lunch recommendations successfully', async () => {
      const recommendations = await recommendationService.generateRecommendations(
        testUserId,
        'lunch',
        1000,
        5
      );

      expect(recommendations).toHaveLength(4); // 3 database + 1 places API
      
      // Check database recommendations
      const dbRecs = recommendations.filter(r => r.source === 'database');
      expect(dbRecs).toHaveLength(3);
      
      // Check the highest-scored database recommendation for lunch should be Quick Lunch Spot
      const topDbRec = dbRecs.find(rec => rec.pin?.name === 'Quick Lunch Spot');
      expect(topDbRec).toBeDefined();
      expect(topDbRec!.distance).toBeGreaterThan(100); // Should be ~200m away
    });

    test('should generate dinner recommendations successfully', async () => {
      const recommendations = await recommendationService.generateRecommendations(
        testUserId,
        'dinner',
        1000,
        5
      );

      expect(recommendations).toHaveLength(4); // 3 database + 1 places API
      
      // Check database recommendations
      const dbRecs = recommendations.filter(r => r.source === 'database');
      expect(dbRecs).toHaveLength(3);
      
      // Check the highest-scored database recommendation for dinner should be Fine Dining Restaurant
      const topDbRec = dbRecs.find(rec => rec.pin?.name === 'Fine Dining Restaurant');
      expect(topDbRec).toBeDefined();
      expect(topDbRec!.distance).toBeGreaterThan(200); // Should be ~300m away
    });

    test('should respect distance limits', async () => {
      const recommendations = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        75, // Only 75m max distance - should exclude 100m+ pins
        10
      );

      // Should only include the 50m breakfast pin, not the 100m+ ones
      const dbRecs = recommendations.filter(r => r.source === 'database');
      expect(dbRecs).toHaveLength(1);
      expect(dbRecs[0].pin?.name).toBe('Morning Brew Cafe');
    });

    test('should respect recommendation limits', async () => {
      const recommendations = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        1000,
        1 // Only 1 recommendation
      );

      expect(recommendations).toHaveLength(1);
    });

    test('should handle no location gracefully', async () => {
      // Create user without location
      const noLocationUser = await userModel.create({
        googleId: 'no-location-user-google-id',
        name: 'No Location User',
        email: 'nolocation@example.com',
        username: 'nolocationuser'
      } as any);

      const recommendations = await recommendationService.generateRecommendations(
        noLocationUser._id,
        'breakfast',
        1000,
        5
      );

      expect(recommendations).toHaveLength(0);
    });

    test('should calculate meal relevance scores correctly', async () => {
      const recommendations = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        1000,
        5
      );

      const dbRec = recommendations.find(r => r.source === 'database');
      expect(dbRec).toBeDefined();
      
      // Breakfast cafe should have high meal relevance for breakfast
      expect(dbRec!.factors.mealRelevance).toBeGreaterThan(15);
    });

    test('should handle weather effects on scoring', async () => {
      // Test with bad weather
      mockedWeatherService.getCurrentWeather.mockResolvedValue({
        condition: 'rain',
        temperature: 5,
        description: 'Heavy rain'
      });

      const recommendations = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        1000,
        5
      );

      expect(recommendations.length).toBeGreaterThan(0);
      
      const dbRec = recommendations.find(r => r.source === 'database');
      expect(dbRec).toBeDefined();
      
      // Weather factor should be lower due to bad weather
      expect(dbRec!.factors.weather).toBeLessThan(15);
    });
  });

  describe('Service Unit Tests - sendRecommendationNotification', () => {
    test('should send notification successfully when recommendations exist', async () => {
      const result = await recommendationService.sendRecommendationNotification(
        testUserId,
        'breakfast'
      );

      expect(result).toBe(true);
      expect(mockedNotificationService.sendLocationRecommendationNotification).toHaveBeenCalledTimes(1);
    });

    test('should handle no recommendations gracefully', async () => {
      // Create user without location (no recommendations possible)
      const noLocationUser = await userModel.create({
        googleId: 'no-location-user-google-id-2',
        name: 'No Location User',
        email: 'nolocation2@example.com',
        username: 'nolocationuser2'
      } as any);

      const result = await recommendationService.sendRecommendationNotification(
        noLocationUser._id,
        'breakfast'
      );

      expect(result).toBe(false);
      expect(mockedNotificationService.sendLocationRecommendationNotification).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests - HTTP Endpoints', () => {
    test('GET /recommendations/:mealType should return recommendations', async () => {
      const response = await request(app)
        .get('/recommendations/breakfast')
        .set('x-dev-user-id', testUserId.toString())
        .set('authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.message).toBe('breakfast recommendations retrieved successfully');
      expect(response.body.data.mealType).toBe('breakfast');
      expect(response.body.data.recommendations).toHaveLength(2);
      expect(response.body.data.count).toBe(2);

      // Verify recommendation structure
      const rec = response.body.data.recommendations[0];
      expect(rec).toHaveProperty('score');
      expect(rec).toHaveProperty('distance');
      expect(rec).toHaveProperty('factors');
      expect(rec).toHaveProperty('source');
    });

    test('GET /recommendations/:mealType should handle invalid meal type', async () => {
      const response = await request(app)
        .get('/recommendations/snack')
        .set('x-dev-user-id', testUserId.toString())
        .set('authorization', 'Bearer test-token')
        .expect(400);

      expect(response.body.message).toBe('Invalid meal type. Must be breakfast, lunch, or dinner');
    });

    test('POST /recommendations/notify/:mealType should send notification', async () => {
      const response = await request(app)
        .post('/recommendations/notify/lunch')
        .set('x-dev-user-id', testUserId.toString())
        .set('authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.message).toBe('lunch recommendation notification sent successfully');
      expect(response.body.data.sent).toBe(true);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/recommendations/breakfast')
        .expect(401);
    });

    test('should handle non-existent user', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      
      await request(app)
        .get('/recommendations/breakfast')
        .set('x-dev-user-id', fakeUserId.toString())
        .set('authorization', 'Bearer test-token')
        .expect(401);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock a database error
      const originalFindByUserId = locationModel.findByUserId;
      locationModel.findByUserId = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const recommendations = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        1000,
        5
      );

      expect(recommendations).toHaveLength(0);

      // Restore original method
      locationModel.findByUserId = originalFindByUserId;
    });

    test('should handle weather service failures', async () => {
      mockedWeatherService.getCurrentWeather.mockRejectedValue(new Error('Weather API failed'));

      const recommendations = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        1000,
        5
      );

      // Should still return recommendations, just with default weather scoring
      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('should handle places API failures', async () => {
      mockedPlacesApiService.getNearbyDiningOptions.mockRejectedValue(new Error('Places API failed'));

      const recommendations = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        1000,
        5
      );

      // Should still return database recommendations
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.every(r => r.source === 'database')).toBe(true);
    });

    test('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 5 }, () =>
        recommendationService.generateRecommendations(testUserId, 'lunch', 1000, 5)
      );

      const results = await Promise.all(promises);

      // All requests should complete successfully
      expect(results).toHaveLength(5);
      results.forEach(recommendations => {
        expect(recommendations.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Tests', () => {
    test('should complete recommendations within reasonable time', async () => {
      const startTime = Date.now();
      
      await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        1000,
        10
      );
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});