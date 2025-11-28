import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import userRoutes from '../../../src/routes/user.routes';
import { errorHandler } from '../../../src/middleware/errorHandler.middleware';
import { userModel } from '../../../src/models/user.model';
import { friendshipModel } from '../../../src/models/friendship.model';

// Mock external dependencies
jest.mock('../../../src/models/user.model');
jest.mock('../../../src/models/friendship.model');

describe('User Privacy Search API - canViewUserProfile Method', () => {
  let app: express.Application;
  let mongoServer: MongoMemoryServer;

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
    
    // Set up Express app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware to provide user context
    app.use((req, res, next) => {
      // Mock current user for all requests with valid token
      if (req.headers.authorization === 'Bearer valid-token') {
        req.user = {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
          username: 'currentuser',
          email: 'current@example.com',
          name: 'Current User',
          isAdmin: false,
        };
      }
      next();
    });
    
    app.use('/users', userRoutes);
    app.use(errorHandler);
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /search - Privacy filtering through canViewUserProfile', () => {
    it('should return users with "everyone" privacy setting', async () => {
      // Mock search results with various privacy settings
      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
          username: 'public_user',
          name: 'Public User',
          profilePicture: 'public.jpg',
          privacy: { profileVisibleTo: 'everyone' }
        },
      ];

      userModel.searchUsers = jest.fn().mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/users/search?q=user')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Users search completed successfully');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].username).toBe('public_user');
      expect(response.body.data[0].displayName).toBe('Public User');
    });

    it('should return users with "friends" privacy setting when users are friends', async () => {
      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'),
          username: 'friend_user',
          name: 'Friend User',
          profilePicture: 'friend.jpg',
          privacy: { profileVisibleTo: 'friends' }
        },
      ];

      userModel.searchUsers = jest.fn().mockResolvedValue(mockUsers);
      friendshipModel.areFriends = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .get('/users/search?q=friend')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].username).toBe('friend_user');
      expect(friendshipModel.areFriends).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439021')
      );
    });

    it('should exclude users with "friends" privacy setting when users are not friends', async () => {
      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439022'),
          username: 'not_friend_user',
          name: 'Not Friend User',
          profilePicture: 'notfriend.jpg',
          privacy: { profileVisibleTo: 'friends' }
        },
      ];

      userModel.searchUsers = jest.fn().mockResolvedValue(mockUsers);
      friendshipModel.areFriends = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .get('/users/search?q=not')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0); // User filtered out due to privacy
      expect(friendshipModel.areFriends).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439022')
      );
    });

    it('should exclude users with "private" privacy setting completely', async () => {
      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439023'),
          username: 'private_user',
          name: 'Private User',
          profilePicture: 'private.jpg',
          privacy: { profileVisibleTo: 'private' }
        },
      ];

      userModel.searchUsers = jest.fn().mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/users/search?q=private')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0); // User filtered out due to private setting
      // friendshipModel.areFriends should not be called for private profiles
      expect(friendshipModel.areFriends).not.toHaveBeenCalled();
    });

    it('should exclude users with unknown privacy setting (defaults to private)', async () => {
      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439024'),
          username: 'unknown_privacy_user',
          name: 'Unknown Privacy User',
          profilePicture: 'unknown.jpg',
          privacy: { profileVisibleTo: 'invalid_setting' as any }
        },
      ];

      userModel.searchUsers = jest.fn().mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/users/search?q=unknown')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0); // User filtered out due to unknown setting defaulting to private
      expect(friendshipModel.areFriends).not.toHaveBeenCalled();
    });

    it('should handle mixed privacy settings correctly', async () => {
      const currentUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
      
      const mockUsers = [
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439025'),
          username: 'everyone_user',
          name: 'Everyone User',
          profilePicture: 'everyone.jpg',
          privacy: { profileVisibleTo: 'everyone' }
        },
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439026'),
          username: 'friend_user',
          name: 'Friend User',
          profilePicture: 'friend.jpg',
          privacy: { profileVisibleTo: 'friends' }
        },
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439027'),
          username: 'private_user',
          name: 'Private User',
          profilePicture: 'private.jpg',
          privacy: { profileVisibleTo: 'private' }
        },
      ];

      userModel.searchUsers = jest.fn().mockResolvedValue(mockUsers);
      
      // Mock friendship: current user is friends with friend_user but not others
      friendshipModel.areFriends = jest.fn().mockImplementation((viewerId, targetId) => {
        const friendUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439026');
        return Promise.resolve(targetId.equals(friendUserId));
      });

      const response = await request(app)
        .get('/users/search?q=user')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2); // everyone_user and friend_user should be returned
      expect(response.body.data.map((u: any) => u.username)).toEqual(
        expect.arrayContaining(['everyone_user', 'friend_user'])
      );
      expect(friendshipModel.areFriends).toHaveBeenCalledWith(currentUserId, mockUsers[1]._id);
    });
  });
});