import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { AuthService } from '../../../src/services/auth.service';
import { userModel } from '../../../src/models/user.model';
import authRoutes from '../../../src/routes/auth.routes';
import { errorHandler } from '../../../src/middleware/errorHandler.middleware';

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

describe('AuthService - signUpWithGoogle Method', () => {
  let mongoServer: MongoMemoryServer;
  let authService: AuthService;
  let app: express.Application;

  beforeAll(async () => {
    // Setup in-memory MongoDB for testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    await mongoose.connect(mongoUri);
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    
    authService = new AuthService();
    
    // Set up Express app for API testing
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    // Clear database using mongoose directly
    const User = mongoose.model('User');
    await User.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should successfully create a new regular user', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google123',
        email: 'user@example.com',
        name: 'John Doe',
        picture: 'https://example.com/pic.jpg',
      }),
    });

    const result = await authService.signUpWithGoogle('valid-token', 'testuser');

    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('user');
    expect(result.user.username).toBe('testuser');
    expect(result.user.email).toBe('user@example.com');
    expect(result.user.isAdmin).toBe(false);
    expect(typeof result.token).toBe('string');
  });

  it('should successfully create an admin user for universe.cpen321@gmail.com', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'admin123',
        email: 'universe.cpen321@gmail.com',
        name: 'Admin User',
        picture: 'https://example.com/admin.jpg',
      }),
    });

    const result = await authService.signUpWithGoogle('admin-token', 'admin');

    expect(result.user.isAdmin).toBe(true);
    expect(result.user.email).toBe('universe.cpen321@gmail.com');
  });

  it('should throw error when Google token is invalid', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Token verification failed'));

    await expect(
      authService.signUpWithGoogle('invalid-token', 'testuser')
    ).rejects.toThrow('Invalid Google token');
  });

  it('should throw error when user with Google ID already exists', async () => {
    // Create an existing user using the userModel
    await userModel.create({
      googleId: 'existing123',
      email: 'existing@example.com',
      name: 'Existing User',
      username: 'existinguser',
      isAdmin: false,
    });

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'existing123',
        email: 'existing@example.com',
        name: 'Existing User',
        picture: 'https://example.com/pic.jpg',
      }),
    });

    await expect(
      authService.signUpWithGoogle('valid-token', 'newusername')
    ).rejects.toThrow('User already exists');
  });

  it('should throw error when username is already taken', async () => {
    // Create an existing user with taken username using userModel
    await userModel.create({
      googleId: 'different123',
      email: 'different@example.com',
      name: 'Different User',
      username: 'takenusername',
      isAdmin: false,
    });

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'newuser123',
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/pic.jpg',
      }),
    });

    // Test the current implementation - userModel.create() converts MongoDB errors to generic errors
    await expect(
      authService.signUpWithGoogle('valid-token', 'takenusername')
    ).rejects.toThrow('Failed to update user');
  });

  // API-level test to cover MongoDB duplicate key error handling
  it('should handle MongoDB duplicate key error correctly', async () => {
    // Mock Google token verification
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'newuser123',
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/pic.jpg',
      }),
    });

    // Mock userModel.create to throw the actual MongoDB duplicate key error
    const originalCreate = userModel.create;
    const mongoError = {
      code: 11000,
      keyPattern: { username: 1 },
      keyValue: { username: 'takenusername' }
    };
    userModel.create = jest.fn().mockRejectedValue(mongoError);

    await expect(
      authService.signUpWithGoogle('valid-token', 'takenusername')
    ).rejects.toThrow('Username already taken');

    // Restore original create method
    userModel.create = originalCreate;
  });
});