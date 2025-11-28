import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PinsController } from '../../../src/controllers/pins.controller';
import { pinModel } from '../../../src/models/pin.model';

// Mock dependencies
jest.mock('../../../src/models/pin.model');

describe('Pins Controller - Admin Endpoints (Mocked)', () => {
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

  describe('getReportedPins', () => {
    it('should return 403 when user is not admin', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: false };

      await pinsController.getReportedPins(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unauthorized: Admin access required',
      });
    });

    it('should return reported pins when user is admin', async () => {
      const mockReportedPins = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Reported Pin',
          reports: [{ reason: 'Inappropriate' }],
          status: 'reported',
        },
      ];

      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: true };
      (pinModel.getReportedPins as jest.Mock).mockResolvedValue(mockReportedPins);

      await pinsController.getReportedPins(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(pinModel.getReportedPins).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Reported pins fetched successfully',
        data: { pins: mockReportedPins, total: mockReportedPins.length },
      });
    });

    it('should handle errors when fetching reported pins', async () => {
      const error = new Error('Database error');
      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: true };
      (pinModel.getReportedPins as jest.Mock).mockRejectedValue(error);

      await pinsController.getReportedPins(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Database error',
      });
    });

    it('should call next for non-Error exceptions in getReportedPins', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: true };
      (pinModel.getReportedPins as jest.Mock).mockRejectedValue('String error');

      await pinsController.getReportedPins(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('String error');
    });
  });

  describe('clearPinReports', () => {
    it('should return 403 when user is not admin', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: false };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };

      await pinsController.clearPinReports(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unauthorized: Admin access required',
      });
    });

    it('should clear reports when user is admin', async () => {
      const pinId = new mongoose.Types.ObjectId();
      const mockPin = {
        _id: pinId,
        name: 'Test Pin',
        reports: [],
        status: 'active',
      };

      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: true };
      mockRequest.params = { id: pinId.toString() };
      (pinModel.clearReports as jest.Mock).mockResolvedValue(mockPin);

      await pinsController.clearPinReports(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(pinModel.clearReports).toHaveBeenCalledWith(expect.any(mongoose.Types.ObjectId));
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Reports cleared successfully',
        data: { pin: mockPin },
      });
    });

    it('should return 404 when pin not found', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: true };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      (pinModel.clearReports as jest.Mock).mockResolvedValue(null);

      await pinsController.clearPinReports(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Pin not found',
      });
    });

    it('should handle errors when clearing reports', async () => {
      const error = new Error('Database error');
      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: true };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      (pinModel.clearReports as jest.Mock).mockRejectedValue(error);

      await pinsController.clearPinReports(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Database error',
      });
    });

    it('should call next for non-Error exceptions in clearPinReports', async () => {
      mockRequest.user = { _id: new mongoose.Types.ObjectId(), isAdmin: true };
      mockRequest.params = { id: new mongoose.Types.ObjectId().toString() };
      (pinModel.clearReports as jest.Mock).mockRejectedValue('String error');

      await pinsController.clearPinReports(
        mockRequest as Request<{ id: string }>,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('String error');
    });
  });
});
