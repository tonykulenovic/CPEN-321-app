import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest, describe, test, beforeEach, expect } from '@jest/globals';

import { BadgeController } from '../../src/controllers/badge.controller';
import { badgeModel } from '../../src/models/badge.model';
import { BadgeService } from '../../src/services/badge.service';
import { validateBody } from '../../src/middleware/validation.middleware';
import {
  createBadgeSchema,
  updateBadgeSchema,
  assignBadgeSchema,
  CreateBadgeRequest,
  UpdateBadgeRequest,
  AssignBadgeRequest,
} from '../../src/types/badge.types';
import { BadgeCategory, BadgeRequirementType, IBadge, IUserBadge } from '../../src/types/badge.types';

// Mock all external dependencies
jest.mock('../../src/models/badge.model');
jest.mock('../../src/services/badge.service');

const app = express();
app.use(express.json());

// Mock authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  req.user = {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    name: 'Test User',
    email: 'test@example.com',
    username: 'testuser',
  };
  next();
};

// Set up routes with authentication and validation middleware
const badgeController = new BadgeController();
app.get('/badges', authenticateToken, badgeController.getAllBadges);
app.post('/badges/initialize', authenticateToken, badgeController.initializeDefaultBadges);
app.get('/badges/category/:category', authenticateToken, badgeController.getBadgesByCategory);
app.get('/badges/:id', authenticateToken, badgeController.getBadgeById);
app.post('/badges', authenticateToken, validateBody<CreateBadgeRequest>(createBadgeSchema), badgeController.createBadge);
app.put('/badges/:id', authenticateToken, validateBody<UpdateBadgeRequest>(updateBadgeSchema), badgeController.updateBadge);
app.delete('/badges/:id', authenticateToken, badgeController.deleteBadge);
app.get('/badges/user/earned', authenticateToken, badgeController.getUserBadges);
app.get('/badges/user/available', authenticateToken, badgeController.getAvailableBadges);
app.get('/badges/user/progress', authenticateToken, badgeController.getBadgeProgress);
app.get('/badges/user/stats', authenticateToken, badgeController.getBadgeStats);
app.post('/badges/user/assign', authenticateToken, validateBody<AssignBadgeRequest>(assignBadgeSchema), badgeController.assignBadge);
app.post('/badges/user/event', authenticateToken, badgeController.processBadgeEvent);
app.put('/badges/user/:badgeId/progress', authenticateToken, badgeController.updateBadgeProgress);
app.delete('/badges/user/:badgeId', authenticateToken, badgeController.removeUserBadge);

const mockBadgeModel = badgeModel as jest.Mocked<typeof badgeModel>;
const mockBadgeService = BadgeService as jest.Mocked<typeof BadgeService>;

describe('Mocked: GET /badges (getAllBadges)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: badgeModel.findAll returns array of badges
  // Input: authenticated request with optional query params (category, isActive)
  // Expected status code: 200
  // Expected behavior: returns list of badges filtered by query params
  // Expected output: badges array
  test('Get all badges successfully', async () => {
    const mockBadges = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        name: 'Early Bird',
        description: 'Log in for 5 consecutive days',
        icon: 'early_bird',
        category: BadgeCategory.ACTIVITY,
        rarity: 'common',
        requirements: {
          type: BadgeRequirementType.LOGIN_STREAK,
          target: 5,
          timeframe: 'consecutive',
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockBadgeModel.findAll.mockResolvedValue(mockBadges as any);

    const response = await request(app)
      .get('/badges')
      .expect(200);

    expect(response.body.message).toBe('Badges fetched successfully');
    expect(response.body.data.badges).toHaveLength(1);
    expect(response.body.data.badges[0].name).toBe('Early Bird');
    expect(mockBadgeModel.findAll).toHaveBeenCalledWith({});
  });

  // Mocked behavior: badgeModel.findAll returns filtered badges by category
  // Input: authenticated request with category query param
  // Expected status code: 200
  // Expected behavior: returns badges filtered by category
  // Expected output: filtered badges array
  test('Get badges filtered by category', async () => {
    const mockBadges = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        name: 'Early Bird',
        category: BadgeCategory.ACTIVITY,
        isActive: true,
      },
    ];

    mockBadgeModel.findAll.mockResolvedValue(mockBadges as any);

    const response = await request(app)
      .get('/badges?category=activity')
      .expect(200);

    expect(response.body.message).toBe('Badges fetched successfully');
    expect(mockBadgeModel.findAll).toHaveBeenCalledWith({ category: 'activity' });
  });

  // Mocked behavior: badgeModel.findAll throws error
  // Input: authenticated request
  // Expected status code: 500
  // Expected behavior: returns error message
  // Expected output: error response
  test('Handle database error when fetching badges', async () => {
    mockBadgeModel.findAll.mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .get('/badges')
      .expect(500);

    expect(response.body.message).toBe('Database connection failed');
  });
});

describe('Mocked: GET /badges/:id (getBadgeById)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: badgeModel.findById returns badge
  // Input: authenticated request with valid badge ID
  // Expected status code: 200
  // Expected behavior: returns badge details
  // Expected output: badge object
  test('Get badge by ID successfully', async () => {
    const mockBadge = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Early Bird',
      description: 'Log in for 5 consecutive days',
      icon: 'early_bird',
      category: BadgeCategory.ACTIVITY,
      rarity: 'common',
      requirements: {
        type: BadgeRequirementType.LOGIN_STREAK,
        target: 5,
      },
      isActive: true,
    };

    mockBadgeModel.findById.mockResolvedValue(mockBadge as any);

    const response = await request(app)
      .get('/badges/507f1f77bcf86cd799439012')
      .expect(200);

    expect(response.body.message).toBe('Badge fetched successfully');
    expect(response.body.data.badge.name).toBe('Early Bird');
    expect(mockBadgeModel.findById).toHaveBeenCalledWith(expect.any(mongoose.Types.ObjectId));
  });

  // Mocked behavior: badgeModel.findById returns null
  // Input: authenticated request with non-existent badge ID
  // Expected status code: 404
  // Expected behavior: returns not found error
  // Expected output: error message
  test('Return 404 when badge not found', async () => {
    mockBadgeModel.findById.mockResolvedValue(null);

    const response = await request(app)
      .get('/badges/507f1f77bcf86cd799439013')
      .expect(404);

    expect(response.body.message).toBe('Badge not found');
  });

  // Mocked behavior: badgeModel.findById throws error
  // Input: authenticated request with invalid badge ID format
  // Expected status code: 500
  // Expected behavior: returns error message
  // Expected output: error response
  test('Handle database error when fetching badge by ID', async () => {
    mockBadgeModel.findById.mockRejectedValue(new Error('input must be a 24 character hex string, 12 byte Uint8Array, or an integer'));

    const response = await request(app)
      .get('/badges/invalid-id')
      .expect(500);

    expect(response.body.message).toBe('input must be a 24 character hex string, 12 byte Uint8Array, or an integer');
  });
});

describe('Mocked: POST /badges (createBadge)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: badgeModel.create successfully creates badge
  // Input: authenticated request with valid badge data
  // Expected status code: 201
  // Expected behavior: creates new badge and returns it
  // Expected output: created badge object
  test('Create badge successfully', async () => {
    const newBadgeData = {
      name: 'Campus Explorer',
      description: 'Create 10 pins',
      icon: 'campus_explorer',
      category: BadgeCategory.EXPLORATION,
      rarity: 'uncommon',
      requirements: {
        type: BadgeRequirementType.PINS_CREATED,
        target: 10,
      },
      isActive: true,
    };

    const mockCreatedBadge = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
      ...newBadgeData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockBadgeModel.create.mockResolvedValue(mockCreatedBadge as any);

    const response = await request(app)
      .post('/badges')
      .send(newBadgeData)
      .expect(201);

    expect(response.body.message).toBe('Badge created successfully');
    expect(response.body.data.badge.name).toBe('Campus Explorer');
    expect(mockBadgeModel.create).toHaveBeenCalledWith(newBadgeData);
  });

  // Mocked behavior: validation middleware catches invalid data before controller
  // Input: authenticated request with invalid badge data (empty name)
  // Expected status code: 400
  // Expected behavior: validation middleware returns validation error
  // Expected output: validation error with details
  test('Return 400 for invalid badge data', async () => {
    const invalidBadgeData = {
      name: '', // Empty name should fail validation
      description: 'Invalid badge',
    };

    const response = await request(app)
      .post('/badges')
      .send(invalidBadgeData)
      .expect(400);

    expect(response.body.error).toBe('Validation error');
    expect(response.body.message).toBe('Invalid input data');
    expect(response.body.details).toBeDefined();
  });
});

describe('Mocked: PUT /badges/:id (updateBadge)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: badgeModel.update successfully updates badge
  // Input: authenticated request with badge ID and update data
  // Expected status code: 200
  // Expected behavior: updates badge and returns updated badge
  // Expected output: updated badge object
  test('Update badge successfully', async () => {
    const updateData = {
      name: 'Updated Badge Name',
      description: 'Updated description',
    };

    const mockUpdatedBadge = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Updated Badge Name',
      description: 'Updated description',
      icon: 'early_bird',
      category: BadgeCategory.ACTIVITY,
      rarity: 'common',
      requirements: {
        type: BadgeRequirementType.LOGIN_STREAK,
        target: 5,
      },
      isActive: true,
    };

    mockBadgeModel.update.mockResolvedValue(mockUpdatedBadge as any);

    const response = await request(app)
      .put('/badges/507f1f77bcf86cd799439012')
      .send(updateData)
      .expect(200);

    expect(response.body.message).toBe('Badge updated successfully');
    expect(response.body.data.badge.name).toBe('Updated Badge Name');
    expect(mockBadgeModel.update).toHaveBeenCalledWith(
      expect.any(mongoose.Types.ObjectId),
      updateData
    );
  });

  // Mocked behavior: badgeModel.update returns null (badge not found)
  // Input: authenticated request with non-existent badge ID
  // Expected status code: 404
  // Expected behavior: returns not found error
  // Expected output: error message
  test('Return 404 when badge not found for update', async () => {
    const updateData = {
      name: 'Updated Badge Name',
    };

    mockBadgeModel.update.mockResolvedValue(null);

    const response = await request(app)
      .put('/badges/507f1f77bcf86cd799439013')
      .send(updateData)
      .expect(404);

    expect(response.body.message).toBe('Badge not found');
  });
});

describe('Mocked: DELETE /badges/:id (deleteBadge)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: badgeModel.delete successfully deletes badge
  // Input: authenticated request with badge ID
  // Expected status code: 200
  // Expected behavior: deletes badge
  // Expected output: success message
  test('Delete badge successfully', async () => {
    mockBadgeModel.delete.mockResolvedValue(undefined);

    const response = await request(app)
      .delete('/badges/507f1f77bcf86cd799439012')
      .expect(200);

    expect(response.body.message).toBe('Badge deleted successfully');
    expect(mockBadgeModel.delete).toHaveBeenCalledWith(expect.any(mongoose.Types.ObjectId));
  });

  // Mocked behavior: badgeModel.delete throws error
  // Input: authenticated request with invalid badge ID
  // Expected status code: 500
  // Expected behavior: returns error message
  // Expected output: error response
  test('Handle database error when deleting badge', async () => {
    mockBadgeModel.delete.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .delete('/badges/507f1f77bcf86cd799439012')
      .expect(500);

    expect(response.body.message).toBe('Database error');
  });
});

describe('Mocked: GET /badges/category/:category (getBadgesByCategory)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: badgeModel.findByCategory returns badges
  // Input: authenticated request with category param
  // Expected status code: 200
  // Expected behavior: returns badges filtered by category
  // Expected output: badges array
  test('Get badges by category successfully', async () => {
    const mockBadges = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        name: 'Early Bird',
        category: BadgeCategory.ACTIVITY,
        isActive: true,
      },
    ];

    mockBadgeModel.findByCategory.mockResolvedValue(mockBadges as any);

    const response = await request(app)
      .get('/badges/category/activity')
      .expect(200);

    expect(response.body.message).toBe('Badges by category fetched successfully');
    expect(response.body.data.badges).toHaveLength(1);
    expect(mockBadgeModel.findByCategory).toHaveBeenCalledWith(BadgeCategory.ACTIVITY);
  });

  // Mocked behavior: badgeModel.findByCategory throws error
  // Input: authenticated request with invalid category
  // Expected status code: 500
  // Expected behavior: returns error message
  // Expected output: error response
  test('Handle database error when fetching badges by category', async () => {
    mockBadgeModel.findByCategory.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .get('/badges/category/activity')
      .expect(500);

    expect(response.body.message).toBe('Database error');
  });
});

describe('Mocked: POST /badges/initialize (initializeDefaultBadges)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: BadgeService.initializeDefaultBadges successfully initializes badges
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: initializes default badges in database
  // Expected output: success message
  test('Initialize default badges successfully', async () => {
    mockBadgeService.initializeDefaultBadges.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/badges/initialize')
      .expect(200);

    expect(response.body.message).toBe('Default badges initialized successfully');
    expect(mockBadgeService.initializeDefaultBadges).toHaveBeenCalled();
  });

  // Mocked behavior: BadgeService.initializeDefaultBadges throws error
  // Input: authenticated request
  // Expected status code: 500
  // Expected behavior: returns error message
  // Expected output: error response
  test('Handle error when initializing default badges', async () => {
    mockBadgeService.initializeDefaultBadges.mockRejectedValue(new Error('Initialization failed'));

    const response = await request(app)
      .post('/badges/initialize')
      .expect(500);

    expect(response.body.message).toBe('Initialization failed');
  });
});

describe('Mocked: GET /badges/user/earned (getUserBadges)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: badgeModel.getUserBadges returns user badges
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns badges earned by authenticated user
  // Expected output: userBadges array
  test('Get user badges successfully', async () => {
    const mockUserBadges = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439015'),
        userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        badgeId: {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          name: 'Early Bird',
          category: BadgeCategory.ACTIVITY,
        },
        earnedAt: new Date(),
        progress: {
          current: 5,
          target: 5,
          percentage: 100,
          lastUpdated: new Date(),
        },
        isDisplayed: true,
      },
    ];

    mockBadgeModel.getUserBadges.mockResolvedValue(mockUserBadges as any);

    const response = await request(app)
      .get('/badges/user/earned')
      .expect(200);

    expect(response.body.message).toBe('User badges fetched successfully');
    expect(response.body.data.userBadges).toHaveLength(1);
    expect(mockBadgeModel.getUserBadges).toHaveBeenCalledWith(expect.any(mongoose.Types.ObjectId));
  });

  // Mocked behavior: badgeModel.getUserBadges throws error
  // Input: authenticated request
  // Expected status code: 500
  // Expected behavior: returns error message
  // Expected output: error response
  test('Handle database error when fetching user badges', async () => {
    mockBadgeModel.getUserBadges.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .get('/badges/user/earned')
      .expect(500);

    expect(response.body.message).toBe('Database error');
  });
});

describe('Mocked: GET /badges/user/available (getAvailableBadges)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: badgeModel.getAvailableBadges returns badges user hasn't earned
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns badges not yet earned by user
  // Expected output: badges array
  test('Get available badges successfully', async () => {
    const mockAvailableBadges = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439016'),
        name: 'Pin Creator',
        category: BadgeCategory.EXPLORATION,
        isActive: true,
      },
    ];

    mockBadgeModel.getAvailableBadges.mockResolvedValue(mockAvailableBadges as any);

    const response = await request(app)
      .get('/badges/user/available')
      .expect(200);

    expect(response.body.message).toBe('Available badges fetched successfully');
    expect(response.body.data.badges).toHaveLength(1);
    expect(mockBadgeModel.getAvailableBadges).toHaveBeenCalledWith(expect.any(mongoose.Types.ObjectId));
  });

  // Mocked behavior: badgeModel.getAvailableBadges throws error
  // Input: authenticated request
  // Expected status code: 500
  // Expected behavior: returns error message
  // Expected output: error response
  test('Handle database error when fetching available badges', async () => {
    mockBadgeModel.getAvailableBadges.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .get('/badges/user/available')
      .expect(500);

    expect(response.body.message).toBe('Database error');
  });
});

describe('Mocked: GET /badges/user/progress (getBadgeProgress)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: BadgeService.getUserBadgeProgress returns progress data
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns earned badges, available badges, and progress for each
  // Expected output: progress object with earned, available, and progress arrays
  test('Get badge progress successfully', async () => {
    const mockProgress = {
      earned: [],
      available: [],
      progress: [
        {
          badge: {
            _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
            name: 'Early Bird',
          },
          progress: {
            current: 3,
            target: 5,
            percentage: 60,
            lastUpdated: new Date(),
          },
        },
      ],
    };

    mockBadgeService.getUserBadgeProgress.mockResolvedValue(mockProgress as any);

    const response = await request(app)
      .get('/badges/user/progress')
      .expect(200);

    expect(response.body.message).toBe('Badge progress fetched successfully');
    expect(response.body.data.progress).toBeDefined();
    expect(mockBadgeService.getUserBadgeProgress).toHaveBeenCalledWith(expect.any(mongoose.Types.ObjectId));
  });

  // Mocked behavior: BadgeService.getUserBadgeProgress throws error
  // Input: authenticated request
  // Expected status code: 500
  // Expected behavior: returns error message
  // Expected output: error response
  test('Handle error when fetching badge progress', async () => {
    mockBadgeService.getUserBadgeProgress.mockRejectedValue(new Error('Service error'));

    const response = await request(app)
      .get('/badges/user/progress')
      .expect(500);

    expect(response.body.message).toBe('Service error');
  });
});

describe('Mocked: GET /badges/user/stats (getBadgeStats)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: BadgeService.getUserBadgeStats returns statistics
  // Input: authenticated request
  // Expected status code: 200
  // Expected behavior: returns badge statistics for user
  // Expected output: stats object with totalBadges, earnedBadges, categoryBreakdown, recentBadges
  test('Get badge stats successfully', async () => {
    const mockStats = {
      totalBadges: 25,
      earnedBadges: 8,
      categoryBreakdown: {
        [BadgeCategory.ACTIVITY]: 3,
        [BadgeCategory.SOCIAL]: 2,
        [BadgeCategory.EXPLORATION]: 2,
        [BadgeCategory.ACHIEVEMENT]: 1,
        [BadgeCategory.SPECIAL]: 0,
      },
      recentBadges: [],
    };

    mockBadgeService.getUserBadgeStats.mockResolvedValue(mockStats);

    const response = await request(app)
      .get('/badges/user/stats')
      .expect(200);

    expect(response.body.message).toBe('Badge statistics fetched successfully');
    expect(response.body.data.totalBadges).toBe(25);
    expect(response.body.data.earnedBadges).toBe(8);
    expect(mockBadgeService.getUserBadgeStats).toHaveBeenCalledWith(expect.any(mongoose.Types.ObjectId));
  });

  // Mocked behavior: BadgeService.getUserBadgeStats throws error
  // Input: authenticated request
  // Expected status code: 500
  // Expected behavior: returns error message with default stats
  // Expected output: error response with default stats
  test('Handle error when fetching badge stats', async () => {
    mockBadgeService.getUserBadgeStats.mockRejectedValue(new Error('Service error'));

    const response = await request(app)
      .get('/badges/user/stats')
      .expect(500);

    expect(response.body.message).toBe('Service error');
    expect(response.body.data.totalBadges).toBe(0);
    expect(response.body.data.earnedBadges).toBe(0);
  });
});

describe('Mocked: POST /badges/user/assign (assignBadge)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: BadgeService.assignBadgeToUser successfully assigns badge
  // Input: authenticated request with badgeId and optional userId and progress
  // Expected status code: 201
  // Expected behavior: assigns badge to user and returns userBadge
  // Expected output: userBadge object
  test('Assign badge successfully', async () => {
    const assignData = {
      badgeId: '507f1f77bcf86cd799439012',
      progress: {
        current: 5,
        target: 5,
        percentage: 100,
      },
    };

    const mockUserBadge = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439015'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      badgeId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      earnedAt: new Date(),
      progress: {
        current: 5,
        target: 5,
        percentage: 100,
        lastUpdated: new Date(),
      },
      isDisplayed: true,
    };

    mockBadgeService.assignBadgeToUser.mockResolvedValue(mockUserBadge as any);

    const response = await request(app)
      .post('/badges/user/assign')
      .send(assignData)
      .expect(201);

    expect(response.body.message).toBe('Badge assigned successfully');
    expect(response.body.data.userBadge).toBeDefined();
    expect(mockBadgeService.assignBadgeToUser).toHaveBeenCalled();
  });

  // Mocked behavior: BadgeService.assignBadgeToUser throws error (badge already assigned)
  // Input: authenticated request with already assigned badge
  // Expected status code: 400
  // Expected behavior: returns error message
  // Expected output: error response
  test('Return 400 when badge already assigned', async () => {
    const assignData = {
      badgeId: '507f1f77bcf86cd799439012',
    };

    mockBadgeService.assignBadgeToUser.mockRejectedValue(new Error('User already has this badge'));

    const response = await request(app)
      .post('/badges/user/assign')
      .send(assignData)
      .expect(400);

    expect(response.body.message).toBe('User already has this badge');
  });
});

describe('Mocked: POST /badges/user/event (processBadgeEvent)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: BadgeService.processBadgeEvent successfully processes event
  // Input: authenticated request with eventType, value, and optional metadata
  // Expected status code: 200
  // Expected behavior: processes badge event and returns earned badges
  // Expected output: userBadges array
  test('Process badge event successfully', async () => {
    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
      metadata: {
        pinId: '507f1f77bcf86cd799439017',
      },
    };

    const mockEarnedBadges = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439015'),
        userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        badgeId: {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          name: 'Pin Creator',
        },
        earnedAt: new Date(),
      },
    ];

    mockBadgeService.processBadgeEvent.mockResolvedValue(mockEarnedBadges as any);

    const response = await request(app)
      .post('/badges/user/event')
      .send(eventData)
      .expect(200);

    expect(response.body.message).toBe('Badge event processed successfully');
    expect(response.body.data.userBadges).toHaveLength(1);
    expect(mockBadgeService.processBadgeEvent).toHaveBeenCalled();
  });

  // Mocked behavior: BadgeService.processBadgeEvent throws error
  // Input: authenticated request with invalid event data
  // Expected status code: 400
  // Expected behavior: returns error message
  // Expected output: error response
  test('Handle error when processing badge event', async () => {
    const eventData = {
      eventType: 'invalid_type',
      value: 1,
    };

    mockBadgeService.processBadgeEvent.mockRejectedValue(new Error('Invalid event type'));

    const response = await request(app)
      .post('/badges/user/event')
      .send(eventData)
      .expect(400);

    expect(response.body.message).toBe('Invalid event type');
  });
});

describe('Mocked: PUT /badges/user/:badgeId/progress (updateBadgeProgress)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: BadgeService.updateBadgeProgress successfully updates progress
  // Input: authenticated request with badgeId and progress data
  // Expected status code: 200
  // Expected behavior: updates badge progress and returns updated userBadge
  // Expected output: userBadge object
  test('Update badge progress successfully', async () => {
    const progressData = {
      progress: {
        current: 3,
        target: 5,
        percentage: 60,
      },
    };

    const mockUpdatedUserBadge = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439015'),
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      badgeId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      progress: {
        current: 3,
        target: 5,
        percentage: 60,
        lastUpdated: new Date(),
      },
    };

    mockBadgeService.updateBadgeProgress.mockResolvedValue(mockUpdatedUserBadge as any);

    const response = await request(app)
      .put('/badges/user/507f1f77bcf86cd799439012/progress')
      .send(progressData)
      .expect(200);

    expect(response.body.message).toBe('Badge progress updated successfully');
    expect(response.body.data.userBadge.progress.current).toBe(3);
    expect(mockBadgeService.updateBadgeProgress).toHaveBeenCalled();
  });

  // Mocked behavior: BadgeService.updateBadgeProgress returns null (userBadge not found)
  // Input: authenticated request with non-existent badgeId
  // Expected status code: 404
  // Expected behavior: returns not found error
  // Expected output: error message
  test('Return 404 when user badge not found', async () => {
    const progressData = {
      progress: {
        current: 3,
        target: 5,
        percentage: 60,
      },
    };

    mockBadgeService.updateBadgeProgress.mockResolvedValue(null);

    const response = await request(app)
      .put('/badges/user/507f1f77bcf86cd799439013/progress')
      .send(progressData)
      .expect(404);

    expect(response.body.message).toBe('User badge not found');
  });
});

describe('Mocked: DELETE /badges/user/:badgeId (removeUserBadge)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: badgeModel.removeUserBadge successfully removes badge
  // Input: authenticated request with badgeId
  // Expected status code: 200
  // Expected behavior: removes badge from user
  // Expected output: success message
  test('Remove user badge successfully', async () => {
    mockBadgeModel.removeUserBadge.mockResolvedValue(undefined);

    const response = await request(app)
      .delete('/badges/user/507f1f77bcf86cd799439012')
      .expect(200);

    expect(response.body.message).toBe('Badge removed from user successfully');
    expect(mockBadgeModel.removeUserBadge).toHaveBeenCalledWith(
      expect.any(mongoose.Types.ObjectId),
      expect.any(mongoose.Types.ObjectId)
    );
  });

  // Mocked behavior: badgeModel.removeUserBadge throws error
  // Input: authenticated request with invalid badgeId
  // Expected status code: 500
  // Expected behavior: returns error message
  // Expected output: error response
  test('Handle database error when removing user badge', async () => {
    mockBadgeModel.removeUserBadge.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .delete('/badges/user/507f1f77bcf86cd799439012')
      .expect(500);

    expect(response.body.message).toBe('Database error');
  });
});

