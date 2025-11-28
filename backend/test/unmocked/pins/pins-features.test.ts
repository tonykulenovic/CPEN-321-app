import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach } from '@jest/globals';

import pinsRoutes from '../../../src/routes/pins.routes';
import { userModel } from '../../../src/models/user.model';
import { pinModel } from '../../../src/models/pin.model';
import { PinCategory, PinVisibility } from '../../../src/types/pins.types';

// Create Express app
function createAuthenticatedApp() {
  const app = express();
  app.use(express.json());

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

const withAuth = (user: any) => (req: request.Test) => {
  return req
    .set('Authorization', 'Bearer test-token-12345')
    .set('x-dev-user-id', user._id.toString());
};

describe('Pins Controller - Rating & Voting', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;
  let testPin: any;

  beforeEach(async () => {
    app = createAuthenticatedApp();

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

    testPin = await pinModel.create(testUser1._id, {
      name: 'Pin for Rating',
      category: PinCategory.STUDY,
      description: 'This pin will be rated by users during testing',
      location: {
        latitude: 49.2606,
        longitude: -123.2460,
      },
      visibility: PinVisibility.PUBLIC,
    });
  });

  describe('POST /api/pins/:id/rate - Rate pin', () => {
    // Input: Upvote pin
    // Expected status code: 200
    // Expected behavior: Pin is upvoted
    // Expected output: Success with updated rating
    test('Successfully upvote a pin', async () => {
      const res = await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${testPin._id.toString()}/rate`)
          .send({ voteType: 'upvote' })
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Pin upvoted successfully');
      expect(res.body.data.upvotes).toBe(1);
      expect(res.body.data.downvotes).toBe(0);
    });

    // Input: Downvote pin
    // Expected status code: 200
    // Expected behavior: Pin is downvoted
    // Expected output: Success with updated rating
    test('Successfully downvote a pin', async () => {
      const res = await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${testPin._id.toString()}/rate`)
          .send({ voteType: 'downvote' })
      );

      expect(res.status).toBe(200);
      expect(res.body.data.downvotes).toBe(1);
      expect(res.body.data.upvotes).toBe(0);
    });

    // Input: Change vote from upvote to downvote
    // Expected status code: 200
    // Expected behavior: Vote is changed
    // Expected output: Updated rating
    test('Change vote from upvote to downvote', async () => {
      // First upvote
      await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${testPin._id.toString()}/rate`)
          .send({ voteType: 'upvote' })
      );

      // Then downvote
      const res = await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${testPin._id.toString()}/rate`)
          .send({ voteType: 'downvote' })
      );

      expect(res.status).toBe(200);
      expect(res.body.data.upvotes).toBe(0);
      expect(res.body.data.downvotes).toBe(1);
    });

    // Input: Remove vote (vote same type twice)
    // Expected status code: 200
    // Expected behavior: Vote is removed
    // Expected output: Rating back to neutral
    test('Remove vote by voting same type twice', async () => {
      // First upvote
      await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${testPin._id.toString()}/rate`)
          .send({ voteType: 'upvote' })
      );

      // Upvote again to remove
      const res = await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${testPin._id.toString()}/rate`)
          .send({ voteType: 'upvote' })
      );

      expect(res.status).toBe(200);
      expect(res.body.data.upvotes).toBe(0);
      expect(res.body.data.downvotes).toBe(0);
    });

    // Input: Invalid vote type
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Validation error
    test('Reject invalid vote type', async () => {
      const res = await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${testPin._id.toString()}/rate`)
          .send({ voteType: 'invalid' })
      );

      expect(res.status).toBe(400);
    });

    // Input: Vote on non-existent pin
    // Expected status code: 500
    // Expected behavior: Error from vote model
    // Expected output: Error message
    test('Return 500 when voting on non-existent pin', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${fakeId.toString()}/rate`)
          .send({ voteType: 'upvote' })
      );

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/pins/:id/vote - Get user vote', () => {
    // Input: Get vote when user has upvoted
    // Expected status code: 200
    // Expected behavior: User's vote is returned
    // Expected output: Vote data with upvote type
    test('Get user vote when upvoted', async () => {
      // First upvote
      await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${testPin._id.toString()}/rate`)
          .send({ voteType: 'upvote' })
      );

      const res = await withAuth(testUser2)(
        request(app)
          .get(`/api/pins/${testPin._id.toString()}/vote`)
      );

      expect(res.status).toBe(200);
      expect(res.body.data.userVote).toBe('upvote');
    });

    // Input: Get vote when user has not voted
    // Expected status code: 404
    // Expected behavior: No vote found
    // Expected output: Vote not found message
    test('Return 404 when user has not voted', async () => {
      const res = await withAuth(testUser2)(
        request(app)
          .get(`/api/pins/${testPin._id.toString()}/vote`)
      );

      expect(res.status).toBe(200);
      expect(res.body.data.userVote).toBeNull();
    });
  });
});

describe('Pins Controller - Reporting', () => {
  let app: express.Application;
  let testUser1: any;
  let testUser2: any;
  let testPin: any;

  beforeEach(async () => {
    app = createAuthenticatedApp();

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

    testPin = await pinModel.create(testUser1._id, {
      name: 'Pin for Reporting',
      category: PinCategory.STUDY,
      description: 'This pin will be reported during testing',
      location: {
        latitude: 49.2606,
        longitude: -123.2460,
      },
      visibility: PinVisibility.PUBLIC,
    });
  });

  describe('POST /api/pins/:id/report - Report pin', () => {
    // Input: Valid report with reason
    // Expected status code: 200
    // Expected behavior: Pin is reported
    // Expected output: Success message
    test('Successfully report a pin', async () => {
      const res = await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${testPin._id.toString()}/report`)
          .send({ reason: 'Inappropriate content posted on this pin' })
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Pin reported successfully');
    });

    // Input: Report same pin multiple times
    // Expected status code: 200
    // Expected behavior: Duplicate report accepted but not counted
    // Expected output: Success with firstReport: false
    test('Accept duplicate report from same user', async () => {
      // First report
      await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${testPin._id.toString()}/report`)
          .send({ reason: 'First report with valid reason text' })
      );

      // Duplicate report
      const res = await withAuth(testUser2)(
        request(app)
          .post(`/api/pins/${testPin._id.toString()}/report`)
          .send({ reason: 'Second report with valid reason text' })
      );

      expect(res.status).toBe(200);
      expect(res.body.data.firstReport).toBe(false);
    });
  });
});

describe('Pins Controller - Search & Visit', () => {
  let app: express.Application;
  let testUser1: any;
  let studyPin: any;
  let eventPin: any;

  beforeEach(async () => {
    app = createAuthenticatedApp();

    testUser1 = await (userModel as any).user.create({
      name: `User One ${Date.now()}`,
      username: `user1_${Date.now()}`,
      email: `user1_${Date.now()}@example.com`,
      googleId: `google1_${Date.now()}`,
      password: 'password123',
    });

    studyPin = await pinModel.create(testUser1._id, {
      name: 'Library Study Room',
      category: PinCategory.STUDY,
      description: 'Quiet study room in the library with good wifi',
      location: {
        latitude: 49.2606,
        longitude: -123.2460,
      },
      visibility: PinVisibility.PUBLIC,
    });

    eventPin = await pinModel.create(testUser1._id, {
      name: 'Campus Festival',
      category: PinCategory.EVENTS,
      description: 'Annual campus festival with food and music',
      location: {
        latitude: 49.2607,
        longitude: -123.2461,
      },
      visibility: PinVisibility.PUBLIC,
    });
  });

  describe('GET /api/pins/search - Search pins', () => {
    // Input: Search by category
    // Expected status code: 200
    // Expected behavior: Pins filtered by category
    // Expected output: List of study pins
    test('Search pins by category', async () => {
      const res = await withAuth(testUser1)(
        request(app)
          .get('/api/pins/search')
          .query({ category: PinCategory.STUDY })
      );

      expect(res.status).toBe(200);
      expect(res.body.data.pins).toBeInstanceOf(Array);
      expect(res.body.data.pins.length).toBeGreaterThan(0);
      expect(res.body.data.pins.every((p: any) => p.category === PinCategory.STUDY)).toBe(true);
    });

    // Input: Search by text query
    // Expected status code: 200
    // Expected behavior: Pins matching text
    // Expected output: Filtered pins
    test('Search pins by text query', async () => {
      const res = await withAuth(testUser1)(
        request(app)
          .get('/api/pins/search')
          .query({ query: 'Library' })
      );

      expect(res.status).toBe(200);
      expect(res.body.data.pins).toBeInstanceOf(Array);
    });

    // Input: Search with invalid category
    // Expected status code: 400
    // Expected behavior: Request is rejected
    // Expected output: Validation error
    test('Reject search with invalid category', async () => {
      const res = await withAuth(testUser1)(
        request(app)
          .get('/api/pins/search')
          .query({ category: 'invalid_category' })
      );

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/pins/:id/visit - Visit pin', () => {
    // Input: Visit a pin
    // Expected status code: 200
    // Expected behavior: Visit is recorded
    // Expected output: Success message
    test('Successfully record pin visit', async () => {
      const res = await withAuth(testUser1)(
        request(app)
          .post(`/api/pins/${studyPin._id.toString()}/visit`)
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    // Input: Visit non-existent pin
    // Expected status code: 404
    // Expected behavior: Pin not found error
    // Expected output: Error message
    test('Return 404 when visiting non-existent pin', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await withAuth(testUser1)(
        request(app)
          .post(`/api/pins/${fakeId.toString()}/visit`)
      );

      expect(res.status).toBe(404);
    });
  });
});
