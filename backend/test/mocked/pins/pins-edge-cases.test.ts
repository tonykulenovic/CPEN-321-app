import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PinsController } from '../../../src/controllers/pins.controller';
import { pinModel } from '../../../src/models/pin.model';
import { pinVoteModel } from '../../../src/models/pinVote.model';
import { BadgeService } from '../../../src/services/badge.service';
import { locationGateway } from '../../../src/realtime/gateway';

// Mock dependencies
jest.mock('../../../src/models/pin.model');
jest.mock('../../../src/models/pinVote.model');
jest.mock('../../../src/services/badge.service');
jest.mock('../../../src/realtime/gateway');
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    model: jest.fn(),
  };
});

describe('Pins Controller - Edge Cases (Mocked)', () => {
  let pinsController: PinsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    pinsController = new PinsController();
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createPin - Error Handlers', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = {};

      await pinsController.createPin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should handle error updating user stats gracefully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Pin',
        category: 'study',
      };

      mockRequest.user = { _id: userId };
      mockRequest.body = { name: 'Test', category: 'study', description: 'Test desc', location: { latitude: 0, longitude: 0 } };

      const mockUserModel = {
        findByIdAndUpdate: jest.fn().mockRejectedValue(new Error('Stats update failed')),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (pinModel.create as jest.Mock).mockResolvedValue(mockPin);
      (BadgeService.processBadgeEvent as jest.Mock).mockResolvedValue([]);
      (locationGateway.broadcastPinCreated as jest.Mock).mockResolvedValue(undefined);

      await pinsController.createPin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Pin created successfully',
        data: { pin: mockPin },
      });
    });

    it('should handle badge processing error gracefully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Pin',
        category: 'study',
      };

      mockRequest.user = { _id: userId };
      mockRequest.body = { name: 'Test', category: 'study', description: 'Test desc', location: { latitude: 0, longitude: 0 } };

      const mockUserModel = {
        findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (pinModel.create as jest.Mock).mockResolvedValue(mockPin);
      (BadgeService.processBadgeEvent as jest.Mock).mockRejectedValue(new Error('Badge service error'));
      (locationGateway.broadcastPinCreated as jest.Mock).mockResolvedValue(undefined);

      await pinsController.createPin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Pin created successfully',
        data: { pin: mockPin },
      });
    });

    it('should log message when user earns badges from creating pin', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Pin',
        category: 'study',
      };
      const mockBadges = [{ _id: 'badge1', name: 'First Pin' }];

      mockRequest.user = { _id: userId };
      mockRequest.body = { name: 'Test', category: 'study', description: 'Test desc', location: { latitude: 0, longitude: 0 } };

      const mockUserModel = {
        findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (pinModel.create as jest.Mock).mockResolvedValue(mockPin);
      (BadgeService.processBadgeEvent as jest.Mock).mockResolvedValue(mockBadges);
      (locationGateway.broadcastPinCreated as jest.Mock).mockResolvedValue(undefined);

      await pinsController.createPin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // createPin doesn't return badges in response, just logs
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Pin created successfully',
        data: { pin: mockPin },
      });
    });

    it('should handle generic error with next function', async () => {
      const userId = new mongoose.Types.ObjectId();
      mockRequest.user = { _id: userId };
      mockRequest.body = {};

      (pinModel.create as jest.Mock).mockRejectedValue('Not an Error object');

      await pinsController.createPin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('Not an Error object');
    });

    it('should return 400 with error message when Error instance thrown', async () => {
      const userId = new mongoose.Types.ObjectId();
      const error = new Error('Validation failed');
      
      mockRequest.user = { _id: userId };
      mockRequest.body = {};

      (pinModel.create as jest.Mock).mockRejectedValue(error);

      await pinsController.createPin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Validation failed' });
    });
  });

  describe('getPin - Error Handlers', () => {
    it('should return 404 when pin not found', async () => {
      const pinId = new mongoose.Types.ObjectId();
      mockRequest.params = { id: pinId.toString() };
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };

      (pinModel.findById as jest.Mock).mockResolvedValue(null);

      await pinsController.getPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Pin not found' });
    });

    it('should handle errors when fetching pin', async () => {
      const error = new Error('Database error');
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };

      (pinModel.findById as jest.Mock).mockRejectedValue(error);

      await pinsController.getPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Database error' });
    });

    it('should call next for non-Error exceptions', async () => {
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };

      (pinModel.findById as jest.Mock).mockRejectedValue('Not an Error');

      await pinsController.getPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('Not an Error');
    });
  });

  describe('updatePin - Error Handlers', () => {
    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = {};

      await pinsController.updatePin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 404 when pin not found or unauthorized', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = { name: 'Updated' };

      (pinModel.update as jest.Mock).mockResolvedValue(null);

      await pinsController.updatePin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Pin not found or unauthorized' });
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = {};

      (pinModel.update as jest.Mock).mockRejectedValue(error);

      await pinsController.updatePin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Update failed' });
    });

    it('should call next for non-Error exceptions in updatePin', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = {};

      (pinModel.update as jest.Mock).mockRejectedValue('String error');

      await pinsController.updatePin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('String error');
    });
  });

  describe('deletePin - Error Handlers', () => {
    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      await pinsController.deletePin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 404 when pin not found or unauthorized', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: false };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      (pinModel.delete as jest.Mock).mockResolvedValue(false);

      await pinsController.deletePin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Pin not found or unauthorized' });
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: false };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      (pinModel.delete as jest.Mock).mockRejectedValue(error);

      await pinsController.deletePin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Delete failed' });
    });

    it('should call next for non-Error exceptions in deletePin', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: false };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      (pinModel.delete as jest.Mock).mockRejectedValue('String error');

      await pinsController.deletePin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('String error');
    });
  });

  describe('ratePin - Error Handlers', () => {
    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = { voteType: 'upvote' };

      await pinsController.ratePin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should handle rating errors', async () => {
      const error = new Error('Vote failed');
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = { voteType: 'upvote' };

      (pinVoteModel.vote as jest.Mock).mockRejectedValue(error);

      await pinsController.ratePin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Vote failed' });
    });

    it('should call next for non-Error exceptions in ratePin', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = { voteType: 'upvote' };

      (pinVoteModel.vote as jest.Mock).mockRejectedValue('String error');

      await pinsController.ratePin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('String error');
    });
  });

  describe('getUserVote - Error Handlers', () => {
    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      await pinsController.getUserVote(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should handle errors when fetching user vote', async () => {
      const error = new Error('Fetch vote failed');
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      (pinVoteModel.getUserVote as jest.Mock).mockRejectedValue(error);

      await pinsController.getUserVote(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Fetch vote failed' });
    });

    it('should call next for non-Error exceptions in getUserVote', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      (pinVoteModel.getUserVote as jest.Mock).mockRejectedValue('String error');

      await pinsController.getUserVote(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('String error');
    });
  });

  describe('reportPin - Error Handlers', () => {
    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = { reason: 'Test' };

      await pinsController.reportPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 404 when user not found', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = { reason: 'Test' };

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(null),
        }),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);

      await pinsController.reportPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should handle stats update error gracefully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      
      mockRequest.user = { _id: userId };
      mockRequest.params = { id: pinId.toString() };
      mockRequest.body = { reason: 'Test reason' };

      const mockUser = {
        reportedPins: [],
        stats: { reportsMade: 0 },
      };

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser),
        }),
        findByIdAndUpdate: jest.fn().mockRejectedValue(new Error('Stats error')),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (pinModel.reportPin as jest.Mock).mockResolvedValue(undefined);
      (BadgeService.processBadgeEvent as jest.Mock).mockResolvedValue([]);

      await pinsController.reportPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Pin reported successfully',
        data: { firstReport: true },
      });
    });

    it('should handle badge error gracefully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      
      mockRequest.user = { _id: userId };
      mockRequest.params = { id: pinId.toString() };
      mockRequest.body = { reason: 'Test reason' };

      const mockUser = {
        reportedPins: [],
        stats: { reportsMade: 0 },
      };

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser),
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (pinModel.reportPin as jest.Mock).mockResolvedValue(undefined);
      (BadgeService.processBadgeEvent as jest.Mock).mockRejectedValue(new Error('Badge error'));

      await pinsController.reportPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Pin reported successfully',
        data: { firstReport: true },
      });
    });

    it('should return earned badges when user earns badges from reporting pin', async () => {
      const userId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      const mockBadges = [{ _id: 'badge1', name: 'Vigilant Reporter' }];
      
      mockRequest.user = { _id: userId };
      mockRequest.params = { id: pinId.toString() };
      mockRequest.body = { reason: 'Test reason' };

      const mockUser = {
        reportedPins: [],
        stats: { reportsMade: 0 },
      };

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser),
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (pinModel.reportPin as jest.Mock).mockResolvedValue(undefined);
      (BadgeService.processBadgeEvent as jest.Mock).mockResolvedValue(mockBadges);

      await pinsController.reportPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Pin reported successfully',
        data: { earnedBadges: mockBadges, firstReport: true },
      });
    });

    it('should handle reportPin errors with Error instance', async () => {
      const error = new Error('Report failed');
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = { reason: 'spam' };

      (pinModel.reportPin as jest.Mock).mockRejectedValue(error);

      await pinsController.reportPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Report failed' });
    });

    it('should call next for non-Error exceptions in reportPin', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      mockRequest.body = { reason: 'spam' };

      (pinModel.reportPin as jest.Mock).mockRejectedValue('String error');

      await pinsController.reportPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('String error');
    });
  });

  describe('searchPins - Error Handlers', () => {
    it('should handle search errors', async () => {
      const error = new Error('Search failed');
      mockRequest.query = { keyword: 'test' };
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };

      (pinModel.search as jest.Mock).mockRejectedValue(error);

      await pinsController.searchPins(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Search failed' });
    });

    it('should call next for non-Error exceptions in searchPins', async () => {
      mockRequest.query = { keyword: 'test' };
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };

      (pinModel.search as jest.Mock).mockRejectedValue('String error');

      await pinsController.searchPins(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('String error');
    });
  });

  describe('visitPin - Error Handlers', () => {
    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 404 when pin not found', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      (pinModel.findById as jest.Mock).mockResolvedValue(null);

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Pin not found' });
    });

    it('should return 404 when user not found', async () => {
      const pinId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: pinId,
        name: 'Test Pin',
        category: 'study',
        isPreSeeded: false,
      };

      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: pinId.toString() };

      (pinModel.findById as jest.Mock).mockResolvedValue(mockPin);

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(null),
        }),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 200 when pin already visited', async () => {
      const userId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: pinId,
        name: 'Test Pin',
        category: 'study',
        isPreSeeded: false,
      };

      mockRequest.user = { _id: userId };
      mockRequest.params = { id: pinId.toString() };

      const mockUser = {
        visitedPins: [pinId],
      };

      (pinModel.findById as jest.Mock).mockResolvedValue(mockPin);

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser),
        }),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Pin already visited',
        data: { alreadyVisited: true },
      });
    });

    it('should track library visit for pre-seeded STUDY pin', async () => {
      const userId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: pinId,
        name: 'Test Library',
        category: 'study',
        isPreSeeded: true,
      };

      mockRequest.user = { _id: userId };
      mockRequest.params = { id: pinId.toString() };

      const mockUser = {
        visitedPins: [],
      };

      (pinModel.findById as jest.Mock).mockResolvedValue(mockPin);

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser),
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (BadgeService.processBadgeEvent as jest.Mock).mockResolvedValue([]);

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        {
          $push: { visitedPins: pinId },
          $inc: {
            'stats.pinsVisited': 1,
            'stats.librariesVisited': 1,
          },
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should track cafe visit for pre-seeded SHOPS_SERVICES pin with cafe subtype', async () => {
      const userId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: pinId,
        name: 'Test Cafe',
        category: 'shops_services',
        isPreSeeded: true,
        metadata: { subtype: 'cafe' },
      };

      mockRequest.user = { _id: userId };
      mockRequest.params = { id: pinId.toString() };

      const mockUser = {
        visitedPins: [],
      };

      (pinModel.findById as jest.Mock).mockResolvedValue(mockPin);

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser),
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (BadgeService.processBadgeEvent as jest.Mock).mockResolvedValue([]);

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        {
          $push: { visitedPins: pinId },
          $inc: {
            'stats.pinsVisited': 1,
            'stats.cafesVisited': 1,
          },
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should track restaurant visit for pre-seeded SHOPS_SERVICES pin with restaurant subtype', async () => {
      const userId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: pinId,
        name: 'Test Restaurant',
        category: 'shops_services',
        isPreSeeded: true,
        metadata: { subtype: 'restaurant' },
      };

      mockRequest.user = { _id: userId };
      mockRequest.params = { id: pinId.toString() };

      const mockUser = {
        visitedPins: [],
      };

      (pinModel.findById as jest.Mock).mockResolvedValue(mockPin);

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser),
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (BadgeService.processBadgeEvent as jest.Mock).mockResolvedValue([]);

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        {
          $push: { visitedPins: pinId },
          $inc: {
            'stats.pinsVisited': 1,
            'stats.restaurantsVisited': 1,
          },
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should warn for SHOPS_SERVICES pin with unknown subtype', async () => {
      const userId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: pinId,
        name: 'Test Shop',
        category: 'shops_services',
        isPreSeeded: true,
        metadata: { subtype: 'unknown_type' },
      };

      mockRequest.user = { _id: userId };
      mockRequest.params = { id: pinId.toString() };

      const mockUser = {
        visitedPins: [],
      };

      (pinModel.findById as jest.Mock).mockResolvedValue(mockPin);

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser),
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (BadgeService.processBadgeEvent as jest.Mock).mockResolvedValue([]);

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        {
          $push: { visitedPins: pinId },
          $inc: {
            'stats.pinsVisited': 1,
          },
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle badge processing error gracefully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: pinId,
        name: 'Test Pin',
        category: 'study',
        isPreSeeded: false,
      };

      mockRequest.user = { _id: userId };
      mockRequest.params = { id: pinId.toString() };

      const mockUser = {
        visitedPins: [],
      };

      (pinModel.findById as jest.Mock).mockResolvedValue(mockPin);

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser),
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (BadgeService.processBadgeEvent as jest.Mock).mockRejectedValue(new Error('Badge error'));

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Pin visited successfully',
        data: { alreadyVisited: false },
      });
    });

    it('should return earned badges when user earns badges from visiting pin', async () => {
      const userId = new mongoose.Types.ObjectId();
      const pinId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: pinId,
        name: 'Test Pin',
        category: 'study',
        isPreSeeded: false,
      };
      const mockBadges = [{ _id: 'badge1', name: 'Explorer' }];

      mockRequest.user = { _id: userId };
      mockRequest.params = { id: pinId.toString() };

      const mockUser = {
        visitedPins: [],
      };

      (pinModel.findById as jest.Mock).mockResolvedValue(mockPin);

      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUser),
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      };
      (mongoose.model as jest.Mock).mockReturnValue(mockUserModel);
      (BadgeService.processBadgeEvent as jest.Mock).mockResolvedValue(mockBadges);

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Pin visited successfully',
        data: { earnedBadges: mockBadges, alreadyVisited: false },
      });
    });

    it('should handle visit errors', async () => {
      const error = new Error('Visit failed');
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      (pinModel.findById as jest.Mock).mockRejectedValue(error);

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Visit failed' });
    });

    it('should call next for non-Error exceptions in visitPin', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId() };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      (pinModel.findById as jest.Mock).mockRejectedValue('String error');

      await pinsController.visitPin(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('String error');
    });
  });
});
