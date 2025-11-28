import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest, describe, test, beforeEach, expect } from '@jest/globals';

// Mock all external dependencies
jest.mock('../../../src/models/user.model');
jest.mock('../../../src/models/friendship.model');
jest.mock('../../../src/models/location.model');
jest.mock('../../../src/services/places.service');
jest.mock('../../../src/config/firebase');
jest.mock('../../../src/middleware/auth.middleware', () => ({
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

import friendsRoutes from '../../../src/routes/friends.routes';
import recommendationRoutes from '../../../src/routes/recommendations.routes';
import { userModel } from '../../../src/models/user.model';
import { friendshipModel } from '../../../src/models/friendship.model';
import { locationModel } from '../../../src/models/location.model';
import { placesApiService } from '../../../src/services/places.service';
import { firebaseService } from '../../../src/config/firebase';

const app = express();
app.use(express.json());
app.use('/friends', friendsRoutes);
app.use('/recommendations', recommendationRoutes);

const mockedUserModel = jest.mocked(userModel);
const mockedFriendshipModel = jest.mocked(friendshipModel);
const mockedLocationModel = jest.mocked(locationModel);
const mockedPlacesApiService = jest.mocked(placesApiService);
const mockedFirebaseService = jest.mocked(firebaseService);

describe('API: Notification Service via Friends API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should send notification when sending friend request', async () => {
    const mockTargetUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Target User',
      privacy: { allowFriendRequestsFrom: 'everyone' },
      fcmToken: 'test-fcm-token'
    };

    const mockFriendship = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      friendId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      status: 'pending'
    };

    // Mock findById to return the target user for both controller and notification service calls
    mockedUserModel.findById
      .mockResolvedValueOnce(mockTargetUser as any) // First call from friends controller
      .mockResolvedValueOnce(mockTargetUser as any); // Second call from notification service
    
    mockedFriendshipModel.findByUserAndFriend.mockResolvedValue(null);
    mockedFriendshipModel.create.mockResolvedValueOnce(mockFriendship as any);
    mockedFirebaseService.sendNotification.mockResolvedValue(true);

    const response = await request(app)
      .post('/friends/requests')
      .send({ toUserId: '507f1f77bcf86cd799439012' });

    expect(response.status).toBe(201);
    expect(mockedFirebaseService.sendNotification).toHaveBeenCalledWith(
      'test-fcm-token',
      'New Friend Request',
      'Test User sent you a friend request',
      {
        type: 'friend_request_received',
        fromUserId: '507f1f77bcf86cd799439011',
        fromUserName: 'Test User'
      }
    );
  });

  test('should handle notification when user has no FCM token', async () => {
    const mockTargetUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Target User',
      privacy: { allowFriendRequestsFrom: 'everyone' },
      // No FCM token
    };

    const mockFriendship = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      friendId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      status: 'pending'
    };

    mockedUserModel.findById.mockResolvedValueOnce(mockTargetUser as any);
    mockedFriendshipModel.findByUserAndFriend.mockResolvedValue(null);
    mockedFriendshipModel.create.mockResolvedValueOnce(mockFriendship as any);

    const response = await request(app)
      .post('/friends/requests')
      .send({ toUserId: '507f1f77bcf86cd799439012' });

    expect(response.status).toBe(201);
    expect(mockedFirebaseService.sendNotification).not.toHaveBeenCalled();
  });

  test('should handle firebase service errors during friend request', async () => {
    const mockTargetUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Target User',
      privacy: { allowFriendRequestsFrom: 'everyone' },
      fcmToken: 'test-fcm-token'
    };

    const mockFriendship = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      friendId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      status: 'pending'
    };

    // Mock findById to return the target user for both controller and notification service calls
    mockedUserModel.findById
      .mockResolvedValueOnce(mockTargetUser as any) // First call from friends controller
      .mockResolvedValueOnce(mockTargetUser as any); // Second call from notification service
    
    mockedFriendshipModel.findByUserAndFriend.mockResolvedValue(null);
    mockedFriendshipModel.create.mockResolvedValueOnce(mockFriendship as any);
    mockedFirebaseService.sendNotification.mockRejectedValueOnce(new Error('Firebase error'));

    const response = await request(app)
      .post('/friends/requests')
      .send({ toUserId: '507f1f77bcf86cd799439012' });

    // Should still succeed despite notification failure
    expect(response.status).toBe(201);
    expect(mockedFirebaseService.sendNotification).toHaveBeenCalled();
  });

});

describe('API: Notification Service via Recommendations API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should send location notification when posting recommendation notification', async () => {
    // Setup mocks for successful recommendation generation
    mockedLocationModel.findByUserId.mockResolvedValue({
      lat: 49.2827,
      lng: -123.1207
    });

    mockedPlacesApiService.getNearbyDiningOptions.mockResolvedValue([
      {
        id: 'test-place',
        name: 'Test Restaurant',
        address: '123 Test St',
        location: { latitude: 49.2827, longitude: -123.1207 },
        rating: 4.5,
        priceLevel: 2,
        isOpen: true,
        types: ['restaurant'],
        distance: 200,
        description: 'Great food',
        mealSuitability: { breakfast: 2, lunch: 9, dinner: 5 }
      }
    ]);

    const mockUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Test User',
      fcmToken: 'test-fcm-token'
    };

    mockedUserModel.findById.mockResolvedValue(mockUser as any);
    mockedFirebaseService.sendNotification.mockResolvedValue(true);

    const response = await request(app)
      .post('/recommendations/notify/lunch');

    expect(response.status).toBe(200);
    expect(mockedFirebaseService.sendNotification).toHaveBeenCalledWith(
      'test-fcm-token',
      expect.stringContaining('Lunch Recommendation'),
      expect.stringContaining('Try Test Restaurant'),
      expect.objectContaining({
        type: 'location_recommendation',
        mealType: 'lunch'
      })
    );
  });

  test('should handle notification failure in recommendations', async () => {
    // Mock to return no location (which will result in no recommendations)
    mockedLocationModel.findByUserId.mockResolvedValue(null);

    const response = await request(app)
      .post('/recommendations/notify/lunch');

    // Should handle no location gracefully with 204 status
    expect(response.status).toBe(204);
  });
});