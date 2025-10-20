import { Request, Response } from 'express';
import {
  UpdateLocationRequest,
  updateLocationSchema,
  FriendsLocationsResponse,
} from '../types/friends.types';
import { locationGateway } from '../realtime/gateway';
import logger from '../utils/logger.util';

/**
 * PUT /location — Upsert location record with TTL & sharing rules.
 * @param body.lat number - Latitude.
 * @param body.lng number - Longitude.
 * @param body.accuracyM number? - Accuracy meters.
 * @return 201 { shared, expiresAt }
 */
export async function upsertMyLocation(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validate request body
    const validation = updateLocationSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        message: 'Invalid request body',
        errors: validation.error.issues,
      });
      return;
    }

    const { lat, lng, accuracyM = 0 } = validation.data;

    // 2. Get user ID from auth middleware
    const currentUser = req.user!;
    const currentUserId = currentUser._id;

    // 3. Use gateway to report location (handles all privacy, storage, and broadcasting)
    const result = await locationGateway.reportLocation(currentUserId, lat, lng, accuracyM);

    // 4. Return response
    res.status(201).json({
      message: 'Location updated successfully',
      data: result,
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
    // 1. Get user ID from auth middleware
    const currentUser = req.user!;
    const currentUserId = currentUser._id;

    // 2. Use gateway to get friends' locations (handles all privacy filtering)
    const locations = await locationGateway.getFriendsLocations(currentUserId);

    // 3. Format response
    const friendLocations = locations.map(location => ({
      userId: location.userId.toString(),
      lat: location.lat,
      lng: location.lng,
      accuracyM: location.accuracyM,
      ts: location.createdAt.toISOString(),
    }));

    const response: FriendsLocationsResponse = {
      message: 'Friends locations retrieved successfully',
      data: friendLocations,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error in getFriendsLocations:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
}