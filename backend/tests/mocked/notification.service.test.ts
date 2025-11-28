import { describe, test, beforeEach, expect, jest } from '@jest/globals';
import mongoose from 'mongoose';

// Mock external dependencies
jest.mock('../../../src/models/user.model');
jest.mock('../../../src/config/firebase');

// Import after mocking
import { notificationService } from '../../../src/services/notification.service';
import { userModel } from '../../../src/models/user.model';
import { firebaseService } from '../../../src/config/firebase';

const mockedUserModel = jest.mocked(userModel);
const mockedFirebaseService = jest.mocked(firebaseService);

describe('NotificationService Mocked Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendFriendRequestNotification', () => {
    test('should send notification when user has FCM token', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const fromUserId = '507f1f77bcf86cd799439011';
      const fromUserName = 'John Doe';

      const mockUser = {
        _id: new mongoose.Types.ObjectId(toUserId),
        name: 'Jane Smith',
        fcmToken: 'test-fcm-token'
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);
      mockedFirebaseService.sendNotification.mockResolvedValue(true);

      await notificationService.sendFriendRequestNotification(toUserId, fromUserId, fromUserName);

      expect(mockedUserModel.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId(toUserId));
      expect(mockedFirebaseService.sendNotification).toHaveBeenCalledWith(
        'test-fcm-token',
        'New Friend Request',
        'John Doe wants to be your friend',
        {
          type: 'friend_request_received',
          fromUserId,
          fromUserName
        }
      );
    });

    test('should not send notification when user has no FCM token', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const fromUserId = '507f1f77bcf86cd799439011';
      const fromUserName = 'John Doe';

      const mockUser = {
        _id: new mongoose.Types.ObjectId(toUserId),
        name: 'Jane Smith',
        fcmToken: null
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);

      await notificationService.sendFriendRequestNotification(toUserId, fromUserId, fromUserName);

      expect(mockedUserModel.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId(toUserId));
      expect(mockedFirebaseService.sendNotification).not.toHaveBeenCalled();
    });

    test('should handle Firebase service errors gracefully', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const fromUserId = '507f1f77bcf86cd799439011';
      const fromUserName = 'John Doe';

      const mockUser = {
        _id: new mongoose.Types.ObjectId(toUserId),
        name: 'Jane Smith',
        fcmToken: 'test-fcm-token'
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);
      mockedFirebaseService.sendNotification.mockRejectedValue(new Error('Firebase error'));

      // Should not throw, but handle error gracefully
      await expect(
        notificationService.sendFriendRequestNotification(toUserId, fromUserId, fromUserName)
      ).resolves.not.toThrow();

      expect(mockedFirebaseService.sendNotification).toHaveBeenCalledWith(
        'test-fcm-token',
        'New Friend Request',
        'John Doe wants to be your friend',
        {
          type: 'friend_request_received',
          fromUserId,
          fromUserName
        }
      );
    });

    test('should handle database errors gracefully', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const fromUserId = '507f1f77bcf86cd799439011';
      const fromUserName = 'John Doe';

      mockedUserModel.findById.mockRejectedValue(new Error('Database error'));

      // Should not throw, but handle error gracefully
      await expect(
        notificationService.sendFriendRequestNotification(toUserId, fromUserId, fromUserName)
      ).resolves.not.toThrow();

      expect(mockedUserModel.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId(toUserId));
      expect(mockedFirebaseService.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendFriendRequestAcceptedNotification', () => {
    test('should send notification when user has FCM token', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const fromUserId = '507f1f77bcf86cd799439011';
      const fromUserName = 'Jane Smith';

      const mockUser = {
        _id: new mongoose.Types.ObjectId(toUserId),
        name: 'John Doe',
        fcmToken: 'test-fcm-token'
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);
      mockedFirebaseService.sendNotification.mockResolvedValue(true);

      await notificationService.sendFriendRequestAcceptedNotification(toUserId, fromUserId, fromUserName);

      expect(mockedUserModel.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId(toUserId));
      expect(mockedFirebaseService.sendNotification).toHaveBeenCalledWith(
        'test-fcm-token',
        'Friend Request Accepted',
        'Jane Smith accepted your friend request',
        {
          type: 'friend_request_accepted',
          fromUserId,
          fromUserName
        }
      );
    });

    test('should not send notification when user has no FCM token', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const fromUserId = '507f1f77bcf86cd799439011';
      const fromUserName = 'Jane Smith';

      const mockUser = {
        _id: new mongoose.Types.ObjectId(toUserId),
        name: 'John Doe',
        fcmToken: null
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);

      await notificationService.sendFriendRequestAcceptedNotification(toUserId, fromUserId, fromUserName);

      expect(mockedUserModel.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId(toUserId));
      expect(mockedFirebaseService.sendNotification).not.toHaveBeenCalled();
    });

    test('should handle Firebase service errors gracefully', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const fromUserId = '507f1f77bcf86cd799439011';
      const fromUserName = 'Jane Smith';

      const mockUser = {
        _id: new mongoose.Types.ObjectId(toUserId),
        name: 'John Doe',
        fcmToken: 'test-fcm-token'
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);
      mockedFirebaseService.sendNotification.mockRejectedValue(new Error('Firebase error'));

      await expect(
        notificationService.sendFriendRequestAcceptedNotification(toUserId, fromUserId, fromUserName)
      ).resolves.not.toThrow();

      expect(mockedFirebaseService.sendNotification).toHaveBeenCalledWith(
        'test-fcm-token',
        'Friend Request Accepted',
        'Jane Smith accepted your friend request',
        {
          type: 'friend_request_accepted',
          fromUserId,
          fromUserName
        }
      );
    });
  });

  describe('sendLocationRecommendationNotification', () => {
    test('should send notification when user has FCM token', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const title = '🍽️ Lunch Recommendation';
      const body = 'Try Cafe Downtown - 500m away. Great spot for lunch!';
      const recommendationData = {
        pinId: '507f1f77bcf86cd799439013',
        mealType: 'lunch',
        distance: 500,
        score: 85
      };

      const mockUser = {
        _id: new mongoose.Types.ObjectId(toUserId),
        name: 'John Doe',
        fcmToken: 'test-fcm-token'
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);
      mockedFirebaseService.sendNotification.mockResolvedValue(true);

      const result = await notificationService.sendLocationRecommendationNotification(
        toUserId, title, body, recommendationData
      );

      expect(result).toBe(true);
      expect(mockedUserModel.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId(toUserId));
      expect(mockedFirebaseService.sendNotification).toHaveBeenCalledWith(
        'test-fcm-token',
        title,
        body,
        {
          type: 'location_recommendation',
          ...recommendationData
        }
      );
    });

    test('should return false when user has no FCM token', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const title = '🍽️ Lunch Recommendation';
      const body = 'Try Cafe Downtown - 500m away. Great spot for lunch!';
      const recommendationData = {
        pinId: '507f1f77bcf86cd799439013',
        mealType: 'lunch',
        distance: 500,
        score: 85
      };

      const mockUser = {
        _id: new mongoose.Types.ObjectId(toUserId),
        name: 'John Doe',
        fcmToken: null
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);

      const result = await notificationService.sendLocationRecommendationNotification(
        toUserId, title, body, recommendationData
      );

      expect(result).toBe(false);
      expect(mockedUserModel.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId(toUserId));
      expect(mockedFirebaseService.sendNotification).not.toHaveBeenCalled();
    });

    test('should handle Firebase service errors gracefully', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const title = '🍽️ Lunch Recommendation';
      const body = 'Try Cafe Downtown - 500m away. Great spot for lunch!';
      const recommendationData = {
        pinId: '507f1f77bcf86cd799439013',
        mealType: 'lunch',
        distance: 500,
        score: 85
      };

      const mockUser = {
        _id: new mongoose.Types.ObjectId(toUserId),
        name: 'John Doe',
        fcmToken: 'test-fcm-token'
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);
      mockedFirebaseService.sendNotification.mockRejectedValue(new Error('Firebase error'));

      const result = await notificationService.sendLocationRecommendationNotification(
        toUserId, title, body, recommendationData
      );

      expect(result).toBe(false);
      expect(mockedFirebaseService.sendNotification).toHaveBeenCalledWith(
        'test-fcm-token',
        title,
        body,
        {
          type: 'location_recommendation',
          ...recommendationData
        }
      );
    });

    test('should return false when Firebase service returns false', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const title = '🍽️ Lunch Recommendation';
      const body = 'Try Cafe Downtown - 500m away. Great spot for lunch!';
      const recommendationData = {
        pinId: '507f1f77bcf86cd799439013',
        mealType: 'lunch',
        distance: 500,
        score: 85
      };

      const mockUser = {
        _id: new mongoose.Types.ObjectId(toUserId),
        name: 'John Doe',
        fcmToken: 'test-fcm-token'
      };

      mockedUserModel.findById.mockResolvedValue(mockUser as any);
      mockedFirebaseService.sendNotification.mockResolvedValue(false);

      const result = await notificationService.sendLocationRecommendationNotification(
        toUserId, title, body, recommendationData
      );

      expect(result).toBe(false);
      expect(mockedFirebaseService.sendNotification).toHaveBeenCalledWith(
        'test-fcm-token',
        title,
        body,
        {
          type: 'location_recommendation',
          ...recommendationData
        }
      );
    });

    test('should handle database errors gracefully', async () => {
      const toUserId = '507f1f77bcf86cd799439012';
      const title = '🍽️ Lunch Recommendation';
      const body = 'Try Cafe Downtown - 500m away. Great spot for lunch!';
      const recommendationData = {
        pinId: '507f1f77bcf86cd799439013',
        mealType: 'lunch',
        distance: 500,
        score: 85
      };

      mockedUserModel.findById.mockRejectedValue(new Error('Database error'));

      const result = await notificationService.sendLocationRecommendationNotification(
        toUserId, title, body, recommendationData
      );

      expect(result).toBe(false);
      expect(mockedUserModel.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId(toUserId));
      expect(mockedFirebaseService.sendNotification).not.toHaveBeenCalled();
    });
  });
});