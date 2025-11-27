import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest, describe, test, beforeEach, expect } from '@jest/globals';

import { authService } from '../../src/services/auth.service';
import authRoutes from '../../src/routes/auth.routes';

// Mock external dependencies
jest.mock('../../src/services/auth.service');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('Mocked: POST /auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: authService.signUpWithGoogle returns user and token
  // Input: valid idToken and username
  // Expected status code: 201
  // Expected behavior: creates new user and returns auth token
  // Expected output: success message, token, and user data
  test('Sign up with valid Google token and username', async () => {
    const mockUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      googleId: 'google123',
      email: 'newuser@gmail.com',
      name: 'New User',
      username: 'newuser',
      profilePicture: 'https://example.com/photo.jpg',
      isAdmin: false,
      isSuspended: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAuthResult = {
      token: 'mock-jwt-token-123',
      user: mockUser,
    };

    mockAuthService.signUpWithGoogle.mockResolvedValue(mockAuthResult as any);

    const response = await request(app)
      .post('/auth/signup')
      .send({
        idToken: 'valid-google-token',
        username: 'newuser',
      })
      .expect(201);

    expect(response.body.message).toBe('User signed up successfully');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.token).toBe('mock-jwt-token-123');
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.username).toBe('newuser');
    expect(response.body.data.user.email).toBe('newuser@gmail.com');
    expect(mockAuthService.signUpWithGoogle).toHaveBeenCalledWith('valid-google-token', 'newuser');
  });

  // Mocked behavior: authService.signUpWithGoogle throws 'Invalid Google token' error
  // Input: invalid idToken
  // Expected status code: 401
  // Expected behavior: rejects invalid token
  // Expected output: error message
  test('Reject signup with invalid Google token', async () => {
    mockAuthService.signUpWithGoogle.mockRejectedValue(new Error('Invalid Google token'));

    const response = await request(app)
      .post('/auth/signup')
      .send({
        idToken: 'invalid-token',
        username: 'newuser',
      })
      .expect(401);

    expect(response.body.message).toBe('Invalid Google token');
    expect(response.body.data).toBeUndefined();
  });

  // Mocked behavior: authService.signUpWithGoogle throws 'User already exists' error
  // Input: valid token for existing user
  // Expected status code: 409
  // Expected behavior: rejects duplicate user
  // Expected output: error message suggesting sign in
  test('Reject signup for existing user', async () => {
    mockAuthService.signUpWithGoogle.mockRejectedValue(new Error('User already exists'));

    const response = await request(app)
      .post('/auth/signup')
      .send({
        idToken: 'valid-google-token',
        username: 'existinguser',
      })
      .expect(409);

    expect(response.body.message).toBe('User already exists, please sign in instead.');
    expect(response.body.data).toBeUndefined();
  });

  // Mocked behavior: authService.signUpWithGoogle throws 'Username already taken' error
  // Input: valid token but username is taken
  // Expected status code: 409
  // Expected behavior: rejects duplicate username
  // Expected output: error message suggesting different username
  test('Reject signup with taken username', async () => {
    mockAuthService.signUpWithGoogle.mockRejectedValue(new Error('Username already taken'));

    const response = await request(app)
      .post('/auth/signup')
      .send({
        idToken: 'valid-google-token',
        username: 'takenusername',
      })
      .expect(409);

    expect(response.body.message).toBe('Username already taken, please choose another.');
    expect(response.body.data).toBeUndefined();
  });

  // Mocked behavior: request validation fails
  // Input: missing username
  // Expected status code: 400
  // Expected behavior: validation middleware rejects request
  // Expected output: validation error
  test('Reject signup with missing username', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({
        idToken: 'valid-google-token',
      })
      .expect(400);

    expect(response.body.message).toContain('Invalid input data');
    expect(mockAuthService.signUpWithGoogle).not.toHaveBeenCalled();
  });

  // Mocked behavior: request validation fails
  // Input: missing idToken
  // Expected status code: 400
  // Expected behavior: validation middleware rejects request
  // Expected output: validation error
  test('Reject signup with missing idToken', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({
        username: 'newuser',
      })
      .expect(400);

    expect(response.body.message).toContain('Invalid input data');
    expect(mockAuthService.signUpWithGoogle).not.toHaveBeenCalled();
  });

  // Mocked behavior: request validation fails
  // Input: username too short
  // Expected status code: 400
  // Expected behavior: validation middleware rejects request
  // Expected output: validation error
  test('Reject signup with username too short', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({
        idToken: 'valid-google-token',
        username: 'ab',
      })
      .expect(400);

    expect(response.body.message).toContain('Invalid input data');
    expect(mockAuthService.signUpWithGoogle).not.toHaveBeenCalled();
  });

  // Mocked behavior: request validation fails
  // Input: username with invalid characters
  // Expected status code: 400
  // Expected behavior: validation middleware rejects request
  // Expected output: validation error
  test('Reject signup with invalid username characters', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({
        idToken: 'valid-google-token',
        username: 'user@name!',
      })
      .expect(400);

    expect(response.body.message).toContain('Invalid input data');
    expect(mockAuthService.signUpWithGoogle).not.toHaveBeenCalled();
  });

  // Mocked behavior: authService.signUpWithGoogle throws 'Failed to process user' error
  // Input: valid idToken and username but processing fails
  // Expected status code: 500
  // Expected behavior: rejects with internal server error
  // Expected output: error message about processing failure
  test('Reject signup when user processing fails', async () => {
    mockAuthService.signUpWithGoogle.mockRejectedValue(new Error('Failed to process user'));

    const response = await request(app)
      .post('/auth/signup')
      .send({
        idToken: 'valid-google-token',
        username: 'newuser',
      })
      .expect(500);

    expect(response.body.message).toBe('Failed to process user information');
    expect(response.body.data).toBeUndefined();
  });

  // Mocked behavior: authService.signUpWithGoogle throws unexpected error
  // Input: valid idToken and username but unexpected error occurs
  // Expected status code: 500
  // Expected behavior: passes error to error handler middleware via next()
  // Expected output: generic error message
  test('Handle unexpected error during signup', async () => {
    mockAuthService.signUpWithGoogle.mockRejectedValue(new Error('Unexpected database error'));

    const response = await request(app)
      .post('/auth/signup')
      .send({
        idToken: 'valid-google-token',
        username: 'newuser',
      })
      .expect(500);

    // The error should be passed to the error handler middleware
    expect(response.body).toBeDefined();
  });
});

describe('Mocked: POST /auth/signin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: authService.signInWithGoogle returns user and token
  // Input: valid idToken for existing user
  // Expected status code: 200
  // Expected behavior: signs in existing user and returns auth token
  // Expected output: success message, token, and user data
  test('Sign in with valid Google token', async () => {
    const mockUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      googleId: 'google123',
      email: 'existinguser@gmail.com',
      name: 'Existing User',
      username: 'existinguser',
      profilePicture: 'https://example.com/photo.jpg',
      isAdmin: false,
      isSuspended: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAuthResult = {
      token: 'mock-jwt-token-456',
      user: mockUser,
    };

    mockAuthService.signInWithGoogle.mockResolvedValue(mockAuthResult as any);

    const response = await request(app)
      .post('/auth/signin')
      .send({
        idToken: 'valid-google-token',
      })
      .expect(200);

    expect(response.body.message).toBe('User signed in successfully');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.token).toBe('mock-jwt-token-456');
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.username).toBe('existinguser');
    expect(response.body.data.user.email).toBe('existinguser@gmail.com');
    expect(mockAuthService.signInWithGoogle).toHaveBeenCalledWith('valid-google-token');
  });

  // Mocked behavior: authService.signInWithGoogle throws 'Invalid Google token' error
  // Input: invalid idToken
  // Expected status code: 401
  // Expected behavior: rejects invalid token
  // Expected output: error message
  test('Reject signin with invalid Google token', async () => {
    mockAuthService.signInWithGoogle.mockRejectedValue(new Error('Invalid Google token'));

    const response = await request(app)
      .post('/auth/signin')
      .send({
        idToken: 'invalid-token',
      })
      .expect(401);

    expect(response.body.message).toBe('Invalid Google token');
    expect(response.body.data).toBeUndefined();
  });

  // Mocked behavior: authService.signInWithGoogle throws 'User not found' error
  // Input: valid token for non-existent user
  // Expected status code: 404
  // Expected behavior: rejects non-existent user
  // Expected output: error message suggesting sign up
  test('Reject signin for non-existent user', async () => {
    mockAuthService.signInWithGoogle.mockRejectedValue(new Error('User not found'));

    const response = await request(app)
      .post('/auth/signin')
      .send({
        idToken: 'valid-google-token',
      })
      .expect(404);

    expect(response.body.message).toBe('User not found, please sign up first.');
    expect(response.body.data).toBeUndefined();
  });

  // Mocked behavior: request validation fails
  // Input: missing idToken
  // Expected status code: 400
  // Expected behavior: validation middleware rejects request
  // Expected output: validation error
  test('Reject signin with missing idToken', async () => {
    const response = await request(app)
      .post('/auth/signin')
      .send({})
      .expect(400);

    expect(response.body.message).toContain('Invalid input data');
    expect(mockAuthService.signInWithGoogle).not.toHaveBeenCalled();
  });

  // Mocked behavior: authService.signInWithGoogle throws 'Failed to process user' error
  // Input: valid idToken but processing fails
  // Expected status code: 500
  // Expected behavior: rejects with internal server error
  // Expected output: error message about processing failure
  test('Reject signin when user processing fails', async () => {
    mockAuthService.signInWithGoogle.mockRejectedValue(new Error('Failed to process user'));

    const response = await request(app)
      .post('/auth/signin')
      .send({
        idToken: 'valid-google-token',
      })
      .expect(500);

    expect(response.body.message).toBe('Failed to process user information');
    expect(response.body.data).toBeUndefined();
  });

  // Mocked behavior: authService.signInWithGoogle throws unexpected error
  // Input: valid idToken but unexpected error occurs
  // Expected status code: 500
  // Expected behavior: passes error to error handler middleware via next()
  // Expected output: generic error message
  test('Handle unexpected error during signin', async () => {
    mockAuthService.signInWithGoogle.mockRejectedValue(new Error('Unexpected database error'));

    const response = await request(app)
      .post('/auth/signin')
      .send({
        idToken: 'valid-google-token',
      })
      .expect(500);

    // The error should be passed to the error handler middleware
    expect(response.body).toBeDefined();
  });
});

describe('Mocked: POST /auth/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: authService.checkGoogleAccountExists returns true
  // Input: valid idToken for existing user
  // Expected status code: 200
  // Expected behavior: checks if Google account exists in database
  // Expected output: success message with exists: true
  test('Check existing Google account', async () => {
    mockAuthService.checkGoogleAccountExists.mockResolvedValue(true);

    const response = await request(app)
      .post('/auth/check')
      .send({
        idToken: 'valid-google-token',
      })
      .expect(200);

    expect(response.body.message).toBe('Check completed');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.exists).toBe(true);
    expect(mockAuthService.checkGoogleAccountExists).toHaveBeenCalledWith('valid-google-token');
  });

  // Mocked behavior: authService.checkGoogleAccountExists returns false
  // Input: valid idToken for non-existent user
  // Expected status code: 200
  // Expected behavior: checks if Google account exists in database
  // Expected output: success message with exists: false
  test('Check non-existent Google account', async () => {
    mockAuthService.checkGoogleAccountExists.mockResolvedValue(false);

    const response = await request(app)
      .post('/auth/check')
      .send({
        idToken: 'valid-google-token',
      })
      .expect(200);

    expect(response.body.message).toBe('Check completed');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.exists).toBe(false);
    expect(mockAuthService.checkGoogleAccountExists).toHaveBeenCalledWith('valid-google-token');
  });

  // Mocked behavior: authService.checkGoogleAccountExists throws 'Invalid Google token' error
  // Input: invalid idToken
  // Expected status code: 401
  // Expected behavior: rejects invalid token
  // Expected output: error message
  test('Reject check with invalid Google token', async () => {
    mockAuthService.checkGoogleAccountExists.mockRejectedValue(new Error('Invalid Google token'));

    const response = await request(app)
      .post('/auth/check')
      .send({
        idToken: 'invalid-token',
      })
      .expect(401);

    expect(response.body.message).toBe('Invalid Google token');
    expect(response.body.data).toBeUndefined();
  });

  // Mocked behavior: request validation fails
  // Input: missing idToken
  // Expected status code: 400
  // Expected behavior: validation middleware rejects request
  // Expected output: validation error
  test('Reject check with missing idToken', async () => {
    const response = await request(app)
      .post('/auth/check')
      .send({})
      .expect(400);

    expect(response.body.message).toContain('Invalid input data');
    expect(mockAuthService.checkGoogleAccountExists).not.toHaveBeenCalled();
  });

  // Mocked behavior: authService.checkGoogleAccountExists throws unexpected error
  // Input: valid idToken but unexpected error occurs
  // Expected status code: 500
  // Expected behavior: passes error to error handler middleware via next()
  // Expected output: generic error message
  test('Handle unexpected error during check', async () => {
    mockAuthService.checkGoogleAccountExists.mockRejectedValue(new Error('Unexpected database error'));

    const response = await request(app)
      .post('/auth/check')
      .send({
        idToken: 'valid-google-token',
      })
      .expect(500);

    // The error should be passed to the error handler middleware
    expect(response.body).toBeDefined();
  });
});
