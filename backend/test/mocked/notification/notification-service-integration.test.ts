import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, beforeAll, beforeEach, afterAll, it, expect, jest } from '@jest/globals';

// Mock external dependencies
jest.mock('../../../src/config/firebase', () => ({
  firebaseService: {
    sendNotification: jest.fn(),
  }
}));

jest.mock('../../../src/models/user.model', () => ({
  userModel: {
    findById: jest.fn(),
    create: jest.fn(),
    incrementFriendsCount: jest.fn(),
  }
}));

jest.mock('../../../src/models/friendship.model', () => ({
  friendshipModel: {
    create: jest.fn(),
    findByUsers: jest.fn(),
    findByUserAndFriend: jest.fn(),
    updateStatus: jest.fn(),
    findById: jest.fn(),
  }
}));

jest.mock('../../../src/models/pin.model', () => ({
  pinModel: {
    find: jest.fn(),
    findById: jest.fn(),
  }
}));

jest.mock('../../../src/models/pinVote.model', () => ({
  pinVoteModel: {
    find: jest.fn(),
    aggregate: jest.fn(),
  }
}));

jest.mock('../../../src/models/location.model', () => ({
  locationModel: {
    findByUserId: jest.fn(),
    create: jest.fn(),
  }
}));

jest.mock('../../../src/services/weather.service', () => ({
  weatherService: {
    getCurrentWeather: jest.fn(),
    getWeatherRecommendations: jest.fn(),
  }
}));

jest.mock('../../../src/services/places.service', () => ({
  placesApiService: {
    getNearbyDiningOptions: jest.fn(),
  }
}));

jest.mock('../../../src/services/badge.service', () => ({
  badgeService: {
    processBadgeEvents: jest.fn(),
  }
}));

jest.mock('../../../src/services/recommendation.service', () => ({
  recommendationService: {
    generateRecommendations: jest.fn(),
    sendRecommendationNotification: jest.fn(),
  }
}));

jest.mock('../../../src/services/notification.service', () => ({
  notificationService: {
    sendFriendRequestNotification: jest.fn(),
    sendFriendRequestAcceptedNotification: jest.fn(),
    sendLocationRecommendationNotification: jest.fn(),
  }
}));

jest.mock('../../../src/services/recommendation.service', () => ({
  recommendationService: {
    generateRecommendations: jest.fn(),
    sendRecommendationNotification: jest.fn(),
  }
}));

// Mock auth middleware
jest.mock('../../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
    };
    next();
  },
}));

// Import after mocking
import { firebaseService } from '../../../src/config/firebase';
import { userModel } from '../../../src/models/user.model';
import { friendshipModel } from '../../../src/models/friendship.model';
import { locationModel } from '../../../src/models/location.model';
import { weatherService } from '../../../src/services/weather.service';
import { placesApiService } from '../../../src/services/places.service';
import { badgeService } from '../../../src/services/badge.service';
import friendsRoutes from '../../../src/routes/friends.routes';
import recommendationsRoutes from '../../../src/routes/recommendations.routes';

describe('Notification Service Integration Tests', () => {
  let app: express.Application;
  const testUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
  const targetUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012');

  const mockedFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
  const mockedUserModel = userModel as jest.Mocked<typeof userModel>;
  const mockedFriendshipModel = friendshipModel as jest.Mocked<typeof friendshipModel>;
  const mockedLocationModel = locationModel as jest.Mocked<typeof locationModel>;
  const mockedWeatherService = weatherService as jest.Mocked<typeof weatherService>;
  const mockedPlacesService = placesApiService as jest.Mocked<typeof placesApiService>;
  const mockedBadgeService = badgeService as jest.Mocked<typeof badgeService>;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/friends', friendsRoutes);
    app.use('/api/recommendations', recommendationsRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock behaviors
    mockedFirebaseService.sendNotification.mockResolvedValue(true);
    mockedBadgeService.processBadgeEvents.mockResolvedValue(undefined);
    mockedUserModel.incrementFriendsCount.mockResolvedValue();
    mockedWeatherService.getCurrentWeather.mockResolvedValue({
      condition: 'clear',
      temperature: 20,
      humidity: 50,
      description: 'Clear sky',
      isGoodForOutdoor: true,
    });
    mockedWeatherService.getWeatherRecommendations.mockReturnValue({
      preferOutdoor: true,
      suggestions: ['Great for outdoor dining'],
    });
    mockedPlacesService.getNearbyDiningOptions.mockResolvedValue([]);
  });

  describe('Friend Request Notification Tests', () => {
    it('should send friend request notification when sending friend request', async () => {
      // Setup mock data
      const fromUser = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        privacy: { allowFriendRequestsFrom: 'everyone' },
      };
      const toUser = {
        _id: targetUserId,
        name: 'Target User',
        email: 'target@example.com',
        username: 'targetuser',
        fcmToken: 'target-fcm-token',
        privacy: { allowFriendRequestsFrom: 'everyone' },
      };

      // Log calls to understand the sequence
      mockedUserModel.findById
        .mockImplementation((id: any) => {
          console.log(`🔍 findById called with ID: ${id?.toString()}`);
          return Promise.resolve(toUser as any);
        });

      mockedFriendshipModel.findByUserAndFriend.mockResolvedValue(null);
      mockedFriendshipModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        fromUserId: testUserId,
        toUserId: targetUserId,
        status: 'pending',
        createdAt: new Date(),
      } as any);

      const response = await request(app)
        .post('/api/friends/requests')
        .set('Authorization', 'Bearer test-token')
        .send({ toUserId: targetUserId.toString() })
        .expect(201);

      // Verify notification was sent
      expect(mockedFirebaseService.sendNotification).toHaveBeenCalledWith(
        'target-fcm-token',
        'New Friend Request',
        'Test User sent you a friend request',
        {
          type: 'friend_request_received',
          fromUserId: testUserId.toString(),
          fromUserName: 'Test User',
        }
      );

      expect(response.body.success).toBe(true);
    });

    it('should handle friend request notification when user not found', async () => {
      const fromUser = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        privacy: { allowFriendRequestsFrom: 'everyone' },
      };

      mockedUserModel.findById
        .mockResolvedValueOnce(fromUser as any)  // First call for fromUser
        .mockResolvedValueOnce(null);            // Second call for toUser - not found

      mockedFriendshipModel.findByUserAndFriend.mockResolvedValue(null);
      mockedFriendshipModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        fromUserId: testUserId,
        toUserId: targetUserId,
        status: 'pending',
        createdAt: new Date(),
      } as any);

      const response = await request(app)
        .post('/api/friends/requests')
        .set('Authorization', 'Bearer test-token')
        .send({ toUserId: targetUserId.toString() })
        .expect(201);

      // Notification should not be sent if user not found
      expect(mockedFirebaseService.sendNotification).not.toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should handle friend request notification when user has no FCM token', async () => {
      const fromUser = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        privacy: { allowFriendRequestsFrom: 'everyone' },
      };
      const toUserWithoutToken = {
        _id: targetUserId,
        name: 'Target User',
        email: 'target@example.com',
        username: 'targetuser',
        privacy: { allowFriendRequestsFrom: 'everyone' },
        // No fcmToken
      };

      mockedUserModel.findById
        .mockResolvedValueOnce(fromUser as any)
        .mockResolvedValueOnce(toUserWithoutToken as any);

      mockedFriendshipModel.findByUserAndFriend.mockResolvedValue(null);
      mockedFriendshipModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        fromUserId: testUserId,
        toUserId: targetUserId,
        status: 'pending',
        createdAt: new Date(),
      } as any);

      const response = await request(app)
        .post('/api/friends/requests')
        .set('Authorization', 'Bearer test-token')
        .send({ toUserId: targetUserId.toString() })
        .expect(201);

      // Notification should not be sent if no FCM token
      expect(mockedFirebaseService.sendNotification).not.toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should handle Firebase service failure during friend request notification', async () => {
      const fromUser = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        privacy: { allowFriendRequestsFrom: 'everyone' },
      };
      const toUser = {
        _id: targetUserId,
        name: 'Target User',
        email: 'target@example.com',
        username: 'targetuser',
        fcmToken: 'target-fcm-token',
        privacy: { allowFriendRequestsFrom: 'everyone' },
      };

      mockedUserModel.findById
        .mockResolvedValueOnce(fromUser as any)
        .mockResolvedValueOnce(toUser as any);

      mockedFriendshipModel.findByUserAndFriend.mockResolvedValue(null);
      mockedFriendshipModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        fromUserId: testUserId,
        toUserId: targetUserId,
        status: 'pending',
        createdAt: new Date(),
      } as any);

      // Simulate Firebase service failure
      mockedFirebaseService.sendNotification.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/friends/requests')
        .set('Authorization', 'Bearer test-token')
        .send({ toUserId: targetUserId.toString() })
        .expect(201);

      expect(mockedFirebaseService.sendNotification).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should handle notification error during friend request', async () => {
      const fromUser = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        privacy: { allowFriendRequestsFrom: 'everyone' },
      };
      const toUser = {
        _id: targetUserId,
        name: 'Target User',
        email: 'target@example.com',
        username: 'targetuser',
        fcmToken: 'target-fcm-token',
        privacy: { allowFriendRequestsFrom: 'everyone' },
      };

      mockedUserModel.findById
        .mockResolvedValueOnce(fromUser as any)
        .mockResolvedValueOnce(toUser as any);

      mockedFriendshipModel.findByUserAndFriend.mockResolvedValue(null);
      mockedFriendshipModel.create.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        fromUserId: testUserId,
        toUserId: targetUserId,
        status: 'pending',
        createdAt: new Date(),
      } as any);

      // Simulate notification error
      mockedFirebaseService.sendNotification.mockRejectedValue(new Error('Firebase error'));

      const response = await request(app)
        .post('/api/friends/requests')
        .set('Authorization', 'Bearer test-token')
        .send({ toUserId: targetUserId.toString() })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Friend Request Accepted Notification Tests', () => {
    it('should send friend request accepted notification when accepting friend request', async () => {
      const acceptingUser = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
      };
      const originalRequester = {
        _id: targetUserId,
        name: 'Original Requester',
        email: 'requester@example.com',
        username: 'requester',
        fcmToken: 'requester-fcm-token',
      };

      const friendRequest = {
        _id: new mongoose.Types.ObjectId(),
        fromUserId: targetUserId,
        toUserId: testUserId,
        status: 'pending',
        createdAt: new Date(),
      };

      mockedFriendshipModel.findById.mockResolvedValue(friendRequest as any);
      mockedFriendshipModel.updateStatus.mockResolvedValue(undefined);
      mockedUserModel.findById
        .mockResolvedValueOnce(acceptingUser as any)  // First call for accepting user
        .mockResolvedValueOnce(originalRequester as any); // Second call for notification

      const response = await request(app)
        .post(`/api/friends/requests/${friendRequest._id}/accept`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // Verify notification was sent
      expect(mockedFirebaseService.sendNotification).toHaveBeenCalledWith(
        'requester-fcm-token',
        'Friend Request Accepted',
        'Test User accepted your friend request',
        {
          type: 'friend_request_accepted',
          fromUserId: testUserId.toString(),
          fromUserName: 'Test User',
        }
      );

      expect(response.body.success).toBe(true);
    });

    it('should handle friend request accepted notification when accepting user not found', async () => {
      const friendRequest = {
        _id: new mongoose.Types.ObjectId(),
        fromUserId: targetUserId,
        toUserId: testUserId,
        status: 'pending',
        createdAt: new Date(),
      };

      mockedFriendshipModel.findById.mockResolvedValue(friendRequest as any);
      mockedFriendshipModel.updateStatus.mockResolvedValue(undefined);
      mockedUserModel.findById.mockResolvedValue(null); // Accepting user not found

      const response = await request(app)
        .post(`/api/friends/requests/${friendRequest._id}/accept`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // No notification should be sent if accepting user not found
      expect(mockedFirebaseService.sendNotification).not.toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should handle friend request accepted notification when original requester has no FCM token', async () => {
      const acceptingUser = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
      };
      const requesterWithoutToken = {
        _id: targetUserId,
        name: 'Original Requester',
        email: 'requester@example.com',
        username: 'requester',
        // No fcmToken
      };

      const friendRequest = {
        _id: new mongoose.Types.ObjectId(),
        fromUserId: targetUserId,
        toUserId: testUserId,
        status: 'pending',
        createdAt: new Date(),
      };

      mockedFriendshipModel.findById.mockResolvedValue(friendRequest as any);
      mockedFriendshipModel.updateStatus.mockResolvedValue(undefined);
      mockedUserModel.findById
        .mockResolvedValueOnce(acceptingUser as any)
        .mockResolvedValueOnce(requesterWithoutToken as any);

      const response = await request(app)
        .post(`/api/friends/requests/${friendRequest._id}/accept`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // No notification should be sent if no FCM token
      expect(mockedFirebaseService.sendNotification).not.toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should handle Firebase failure during friend request accepted notification', async () => {
      const acceptingUser = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
      };
      const originalRequester = {
        _id: targetUserId,
        name: 'Original Requester',
        email: 'requester@example.com',
        username: 'requester',
        fcmToken: 'requester-fcm-token',
      };

      const friendRequest = {
        _id: new mongoose.Types.ObjectId(),
        fromUserId: targetUserId,
        toUserId: testUserId,
        status: 'pending',
        createdAt: new Date(),
      };

      mockedFriendshipModel.findById.mockResolvedValue(friendRequest as any);
      mockedFriendshipModel.updateStatus.mockResolvedValue(undefined);
      mockedUserModel.findById
        .mockResolvedValueOnce(acceptingUser as any)
        .mockResolvedValueOnce(originalRequester as any);

      // Simulate Firebase failure
      mockedFirebaseService.sendNotification.mockResolvedValue(false);

      const response = await request(app)
        .post(`/api/friends/requests/${friendRequest._id}/accept`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(mockedFirebaseService.sendNotification).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should handle notification error during friend request acceptance', async () => {
      const acceptingUser = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
      };
      const originalRequester = {
        _id: targetUserId,
        name: 'Original Requester',
        email: 'requester@example.com',
        username: 'requester',
        fcmToken: 'requester-fcm-token',
      };

      const friendRequest = {
        _id: new mongoose.Types.ObjectId(),
        fromUserId: targetUserId,
        toUserId: testUserId,
        status: 'pending',
        createdAt: new Date(),
      };

      mockedFriendshipModel.findById.mockResolvedValue(friendRequest as any);
      mockedFriendshipModel.updateStatus.mockResolvedValue(undefined);
      mockedUserModel.findById
        .mockResolvedValueOnce(acceptingUser as any)
        .mockResolvedValueOnce(originalRequester as any);

      // Simulate notification error
      mockedFirebaseService.sendNotification.mockRejectedValue(new Error('Notification error'));

      const response = await request(app)
        .post(`/api/friends/requests/${friendRequest._id}/accept`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Location Recommendation Notification Tests', () => {
    it('should send location recommendation notification when recommendation exists', async () => {
      const user = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        fcmToken: 'test-fcm-token',
      };

      const location = {
        userId: testUserId,
        lat: 49.2827,
        lng: -123.1207,
        accuracy: 10,
        timestamp: new Date(),
      };

      const mockPin = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Restaurant',
        description: 'Great food',
        category: 'shops_services',
        location: {
          latitude: 49.2828,
          longitude: -123.1208,
        },
        rating: {
          upvotes: 10,
          downvotes: 2,
        },
        metadata: {
          cuisineType: ['Italian'],
          priceRange: '$$',
        },
      };

      // Mock mongoose.model for direct DB access
      const mockPinVoteFind = jest.fn().mockResolvedValue([]);
      const mockUserFindById = jest.fn().mockResolvedValue({ visitedPins: [] });
      const mockPinFind = jest.fn().mockResolvedValue({
        pins: [mockPin],
      });

      jest.doMock('mongoose', () => ({
        ...jest.requireActual('mongoose'),
        model: jest.fn().mockImplementation((modelName: string) => {
          if (modelName === 'PinVote') {
            return { find: mockPinVoteFind };
          }
          if (modelName === 'User') {
            return { findById: mockUserFindById };
          }
          if (modelName === 'Pin') {
            return { search: mockPinFind };
          }
          return {};
        }),
      }));

      mockedUserModel.findById.mockResolvedValue(user as any);
      mockedLocationModel.findByUserId.mockResolvedValue(location as any);

      const response = await request(app)
        .post('/api/recommendations/notify/lunch')
        .set('Authorization', 'Bearer test-token')
        .expect(204);

      // The notification should be attempted through the recommendation service
      // which calls the notification service internally
    });

    it('should handle location recommendation when user not found', async () => {
      const location = {
        userId: testUserId,
        lat: 49.2827,
        lng: -123.1207,
        accuracy: 10,
        timestamp: new Date(),
      };

      mockedUserModel.findById.mockResolvedValue(null); // User not found
      mockedLocationModel.findByUserId.mockResolvedValue(location as any);

      const response = await request(app)
        .post('/api/recommendations/notify/lunch')
        .set('Authorization', 'Bearer test-token')
        .expect(204);

      // Should handle gracefully when user not found
    });

    it('should handle location recommendation when user has no FCM token', async () => {
      const userWithoutToken = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        // No fcmToken
      };

      const location = {
        userId: testUserId,
        lat: 49.2827,
        lng: -123.1207,
        accuracy: 10,
        timestamp: new Date(),
      };

      mockedUserModel.findById.mockResolvedValue(userWithoutToken as any);
      mockedLocationModel.findByUserId.mockResolvedValue(location as any);

      const response = await request(app)
        .post('/api/recommendations/notify/lunch')
        .set('Authorization', 'Bearer test-token')
        .expect(204);

      // Should handle gracefully when user has no FCM token
    });

    it('should handle Firebase failure during location recommendation notification', async () => {
      const user = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        fcmToken: 'test-fcm-token',
      };

      const location = {
        userId: testUserId,
        lat: 49.2827,
        lng: -123.1207,
        accuracy: 10,
        timestamp: new Date(),
      };

      mockedUserModel.findById.mockResolvedValue(user as any);
      mockedLocationModel.findByUserId.mockResolvedValue(location as any);
      
      // Simulate Firebase failure
      mockedFirebaseService.sendNotification.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/recommendations/notify/lunch')
        .set('Authorization', 'Bearer test-token')
        .expect(204);

      // Should complete successfully even with Firebase failure
    });

    it('should handle notification error during location recommendation', async () => {
      const user = {
        _id: testUserId,
        name: 'Test User',
        email: 'test@example.com',
        username: 'testuser',
        fcmToken: 'test-fcm-token',
      };

      const location = {
        userId: testUserId,
        lat: 49.2827,
        lng: -123.1207,
        accuracy: 10,
        timestamp: new Date(),
      };

      mockedUserModel.findById.mockResolvedValue(user as any);
      mockedLocationModel.findByUserId.mockResolvedValue(location as any);
      
      // Simulate notification error
      mockedFirebaseService.sendNotification.mockRejectedValue(new Error('Notification error'));

      const response = await request(app)
        .post('/api/recommendations/notify/lunch')
        .set('Authorization', 'Bearer test-token')
        .expect(204);

      // Should complete successfully even with notification error
    });
  });

  afterAll(async () => {
    // Clean up if needed
  });
});