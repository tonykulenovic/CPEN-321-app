import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach } from '@jest/globals';

import pinsRoutes from '../../../src/routes/pins.routes';
import { userModel } from '../../../src/models/user.model';
import { pinModel } from '../../../src/models/pin.model';
import { PinCategory, PinVisibility } from '../../../src/types/pins.types';

// Create Express app with routes and authentication middleware
function createAuthenticatedApp() {
  const app = express();
  app.use(express.json());

  // Add authentication middleware
  app.use(async (req: any, res: any, next: any) => {
    const userId = req.headers['x-dev-user-id'];
    const authHeader = req.headers.authorization;

    if (!authHeader || !userId) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required',
      });
    }

    try {
      const user = await (userModel as any).user.findById(new mongoose.Types.ObjectId(userId as string));
      if (!user) {
        return res.status(401).json({
          error: 'User not found',
          message: 'Invalid user ID',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Failed to authenticate user',
      });
    }
  });

  app.use('/api/pins', pinsRoutes);

  return app;
}

// Helper to add auth headers
const withAuth = (user: any) => (req: request.Test) => {
  return req
    .set('Authorization', 'Bearer test-token-12345')
    .set('x-dev-user-id', user._id.toString());
};

describe('Pins Controller - CRUD Operations', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;

  beforeEach(async () => {
    app = createAuthenticatedApp();

    // Create test users
    testUser1 = await (userModel as any).user.create({
      name: `User One ${Date.now()}`,
      username: `user1_${Date.now()}`,
      email: `user1_${Date.now()}@example.com`,
      googleId: `google1_${Date.now()}`,
      password: 'password123',
    });

    testUser2 = await (userModel as any).user.create({
      name: `User Two ${Date.now()}`,
      username: `user2_${Date.now()}`,
      email: `user2_${Date.now()}@example.com`,
      googleId: `google2_${Date.now()}`,
      password: 'password123',
    });
  });

  describe('POST /api/pins - Create pin', () => {
    // Input: Valid pin data with all required fields
    // Expected status code: 201
    // Expected behavior: Pin is created and badge event is processed
    // Expected output: Success message with created pin
    test('Successfully create a pin with valid data', async () => {
      const pinData = {
        name: 'Test Study Spot',
        category: PinCategory.STUDY,
        description: 'A great place to study with good wifi and quiet atmosphere',
        location: {
          latitude: 49.2606,
          longitude: -123.2460,
          address: '6133 University Blvd, Vancouver',
        },
        visibility: PinVisibility.PUBLIC,
      };

      const res = await withAuth(testUser1)(
        request(app)
          .post('/api/pins')
          .send(pinData)
      );

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Pin created successfully');
      expect(res.body.data).toHaveProperty('pin');
      expect(res.body.data.pin.name).toBe(pinData.name);
      expect(res.body.data.pin.category).toBe(pinData.category);
      expect(res.body.data.pin.createdBy).toEqual(
        expect.objectContaining({ _id: testUser1._id.toString() })
      );
    });

    // Input: Pin with EVENTS category
    // Expected status code: 201
    // Expected behavior: Pin is created
    // Expected output: Success with pin data
    test('Create pin with EVENTS category', async () => {
      const pinData = {
        name: 'Campus Concert',
        category: PinCategory.EVENTS,
        description: 'Live music event happening at the plaza this weekend',
        location: {
          latitude: 49.2606,
          longitude: -123.2460,
        },
        visibility: PinVisibility.PUBLIC,
      };

      const res = await withAuth(testUser1)(
        request(app)
          .post('/api/pins')
          .send(pinData)
      );

      expect(res.status).toBe(201);
      expect(res.body.data.pin.category).toBe(PinCategory.EVENTS);
    });

    // Input: Pin with FRIENDS_ONLY visibility
    // Expected status code: 201
    // Expected behavior: Pin is created with limited visibility
    // Expected output: Success with visibility set to friends
    test('Create pin with FRIENDS_ONLY visibility', async () => {
      const pinData = {
        name: 'Private Study Session',
        category: PinCategory.STUDY,
        description: 'Study session for friends only, quiet environment',
        location: {
          latitude: 49.2606,
          longitude: -123.2460,
        },
        visibility: PinVisibility.FRIENDS_ONLY,
      };

      const res = await withAuth(testUser1)(
        request(app)
          .post('/api/pins')
          .send(pinData)
      );

      expect(res.status).toBe(201);
      expect(res.body.data.pin.visibility).toBe(PinVisibility.FRIENDS_ONLY);
    });

    // Input: Missing required field (name)
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Validation error
    test('Reject pin creation with missing name', async () => {
      const pinData = {
        category: PinCategory.STUDY,
        description: 'A great place to study',
        location: {
          latitude: 49.2606,
          longitude: -123.2460,
        },
      };

      const res = await withAuth(testUser1)(
        request(app)
          .post('/api/pins')
          .send(pinData)
      );

      expect(res.status).toBe(400);
    });

    // Input: Invalid latitude (outside range)
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Validation error
    test('Reject pin with invalid latitude', async () => {
      const pinData = {
        name: 'Invalid Location',
        category: PinCategory.STUDY,
        description: 'This pin has invalid coordinates',
        location: {
          latitude: 100, // Invalid: > 90
          longitude: -123.2460,
        },
      };

      const res = await withAuth(testUser1)(
        request(app)
          .post('/api/pins')
          .send(pinData)
      );

      expect(res.status).toBe(400);
    });

    // Input: Description too short (< 10 characters)
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Validation error
    test('Reject pin with too short description', async () => {
      const pinData = {
        name: 'Test Pin',
        category: PinCategory.STUDY,
        description: 'Short', // Less than 10 characters
        location: {
          latitude: 49.2606,
          longitude: -123.2460,
        },
      };

      const res = await withAuth(testUser1)(
        request(app)
          .post('/api/pins')
          .send(pinData)
      );

      expect(res.status).toBe(400);
    });

    // Input: Request without authentication
    // Expected status code: 401
    // Expected behavior: Request is rejected
    // Expected output: Authentication error
    test('Reject pin creation without authentication', async () => {
      const pinData = {
        name: 'Test Pin',
        category: PinCategory.STUDY,
        description: 'A great place to study',
        location: {
          latitude: 49.2606,
          longitude: -123.2460,
        },
      };

      const res = await request(app)
        .post('/api/pins')
        .send(pinData);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/pins/:id - Get pin by ID', () => {
    let testPin: any;

    beforeEach(async () => {
      // Create a test pin
      testPin = await pinModel.create(testUser1._id, {
        name: 'Test Pin',
        category: PinCategory.STUDY,
        description: 'Test description for studying',
        location: {
          latitude: 49.2606,
          longitude: -123.2460,
        },
        visibility: PinVisibility.PUBLIC,
      });
    });

    // Input: Valid pin ID
    // Expected status code: 200
    // Expected behavior: Pin details are returned
    // Expected output: Pin data
    test('Successfully get pin by ID', async () => {
      const res = await withAuth(testUser1)(
        request(app)
          .get(`/api/pins/${testPin._id.toString()}`)
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Pin fetched successfully');
      expect(res.body.data.pin._id).toBe(testPin._id.toString());
      expect(res.body.data.pin.name).toBe('Test Pin');
    });

    // Input: Non-existent pin ID
    // Expected status code: 404
    // Expected behavior: Pin not found error
    // Expected output: Error message
    test('Return 404 for non-existent pin', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await withAuth(testUser1)(
        request(app)
          .get(`/api/pins/${fakeId.toString()}`)
      );

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message', 'Pin not found');
    });

    // Input: Invalid pin ID format
    // Expected status code: 500
    // Expected behavior: Error handling
    // Expected output: Error message
    test('Handle invalid pin ID format', async () => {
      const res = await withAuth(testUser1)(
        request(app)
          .get('/api/pins/invalid-id')
      );

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/pins/:id - Update pin', () => {
    let testPin: any;

    beforeEach(async () => {
      testPin = await pinModel.create(testUser1._id, {
        name: 'Original Pin',
        category: PinCategory.STUDY,
        description: 'Original description for this study spot',
        location: {
          latitude: 49.2606,
          longitude: -123.2460,
        },
        visibility: PinVisibility.PUBLIC,
      });
    });

    // Input: Valid update data from pin owner
    // Expected status code: 200
    // Expected behavior: Pin is updated
    // Expected output: Success with updated pin
    test('Successfully update own pin', async () => {
      const updateData = {
        name: 'Updated Pin Name',
        description: 'This is the updated description for the study spot',
      };

      const res = await withAuth(testUser1)(
        request(app)
          .put(`/api/pins/${testPin._id.toString()}`)
          .send(updateData)
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Pin updated successfully');
      expect(res.body.data.pin.name).toBe(updateData.name);
      expect(res.body.data.pin.description).toBe(updateData.description);
    });

    // Input: Update attempt from non-owner
    // Expected status code: 404
    // Expected behavior: Request is rejected (visibility filtering)
    // Expected output: Not found error
    test('Reject update from non-owner', async () => {
      const updateData = {
        name: 'Hacked Name',
      };

      const res = await withAuth(testUser2)(
        request(app)
          .put(`/api/pins/${testPin._id.toString()}`)
          .send(updateData)
      );

      expect(res.status).toBe(404);
    });

    // Input: Update with invalid data (description too short)
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Validation error
    test('Reject update with invalid description', async () => {
      const updateData = {
        description: 'Short', // Less than 10 characters
      };

      const res = await withAuth(testUser1)(
        request(app)
          .put(`/api/pins/${testPin._id.toString()}`)
          .send(updateData)
      );

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/pins/:id - Delete pin', () => {
    let testPin: any;

    beforeEach(async () => {
      testPin = await pinModel.create(testUser1._id, {
        name: 'Pin to Delete',
        category: PinCategory.CHILL,
        description: 'This pin will be deleted during testing',
        location: {
          latitude: 49.2606,
          longitude: -123.2460,
        },
        visibility: PinVisibility.PUBLIC,
      });
    });

    // Input: Valid pin ID from owner
    // Expected status code: 200
    // Expected behavior: Pin is deleted
    // Expected output: Success message
    test('Successfully delete own pin', async () => {
      const res = await withAuth(testUser1)(
        request(app)
          .delete(`/api/pins/${testPin._id.toString()}`)
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Pin deleted successfully');

      // Verify pin is actually deleted
      const checkRes = await withAuth(testUser1)(
        request(app)
          .get(`/api/pins/${testPin._id.toString()}`)
      );
      expect(checkRes.status).toBe(404);
    });

    // Input: Delete attempt from non-owner
    // Expected status code: 404
    // Expected behavior: Request is rejected (visibility filtering)
    // Expected output: Not found error
    test('Reject delete from non-owner', async () => {
      const res = await withAuth(testUser2)(
        request(app)
          .delete(`/api/pins/${testPin._id.toString()}`)
      );

      expect(res.status).toBe(404);
    });

    // Input: Delete non-existent pin
    // Expected status code: 404
    // Expected behavior: Pin not found error
    // Expected output: Error message
    test('Return 404 when deleting non-existent pin', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await withAuth(testUser1)(
        request(app)
          .delete(`/api/pins/${fakeId.toString()}`)
      );

      expect(res.status).toBe(404);
    });
  });
});
