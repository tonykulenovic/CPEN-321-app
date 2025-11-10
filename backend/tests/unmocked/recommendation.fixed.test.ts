import mongoose from 'mongoose';
import { describe, test, beforeEach, expect, jest } from '@jest/globals';
import { recommendationService } from '../../src/services/recommendation.service';

// Mock all external dependencies
jest.mock('../../src/services/weather.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/services/places.service');

// Mock MongoDB models properly
jest.mock('../../src/models/user.model', () => ({
  UserModel: class {
    static findById = jest.fn();
    static findByIdWithBadges = jest.fn();
  }
}));

jest.mock('../../src/models/location.model', () => ({
  LocationModel: class {
    static findByUserId = jest.fn();
    static create = jest.fn();
    findByUserId = jest.fn();
    create = jest.fn();
  }
}));

jest.mock('../../src/models/pin.model', () => ({
  PinModel: class {
    static findNearby = jest.fn();
    static find = jest.fn();
    findNearby = jest.fn();
    find = jest.fn();
  }
}));

jest.mock('../../src/models/pinVote.model', () => ({
  PinVoteModel: class {
    static findUserVotes = jest.fn();
    findUserVotes = jest.fn();
  }
}));

// Import mocked models
import { UserModel } from '../../src/models/user.model';
import { LocationModel } from '../../src/models/location.model';
import { PinModel } from '../../src/models/pin.model';
import { PinVoteModel } from '../../src/models/pinVote.model';
import { weatherService } from '../../src/services/weather.service';
import { notificationService } from '../../src/services/notification.service';
import { placesApiService } from '../../src/services/places.service';

const mockedUserModel = jest.mocked(UserModel);
const mockedLocationModel = jest.mocked(LocationModel);
const mockedPinModel = jest.mocked(PinModel);
const mockedPinVoteModel = jest.mocked(PinVoteModel);
const mockedWeatherService = jest.mocked(weatherService);
const mockedNotificationService = jest.mocked(notificationService);
const mockedPlacesApiService = jest.mocked(placesApiService);

describe('Fixed Recommendation Service Tests', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeEach(() => {
    jest.clearAllMocks();
    testUserId = new mongoose.Types.ObjectId();

    // Setup default mocks
    mockedLocationModel.findLatestByUserId.mockResolvedValue(null);
    mockedUserModel.findById.mockResolvedValue(null);
    mockedPinModel.findNearby.mockResolvedValue([]);
    mockedPinVoteModel.findUserVotes.mockResolvedValue([]);
    
    mockedWeatherService.getCurrentWeather.mockResolvedValue({
      condition: 'clear',
      temperature: 20,
      humidity: 60,
      description: 'Clear sky',
      isGoodForOutdoor: true
    });

    mockedWeatherService.getWeatherRecommendations.mockReturnValue({
      preferOutdoor: true,
      suggestions: ['Great weather']
    });

    mockedPlacesApiService.getNearbyDiningOptions.mockResolvedValue([]);
    mockedNotificationService.sendLocationRecommendationNotification.mockResolvedValue(true);
  });

  test('should handle user with no location', async () => {
    // User has no location
    mockedLocationModel.findLatestByUserId.mockResolvedValue(null);
    
    const result = await recommendationService.generateRecommendations(
      testUserId,
      'lunch',
      2000,
      5
    );

    expect(result).toEqual([]);
    expect(mockedLocationModel.findLatestByUserId).toHaveBeenCalledWith(testUserId);
  });

  test('should generate recommendations when user has location', async () => {
    // Mock user location
    const mockLocation = {
      _id: new mongoose.Types.ObjectId(),
      userId: testUserId,
      latitude: 49.2827,
      longitude: -123.1207,
      timestamp: new Date(),
      accuracy: 10
    };
    
    mockedLocationModel.findLatestByUserId.mockResolvedValue(mockLocation as any);
    
    // Mock places API response
    mockedPlacesApiService.getNearbyDiningOptions.mockResolvedValue([
      {
        id: 'test-place-1',
        name: 'Test Restaurant',
        address: '123 Test St',
        location: { latitude: 49.2828, longitude: -123.1208 },
        rating: 4.5,
        priceLevel: 2,
        isOpen: true,
        types: ['restaurant'],
        distance: 100,
        description: 'Great food',
        mealSuitability: { breakfast: 3, lunch: 8, dinner: 7 }
      }
    ]);

    const result = await recommendationService.generateRecommendations(
      testUserId,
      'lunch',
      2000,
      5
    );

    expect(result.length).toBeGreaterThan(0);
    expect(mockedPlacesApiService.getNearbyDiningOptions).toHaveBeenCalledWith(
      49.2827, -123.1207, 2000, 'lunch'
    );
  });

  test('should handle notification sending', async () => {
    // No location = no notification
    mockedLocationModel.findLatestByUserId.mockResolvedValue(null);
    
    const result = await recommendationService.sendRecommendationNotification(
      testUserId,
      'lunch'
    );

    expect(result).toBe(false);
    expect(mockedNotificationService.sendLocationRecommendationNotification).not.toHaveBeenCalled();
  });

  test('should handle different meal types', async () => {
    const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];
    
    for (const mealType of mealTypes) {
      const result = await recommendationService.generateRecommendations(
        testUserId,
        mealType,
        2000,
        5
      );
      
      expect(Array.isArray(result)).toBe(true);
    }
  });

  test('should handle API errors gracefully', async () => {
    // Mock location exists
    const mockLocation = {
      _id: new mongoose.Types.ObjectId(),
      userId: testUserId,
      latitude: 49.2827,
      longitude: -123.1207,
      timestamp: new Date(),
      accuracy: 10
    };
    
    mockedLocationModel.findLatestByUserId.mockResolvedValue(mockLocation as any);
    
    // Mock places API error
    mockedPlacesApiService.getNearbyDiningOptions.mockRejectedValue(new Error('API Error'));
    
    const result = await recommendationService.generateRecommendations(
      testUserId,
      'lunch',
      2000,
      5
    );

    // Should handle error gracefully
    expect(Array.isArray(result)).toBe(true);
  });
});