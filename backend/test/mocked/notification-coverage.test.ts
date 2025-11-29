import { NotificationService } from '../../src/services/notification.service';
import { userModel } from '../../src/models/user.model';
import mongoose from 'mongoose';

// Mock the user model
jest.mock('../../src/models/user.model', () => ({
  userModel: {
    findById: jest.fn(),
  }
}));

describe('Notification Service Coverage', () => {
  let notificationService: NotificationService;
  let mockedUserModel: jest.Mocked<typeof userModel>;

  beforeEach(() => {
    notificationService = NotificationService.getInstance();
    mockedUserModel = userModel as jest.Mocked<typeof userModel>;
    jest.clearAllMocks();
  });

  test('should hit user not found line in sendFriendRequestNotification', async () => {
    const toUserId = '507f1f77bcf86cd799439012';
    const fromUserId = '507f1f77bcf86cd799439011';
    const fromUserName = 'John Doe';

    // Mock user not found
    mockedUserModel.findById.mockResolvedValue(null);

    await notificationService.sendFriendRequestNotification(toUserId, fromUserId, fromUserName);

    expect(mockedUserModel.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId(toUserId));
  });

  test('should hit user not found line in sendLocationRecommendationNotification', async () => {
    const toUserId = '507f1f77bcf86cd799439012';
    const title = 'Test Recommendation';
    const body = 'Test body';
    const recommendationData = {
      pinId: '507f1f77bcf86cd799439013',
      mealType: 'lunch',
      distance: 100,
      score: 85
    };

    // Mock user not found
    mockedUserModel.findById.mockResolvedValue(null);

    const result = await notificationService.sendLocationRecommendationNotification(
      toUserId, title, body, recommendationData
    );

    expect(result).toBe(false);
    expect(mockedUserModel.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId(toUserId));
  });
});