import mongoose from 'mongoose';
import { ILocation, LocationUpdateEvent } from '../types/friends.types';
import { locationModel } from '../models/location.model';
import { friendshipModel } from '../models/friendship.model';
import { userModel } from '../models/user.model';
import logger from '../utils/logger.util';

/**
 * Subscribe viewer to friend's live location for a bounded duration.
 * AuthZ: friend -> viewer must be accepted and shareLocation=true.
 * Immediately delivers latest known location, then forwards live updates.
 * @param viewerId - Requesting user id.
 * @param friendId - Friend to track.
 * @param durationMs - Auto-unsubscribe after this many ms.
 * @param deliver - Callback to push LocationUpdateEvent to client.
 * @return function - Unsubscribe function.
 */
export async function trackLocation(
  viewerId: mongoose.Types.ObjectId,
  friendId: mongoose.Types.ObjectId,
  durationMs: number,
  deliver: (evt: LocationUpdateEvent) => void
): Promise<() => void> {
  // TODO: Implement track location logic
  // 1. Verify friendship exists and shareLocation=true
  // 2. Get friend's current location privacy settings
  // 3. Subscribe to real-time location updates
  // 4. Deliver initial location if available
  // 5. Set up auto-unsubscribe timer
  // 6. Return unsubscribe function

  throw new Error('trackLocation not implemented yet');
}

/**
 * Record/upsert a user's current location with TTL and privacy.
 * Enforces global privacy (off/live/approximate), writes to DB, and fans out to active watchers.
 * @param userId - Owner user id.
 * @param lat - Latitude.
 * @param lng - Longitude.
 * @param accuracyM - Optional accuracy meters.
 * @return object - { shared, expiresAt }
 */
export async function reportLocation(
  userId: mongoose.Types.ObjectId,
  lat: number,
  lng: number,
  accuracyM = 0
): Promise<{ shared: boolean; expiresAt: string }> {
  // TODO: Implement report location logic
  // 1. Get user's privacy settings
  // 2. Apply privacy rules (off/live/approximate)
  // 3. Calculate TTL based on settings
  // 4. Apply location approximation if needed
  // 5. Upsert location in database
  // 6. Emit real-time updates to subscribed friends
  // 7. Return sharing status and expiration

  throw new Error('reportLocation not implemented yet');
}

/**
 * Get friends' locations that are visible to the requesting user.
 * @param userId - Requesting user id.
 * @return ILocation[] - Array of friend locations.
 */
export async function getFriendsLocations(
  userId: mongoose.Types.ObjectId
): Promise<ILocation[]> {
  // TODO: Implement get friends locations logic
  // 1. Find accepted friends with shareLocation=true
  // 2. Get current locations for those friends
  // 3. Filter based on privacy settings
  // 4. Apply location approximation based on friend's settings
  // 5. Return formatted location data

  throw new Error('getFriendsLocations not implemented yet');
}