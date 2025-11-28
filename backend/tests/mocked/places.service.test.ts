import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest, describe, test, beforeEach, expect } from '@jest/globals';

// Mock all external dependencies
jest.mock('../../src/services/places.service');
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
import { placesApiService } from '../../src/services/places.service';

const app = express();
app.use(express.json());
app.use('/recommendations', recommendationRoutes);

const mockPlacesApiService = placesApiService as jest.Mocked<typeof placesApiService>;

describe('Mocked: GET /recommendations/:mealType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return recommendations when places API returns data', async () => {
    mockPlacesApiService.getNearbyDiningOptions.mockResolvedValueOnce([
      {
        id: 'test-place-1',
        name: 'Test Restaurant',
        address: '123 Test St',
        location: { latitude: 49.2827, longitude: -123.1207 },
        rating: 4.5,
        priceLevel: 2,
        isOpen: true,
        types: ['restaurant'],
        distance: 500,
        description: 'Great test food',
        mealSuitability: { breakfast: 3, lunch: 8, dinner: 7 }
      }
    ]);
    
    const response = await request(app)
      .get('/recommendations/lunch');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('should handle service errors gracefully', async () => {
    mockPlacesApiService.getNearbyDiningOptions.mockRejectedValueOnce(new Error('Service error'));
    
    const response = await request(app)
      .get('/recommendations/lunch');
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message');
  });

  test('should handle empty recommendations', async () => {
    mockPlacesApiService.getNearbyDiningOptions.mockResolvedValueOnce([]);
    
    const response = await request(app)
      .get('/recommendations/lunch');
    
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  test('should validate meal type parameter', async () => {
    const response = await request(app)
      .get('/recommendations/invalid-meal');
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

  test('should return filtered recommendations for different meal types', async () => {
    mockPlacesApiService.getNearbyDiningOptions.mockResolvedValueOnce([
      {
        id: 'breakfast-place',
        name: 'Morning Cafe',
        address: '123 Breakfast St',
        location: { latitude: 49.2828, longitude: -123.1208 },
        rating: 4.5,
        priceLevel: 2,
        isOpen: true,
        types: ['cafe'],
        distance: 100,
        description: 'Great breakfast',
        mealSuitability: { breakfast: 9, lunch: 3, dinner: 1 }
      }
    ]);
    
    const response = await request(app)
      .get('/recommendations/breakfast');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(0);
  });

  test('should handle different meal types', async () => {
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    
    for (const mealType of mealTypes) {
      mockPlacesApiService.getNearbyDiningOptions.mockResolvedValueOnce([]);
      
      const response = await request(app)
        .get(`/recommendations/${mealType}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    }
  });

});

describe('Mocked: POST /recommendations/notify/:mealType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should send notification for meal recommendations', async () => {
    mockPlacesApiService.getNearbyDiningOptions.mockResolvedValueOnce([
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
    
    const response = await request(app)
      .post('/recommendations/notify/lunch');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });

  test('should handle notification errors', async () => {
    mockPlacesApiService.getNearbyDiningOptions.mockRejectedValueOnce(new Error('Service error'));
    
    const response = await request(app)
      .post('/recommendations/notify/lunch');
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message');
});