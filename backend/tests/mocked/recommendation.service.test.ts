import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest, describe, test, beforeEach, expect } from '@jest/globals';

// Mock all external dependencies
jest.mock('../../src/services/weather.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/services/places.service');
jest.mock('../../src/models/location.model');
jest.mock('../../src/models/pin.model');
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

import recommendationRoutes from '../../src/routes/recommendations.routes';
import { weatherService } from '../../src/services/weather.service';
import { notificationService } from '../../src/services/notification.service';
import { placesApiService } from '../../src/services/places.service';
import { locationModel } from '../../src/models/location.model';

const app = express();
app.use(express.json());
app.use('/recommendations', recommendationRoutes);

const mockedWeatherService = jest.mocked(weatherService);
const mockedNotificationService = jest.mocked(notificationService);
const mockedPlacesApiService = jest.mocked(placesApiService);
const mockedLocationModel = jest.mocked(locationModel);

describe('Mocked: GET /recommendations/:mealType', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock user location
    mockedLocationModel.findByUserId.mockResolvedValue({
      lat: 49.2827,
      lng: -123.1207
    } as any);

    // Set up default mock responses
    mockedWeatherService.getCurrentWeather.mockResolvedValue({
      condition: 'clear',
      temperature: 20,
      description: 'Clear sky',
      humidity: 60,
      isGoodForOutdoor: true
    });

    mockedWeatherService.getWeatherRecommendations.mockReturnValue({
      preferOutdoor: true,
      suggestions: ['Great weather for outdoor dining']
    });

    mockedNotificationService.sendLocationRecommendationNotification.mockResolvedValue(true);

    mockedPlacesApiService.getNearbyDiningOptions.mockResolvedValue([
      {
        id: 'places_api_cafe',
        name: 'Places API Café',
        address: '789 API St, Vancouver, BC',
        location: { latitude: 49.2828, longitude: -123.1208 },
        rating: 4.3,
        priceLevel: 2,
        isOpen: true,
        types: ['cafe', 'restaurant'],
        distance: 50,
        description: 'Great coffee from Places API',
        mealSuitability: {
          breakfast: 8,
          lunch: 6,
          dinner: 3
        }
      }
    ]);
  });

  test('should return recommendations when user has location', async () => {
    const response = await request(app)
      .get('/recommendations/breakfast');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('should handle no user location scenario', async () => {
    mockedLocationModel.findByUserId.mockResolvedValueOnce(null);

    const response = await request(app)
      .get('/recommendations/breakfast');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  test('should handle different meal types', async () => {
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    
    for (const mealType of mealTypes) {
      const response = await request(app)
        .get(`/recommendations/${mealType}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    }
  });

  test('should validate meal type parameter', async () => {
    const response = await request(app)
      .get('/recommendations/invalid-meal');
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

    test('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        recommendationService.generateRecommendations(
          new mongoose.Types.ObjectId(),
          i % 3 === 0 ? 'breakfast' : i % 3 === 1 ? 'lunch' : 'dinner',
          2000,
          5
});

describe('Mocked: POST /recommendations/notify/:mealType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock user location
    mockedLocationModel.findByUserId.mockResolvedValue({
      lat: 49.2827,
      lng: -123.1207
    } as any);
    
    mockedPlacesApiService.getNearbyDiningOptions.mockResolvedValue([
      {
        id: 'lunch-place',
        name: 'Lunch Spot',
        address: '456 Lunch Ave',
        location: { latitude: 49.2827, longitude: -123.1207 },
        rating: 4.2,
        priceLevel: 2,
        isOpen: true,
        types: ['restaurant'],
        distance: 200,
        description: 'Good lunch',
        mealSuitability: { breakfast: 2, lunch: 9, dinner: 5 }
      }
    ]);
  });

  test('should send notification for meal recommendations', async () => {
    mockedNotificationService.sendLocationRecommendationNotification.mockResolvedValueOnce(true);
    
    const response = await request(app)
      .post('/recommendations/notify/lunch');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });

  test('should handle notification service errors', async () => {
    mockedNotificationService.sendLocationRecommendationNotification.mockRejectedValueOnce(
      new Error('Notification service error')
    );

    const response = await request(app)
      .post('/recommendations/notify/lunch');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', false);
  });

  test('should handle notification service returning false', async () => {
    mockedNotificationService.sendLocationRecommendationNotification.mockResolvedValueOnce(false);

    const response = await request(app)
      .post('/recommendations/notify/dinner');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', false);
  });

  test('should handle different meal types for notifications', async () => {
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    
    for (const mealType of mealTypes) {
      mockedNotificationService.sendLocationRecommendationNotification.mockResolvedValueOnce(true);
      
      const response = await request(app)
        .post(`/recommendations/notify/${mealType}`);
      
      expect(response.status).toBe(200);
    }
});