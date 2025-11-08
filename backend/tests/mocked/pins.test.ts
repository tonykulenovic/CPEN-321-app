import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

import pinsRoutes from '../../src/routes/pins.routes';
import { pinModel } from '../../src/models/pin.model';
import { pinVoteModel } from '../../src/models/pinVote.model';
import { userModel } from '../../src/models/user.model';
import { BadgeService } from '../../src/services/badge.service';

// Mock all external dependencies
jest.mock('../../src/models/pin.model');
jest.mock('../../src/models/pinVote.model');
jest.mock('../../src/models/user.model');
jest.mock('../../src/services/badge.service');
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser',
      isAdmin: false
    };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/pins', pinsRoutes);

const mockPinModel = pinModel as jest.Mocked<typeof pinModel>;
const mockPinVoteModel = pinVoteModel as jest.Mocked<typeof pinVoteModel>;
const mockUserModel = userModel as jest.Mocked<typeof userModel>;
const mockBadgeService = BadgeService as jest.Mocked<typeof BadgeService>;

describe('Mocked: POST /pins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: pinModel.create returns valid pin
  // Input: valid pin data in request body
  // Expected status code: 201
  // Expected behavior: pin is created
  // Expected output: pin data
  test('Valid pin creation', async () => {
    const mockPin = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
      name: 'Test Study Spot',
      category: 'study',
      description: 'A quiet study space',
      location: {
        latitude: 49.268,
        longitude: -123.254,
        address: 'UBC Campus'
      },
      createdBy: {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        name: 'Test User'
      },
      status: 'active',
      rating: {
        upvotes: 0,
        downvotes: 0,
        voters: []
      }
    };

    mockPinModel.create.mockResolvedValueOnce(mockPin as any);
    // Mock mongoose.model('User') for stats update
    const mockUserModelInstance: any = {
      findByIdAndUpdate: jest.fn().mockResolvedValue({})
    };
    (mongoose.model as jest.Mock) = jest.fn().mockReturnValue(mockUserModelInstance);
    mockBadgeService.processBadgeEvent.mockResolvedValueOnce([]);

    const response = await request(app)
      .post('/pins')
      .send({
        name: 'Test Study Spot',
        category: 'study',
        description: 'A quiet study space with good lighting',
        location: {
          latitude: 49.268,
          longitude: -123.254,
          address: 'UBC Campus'
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Pin created successfully');
    expect(response.body.data.pin).toHaveProperty('_id');
    expect(mockPinModel.create).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: missing required fields
  // Input: request without required fields
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: validation error message
  test('Missing required fields', async () => {
    const response = await request(app)
      .post('/pins')
      .send({
        name: 'Test Study Spot'
        // Missing category, description, location
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(mockPinModel.create).not.toHaveBeenCalled();
  });

  // Mocked behavior: invalid category
  // Input: invalid category value
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: validation error message
  test('Invalid category', async () => {
    const response = await request(app)
      .post('/pins')
      .send({
        name: 'Test Spot',
        category: 'invalid_category',
        description: 'A test description',
        location: {
          latitude: 49.268,
          longitude: -123.254
        }
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(mockPinModel.create).not.toHaveBeenCalled();
  });

  // Mocked behavior: pinModel.create throws error
  // Input: valid request but database error occurs
  // Expected status code: 400 or 500
  // Expected behavior: error handling
  // Expected output: error message
  test('Pin creation service error', async () => {
    mockPinModel.create.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .post('/pins')
      .send({
        name: 'Test Study Spot',
        category: 'study',
        description: 'A quiet study space',
        location: {
          latitude: 49.268,
          longitude: -123.254
        }
      });

    expect([400, 500]).toContain(response.status);
    expect(response.body).toHaveProperty('message');
  });
});

describe('Mocked: GET /pins/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: pinModel.search returns pins
  // Input: search query parameters
  // Expected status code: 200
  // Expected behavior: returns list of pins
  // Expected output: array of pins with pagination
  test('Search pins successfully', async () => {
    const mockPins = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
        name: 'Study Spot 1',
        category: 'study',
        description: 'A quiet study space',
        location: {
          latitude: 49.268,
          longitude: -123.254
        }
      }
    ];

    mockPinModel.search.mockResolvedValueOnce({
      pins: mockPins as any,
      total: 1
    });

    const response = await request(app)
      .get('/pins/search')
      .query({ category: 'study', page: 1, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.data.pins).toHaveLength(1);
    expect(response.body.data.total).toBe(1);
    expect(mockPinModel.search).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: pinModel.search returns empty array
  // Input: search query with no results
  // Expected status code: 200
  // Expected behavior: returns empty list
  // Expected output: empty array
  test('Search pins with no results', async () => {
    mockPinModel.search.mockResolvedValueOnce({
      pins: [],
      total: 0
    });

    const response = await request(app)
      .get('/pins/search')
      .query({ category: 'events', search: 'nonexistent' });

    expect(response.status).toBe(200);
    expect(response.body.data.pins).toHaveLength(0);
    expect(response.body.data.total).toBe(0);
  });

  // Mocked behavior: pinModel.search throws error
  // Input: valid query but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: error message
  test('Search pins service error', async () => {
    mockPinModel.search.mockRejectedValueOnce(new Error('Database query failed'));

    const response = await request(app)
      .get('/pins/search')
      .query({ category: 'study' });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message');
  });
});

describe('Mocked: GET /pins/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: pinModel.findById returns valid pin
  // Input: valid pin ID
  // Expected status code: 200
  // Expected behavior: returns pin data
  // Expected output: pin object
  test('Get pin by ID successfully', async () => {
    const mockPin = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
      name: 'Test Study Spot',
      category: 'study',
      description: 'A quiet study space',
      location: {
        latitude: 49.268,
        longitude: -123.254
      },
      createdBy: {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        name: 'Test User'
      }
    };

    mockPinModel.findById.mockResolvedValueOnce(mockPin as any);

    const response = await request(app)
      .get('/pins/507f1f77bcf86cd799439020');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Pin fetched successfully');
    expect(response.body.data.pin).toHaveProperty('_id');
    expect(mockPinModel.findById).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: pinModel.findById returns null
  // Input: non-existent pin ID
  // Expected status code: 404
  // Expected behavior: pin not found
  // Expected output: error message
  test('Pin not found', async () => {
    mockPinModel.findById.mockResolvedValueOnce(null);

    const response = await request(app)
      .get('/pins/507f1f77bcf86cd799439999');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Pin not found');
    expect(mockPinModel.findById).toHaveBeenCalledTimes(1);
  });
});

describe('Mocked: PUT /pins/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: pinModel.update returns updated pin
  // Input: valid pin ID and update data
  // Expected status code: 200
  // Expected behavior: pin is updated
  // Expected output: updated pin data
  test('Update pin successfully', async () => {
    const mockUpdatedPin = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
      name: 'Updated Study Spot',
      category: 'study',
      description: 'Updated description',
      createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
    };

    mockPinModel.update.mockResolvedValueOnce(mockUpdatedPin as any);

    const response = await request(app)
      .put('/pins/507f1f77bcf86cd799439020')
      .send({
        description: 'Updated description'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Pin updated successfully');
    expect(mockPinModel.update).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: pinModel.update returns null (unauthorized or not found)
  // Input: pin ID that user doesn't own
  // Expected status code: 404
  // Expected behavior: pin not found or unauthorized
  // Expected output: error message
  test('Update pin unauthorized', async () => {
    mockPinModel.update.mockResolvedValueOnce(null);

    const response = await request(app)
      .put('/pins/507f1f77bcf86cd799439020')
      .send({
        description: 'Updated description'
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Pin not found or unauthorized');
  });
});

describe('Mocked: DELETE /pins/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: pinModel.delete returns true
  // Input: valid pin ID owned by user
  // Expected status code: 200
  // Expected behavior: pin is deleted
  // Expected output: success message
  test('Delete pin successfully', async () => {
    mockPinModel.delete.mockResolvedValueOnce(true);

    const response = await request(app)
      .delete('/pins/507f1f77bcf86cd799439020');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Pin deleted successfully');
    expect(mockPinModel.delete).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: pinModel.delete returns false
  // Input: pin ID that user doesn't own
  // Expected status code: 404
  // Expected behavior: pin not found or unauthorized
  // Expected output: error message
  test('Delete pin unauthorized', async () => {
    mockPinModel.delete.mockResolvedValueOnce(false);

    const response = await request(app)
      .delete('/pins/507f1f77bcf86cd799439020');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Pin not found or unauthorized');
  });
});

describe('Mocked: POST /pins/:id/rate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: pinVoteModel.vote returns success
  // Input: valid pin ID and voteType
  // Expected status code: 200
  // Expected behavior: pin is voted on
  // Expected output: success message with vote data
  test('Rate pin with upvote successfully', async () => {
    const mockVoteResult = {
      action: 'created',
      upvotes: 1,
      downvotes: 0
    };
    const mockUserVote = 'upvote';

    mockPinVoteModel.vote.mockResolvedValueOnce(mockVoteResult as any);
    mockPinVoteModel.getUserVote.mockResolvedValueOnce(mockUserVote);

    const response = await request(app)
      .post('/pins/507f1f77bcf86cd799439020/rate')
      .send({
        voteType: 'upvote'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('upvote');
    expect(response.body.data).toHaveProperty('upvotes');
    expect(mockPinVoteModel.vote).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: pinVoteModel.vote returns success for downvote
  // Input: valid pin ID and voteType 'downvote'
  // Expected status code: 200
  // Expected behavior: pin is downvoted
  // Expected output: success message with vote data
  test('Rate pin with downvote successfully', async () => {
    const mockVoteResult = {
      action: 'created',
      upvotes: 0,
      downvotes: 1
    };
    const mockUserVote = 'downvote';

    mockPinVoteModel.vote.mockResolvedValueOnce(mockVoteResult as any);
    mockPinVoteModel.getUserVote.mockResolvedValueOnce(mockUserVote);

    const response = await request(app)
      .post('/pins/507f1f77bcf86cd799439020/rate')
      .send({
        voteType: 'downvote'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('downvote');
    expect(response.body.data).toHaveProperty('downvotes');
  });

  // Mocked behavior: missing voteType
  // Input: request without voteType
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: validation error message
  test('Missing voteType', async () => {
    const response = await request(app)
      .post('/pins/507f1f77bcf86cd799439020/rate')
      .send({});

    expect(response.status).toBe(400);
    expect(mockPinVoteModel.vote).not.toHaveBeenCalled();
  });

  // Mocked behavior: pinVoteModel.vote throws error
  // Input: valid request but database error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: error message
  test('Rate pin service error', async () => {
    mockPinVoteModel.vote.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .post('/pins/507f1f77bcf86cd799439020/rate')
      .send({
        voteType: 'upvote'
      });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message');
  });
});

describe('Mocked: POST /pins/:id/report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: pinModel.reportPin and user updates succeed
  // Input: valid pin ID and reason
  // Expected status code: 200
  // Expected behavior: pin is reported
  // Expected output: success message
  test('Report pin successfully', async () => {
    const mockPin = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
      reports: []
    };
    const mockUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      reportedPins: [],
      stats: { reportsMade: 0 }
    };

    mockPinModel.reportPin.mockResolvedValueOnce(mockPin as any);
    // Mock mongoose.model('User') for user lookup and update
    const mockUserModelInstance: any = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      }),
      findByIdAndUpdate: jest.fn().mockResolvedValue({})
    };
    (mongoose.model as jest.Mock) = jest.fn().mockReturnValue(mockUserModelInstance);
    mockBadgeService.processBadgeEvent.mockResolvedValueOnce([]);

    const response = await request(app)
      .post('/pins/507f1f77bcf86cd799439020/report')
      .send({
        reason: 'Inappropriate content or location'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Pin reported successfully');
    expect(mockPinModel.reportPin).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: missing reason
  // Input: request without reason
  // Expected status code: 400
  // Expected behavior: validation error
  // Expected output: validation error message
  test('Missing reason', async () => {
    const response = await request(app)
      .post('/pins/507f1f77bcf86cd799439020/report')
      .send({});

    expect(response.status).toBe(400);
    expect(mockPinModel.reportPin).not.toHaveBeenCalled();
  });
});

describe('Mocked: POST /pins/:id/visit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: pin visit succeeds
  // Input: valid pin ID
  // Expected status code: 200
  // Expected behavior: pin is marked as visited
  // Expected output: success message
  test('Visit pin successfully', async () => {
    const mockPin = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
      name: 'Test Study Spot',
      category: 'study',
      isPreSeeded: true
    };
    const mockUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      visitedPins: []
    };

    mockPinModel.findById.mockResolvedValueOnce(mockPin as any);
    // Mock mongoose.model('User') for user lookup and update
    const mockUserModelInstance: any = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      }),
      findByIdAndUpdate: jest.fn().mockResolvedValue({})
    };
    (mongoose.model as jest.Mock) = jest.fn().mockReturnValue(mockUserModelInstance);
    mockBadgeService.processBadgeEvent.mockResolvedValueOnce([]);

    const response = await request(app)
      .post('/pins/507f1f77bcf86cd799439020/visit');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Pin visited successfully');
  });

  // Mocked behavior: pin not found
  // Input: non-existent pin ID
  // Expected status code: 404
  // Expected behavior: pin not found
  // Expected output: error message
  test('Visit pin not found', async () => {
    mockPinModel.findById.mockResolvedValueOnce(null);

    const response = await request(app)
      .post('/pins/507f1f77bcf86cd799439999/visit');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Pin not found');
  });
});

describe('Mocked: GET /pins/:id/vote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: pinVoteModel.getUserVote returns user's vote
  // Input: valid pin ID
  // Expected status code: 200
  // Expected behavior: returns user's vote status
  // Expected output: vote data
  test('Get user vote successfully', async () => {
    mockPinVoteModel.getUserVote.mockResolvedValueOnce('upvote');

    const response = await request(app)
      .get('/pins/507f1f77bcf86cd799439020/vote');

    expect(response.status).toBe(200);
    expect(response.body.data.userVote).toBe('upvote');
    expect(mockPinVoteModel.getUserVote).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: user has not voted
  // Input: valid pin ID
  // Expected status code: 200
  // Expected behavior: returns null for no vote
  // Expected output: null vote
  test('Get user vote when not voted', async () => {
    mockPinVoteModel.getUserVote.mockResolvedValueOnce(null);

    const response = await request(app)
      .get('/pins/507f1f77bcf86cd799439020/vote');

    expect(response.status).toBe(200);
    expect(response.body.data.userVote).toBeNull();
  });
});

