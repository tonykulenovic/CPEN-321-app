import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { locationModel } from '../../../src/models/location.model';
import { pinModel } from '../../../src/models/pin.model';
import { notificationService } from '../../../src/services/notification.service';
import recommendationsRoutes from '../../../src/routes/recommendations.routes';

// Mock the dependencies
jest.mock('../../../src/models/location.model');
jest.mock('../../../src/models/pin.model');
jest.mock('../../../src/services/notification.service');

// Mock auth middleware
jest.mock('../../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
      });
      return;
    }

    req.user = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
    };
    next();
  },
}));

describe('Recommendations API - Simplified Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/recommendations', recommendationsRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/recommendations/:mealType', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Don't set Authorization header to trigger auth failure
      const response = await request(app)
        .get('/api/recommendations/breakfast')
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });

    it('should return 400 for invalid meal type', async () => {
      const response = await request(app)
        .get('/api/recommendations/snack')
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(response.body.message).toBe('Invalid meal type. Must be breakfast, lunch, or dinner');
    });

    it('should return 200 with recommendations when location and pins available', async () => {
      // Mock user location
      (locationModel.findByUserId as jest.Mock).mockResolvedValue({
        lat: 49.26,
        lng: -123.25
      });

      // Mock nearby pins for breakfast
      const mockPin = {
        _id: 'pin1',
        name: 'Morning Cafe',
        description: 'Great breakfast spot',
        location: { latitude: 49.261, longitude: -123.251 },
        rating: { upvotes: 8, downvotes: 2 },
        category: 'shops_services'
      };
      (pinModel.findNearbyForMeal as jest.Mock).mockResolvedValue([mockPin]);

      const response = await request(app)
        .get('/api/recommendations/breakfast')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.message).toBe('breakfast recommendations retrieved successfully');
      expect(response.body.data.recommendations).toHaveLength(1);
      expect(response.body.data.recommendations[0].pin.name).toBe('Morning Cafe');
      expect(response.body.data.recommendations[0].score).toBeGreaterThan(0);
      expect(response.body.data.recommendations[0].distance).toBeGreaterThan(0);
    });

    it('should return 200 with empty recommendations when no location found', async () => {
      (locationModel.findByUserId as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/recommendations/lunch')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.message).toBe('No location found for recommendations');
      expect(response.body.data.recommendations).toHaveLength(0);
    });

    it('should handle database errors with 500 response', async () => {
      (locationModel.findByUserId as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/recommendations/dinner')
        .set('Authorization', 'Bearer test-token')
        .expect(500);

      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('POST /api/recommendations/notify/:mealType', () => {
    it('should return 400 for invalid meal type', async () => {
      const response = await request(app)
        .post('/api/recommendations/notify/snack')
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(response.body.message).toBe('Invalid meal type. Must be breakfast, lunch, or dinner');
    });

    it('should return 200 when notification sent successfully', async () => {
      // Mock successful notification sending
      (locationModel.findByUserId as jest.Mock).mockResolvedValue({
        lat: 49.26,
        lng: -123.25
      });

      const mockPin = {
        _id: 'pin1',
        name: 'Lunch Bistro',
        location: { latitude: 49.261, longitude: -123.251 }
      };
      (pinModel.findNearbyForMeal as jest.Mock).mockResolvedValue([mockPin]);
      (notificationService.sendLocationRecommendationNotification as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/api/recommendations/notify/lunch')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.message).toBe('lunch recommendation notification sent successfully');
      expect(response.body.data.notificationSent).toBe(true);
    });

    it('should return 204 when no recommendations available', async () => {
      // Mock no location found
      (locationModel.findByUserId as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/recommendations/notify/dinner')
        .set('Authorization', 'Bearer test-token')
        .expect(204);

      // 204 No Content should have empty body
      expect(response.text).toBe('');
    });

    it('should handle database errors with 500 response', async () => {
      // Mock database error in sendMealRecommendationNotification by mocking location service
      (locationModel.findByUserId as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/recommendations/notify/breakfast')
        .set('Authorization', 'Bearer test-token')
        .expect(500);

      expect(response.body.message).toBe('Internal server error');
    });
  });
});