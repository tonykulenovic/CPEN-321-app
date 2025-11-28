import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as recommendationsController from '../../../src/controllers/recommendations.controller';
import { locationModel } from '../../../src/models/location.model';
import { weatherService } from '../../../src/services/weather.service';
import { notificationService } from '../../../src/services/notification.service';
import { placesApiService } from '../../../src/services/places.service';

// Mock the service dependencies instead of the service itself
jest.mock('../../../src/models/location.model');
jest.mock('../../../src/services/weather.service');
jest.mock('../../../src/services/notification.service');
jest.mock('../../../src/services/places.service', () => ({
  placesApiService: {
    getNearbyDiningOptions: jest.fn().mockResolvedValue([]),
  },
}));

// Store the mock functions we can control in tests
const mockPinVoteFind = jest.fn();
const mockUserFindById = jest.fn();
const mockPinFind = jest.fn();

// Mock mongoose.model BEFORE any imports that use it
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  const mockModels: Record<string, unknown> = {};
  
  return {
    ...actualMongoose,
    model: jest.fn((name: string, schema?: unknown) => {
      // If schema is provided, we're defining a model, store it
      if (schema) {
        const MockModel = actualMongoose.model(name, schema);
        mockModels[name] = MockModel;
        return MockModel;
      }
      
      // If no schema, we're accessing an existing model
      if (name === 'PinVote') {
        return {
          find: mockPinVoteFind.mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([]),
            }),
          }),
        };
      }
      if (name === 'User') {
        return {
          findById: mockUserFindById.mockReturnValue({
            select: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue({ visitedPins: [] }),
            }),
          }),
        };
      }
      if (name === 'Pin') {
        return {
          find: mockPinFind.mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        };
      }
      
      // Return stored model or create new one
      return mockModels[name] || actualMongoose.model(name);
    }),
  };
});

describe('Recommendations Controller - Edge Cases (Mocked Dependencies)', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {},
      query: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('getRecommendations - Error Handlers', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest.params = { mealType: 'breakfast' };
      mockRequest.user = undefined;

      await recommendationsController.getRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 400 for invalid meal type', async () => {
      mockRequest.params = { mealType: 'snack' };
      mockRequest.user = { _id: new mongoose.Types.ObjectId() } as any;

      await recommendationsController.getRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid meal type. Must be breakfast, lunch, or dinner',
      });
    });

    it('should return 200 with recommendations when location and weather are available', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockLocation = { lat: 49.26, lng: -123.25 };
      const mockWeather = { temperature: 15, condition: 'Sunny', humidity: 60 };
      const mockPlaces = [
        {
          id: 'place1',
          name: 'Morning Cafe',
          vicinity: '123 Main St',
          lat: 49.261,
          lng: -123.251,
          rating: 4.5,
          priceLevel: 2,
          types: ['cafe', 'breakfast'],
        },
      ];

      mockRequest.params = { mealType: 'breakfast' };
      mockRequest.user = { _id: userId } as any;

      // Mock the dependencies
      (locationModel.findByUserId as jest.Mock).mockResolvedValue(mockLocation);
      (weatherService.getCurrentWeather as jest.Mock).mockResolvedValue(mockWeather);
      (placesApiService.getNearbyDiningOptions as jest.Mock).mockResolvedValue(mockPlaces);

      await recommendationsController.getRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      // Verify service dependencies were called
      expect(locationModel.findByUserId).toHaveBeenCalledWith(userId);
      expect(weatherService.getCurrentWeather).toHaveBeenCalledWith(mockLocation.lat, mockLocation.lng);
      expect(placesApiService.getNearbyDiningOptions).toHaveBeenCalled();
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.message).toBe('breakfast recommendations retrieved successfully');
      expect(jsonCall.data.recommendations).toBeDefined();
      expect(Array.isArray(jsonCall.data.recommendations)).toBe(true);
    });

    it('should use default maxDistance and limit when not provided', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockLocation = { lat: 49.26, lng: -123.25 };

      mockRequest.params = { mealType: 'lunch' };
      mockRequest.query = {};
      mockRequest.user = { _id: userId } as any;

      (locationModel.findByUserId as jest.Mock).mockResolvedValue(mockLocation);
      (weatherService.getCurrentWeather as jest.Mock).mockResolvedValue({ temperature: 20, condition: 'Clear' });
      (placesApiService.getNearbyDiningOptions as jest.Mock).mockResolvedValue([]);

      await recommendationsController.getRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return empty recommendations when no location found', async () => {
      const userId = new mongoose.Types.ObjectId();

      mockRequest.params = { mealType: 'dinner' };
      mockRequest.user = { _id: userId } as any;

      // Mock no location found
      (locationModel.findByUserId as jest.Mock).mockResolvedValue(null);

      await recommendationsController.getRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(locationModel.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.recommendations).toHaveLength(0);
    });

    it('should handle weather service failure gracefully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockLocation = { lat: 49.26, lng: -123.25 };

      mockRequest.params = { mealType: 'breakfast' };
      mockRequest.user = { _id: userId } as any;

      (locationModel.findByUserId as jest.Mock).mockResolvedValue(mockLocation);
      (weatherService.getCurrentWeather as jest.Mock).mockRejectedValue(new Error('Weather API error'));
      (placesApiService.getNearbyDiningOptions as jest.Mock).mockResolvedValue([]);

      await recommendationsController.getRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      // Should still return 200 with empty recommendations
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle service errors with 500 response', async () => {
      const userId = new mongoose.Types.ObjectId();

      mockRequest.params = { mealType: 'lunch' };
      mockRequest.user = { _id: userId } as any;

      // Mock location service throwing error
      (locationModel.findByUserId as jest.Mock).mockRejectedValue(new Error('Database error'));

      await recommendationsController.getRecommendations(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });
  });

  describe('sendRecommendationNotification - Error Handlers', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest.params = { mealType: 'lunch' };
      mockRequest.user = undefined;

      await recommendationsController.sendRecommendationNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 400 for invalid meal type', async () => {
      mockRequest.params = { mealType: 'brunch' };
      mockRequest.user = { _id: new mongoose.Types.ObjectId() } as any;

      await recommendationsController.sendRecommendationNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid meal type. Must be breakfast, lunch, or dinner',
      });
    });

    it('should return 200 when notification sent successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockLocation = { lat: 49.26, lng: -123.25 };
      const mockWeather = { temperature: 18, condition: 'Sunny' };
      const mockPlaces = [
        {
          id: 'place1',
          name: 'Lunch Spot',
          vicinity: '456 Oak St',
          lat: 49.262,
          lng: -123.252,
          rating: 4.3,
          priceLevel: 2,
          types: ['restaurant', 'lunch'],
        },
      ];

      mockRequest.params = { mealType: 'lunch' };
      mockRequest.user = { _id: userId } as any;

      (locationModel.findByUserId as jest.Mock).mockResolvedValue(mockLocation);
      (weatherService.getCurrentWeather as jest.Mock).mockResolvedValue(mockWeather);
      (placesApiService.getNearbyDiningOptions as jest.Mock).mockResolvedValue(mockPlaces);
      (notificationService.sendLocationRecommendationNotification as jest.Mock).mockResolvedValue(true);

      await recommendationsController.sendRecommendationNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(notificationService.sendLocationRecommendationNotification).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'lunch recommendation notification sent successfully',
        data: { sent: true },
      });
    });

    it('should return 204 when no recommendations available', async () => {
      const userId = new mongoose.Types.ObjectId();

      mockRequest.params = { mealType: 'dinner' };
      mockRequest.user = { _id: userId } as any;

      // Mock no location found - will result in no recommendations
      (locationModel.findByUserId as jest.Mock).mockResolvedValue(null);

      await recommendationsController.sendRecommendationNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'No recommendations available for dinner',
        data: { sent: false },
      });
    });

    it('should handle notification service errors', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockLocation = { lat: 49.26, lng: -123.25 };

      mockRequest.params = { mealType: 'breakfast' };
      mockRequest.user = { _id: userId } as any;

      (locationModel.findByUserId as jest.Mock).mockResolvedValue(mockLocation);
      (weatherService.getCurrentWeather as jest.Mock).mockRejectedValue(new Error('Weather error'));
      (placesApiService.getNearbyDiningOptions as jest.Mock).mockResolvedValue([]);

      await recommendationsController.sendRecommendationNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      // Should return 204 since no recommendations due to weather error leading to empty results
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('should handle database errors with 500 response', async () => {
      const userId = new mongoose.Types.ObjectId();

      mockRequest.params = { mealType: 'dinner' };
      mockRequest.user = { _id: userId } as any;

      (locationModel.findByUserId as jest.Mock).mockRejectedValue(new Error('Database connection error'));

      await recommendationsController.sendRecommendationNotification(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });
  });
});
