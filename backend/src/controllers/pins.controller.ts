import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { pinModel } from '../models/pin.model';
import { pinVoteModel } from '../models/pinVote.model';
import {
  CreatePinRequest,
  UpdatePinRequest,
  RatePinRequest,
  ReportPinRequest,
  SearchPinsRequest,
  PinResponse,
  PinsListResponse,
} from '../types/pins.types';
import logger from '../utils/logger.util';

export class PinsController {
  async createPin(
    req: Request<unknown, unknown, CreatePinRequest>,
    res: Response<PinResponse>,
    next: NextFunction
  ) {
    try {
      const userId = req.user!._id;
      const pin = await pinModel.create(userId, req.body);
      res.status(201).json({ message: 'Pin created successfully', data: { pin } });
    } catch (error) {
      logger.error('Failed to create pin:', error as Error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message || 'Failed to create pin' });
      }
      next(error);
    }
  }

  async getPin(
    req: Request<{ id: string }>,
    res: Response<PinResponse>,
    next: NextFunction
  ) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const pin = await pinModel.findById(pinId);
      if (!pin) return res.status(404).json({ message: 'Pin not found' });
      res.status(200).json({ message: 'Pin fetched successfully', data: { pin } });
    } catch (error) {
      logger.error('Failed to get pin:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to get pin' });
      }
      next(error);
    }
  }

  async updatePin(
    req: Request<{ id: string }, unknown, UpdatePinRequest>,
    res: Response<PinResponse>,
    next: NextFunction
  ) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const userId = req.user!._id;
      const pin = await pinModel.update(pinId, userId, req.body);
      if (!pin) return res.status(404).json({ message: 'Pin not found or unauthorized' });
      res.status(200).json({ message: 'Pin updated successfully', data: { pin } });
    } catch (error) {
      logger.error('Failed to update pin:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to update pin' });
      }
      next(error);
    }
  }

  async deletePin(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const userId = req.user!._id;
      const deleted = await pinModel.delete(pinId, userId);
      if (!deleted) return res.status(404).json({ message: 'Pin not found or unauthorized' });
      res.status(200).json({ message: 'Pin deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete pin:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to delete pin' });
      }
      next(error);
    }
  }

  async searchPins(
    req: Request<unknown, unknown, unknown, SearchPinsRequest>,
    res: Response<PinsListResponse>,
    next: NextFunction
  ) {
    try {
      const userId = req.user?._id; // Get userId from auth middleware
      const { pins, total } = await pinModel.search({
        category: req.query.category,
        latitude: req.query.latitude,
        longitude: req.query.longitude,
        radius: req.query.radius,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit,
        userId: userId, // Pass userId for visibility filtering
      });
      res.status(200).json({ message: 'Pins fetched successfully', data: { pins, total, page: req.query.page || 1, limit: req.query.limit || 20 } });
    } catch (error) {
      logger.error('Failed to search pins:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to search pins' });
      }
      next(error);
    }
  }

  async ratePin(
    req: Request<{ id: string }, unknown, RatePinRequest>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const userId = req.user!._id;
      const { voteType } = req.body;
      await pinVoteModel.vote(userId, pinId, voteType);
      res.status(200).json({ message: `Pin ${voteType}d successfully` });
    } catch (error) {
      logger.error('Failed to rate pin:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to rate pin' });
      }
      next(error);
    }
  }

  async reportPin(
    req: Request<{ id: string }, unknown, ReportPinRequest>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pinId = new mongoose.Types.ObjectId(req.params.id);
      const userId = req.user!._id;
      const { reason } = req.body;
      await pinModel.reportPin(pinId, userId, reason);
      res.status(200).json({ message: 'Pin reported successfully' });
    } catch (error) {
      logger.error('Failed to report pin:', error as Error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message || 'Failed to report pin' });
      }
      next(error);
    }
  }
}

export const pinsController = new PinsController();


