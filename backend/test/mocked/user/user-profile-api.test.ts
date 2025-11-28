import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import userRoutes from '../../../src/routes/user.routes';
import { errorHandler } from '../../../src/middleware/errorHandler.middleware';
import { userModel } from '../../../src/models/user.model';
import { MediaService } from '../../../src/services/media.service';
import { friendshipModel } from '../../../src/models/friendship.model';
import { badgeModel } from '../../../src/models/badge.model';

// Mock services
jest.mock('../../../src/services/media.service', () => ({
  MediaService: {
    deleteAllUserImages: jest.fn(),
  },
}));

jest.mock('../../../src/models/friendship.model', () => ({
  friendshipModel: {
    areFriends: jest.fn(),
  },
}));

jest.mock('../../../src/models/badge.model', () => ({
  badgeModel: {
    getUserBadges: jest.fn(),
  },
}));

jest.mock('../../../src/models/pin.model', () => ({
  pinModel: {
    deleteAllByUser: jest.fn(),
  },
}));

describe('User Routes - Profile API', () => {
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
    
    // Add auth middleware mock
    app.use((req, res, next) => {
      // Check for Authorization header to simulate auth middleware
      const authHeader = req.headers.authorization;
      if (authHeader === 'Bearer valid-token') {
        req.user = {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
          username: 'testuser',
          email: 'test@example.com',
          name: 'Test User',
          isAdmin: false,
        };
        next();
      } else if (authHeader === 'Bearer admin-token') {
        req.user = {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          username: 'adminuser',
          email: 'admin@example.com',
          name: 'Admin User',
          isAdmin: true,
        };
        next();
      } else {
        // No valid token found - simulate auth middleware behavior
        return res.status(401).json({ 
          error: 'Access denied',
          message: 'No token provided' 
        });
      }
    });
    
    app.use('/users', userRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    // Clear database
    const User = mongoose.model('User');
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('GET /profile', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get('/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 200 with user profile when authenticated', async () => {
      const response = await request(app)
        .get('/users/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile fetched successfully');
      expect(response.body.data.user).toEqual({
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        isAdmin: false,
      });
    });
  });

  describe('POST /profile', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .post('/users/profile')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 400 when validation fails', async () => {
      const response = await request(app)
        .post('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: '' }); // Invalid: empty string

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid input data');
    });

    it('should return 200 when profile is updated successfully', async () => {
      // Mock userModel.update to return updated user
      const originalUpdate = userModel.update;
      userModel.update = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        username: 'testuser',
        email: 'test@example.com',
        name: 'Updated Name',
        bio: 'Updated bio',
        isAdmin: false,
      });

      const response = await request(app)
        .post('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Name',
          bio: 'Updated bio'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User info updated successfully');
      expect(response.body.data.user.name).toBe('Updated Name');
      expect(response.body.data.user.bio).toBe('Updated bio');

      // Restore original method
      userModel.update = originalUpdate;
    });

    it('should return 500 when database update fails', async () => {
      // Mock userModel.update to throw error
      const originalUpdate = userModel.update;
      userModel.update = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/users/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Database error');

      // Restore original method
      userModel.update = originalUpdate;
    });
  });

  describe('DELETE /profile', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .delete('/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 200 when profile is deleted successfully', async () => {
      // Mock successful service calls
      (MediaService.deleteAllUserImages as jest.Mock).mockResolvedValue(undefined);
      
      const originalDelete = userModel.delete;
      userModel.delete = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/users/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');
      
      // Verify service calls were made
      expect(MediaService.deleteAllUserImages).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(userModel.delete).toHaveBeenCalledWith(new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'));

      // Restore original method
      userModel.delete = originalDelete;
    });

    it('should return 500 when media deletion fails', async () => {
      // Mock MediaService to throw error
      (MediaService.deleteAllUserImages as jest.Mock).mockRejectedValue(new Error('Media deletion failed'));

      const response = await request(app)
        .delete('/users/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Media deletion failed');
    });

    it('should return 500 when user deletion fails', async () => {
      // Mock successful media deletion but failed user deletion
      (MediaService.deleteAllUserImages as jest.Mock).mockResolvedValue(undefined);
      
      const originalDelete = userModel.delete;
      userModel.delete = jest.fn().mockRejectedValue(new Error('User deletion failed'));

      const response = await request(app)
        .delete('/users/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('User deletion failed');

      // Restore original method
      userModel.delete = originalDelete;
    });
  });

  describe('GET /:userId/profile', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get('/users/507f1f77bcf86cd799439012/profile');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 400 when userId format is invalid', async () => {
      const response = await request(app)
        .get('/users/invalid-id/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid user ID format');
    });

    it('should return 404 when target user does not exist', async () => {
      const originalFindById = userModel.findById;
      userModel.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/users/507f1f77bcf86cd799439012/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');

      userModel.findById = originalFindById;
    });

    it('should return 403 when users are not friends', async () => {
      // Mock target user exists
      const originalFindById = userModel.findById;
      userModel.findById = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        name: 'Friend User',
        username: 'frienduser',
      });

      // Mock users are not friends
      (friendshipModel.areFriends as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .get('/users/507f1f77bcf86cd799439012/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('You can only view profiles of your friends');

      userModel.findById = originalFindById;
    });

    it('should return 200 with friend profile when users are friends', async () => {
      const targetUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012');
      
      // Mock target user exists
      const originalFindById = userModel.findById;
      const originalGetOnlineStatus = userModel.getOnlineStatus;
      
      userModel.findById = jest.fn().mockResolvedValue({
        _id: targetUserId,
        name: 'Friend User',
        username: 'frienduser',
        email: 'friend@example.com',
        bio: 'Friend bio',
        campus: 'UBC',
        profilePicture: 'http://example.com/pic.jpg',
        friendsCount: 5,
        stats: {
          pinsCreated: 10,
          pinsVisited: 25,
          locationsExplored: 15,
          librariesVisited: 3,
          cafesVisited: 8,
          restaurantsVisited: 12,
        },
      });

      // Mock users are friends
      (friendshipModel.areFriends as jest.Mock).mockResolvedValue(true);

      // Mock online status
      userModel.getOnlineStatus = jest.fn().mockResolvedValue(
        new Map([[targetUserId.toString(), true]])
      );

      // Mock user badges
      (badgeModel.getUserBadges as jest.Mock).mockResolvedValue([
        { id: 'badge1', name: 'Explorer' },
        { id: 'badge2', name: 'Social' },
      ]);

      const response = await request(app)
        .get(`/users/${targetUserId.toString()}/profile`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Friend profile fetched successfully');
      expect(response.body.data).toEqual({
        userId: targetUserId.toString(),
        name: 'Friend User',
        username: 'frienduser',
        email: 'friend@example.com',
        bio: 'Friend bio',
        campus: 'UBC',
        profilePicture: 'http://example.com/pic.jpg',
        isOnline: true,
        friendsCount: 5,
        badgesCount: 2,
        stats: {
          pinsCreated: 10,
          pinsVisited: 25,
          locationsExplored: 15,
          librariesVisited: 3,
          cafesVisited: 8,
          restaurantsVisited: 12,
        },
        badges: [
          { id: 'badge1', name: 'Explorer' },
          { id: 'badge2', name: 'Social' },
        ],
      });

      // Verify service calls
      expect(friendshipModel.areFriends).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // current user
        targetUserId
      );
      expect(userModel.getOnlineStatus).toHaveBeenCalledWith([targetUserId], 10);
      expect(badgeModel.getUserBadges).toHaveBeenCalledWith(targetUserId);

      userModel.findById = originalFindById;
      userModel.getOnlineStatus = originalGetOnlineStatus;
    });

    it('should return 500 when database error occurs', async () => {
      const originalFindById = userModel.findById;
      userModel.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/users/507f1f77bcf86cd799439012/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Database error');

      userModel.findById = originalFindById;
    });
  });

  describe('GET /search', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get('/users/search?q=test');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 400 when query parameter is missing', async () => {
      const response = await request(app)
        .get('/users/search')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters');
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 when query parameter is empty', async () => {
      const response = await request(app)
        .get('/users/search?q=')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters');
    });

    it('should return 200 with search results when query is valid', async () => {
      // Mock userModel.searchUsers
      const originalSearchUsers = userModel.searchUsers;
      userModel.searchUsers = jest.fn().mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
          username: 'testuser1',
          name: 'Test User 1',
          profilePicture: 'http://example.com/pic1.jpg',
          privacy: { profileVisibleTo: 'everyone' }
        },
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'),
          username: 'testuser2', 
          name: 'Test User 2',
          profilePicture: 'http://example.com/pic2.jpg',
          privacy: { profileVisibleTo: 'friends' }
        },
        {
          // Current user - should be filtered out
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
          username: 'testuser',
          name: 'Test User',
          privacy: { profileVisibleTo: 'everyone' }
        }
      ]);

      const response = await request(app)
        .get('/users/search?q=test&limit=10')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Users search completed successfully');
      expect(response.body.data).toHaveLength(2); // Current user filtered out
      expect(response.body.data[0]).toEqual({
        _id: '507f1f77bcf86cd799439020',
        username: 'testuser1',
        displayName: 'Test User 1',
        photoUrl: 'http://example.com/pic1.jpg'
      });
      expect(response.body.data[1]).toEqual({
        _id: '507f1f77bcf86cd799439021',
        username: 'testuser2',
        displayName: 'Test User 2', 
        photoUrl: 'http://example.com/pic2.jpg'
      });

      // Verify search was called with correct parameters
      expect(userModel.searchUsers).toHaveBeenCalledWith('test', 60); // 10 + 50

      userModel.searchUsers = originalSearchUsers;
    });

    it('should use default limit when not specified', async () => {
      const originalSearchUsers = userModel.searchUsers;
      userModel.searchUsers = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/users/search?q=test')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(userModel.searchUsers).toHaveBeenCalledWith('test', 70); // 20 + 50 (default limit + buffer)

      userModel.searchUsers = originalSearchUsers;
    });

    it('should return 500 when database search fails', async () => {
      const originalSearchUsers = userModel.searchUsers;
      userModel.searchUsers = jest.fn().mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .get('/users/search?q=test')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');

      userModel.searchUsers = originalSearchUsers;
    });
  });

  describe('GET /me', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get('/users/me');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 200 with current user profile when authenticated', async () => {
      const response = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile fetched successfully');
      expect(response.body.data.user).toEqual({
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        isAdmin: false,
      });
    });
  });

  describe('PATCH /me/privacy', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .patch('/users/me/privacy')
        .send({ profileVisibleTo: 'friends' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 400 when request body is invalid', async () => {
      const response = await request(app)
        .patch('/users/me/privacy')
        .set('Authorization', 'Bearer valid-token')
        .send({ profileVisibleTo: 'invalid_value' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid request body');
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 when no privacy settings are provided', async () => {
      const response = await request(app)
        .patch('/users/me/privacy')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('At least one privacy setting must be provided');
    });

    it('should return 200 when privacy settings are updated successfully', async () => {
      const updatedUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        privacy: {
          profileVisibleTo: 'friends',
          location: { sharing: 'live', precisionMeters: 50 },
        },
      };

      userModel.updatePrivacy = jest.fn().mockResolvedValue(updatedUser);

      const response = await request(app)
        .patch('/users/me/privacy')
        .set('Authorization', 'Bearer valid-token')
        .send({
          profileVisibleTo: 'friends',
          location: { sharing: 'live', precisionMeters: 50 },
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Privacy settings updated successfully');
      expect(response.body.data.user.privacy.profileVisibleTo).toBe('friends');
      expect(response.body.data.user.privacy.location.sharing).toBe('live');
      expect(userModel.updatePrivacy).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        {
          profileVisibleTo: 'friends',
          location: { sharing: 'live', precisionMeters: 50 },
        }
      );
    });

    it('should return 404 when user is not found', async () => {
      userModel.updatePrivacy = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .patch('/users/me/privacy')
        .set('Authorization', 'Bearer valid-token')
        .send({ profileVisibleTo: 'friends' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 500 when database update fails', async () => {
      userModel.updatePrivacy = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .patch('/users/me/privacy')
        .set('Authorization', 'Bearer valid-token')
        .send({ profileVisibleTo: 'friends' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('GET /admin/all', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get('/users/admin/all');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 403 when user is not admin', async () => {
      const response = await request(app)
        .get('/users/admin/all')
        .set('Authorization', 'Bearer valid-token'); // Regular user token

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized: Admin access required');
    });

    it('should return 200 with all users when user is admin', async () => {
      const allUsers = [
        { _id: '507f1f77bcf86cd799439011', username: 'user1', email: 'user1@example.com' },
        { _id: '507f1f77bcf86cd799439012', username: 'user2', email: 'user2@example.com' },
      ];

      userModel.findAllWithAllFields = jest.fn().mockResolvedValue(allUsers);

      const response = await request(app)
        .get('/users/admin/all')
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Users fetched successfully');
      expect(response.body.data.users).toEqual(allUsers);
      expect(response.body.data.total).toBe(2);
      expect(userModel.findAllWithAllFields).toHaveBeenCalled();
    });

    it('should return 500 when database query fails', async () => {
      userModel.findAllWithAllFields = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/users/admin/all')
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('PATCH /admin/:id/suspend', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .patch('/users/admin/507f1f77bcf86cd799439013/suspend');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 403 when user is not admin', async () => {
      const response = await request(app)
        .patch('/users/admin/507f1f77bcf86cd799439013/suspend')
        .set('Authorization', 'Bearer valid-token'); // Regular user token

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized: Admin access required');
    });

    it('should return 400 when admin tries to suspend themselves', async () => {
      const response = await request(app)
        .patch('/users/admin/507f1f77bcf86cd799439012/suspend') // Admin's own ID
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Cannot suspend your own account');
    });

    it('should return 200 when user is suspended successfully', async () => {
      const suspendedUser = {
        _id: '507f1f77bcf86cd799439013',
        username: 'targetuser',
        email: 'target@example.com',
        isSuspended: true,
      };

      userModel.updateSuspensionStatus = jest.fn().mockResolvedValue(suspendedUser);

      const response = await request(app)
        .patch('/users/admin/507f1f77bcf86cd799439013/suspend')
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User suspended successfully');
      expect(response.body.data.user.isSuspended).toBe(true);
      expect(userModel.updateSuspensionStatus).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        true
      );
    });

    it('should return 404 when target user is not found', async () => {
      userModel.updateSuspensionStatus = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .patch('/users/admin/507f1f77bcf86cd799439013/suspend')
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 500 when database update fails', async () => {
      userModel.updateSuspensionStatus = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .patch('/users/admin/507f1f77bcf86cd799439013/suspend')
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('PATCH /admin/:id/unsuspend', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .patch('/users/admin/507f1f77bcf86cd799439013/unsuspend');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 403 when user is not admin', async () => {
      const response = await request(app)
        .patch('/users/admin/507f1f77bcf86cd799439013/unsuspend')
        .set('Authorization', 'Bearer valid-token'); // Regular user token

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized: Admin access required');
    });

    it('should return 200 when user is unsuspended successfully', async () => {
      const unsuspendedUser = {
        _id: '507f1f77bcf86cd799439013',
        username: 'targetuser',
        email: 'target@example.com',
        isSuspended: false,
      };

      userModel.updateSuspensionStatus = jest.fn().mockResolvedValue(unsuspendedUser);

      const response = await request(app)
        .patch('/users/admin/507f1f77bcf86cd799439013/unsuspend')
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User unsuspended successfully');
      expect(response.body.data.user.isSuspended).toBe(false);
      expect(userModel.updateSuspensionStatus).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        false
      );
    });

    it('should return 404 when target user is not found', async () => {
      userModel.updateSuspensionStatus = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .patch('/users/admin/507f1f77bcf86cd799439013/unsuspend')
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 500 when database update fails', async () => {
      userModel.updateSuspensionStatus = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .patch('/users/admin/507f1f77bcf86cd799439013/unsuspend')
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('DELETE /admin/:id', () => {
    beforeEach(() => {
      // Mock pinModel for these tests
      jest.doMock('../../../src/models/pin.model', () => ({
        pinModel: {
          deleteAllByUser: jest.fn(),
        },
      }));
    });

    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .delete('/users/admin/507f1f77bcf86cd799439013');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 403 when user is not admin', async () => {
      const response = await request(app)
        .delete('/users/admin/507f1f77bcf86cd799439013')
        .set('Authorization', 'Bearer valid-token'); // Regular user token

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized: Admin access required');
    });

    it('should return 400 when admin tries to delete themselves', async () => {
      const response = await request(app)
        .delete('/users/admin/507f1f77bcf86cd799439012') // Admin's own ID
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Cannot delete your own account');
    });

    it('should return 200 when user is deleted successfully', async () => {
      const { MediaService } = require('../../../src/services/media.service');
      const { pinModel } = require('../../../src/models/pin.model');
      
      MediaService.deleteAllUserImages.mockResolvedValue(undefined);
      pinModel.deleteAllByUser = jest.fn().mockResolvedValue(3); // 3 pins deleted
      userModel.delete = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/users/admin/507f1f77bcf86cd799439013')
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');
      expect(response.body.deletedPins).toBe(3);
      expect(MediaService.deleteAllUserImages).toHaveBeenCalledWith('507f1f77bcf86cd799439013');
      expect(pinModel.deleteAllByUser).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439013')
      );
      expect(userModel.delete).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439013')
      );
    });

    it('should return 500 when media deletion fails', async () => {
      const { MediaService } = require('../../../src/services/media.service');
      
      MediaService.deleteAllUserImages.mockRejectedValue(new Error('Media service error'));

      const response = await request(app)
        .delete('/users/admin/507f1f77bcf86cd799439013')
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should return 500 when user deletion fails', async () => {
      const { MediaService } = require('../../../src/services/media.service');
      const { pinModel } = require('../../../src/models/pin.model');
      
      MediaService.deleteAllUserImages.mockResolvedValue(undefined);
      pinModel.deleteAllByUser = jest.fn().mockResolvedValue(2);
      userModel.delete = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/users/admin/507f1f77bcf86cd799439013')
        .set('Authorization', 'Bearer admin-token'); // Admin token

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('PUT /me/fcm-token', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .put('/users/me/fcm-token')
        .send({ fcmToken: 'test-token' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 400 when fcmToken is missing', async () => {
      const response = await request(app)
        .put('/users/me/fcm-token')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('FCM token is required and must be a string');
    });

    it('should return 400 when fcmToken is not a string', async () => {
      const response = await request(app)
        .put('/users/me/fcm-token')
        .set('Authorization', 'Bearer valid-token')
        .send({ fcmToken: 123 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('FCM token is required and must be a string');
    });

    it('should return 200 when FCM token is updated successfully', async () => {
      const updatedUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test User',
        fcmToken: 'test-fcm-token-12345',
      };

      userModel.updateFcmToken = jest.fn().mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/users/me/fcm-token')
        .set('Authorization', 'Bearer valid-token')
        .send({ fcmToken: '  test-fcm-token-12345  ' }); // Test trimming

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('FCM token updated successfully');
      expect(response.body.data.userId).toBe('507f1f77bcf86cd799439011');
      expect(response.body.data.hasToken).toBe(true);
      expect(userModel.updateFcmToken).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        'test-fcm-token-12345'
      );
    });

    it('should return 404 when user is not found', async () => {
      userModel.updateFcmToken = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/users/me/fcm-token')
        .set('Authorization', 'Bearer valid-token')
        .send({ fcmToken: 'test-token' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 500 when database update fails', async () => {
      userModel.updateFcmToken = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/users/me/fcm-token')
        .set('Authorization', 'Bearer valid-token')
        .send({ fcmToken: 'test-token' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('DELETE /me/fcm-token', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .delete('/users/me/fcm-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should remove FCM token successfully', async () => {
      const updatedUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test User',
      };

      userModel.removeFcmToken = jest.fn().mockResolvedValue(updatedUser);

      const response = await request(app)
        .delete('/users/me/fcm-token')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('FCM token removed successfully');
      expect(response.body.data.userId).toBe('507f1f77bcf86cd799439011');
      expect(response.body.data.hasToken).toBe(false);
      expect(userModel.removeFcmToken).toHaveBeenCalledWith(
        new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
      );
    });

    it('should return 404 when user is not found', async () => {
      userModel.removeFcmToken = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .delete('/users/me/fcm-token')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 500 when database removal fails', async () => {
      userModel.removeFcmToken = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/users/me/fcm-token')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });
  });
});