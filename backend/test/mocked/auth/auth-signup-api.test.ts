import express from 'express';
import request from 'supertest';
import { authService } from '../../../src/services/auth.service';
import { validateBody } from '../../../src/middleware/validation.middleware';
import logger from '../../../src/utils/logger.util';

// Mock dependencies
jest.mock('../../../src/services/auth.service');
jest.mock('../../../src/utils/logger.util');

// Import routes after mocking dependencies
import authRoutes from '../../../src/routes/auth.routes';
import { errorHandler } from '../../../src/middleware/errorHandler.middleware';

describe('Auth Signup API Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    
    // Add error handler middleware for proper error responses
    app.use(errorHandler);
    
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    const validSignupData = {
      idToken: 'valid-google-id-token-12345',
      username: 'testuser123'
    };

    const mockAuthResult = {
      token: 'jwt-token-12345',
      user: {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser123',
        email: 'test@example.com',
        displayName: 'Test User',
        profilePicture: 'https://example.com/profile.jpg',
        createdAt: '2025-11-28T19:25:46.796Z',
        updatedAt: '2025-11-28T19:25:46.796Z'
      }
    };

    it('should successfully sign up a new user with valid data', async () => {
      (authService.signUpWithGoogle as jest.Mock).mockResolvedValue(mockAuthResult);

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'User signed up successfully',
        data: mockAuthResult
      });

      expect(authService.signUpWithGoogle).toHaveBeenCalledWith(
        validSignupData.idToken,
        validSignupData.username
      );
      expect(authService.signUpWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for missing idToken', async () => {
      const invalidData = {
        username: 'testuser123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid input data');
      expect(authService.signUpWithGoogle).not.toHaveBeenCalled();
    });

    it('should return 400 for empty idToken', async () => {
      const invalidData = {
        idToken: '',
        username: 'testuser123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid input data');
      expect(response.body).toHaveProperty('error', 'Validation error');
      expect(authService.signUpWithGoogle).not.toHaveBeenCalled();
    });

    it('should return 400 for missing username', async () => {
      const invalidData = {
        idToken: 'valid-google-id-token-12345'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid input data');
      expect(authService.signUpWithGoogle).not.toHaveBeenCalled();
    });

    it('should return 400 for username too short (less than 3 characters)', async () => {
      const invalidData = {
        idToken: 'valid-google-id-token-12345',
        username: 'ab'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid input data');
      expect(response.body).toHaveProperty('error', 'Validation error');
      expect(authService.signUpWithGoogle).not.toHaveBeenCalled();
    });

    it('should return 400 for username too long (more than 20 characters)', async () => {
      const invalidData = {
        idToken: 'valid-google-id-token-12345',
        username: 'thisusernameiswaytoolongandexceeds20chars'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid input data');
      expect(response.body).toHaveProperty('error', 'Validation error');
      expect(authService.signUpWithGoogle).not.toHaveBeenCalled();
    });

    it('should return 400 for username with invalid characters', async () => {
      const invalidData = {
        idToken: 'valid-google-id-token-12345',
        username: 'test-user@123'  // contains invalid characters - and @
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid input data');
      expect(response.body).toHaveProperty('error', 'Validation error');
      expect(authService.signUpWithGoogle).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid Google token', async () => {
      (authService.signUpWithGoogle as jest.Mock).mockRejectedValue(
        new Error('Invalid Google token')
      );

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(401);

      expect(response.body).toEqual({
        message: 'Invalid Google token'
      });

      expect(authService.signUpWithGoogle).toHaveBeenCalledWith(
        validSignupData.idToken,
        validSignupData.username
      );
      expect(logger.error).toHaveBeenCalledWith('Google sign up error:', expect.any(Error));
    });

    it('should return 409 when user already exists', async () => {
      (authService.signUpWithGoogle as jest.Mock).mockRejectedValue(
        new Error('User already exists')
      );

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(409);

      expect(response.body).toEqual({
        message: 'User already exists, please sign in instead.'
      });

      expect(authService.signUpWithGoogle).toHaveBeenCalledWith(
        validSignupData.idToken,
        validSignupData.username
      );
      expect(logger.error).toHaveBeenCalledWith('Google sign up error:', expect.any(Error));
    });

    it('should return 409 when username is already taken', async () => {
      (authService.signUpWithGoogle as jest.Mock).mockRejectedValue(
        new Error('Username already taken')
      );

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(409);

      expect(response.body).toEqual({
        message: 'Username already taken, please choose another.'
      });

      expect(authService.signUpWithGoogle).toHaveBeenCalledWith(
        validSignupData.idToken,
        validSignupData.username
      );
      expect(logger.error).toHaveBeenCalledWith('Google sign up error:', expect.any(Error));
    });

    it('should return 500 for failed user processing', async () => {
      (authService.signUpWithGoogle as jest.Mock).mockRejectedValue(
        new Error('Failed to process user')
      );

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to process user information'
      });

      expect(authService.signUpWithGoogle).toHaveBeenCalledWith(
        validSignupData.idToken,
        validSignupData.username
      );
      expect(logger.error).toHaveBeenCalledWith('Google sign up error:', expect.any(Error));
    });

    it('should return 500 for unexpected errors', async () => {
      (authService.signUpWithGoogle as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignupData)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Internal server error'
      });

      expect(authService.signUpWithGoogle).toHaveBeenCalledWith(
        validSignupData.idToken,
        validSignupData.username
      );
      expect(logger.error).toHaveBeenCalledWith('Google sign up error:', expect.any(Error));
    });

    it('should return 400 for malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send('invalid-json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(authService.signUpWithGoogle).not.toHaveBeenCalled();
    });

    it('should return 400 for empty request body', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid input data');
      expect(authService.signUpWithGoogle).not.toHaveBeenCalled();
    });

    it('should handle valid username edge cases', async () => {
      const edgeCaseUsernames = [
        'abc',           // minimum length
        'user_123',      // with underscore
        'User123',       // mixed case
        'a'.repeat(20),  // maximum length
        '123456',        // numbers only
        'ABC_DEF_123'    // mixed with underscores
      ];

      (authService.signUpWithGoogle as jest.Mock).mockResolvedValue(mockAuthResult);

      for (const username of edgeCaseUsernames) {
        const data = {
          idToken: 'valid-google-id-token-12345',
          username
        };

        const response = await request(app)
          .post('/api/auth/signup')
          .send(data)
          .expect(201);

        expect(response.body).toEqual({
          message: 'User signed up successfully',
          data: mockAuthResult
        });

        expect(authService.signUpWithGoogle).toHaveBeenCalledWith(
          data.idToken,
          username
        );

        jest.clearAllMocks();
        (authService.signUpWithGoogle as jest.Mock).mockResolvedValue(mockAuthResult);
      }
    });

    it('should handle non-string inputs correctly', async () => {
      const invalidData = {
        idToken: 123, // number instead of string
        username: true // boolean instead of string
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid input data');
      expect(authService.signUpWithGoogle).not.toHaveBeenCalled();
    });
  });
});