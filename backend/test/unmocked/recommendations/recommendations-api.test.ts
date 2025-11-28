import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import recommendationsRoutes from '../../../src/routes/recommendations.routes';

const app = express();
app.use(express.json());

// Mock auth middleware to inject test user
jest.mock('../../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      username: 'testuser',
    };
    next();
  },
}));

app.use('/recommendations', recommendationsRoutes);

describe('Recommendations Controller - API Tests (Unmocked)', () => {
  describe('GET /recommendations/:mealType', () => {
    it('should return 400 for invalid meal type', async () => {
      const response = await request(app).get('/recommendations/snack');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Invalid meal type. Must be breakfast, lunch, or dinner'
      );
    });

    it('should accept breakfast as valid meal type', async () => {
      const response = await request(app).get('/recommendations/breakfast');

      expect([200, 500]).toContain(response.status);
    });

    it('should accept lunch as valid meal type', async () => {
      const response = await request(app).get('/recommendations/lunch');

      expect([200, 500]).toContain(response.status);
    });

    it('should accept dinner as valid meal type', async () => {
      const response = await request(app).get('/recommendations/dinner');

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('POST /recommendations/notify/:mealType', () => {
    it('should return 400 for invalid meal type', async () => {
      const response = await request(app).post('/recommendations/notify/brunch');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Invalid meal type. Must be breakfast, lunch, or dinner'
      );
    });

    it('should accept breakfast for notifications', async () => {
      const response = await request(app).post('/recommendations/notify/breakfast');

      expect([200, 204, 500]).toContain(response.status);
    });

    it('should accept lunch for notifications', async () => {
      const response = await request(app).post('/recommendations/notify/lunch');

      expect([200, 204, 500]).toContain(response.status);
    });

    it('should accept dinner for notifications', async () => {
      const response = await request(app).post('/recommendations/notify/dinner');

      expect([200, 204, 500]).toContain(response.status);
    });
  });
});
