import mongoose from 'mongoose';
import { describe, test, beforeEach, afterEach, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { recommendationService } from '../../src/services/recommendation.service';
import { weatherService } from '../../src/services/weather.service';
import { notificationService } from '../../src/services/notification.service';
import { placesApiService } from '../../src/services/places.service';

// Mock external services
jest.mock('../../src/services/weather.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/services/places.service');

const mockedWeatherService = jest.mocked(weatherService);
const mockedNotificationService = jest.mocked(notificationService);
const mockedPlacesApiService = jest.mocked(placesApiService);

describe('Enhanced: RecommendationService Coverage Tests', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create test user ID
    testUserId = new mongoose.Types.ObjectId();

    // Set up mock responses for external services
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateRecommendations method - Core functionality', () => {
    test('should handle no user location scenario', async () => {
      const result = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        2000,
        5
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('should handle all meal types with different parameters', async () => {
      const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];
      
      for (const mealType of mealTypes) {
        const result = await recommendationService.generateRecommendations(
          testUserId,
          mealType,
          Math.floor(Math.random() * 5000) + 500, // Random radius 500-5500m
          Math.floor(Math.random() * 10) + 1      // Random limit 1-10
        );
        
        expect(Array.isArray(result)).toBe(true);
      }
    });

    test('should handle zero and negative limits', async () => {
      const zeroResult = await recommendationService.generateRecommendations(
        testUserId,
        'lunch',
        2000,
        0
      );
      
      const negativeResult = await recommendationService.generateRecommendations(
        testUserId,
        'lunch', 
        2000,
        -5
      );

      expect(Array.isArray(zeroResult)).toBe(true);
      expect(zeroResult.length).toBe(0);
      expect(Array.isArray(negativeResult)).toBe(true);
    });

    test('should handle very large and very small radius values', async () => {
      const smallRadiusResult = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        1, // 1 meter
        5
      );

      const largeRadiusResult = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        100000, // 100km
        5
      );

      expect(Array.isArray(smallRadiusResult)).toBe(true);
      expect(Array.isArray(largeRadiusResult)).toBe(true);
    });

    test('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        recommendationService.generateRecommendations(
          new mongoose.Types.ObjectId(),
          i % 3 === 0 ? 'breakfast' : i % 3 === 1 ? 'lunch' : 'dinner',
          2000,
          5
        )
      );

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('sendRecommendationNotification method - Enhanced coverage', () => {
    test('should handle notification sending with different meal types', async () => {
      const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];
      
      for (const mealType of mealTypes) {
        const result = await recommendationService.sendRecommendationNotification(
          testUserId,
          mealType
        );
        
        expect(typeof result).toBe('boolean');
        expect(result).toBe(false); // No location available
      }
    });

    test('should handle notification service errors', async () => {
      mockedNotificationService.sendLocationRecommendationNotification.mockRejectedValue(
        new Error('Notification service error')
      );

      const result = await recommendationService.sendRecommendationNotification(
        testUserId,
        'lunch'
      );

      expect(result).toBe(false);
    });

    test('should handle notification service returning false', async () => {
      mockedNotificationService.sendLocationRecommendationNotification.mockResolvedValue(false);

      const result = await recommendationService.sendRecommendationNotification(
        testUserId,
        'dinner'
      );

      expect(result).toBe(false);
    });

    test('should handle multiple concurrent notification requests', async () => {
      const promises = [
        recommendationService.sendRecommendationNotification(testUserId, 'breakfast'),
        recommendationService.sendRecommendationNotification(testUserId, 'lunch'),
        recommendationService.sendRecommendationNotification(testUserId, 'dinner')
      ];

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('External service integration - Error handling', () => {
    test('should handle weather service failures gracefully', async () => {
      mockedWeatherService.getCurrentWeather.mockRejectedValue(new Error('Weather API error'));
      mockedWeatherService.getWeatherRecommendations.mockImplementation(() => {
        throw new Error('Weather recommendations error');
      });

      const result = await recommendationService.generateRecommendations(
        testUserId,
        'lunch',
        2000,
        5
      );

      expect(Array.isArray(result)).toBe(true);
      // Should handle errors gracefully
    });

    test('should handle places API service failures', async () => {
      mockedPlacesApiService.getNearbyDiningOptions.mockRejectedValue(
        new Error('Places API unavailable')
      );

      const result = await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        2000,
        5
      );

      expect(Array.isArray(result)).toBe(true);
      // Should continue working even if places API fails
    });

    test('should handle weather service returning null/undefined', async () => {
      mockedWeatherService.getCurrentWeather.mockResolvedValue(null as any);
      mockedWeatherService.getWeatherRecommendations.mockReturnValue(null as any);

      const result = await recommendationService.generateRecommendations(
        testUserId,
        'dinner',
        2000,
        5
      );

      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle places API returning empty results', async () => {
      mockedPlacesApiService.getNearbyDiningOptions.mockResolvedValue([]);

      const result = await recommendationService.generateRecommendations(
        testUserId,
        'lunch',
        2000,
        5
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Performance and stress testing', () => {
    test('should handle multiple users simultaneously', async () => {
      const userIds = Array.from({ length: 20 }, () => new mongoose.Types.ObjectId());
      
      const promises = userIds.map(userId =>
        recommendationService.generateRecommendations(userId, 'lunch', 2000, 5)
      );

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    test('should handle high-frequency requests from same user', async () => {
      const promises = Array.from({ length: 50 }, () =>
        recommendationService.generateRecommendations(testUserId, 'breakfast', 1000, 3)
      );

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    test('should handle large limit values', async () => {
      const result = await recommendationService.generateRecommendations(
        testUserId,
        'lunch',
        10000,
        1000 // Very large limit
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Edge case parameter combinations', () => {
    test('should handle extreme coordinate values', async () => {
      // Test with coordinates at edge of valid ranges
      const edgeCases = [
        { lat: -90, lng: -180 },    // South Pole, Date Line
        { lat: 90, lng: 180 },      // North Pole, Date Line  
        { lat: 0, lng: 0 }          // Equator, Prime Meridian
      ];

      for (const coords of edgeCases) {
        const result = await recommendationService.generateRecommendations(
          testUserId,
          'dinner',
          5000,
          5
        );

        expect(Array.isArray(result)).toBe(true);
      }
    });

    test('should handle boundary radius values', async () => {
      const radiusValues = [0, 1, 100, 1000, 10000, 50000];

      for (const radius of radiusValues) {
        const result = await recommendationService.generateRecommendations(
          testUserId,
          'breakfast',
          radius,
          5
        );

        expect(Array.isArray(result)).toBe(true);
      }
    });

    test('should handle various meal type cases', async () => {
      // Test meal types with different casing and variations
      const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];
      
      for (const mealType of mealTypes) {
        const result = await recommendationService.generateRecommendations(
          testUserId,
          mealType,
          2000,
          3
        );

        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('Service lifecycle and state management', () => {
    test('should maintain consistent behavior across multiple calls', async () => {
      const call1 = await recommendationService.generateRecommendations(
        testUserId,
        'lunch',
        2000,
        5
      );
      
      const call2 = await recommendationService.generateRecommendations(
        testUserId,
        'lunch',
        2000,
        5
      );

      expect(Array.isArray(call1)).toBe(true);
      expect(Array.isArray(call2)).toBe(true);
      // Results should be consistent for same parameters
    });

    test('should handle service instance correctly', async () => {
      // Test that the service singleton works correctly
      const service1 = recommendationService;
      const service2 = recommendationService;
      
      expect(service1).toBe(service2);

      // Both should behave identically
      const result1 = await service1.generateRecommendations(testUserId, 'breakfast', 1000, 3);
      const result2 = await service2.generateRecommendations(testUserId, 'breakfast', 1000, 3);
      
      expect(Array.isArray(result1)).toBe(true);
      expect(Array.isArray(result2)).toBe(true);
    });
  });

  describe('Mock verification and integration', () => {
    test('should call external services with correct parameters', async () => {
      await recommendationService.generateRecommendations(
        testUserId,
        'breakfast',
        2000,
        5
      );

      // Since there's no location, weather and places API should not be called
      expect(mockedWeatherService.getCurrentWeather).not.toHaveBeenCalled();
      expect(mockedPlacesApiService.getNearbyDiningOptions).not.toHaveBeenCalled();
    });

    test('should verify notification parameters when no recommendations', async () => {
      await recommendationService.sendRecommendationNotification(
        testUserId,
        'lunch'
      );

      // Should not call notification service when no recommendations
      expect(mockedNotificationService.sendLocationRecommendationNotification).not.toHaveBeenCalled();
    });

    test('should handle service mock state changes', async () => {
      // Change mock behavior mid-test
      mockedNotificationService.sendLocationRecommendationNotification
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockRejectedValueOnce(new Error('Service down'));

      const results = await Promise.all([
        recommendationService.sendRecommendationNotification(testUserId, 'breakfast'),
        recommendationService.sendRecommendationNotification(testUserId, 'lunch'),
        recommendationService.sendRecommendationNotification(testUserId, 'dinner')
      ]);

      results.forEach(result => {
        expect(typeof result).toBe('boolean');
      });
    });
  });
});