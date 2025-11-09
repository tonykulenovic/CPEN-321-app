import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest, describe, test, beforeEach, expect } from '@jest/globals';

import { BadgeController } from '../../src/controllers/badge.controller';
import { badgeModel } from '../../src/models/badge.model';
import { BadgeService } from '../../src/services/badge.service';
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
app.get('/badges/user/earned', authenticateToken, badgeController.getUserBadges);
app.get('/badges/user/available', authenticateToken, badgeController.getAvailableBadges);
app.get('/badges/user/progress', authenticateToken, badgeController.getBadgeProgress);
app.get('/badges/user/stats', authenticateToken, badgeController.getBadgeStats);
app.post('/badges/user/event', authenticateToken, badgeController.processBadgeEvent);

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

    mockBadgeModel.findAll.mockResolvedValue(mockBadges as unknown);

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

  // Mocked behavior: badgeModel.findAll returns filtered badges by isActive=false
  // Input: authenticated request with isActive=false query param
  // Expected status code: 200
  // Expected behavior: returns badges filtered by isActive=false
  // Expected output: filtered badges array
  test('Get badges filtered by isActive=false', async () => {
    const mockBadges = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        name: 'Inactive Badge',
        isActive: false,
      },
    ];

    mockBadgeModel.findAll.mockResolvedValue(mockBadges as any);

    const response = await request(app)
      .get('/badges?isActive=false')
      .expect(200);

    expect(response.body.message).toBe('Badges fetched successfully');
    expect(mockBadgeModel.findAll).toHaveBeenCalledWith({ isActive: false });
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

  // Test error case where error.message is falsy (to cover fallback message on line 43)
  test('Handle error without message when fetching badges', async () => {
    const errorWithoutMessage = Object.assign(new Error(), { message: '' });
    mockBadgeModel.findAll.mockRejectedValue(errorWithoutMessage);

    const response = await request(app)
      .get('/badges')
      .expect(500);

    expect(response.body.message).toBe('Failed to fetch badges');
  });

  // Mocked behavior: badgeModel.findAll throws non-Error
  // Input: authenticated request
  // Expected status code: 500 (via next)
  // Expected behavior: calls next with error
  // Expected output: error passed to next middleware
  test('Handle non-Error exception when fetching badges', async () => {
    const mockNext = jest.fn();
    const req = { query: {} } as unknown;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown;

    mockBadgeModel.findAll.mockRejectedValue('String error');

    await badgeController.getAllBadges(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith('String error');
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

    mockBadgeModel.getUserBadges.mockResolvedValue(mockUserBadges as unknown);

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

  // Test error case where error.message is falsy (to cover fallback message on line 70)
  test('Handle error without message when fetching user badges', async () => {
    const errorWithoutMessage = Object.assign(new Error(), { message: '' });
    mockBadgeModel.getUserBadges.mockRejectedValue(errorWithoutMessage);

    const response = await request(app)
      .get('/badges/user/earned')
      .expect(500);

    expect(response.body.message).toBe('Failed to fetch user badges');
  });

  // Mocked behavior: badgeModel.getUserBadges throws non-Error
  // Input: authenticated request
  // Expected status code: 500 (via next)
  // Expected behavior: calls next with error
  test('Handle non-Error exception when fetching user badges', async () => {
    const mockNext = jest.fn();
    const req = { user: { _id: new mongoose.Types.ObjectId() } } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    mockBadgeModel.getUserBadges.mockRejectedValue('String error');

    await badgeController.getUserBadges(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith('String error');
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

    mockBadgeModel.getAvailableBadges.mockResolvedValue(mockAvailableBadges as unknown);

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

  // Test error case where error.message is falsy (to cover fallback message on line 96)
  test('Handle error without message when fetching available badges', async () => {
    const errorWithoutMessage = Object.assign(new Error(), { message: '' });
    mockBadgeModel.getAvailableBadges.mockRejectedValue(errorWithoutMessage);

    const response = await request(app)
      .get('/badges/user/available')
      .expect(500);

    expect(response.body.message).toBe('Failed to fetch available badges');
  });

  // Mocked behavior: badgeModel.getAvailableBadges throws non-Error
  // Input: authenticated request
  // Expected status code: 500 (via next)
  // Expected behavior: calls next with error
  test('Handle non-Error exception when fetching available badges', async () => {
    const mockNext = jest.fn();
    const req = { user: { _id: new mongoose.Types.ObjectId() } } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    mockBadgeModel.getAvailableBadges.mockRejectedValue('String error');

    await badgeController.getAvailableBadges(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith('String error');
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

  // Test error case where error.message is falsy (to cover fallback message on line 122)
  test('Handle error without message when fetching badge progress', async () => {
    const errorWithoutMessage = Object.assign(new Error(), { message: '' });
    mockBadgeService.getUserBadgeProgress.mockRejectedValue(errorWithoutMessage);

    const response = await request(app)
      .get('/badges/user/progress')
      .expect(500);

    expect(response.body.message).toBe('Failed to fetch badge progress');
  });

  // Mocked behavior: BadgeService.getUserBadgeProgress throws non-Error
  // Input: authenticated request
  // Expected status code: 500 (via next)
  // Expected behavior: calls next with error
  test('Handle non-Error exception when fetching badge progress', async () => {
    const mockNext = jest.fn();
    const req = { user: { _id: new mongoose.Types.ObjectId() } } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    mockBadgeService.getUserBadgeProgress.mockRejectedValue('String error');

    await badgeController.getBadgeProgress(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith('String error');
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

  // Test error case where error.message is falsy (to cover fallback message on line 148)
  test('Handle error without message when fetching badge stats', async () => {
    const errorWithoutMessage = Object.assign(new Error(), { message: '' });
    mockBadgeService.getUserBadgeStats.mockRejectedValue(errorWithoutMessage);

    const response = await request(app)
      .get('/badges/user/stats')
      .expect(500);

    expect(response.body.message).toBe('Failed to fetch badge statistics');
    expect(response.body.data.totalBadges).toBe(0);
    expect(response.body.data.earnedBadges).toBe(0);
  });

  // Mocked behavior: BadgeService.getUserBadgeStats throws non-Error
  // Input: authenticated request
  // Expected status code: 500 (via next)
  // Expected behavior: calls next with error
  test('Handle non-Error exception when fetching badge stats', async () => {
    const mockNext = jest.fn();
    const req = { user: { _id: new mongoose.Types.ObjectId() } } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    mockBadgeService.getUserBadgeStats.mockRejectedValue('String error');

    await badgeController.getBadgeStats(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith('String error');
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

  // Test error case where error.message is falsy (to cover fallback message on line 186)
  test('Handle error without message when processing badge event', async () => {
    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
    };

    const errorWithoutMessage = Object.assign(new Error(), { message: '' });
    mockBadgeService.processBadgeEvent.mockRejectedValue(errorWithoutMessage);

    const response = await request(app)
      .post('/badges/user/event')
      .send(eventData)
      .expect(400);

    expect(response.body.message).toBe('Failed to process badge event');
  });

  // Mocked behavior: BadgeService.processBadgeEvent throws non-Error
  // Input: authenticated request
  // Expected status code: 400 (via next)
  // Expected behavior: calls next with error
  test('Handle non-Error exception when processing badge event', async () => {
    const mockNext = jest.fn();
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: { eventType: 'test', value: 1 },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    mockBadgeService.processBadgeEvent.mockRejectedValue('String error');

    await badgeController.processBadgeEvent(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith('String error');
  });

  // Mocked behavior: processBadgeEvent with userId in body
  // Input: authenticated request with userId in body
  // Expected status code: 200
  // Expected behavior: uses userId from body instead of req.user
  test('Process badge event with userId in body', async () => {
    const eventData = {
      eventType: BadgeRequirementType.PINS_CREATED,
      value: 1,
      userId: '507f1f77bcf86cd799439099',
    };

    const mockEarnedBadges: IUserBadge[] = [];

    mockBadgeService.processBadgeEvent.mockResolvedValue(mockEarnedBadges);

    const response = await request(app)
      .post('/badges/user/event')
      .send(eventData)
      .expect(200);

    expect(response.body.message).toBe('Badge event processed successfully');
    expect(mockBadgeService.processBadgeEvent).toHaveBeenCalled();
  });
});


