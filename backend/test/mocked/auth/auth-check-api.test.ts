import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import authRoutes from '../../../src/routes/auth.routes';
import { errorHandler } from '../../../src/middleware/errorHandler.middleware';
import { userModel } from '../../../src/models/user.model';

// Mock Google auth library
jest.mock('google-auth-library', () => {
  const mockVerifyIdToken = jest.fn();
  const mockOAuth2Client = jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  }));

  return {
    OAuth2Client: mockOAuth2Client,
    __getMockVerifyIdToken: () => mockVerifyIdToken,
  };
});

const { __getMockVerifyIdToken } = require('google-auth-library');
const mockVerifyIdToken = __getMockVerifyIdToken();

describe('Auth Check API Tests', () => {
  let app: express.Application;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Setup in-memory MongoDB for testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Disconnect any existing connection before creating a new one
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    await mongoose.connect(mongoUri);
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
    process.env.DEV_AUTH_TOKEN = 'test-token-12345';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    
    // Set up Express app with middleware
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
  });

  afterAll(async () => {
    // Clean up
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    jest.clearAllMocks();

    // Default mock for Google token verification
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google123456789',
        email: 'testuser@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        email_verified: true,
      }),
    });
  });

  describe('POST /api/auth/check', () => {
    const validCheckData = {
      idToken: 'valid.google.token'
    };

    describe('Validation Tests', () => {
      it('should return 400 for missing idToken', async () => {
        const response = await request(app)
          .post('/api/auth/check')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          message: 'Invalid input data',
          error: 'Validation error',
          details: [
            {
              field: 'idToken',
              message: 'Invalid input: expected string, received undefined',
            },
          ],
        });
      });

      it('should return 400 for empty idToken', async () => {
        const response = await request(app)
          .post('/api/auth/check')
          .send({ idToken: '' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          message: 'Invalid input data',
          error: 'Validation error',
          details: [
            {
              field: 'idToken',
              message: 'Google token is required',
            },
          ],
        });
      });

      it('should return 400 for non-string idToken', async () => {
        const response = await request(app)
          .post('/api/auth/check')
          .send({ idToken: 123 });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          message: 'Invalid input data',
          error: 'Validation error',
          details: [
            {
              field: 'idToken',
              message: 'Invalid input: expected string, received number',
            },
          ],
        });
      });

      it('should return 400 for malformed JSON', async () => {
        const response = await request(app)
          .post('/api/auth/check')
          .set('Content-Type', 'application/json')
          .send('invalid-json');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          message: 'Request body contains invalid JSON',
          error: 'Invalid JSON',
        });
      });

      it('should return 400 for empty request body', async () => {
        const response = await request(app)
          .post('/api/auth/check')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid input data');
      });
    });

    describe('Authentication Tests', () => {
      it('should return 401 for invalid Google token', async () => {
        mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

        const response = await request(app)
          .post('/api/auth/check')
          .send(validCheckData);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          message: 'Invalid Google token',
        });
      });

      it('should return 401 for Google token verification failure', async () => {
        mockVerifyIdToken.mockRejectedValueOnce(new Error('Token expired'));

        const response = await request(app)
          .post('/api/auth/check')
          .send(validCheckData);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          message: 'Invalid Google token',
        });
      });
    });

    describe('Success Tests', () => {
      it('should return true when user exists in database', async () => {
        // Create a user with the Google ID that matches our mock
        const user = new (userModel as any).user({
          username: 'testuser',
          email: 'testuser@example.com',
          googleId: 'google123456789',
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
          joinDate: new Date(),
          isActive: true,
        });
        await user.save();

        const response = await request(app)
          .post('/api/auth/check')
          .send(validCheckData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          message: 'Check completed',
          data: { exists: true }
        });

        expect(mockVerifyIdToken).toHaveBeenCalledWith({
          idToken: 'valid.google.token',
          audience: process.env.GOOGLE_CLIENT_ID,
        });
      });

      it('should return false when user does not exist in database', async () => {
        // Don't create any user, so the check should return false

        const response = await request(app)
          .post('/api/auth/check')
          .send(validCheckData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          message: 'Check completed',
          data: { exists: false }
        });

        expect(mockVerifyIdToken).toHaveBeenCalledWith({
          idToken: 'valid.google.token',
          audience: process.env.GOOGLE_CLIENT_ID,
        });
      });

      it('should work with different Google IDs', async () => {
        // Mock different Google ID
        mockVerifyIdToken.mockResolvedValueOnce({
          getPayload: () => ({
            sub: 'google987654321',
            email: 'anotheruser@example.com',
            name: 'Another User',
            picture: 'https://example.com/another-avatar.jpg',
            email_verified: true,
          }),
        });

        // Create a user with different Google ID
        const user = new (userModel as any).user({
          username: 'anotheruser',
          email: 'anotheruser@example.com',
          googleId: 'google987654321',
          name: 'Another User',
          avatar: 'https://example.com/another-avatar.jpg',
          joinDate: new Date(),
          isActive: true,
        });
        await user.save();

        const response = await request(app)
          .post('/api/auth/check')
          .send({ idToken: 'another.valid.token' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          message: 'Check completed',
          data: { exists: true }
        });
      });
    });

    describe('Error Handling Tests', () => {
      it('should handle database connection errors', async () => {
        // Mock database error by closing connection
        const originalFindByGoogleId = userModel.findByGoogleId;
        userModel.findByGoogleId = jest.fn().mockRejectedValue(new Error('Database connection error'));

        const response = await request(app)
          .post('/api/auth/check')
          .send(validCheckData);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          message: 'Internal server error',
        });

        // Restore original method
        userModel.findByGoogleId = originalFindByGoogleId;
      });

      it('should handle unexpected errors gracefully', async () => {
        // Mock unexpected error
        const originalFindByGoogleId = userModel.findByGoogleId;
        userModel.findByGoogleId = jest.fn().mockRejectedValue(new Error('Unexpected error'));

        const response = await request(app)
          .post('/api/auth/check')
          .send(validCheckData);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          message: 'Internal server error',
        });

        // Restore original method
        userModel.findByGoogleId = originalFindByGoogleId;
      });

      it('should handle Google payload parsing errors', async () => {
        // Mock Google verification to return invalid payload
        mockVerifyIdToken.mockResolvedValueOnce({
          getPayload: () => null,
        });

        const response = await request(app)
          .post('/api/auth/check')
          .send(validCheckData);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          message: 'Invalid Google token',
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle null user lookup result correctly', async () => {
        // Mock findByGoogleId to return null explicitly
        const originalFindByGoogleId = userModel.findByGoogleId;
        userModel.findByGoogleId = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post('/api/auth/check')
          .send(validCheckData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          message: 'Check completed',
          data: { exists: false }
        });

        // Restore original method
        userModel.findByGoogleId = originalFindByGoogleId;
      });

      it('should handle very long idToken strings', async () => {
        const longToken = 'a'.repeat(10000);
        
        const response = await request(app)
          .post('/api/auth/check')
          .send({ idToken: longToken });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          message: 'Check completed',
          data: { exists: false }
        });
      });

      it('should handle special characters in idToken', async () => {
        const specialToken = 'token.with.special@chars#$%^&*()';
        
        const response = await request(app)
          .post('/api/auth/check')
          .send({ idToken: specialToken });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          message: 'Check completed',
          data: { exists: false }
        });
      });
    });

    describe('Response Format Tests', () => {
      it('should return consistent response structure for existing user', async () => {
        // Create a user
        const user = new (userModel as any).user({
          username: 'testuser',
          email: 'testuser@example.com',
          googleId: 'google123456789',
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
          joinDate: new Date(),
          isActive: true,
        });
        await user.save();

        const response = await request(app)
          .post('/api/auth/check')
          .send(validCheckData);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('exists');
        expect(typeof response.body.data.exists).toBe('boolean');
        expect(response.body.data.exists).toBe(true);
      });

      it('should return consistent response structure for non-existing user', async () => {
        const response = await request(app)
          .post('/api/auth/check')
          .send(validCheckData);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('exists');
        expect(typeof response.body.data.exists).toBe('boolean');
        expect(response.body.data.exists).toBe(false);
      });
    });
  });
});