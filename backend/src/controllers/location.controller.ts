import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  UpdateLocationRequest,
  updateLocationSchema,
  UpdateLocationResponse,
  FriendsLocationsResponse,
} from '../types/friends.types';
import { locationModel } from '../models/location.model';
import { friendshipModel } from '../models/friendship.model';
import { userModel } from '../models/user.model';
import logger from '../utils/logger.util';

/**
 * PUT /me/location — Upsert my location with TTL & sharing rules.
 * @param body.lat number - Latitude.
 * @param body.lng number - Longitude.
 * @param body.accuracyM number? - Accuracy meters.
 * @return 200 { shared, expiresAt }
 */
export async function upsertMyLocation(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Implement upsert location logic
    // 1. Validate request body
    // 2. Get user ID from auth middleware
    // 3. Get user's privacy settings
    // 4. Apply privacy rules (off/live/approximate)
    // 5. Calculate expiration time (TTL)
    // 6. Upsert location in database
    // 7. Emit real-time updates to friends if applicable
    // 8. Return response with sharing status and expiration

    res.status(501).json({
      message: 'Upsert location not implemented yet',
    });
  } catch (error) {
    logger.error('Error in upsertMyLocation:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}

/**
 * GET /friends/locations — Latest visible friends' locations.
 * @return 200 FriendLocation[]
 */
export async function getFriendsLocations(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Implement get friends locations logic
    // 1. Get user ID from auth middleware
    // 2. Find accepted friends with shareLocation=true
    // 3. Get latest locations for those friends
    // 4. Filter based on privacy settings
    // 5. Format location data
    // 6. Return friends' locations

    res.status(501).json({
      message: 'Get friends locations not implemented yet',
    });
  } catch (error) {
    logger.error('Error in getFriendsLocations:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}