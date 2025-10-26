import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { locationModel } from '../models/location.model';
import { friendshipModel } from '../models/friendship.model';
import { userModel } from '../models/user.model';
import { pinModel } from '../models/pin.model';
import { LocationUpdateEvent, ILocation } from '../types/friends.types';
import { BadgeService } from '../services/badge.service';
import { BadgeRequirementType } from '../types/badge.types';
import logger from '../utils/logger.util';

// Location tracking subscription map
const locationTrackers = new Map<string, Set<string>>(); // friendId -> Set<viewerIds>
const socketToUser = new Map<string, mongoose.Types.ObjectId>(); // socketId -> userId
const userHeartbeats = new Map<string, NodeJS.Timeout>(); // userId -> heartbeat interval

/**
 * Location Gateway - Single source of truth for all location operations
 */
export class LocationGateway {
  private io: Server | null = null;

  /**
   * Initialize Socket.io server and location gateway
   */
  initialize(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*", // Configure for production
        methods: ["GET", "POST"]
      }
    });

    this.setupSocketHandlers();
  }

  /**
   * Report user location (from HTTP or Socket)
   */
  async reportLocation(
    userId: mongoose.Types.ObjectId,
    lat: number,
    lng: number,
    accuracyM = 0
  ): Promise<{ shared: boolean; expiresAt: string }> {
    try {
      logger.info(`📍 reportLocation called for user ${userId}: lat=${lat}, lng=${lng}`);
      
      // 1. Get user's privacy settings
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const locationPrivacy = user.privacy.location || { sharing: 'off', precisionMeters: 30 };
      logger.info(`🔒 User ${userId} privacy settings: sharing=${locationPrivacy.sharing}`);

      // 2. Check if location sharing is off
      // Handle legacy "on" value as equivalent to "live"
      if (locationPrivacy.sharing === 'off') {
        logger.warn(`🔴 User ${userId} has location sharing OFF, not sharing location`);
        return {
          shared: false,
          expiresAt: new Date().toISOString(),
        };
      }

      // 3. Apply location approximation if needed
      let finalLat = lat;
      let finalLng = lng;
      let finalAccuracyM = accuracyM;

      if (locationPrivacy.sharing === 'approximate') {
        // Apply approximation based on precisionMeters setting
        const precision = locationPrivacy.precisionMeters;
        finalAccuracyM = Math.max(accuracyM, precision);
        
        // Add some random offset within precision range
        const offset = precision / 111000; // Convert meters to degrees (approximate)
        finalLat += (Math.random() - 0.5) * offset;
        finalLng += (Math.random() - 0.5) * offset;
      }

      // 4. Store location in database with TTL
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const location = await locationModel.create(
        userId,
        finalLat,
        finalLng,
        finalAccuracyM,
        true,
        expiresAt
      );

      // 4.5. Check for nearby pins and auto-visit (use original coordinates, not approximated)
      try {
        await this.checkAndVisitNearbyPins(userId, lat, lng);
      } catch (error) {
        logger.error('Error checking nearby pins:', error);
        // Don't fail the location update if pin checking fails
      }

      // 5. Broadcast to subscribed friends
      logger.info(`📡 Broadcasting location update for user ${userId} to subscribed friends`);
      await this.broadcastLocationUpdate(userId, {
        lat: finalLat,
        lng: finalLng,
        accuracyM: finalAccuracyM,
        ts: location.createdAt.toISOString(),
      });

      logger.info(`✅ Location successfully reported and shared for user ${userId}`);
      return {
        shared: true,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      logger.error('Error reporting location:', error);
      throw error;
    }
  }

  /**
   * Get friends' current locations for HTTP endpoints
   */
  async getFriendsLocations(userId: mongoose.Types.ObjectId): Promise<ILocation[]> {
    try {
      // 1. Get accepted friends with location sharing enabled
      const friendships = await friendshipModel.findUserFriendships(userId, 'accepted');
      const friendsWithLocationSharing = friendships.filter(f => f.shareLocation);

      // 2. Get fresh locations for those friends (within last 5 minutes)
      const friendIds = friendsWithLocationSharing.map(f => 
        f.friendId._id || f.friendId
      );
      const freshLocations = await locationModel.findFriendsLocations(friendIds);

      logger.info(`Found ${freshLocations.length} fresh friend locations (within 5 minutes)`);

      // 3. Filter based on privacy settings and apply approximation
      const filteredLocations: ILocation[] = [];
      
      for (const location of freshLocations) {
        const friend = await userModel.findById(location.userId);
        if (!friend) {
          continue;
        }

        // Handle both old and new privacy format
        const locationSharing = friend.privacy.location?.sharing || 'off';
        
        // Skip if location sharing is explicitly disabled
        // Handle legacy "on" value as "live"
        if (locationSharing === 'off') {
          continue;
        }

        // Apply approximation if needed
        if (locationSharing === 'approximate') {
          const precision = friend.privacy.location?.precisionMeters || 30;
          const offset = precision / 111000;
          location.lat += (Math.random() - 0.5) * offset;
          location.lng += (Math.random() - 0.5) * offset;
          location.accuracyM = Math.max(location.accuracyM, precision);
        }
        // For legacy "on" or "live" values, use exact location (no approximation needed)

        filteredLocations.push(location);
      }

      return filteredLocations;
    } catch (error) {
      logger.error('Error getting friends locations:', error);
      throw error;
    }
  }

  /**
   * Subscribe to friend's location updates (real-time)
   */
  async trackFriendLocation(
    viewerId: mongoose.Types.ObjectId,
    friendId: mongoose.Types.ObjectId,
    durationSec = 300
  ): Promise<void> {
    try {
      // 1. Verify friendship and location sharing permission
      const friendship = await friendshipModel.findByUserAndFriend(viewerId, friendId);
      if (!friendship || friendship.status !== 'accepted' || !friendship.shareLocation) {
        throw new Error('Not authorized to track this friend\'s location');
      }

      // 2. Check friend's privacy settings
      const friend = await userModel.findById(friendId);
      const locationSharing = friend?.privacy.location?.sharing || 'off';
      if (!friend || locationSharing === 'off') {
        throw new Error('Friend has location sharing disabled');
      }

      // 3. Add to tracking map
      const friendIdStr = friendId.toString();
      const viewerIdStr = viewerId.toString();
      
      if (!locationTrackers.has(friendIdStr)) {
        locationTrackers.set(friendIdStr, new Set());
      }
      locationTrackers.get(friendIdStr)!.add(viewerIdStr);

      // 4. Send current location if available
      const currentLocation = await locationModel.findByUserId(friendId);
      if (currentLocation) {
        await this.sendLocationUpdate(viewerId, friendId, {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          accuracyM: currentLocation.accuracyM,
          ts: currentLocation.createdAt.toISOString(),
        });
      }

      // 5. Auto-unsubscribe after duration
      setTimeout(() => {
        this.untrackFriendLocation(viewerId, friendId);
      }, durationSec * 1000);

    } catch (error) {
      logger.error('Error tracking friend location:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from friend's location updates
   */
  async untrackFriendLocation(
    viewerId: mongoose.Types.ObjectId,
    friendId: mongoose.Types.ObjectId
  ): Promise<void> {
    const friendIdStr = friendId.toString();
    const viewerIdStr = viewerId.toString();
    
    const trackers = locationTrackers.get(friendIdStr);
    if (trackers) {
      trackers.delete(viewerIdStr);
      if (trackers.size === 0) {
        locationTrackers.delete(friendIdStr);
      }
    }
  }

  /**
   * Broadcast location update to all subscribers
   */
  private async broadcastLocationUpdate(
    userId: mongoose.Types.ObjectId,
    locationData: { lat: number; lng: number; accuracyM: number; ts: string }
  ): Promise<void> {
    if (!this.io) return;

    const userIdStr = userId.toString();
    const trackers = locationTrackers.get(userIdStr);
    
    logger.info(`📡 Checking trackers for user ${userIdStr}: ${trackers ? trackers.size : 0} subscribers`);
    
    if (trackers && trackers.size > 0) {
      logger.info(`📡 Broadcasting to ${trackers.size} friends tracking user ${userIdStr}`);
      const locationEvent: LocationUpdateEvent = {
        type: 'location.update',
        version: 1,
        userId: userIdStr,
        lat: locationData.lat,
        lng: locationData.lng,
        accuracyM: locationData.accuracyM,
        ts: locationData.ts,
        ttlSec: 1800, // 30 minutes
        approx: false, // Will be determined by privacy settings
        idempotencyKey: `${userIdStr}-${Date.now()}`,
      };

      // Send to each subscriber
      for (const viewerId of trackers) {
        await this.sendLocationUpdate(new mongoose.Types.ObjectId(viewerId), userId, locationData);
      }
    }
  }

  /**
   * Send location update to specific user
   */
  private async sendLocationUpdate(
    viewerId: mongoose.Types.ObjectId,
    friendId: mongoose.Types.ObjectId,
    locationData: { lat: number; lng: number; accuracyM: number; ts: string }
  ): Promise<void> {
    if (!this.io) return;

    const nsp = this.io.of('/realtime');
    nsp.to(`user:${viewerId.toString()}`).emit('location:update', {
      friendId: friendId.toString(),
      ...locationData,
    });
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    const nsp = this.io.of('/realtime');

    // Authentication middleware
    nsp.use(async (socket: Socket, next: (err?: Error) => void) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // Development bypass with dev token
        const devToken = process.env.DEV_AUTH_TOKEN;
        const devUserId = socket.handshake.headers['x-dev-user-id'] as string;
        
        if (devToken && token === devToken && devUserId && process.env.NODE_ENV !== 'production') {
          console.log(`[DEV] Socket.io using dev token bypass for user ID: ${devUserId}`);
          
          if (!mongoose.Types.ObjectId.isValid(devUserId)) {
            return next(new Error('Invalid dev user ID'));
          }

          const user = await userModel.findById(new mongoose.Types.ObjectId(devUserId));
          if (!user) {
            return next(new Error('Dev user not found'));
          }

          // Store user ID in socket data
          socket.data.userId = new mongoose.Types.ObjectId(devUserId);
          socketToUser.set(socket.id, new mongoose.Types.ObjectId(devUserId));
          
          next();
          return;
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const userId = new mongoose.Types.ObjectId(decoded.id);
        
        // Store user ID in socket data
        socket.data.userId = userId;
        socketToUser.set(socket.id, userId);
        
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    nsp.on('connection', (socket: Socket) => {
      const userId = socket.data.userId as mongoose.Types.ObjectId;
      const userIdStr = userId.toString();
      socket.join(`user:${userIdStr}`);

      logger.info(`🟢 User ${userId} connected to realtime namespace (Socket ID: ${socket.id})`);

      // Update lastActiveAt immediately on connection
      userModel.updateLastActiveAt(userId).catch(error => {
        logger.error('Error updating lastActiveAt on connect:', error);
      });

      // Set up heartbeat to update lastActiveAt every 5 minutes
      const heartbeatInterval = setInterval(async () => {
        try {
          await userModel.updateLastActiveAt(userId);
          logger.debug(`💓 Heartbeat: Updated lastActiveAt for user ${userId}`);
        } catch (error) {
          logger.error('Error in heartbeat update:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes

      userHeartbeats.set(userIdStr, heartbeatInterval);

      // Handle location tracking subscription
      socket.on('location:track', async (payload: { friendId: string; durationSec?: number }) => {
        try {
          const friendId = new mongoose.Types.ObjectId(payload.friendId);
          const duration = payload.durationSec || 300; // 5 minutes default

          await this.trackFriendLocation(userId, friendId, duration);
          
          socket.emit('location:track:ack', {
            friendId: payload.friendId,
            status: 'subscribed',
            durationSec: duration,
          });
        } catch (error) {
          logger.error('Error in location:track:', error);
          socket.emit('location:track:error', {
            friendId: payload.friendId,
            error: error instanceof Error ? error.message : 'Failed to subscribe to location updates',
          });
        }
      });

      // Handle location tracking unsubscribe
      socket.on('location:untrack', async (payload: { friendId: string }) => {
        try {
          const friendId = new mongoose.Types.ObjectId(payload.friendId);
          await this.untrackFriendLocation(userId, friendId);
          
          socket.emit('location:untrack:ack', {
            friendId: payload.friendId,
            status: 'unsubscribed',
          });
        } catch (error) {
          logger.error('Error in location:untrack:', error);
          socket.emit('location:untrack:error', {
            friendId: payload.friendId,
            error: error instanceof Error ? error.message : 'Failed to unsubscribe from location updates',
          });
        }
      });

      // Handle location updates from client
      socket.on('location:ping', async (payload: { lat: number; lng: number; accuracyM?: number }) => {
        try {
          const { lat, lng, accuracyM = 0 } = payload;
          
          logger.info(`📍 location:ping received from user ${userId}: lat=${lat}, lng=${lng}, accuracy=${accuracyM}`);
          
          const result = await this.reportLocation(userId, lat, lng, accuracyM);
          
          logger.info(`✅ location:ping processed for user ${userId}, shared=${result.shared}`);
          socket.emit('location:ping:ack', result);
        } catch (error) {
          logger.error(`❌ Error in location:ping for user ${userId}:`, error);
          socket.emit('location:ping:error', {
            error: error instanceof Error ? error.message : 'Failed to update location',
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason: string) => {
        logger.info(`User ${userId} disconnected from realtime namespace:`, reason);

        // Clean up heartbeat
        const heartbeat = userHeartbeats.get(userIdStr);
        if (heartbeat) {
          clearInterval(heartbeat);
          userHeartbeats.delete(userIdStr);
        }

        // Clean up tracking subscriptions for this user
        for (const [friendId, trackers] of locationTrackers.entries()) {
          trackers.delete(userIdStr);
          if (trackers.size === 0) {
            locationTrackers.delete(friendId);
          }
        }
        
        socketToUser.delete(socket.id);
      });
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @returns distance in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Check for nearby pins and automatically visit them if within 10m
   */
  private async checkAndVisitNearbyPins(
    userId: mongoose.Types.ObjectId,
    userLat: number,
    userLng: number
  ): Promise<void> {
    try {
      // Get user's visited pins to avoid re-checking
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('visitedPins');
      if (!user) return;

      const visitedPinIds = new Set(user.visitedPins.map((id: mongoose.Types.ObjectId) => id.toString()));

      // Search for pins within a reasonable radius (100m to be safe)
      const nearbyPins = await pinModel.search({
        latitude: userLat,
        longitude: userLng,
        radius: 100, // Search within 100m
        page: 1,
        limit: 50,
      });

      logger.info(`🔍 Checking ${nearbyPins.pins.length} nearby pins for visits. Already visited: ${visitedPinIds.size} pins.`);

      // Check each pin for exact proximity (50m)
      for (const pin of nearbyPins.pins) {
        // Skip if already visited
        if (visitedPinIds.has(pin._id.toString())) {
          continue;
        }

        // Calculate exact distance
        const distance = this.calculateDistance(
          userLat,
          userLng,
          pin.location.latitude,
          pin.location.longitude
        );

        // If within 50 meters, mark as visited
        if (distance <= 50) {
          logger.info(`📍 User ${userId} is within ${distance.toFixed(2)}m of pin ${pin._id} (${pin.name}). Auto-visiting...`);

          // Prepare increments based on pin category
          const increments: any = { 'stats.pinsVisited': 1 };

          // Track category-specific visits (only for pre-seeded pins)
          if (pin.isPreSeeded) {
            if (pin.category === 'study') {
              increments['stats.librariesVisited'] = 1;
              logger.info(`📚 Incrementing library visit count (pre-seeded)`);
            } else if (pin.category === 'shops_services') {
              // Check subtype to distinguish cafes from restaurants
              const subtype = pin.metadata?.subtype;
              if (subtype === 'cafe') {
                increments['stats.cafesVisited'] = 1;
                logger.info(`☕ Incrementing cafe visit count (pre-seeded)`);
              } else if (subtype === 'restaurant') {
                increments['stats.restaurantsVisited'] = 1;
                logger.info(`🍽️  Incrementing restaurant visit count (pre-seeded)`);
              }
            }
          }

          // Add pin to visited list and increment counters
          await User.findByIdAndUpdate(userId, {
            $push: { visitedPins: pin._id },
            $inc: increments,
          });

          // Process badge events for pin visit
          try {
            let allEarnedBadges: any[] = [];

            // General pin visit event
            const visitBadges = await BadgeService.processBadgeEvent({
              userId: userId.toString(),
              eventType: BadgeRequirementType.PINS_VISITED,
              value: 1,
              timestamp: new Date(),
              metadata: {
                pinId: pin._id.toString(),
                pinName: pin.name,
                category: pin.category,
                distance: distance,
              },
            });
            allEarnedBadges = allEarnedBadges.concat(visitBadges);

            // Category-specific badge events (only for pre-seeded pins)
            if (pin.isPreSeeded) {
              if (pin.category === 'study') {
                const libraryBadges = await BadgeService.processBadgeEvent({
                  userId: userId.toString(),
                  eventType: BadgeRequirementType.LIBRARIES_VISITED,
                  value: 1,
                  timestamp: new Date(),
                  metadata: {
                    pinId: pin._id.toString(),
                    pinName: pin.name,
                  },
                });
                allEarnedBadges = allEarnedBadges.concat(libraryBadges);
              } else if (pin.category === 'shops_services') {
                // Check subtype for specific badge events
                const subtype = pin.metadata?.subtype;
                if (subtype === 'cafe') {
                  const cafeBadges = await BadgeService.processBadgeEvent({
                    userId: userId.toString(),
                    eventType: BadgeRequirementType.CAFES_VISITED,
                    value: 1,
                    timestamp: new Date(),
                    metadata: {
                      pinId: pin._id.toString(),
                      pinName: pin.name,
                    },
                  });
                  allEarnedBadges = allEarnedBadges.concat(cafeBadges);
                } else if (subtype === 'restaurant') {
                  const restaurantBadges = await BadgeService.processBadgeEvent({
                    userId: userId.toString(),
                    eventType: BadgeRequirementType.RESTAURANTS_VISITED,
                    value: 1,
                    timestamp: new Date(),
                    metadata: {
                      pinId: pin._id.toString(),
                      pinName: pin.name,
                    },
                  });
                  allEarnedBadges = allEarnedBadges.concat(restaurantBadges);
                }
              }
            }

            if (allEarnedBadges.length > 0) {
              logger.info(`🏆 User ${userId} earned ${allEarnedBadges.length} badge(s) from visiting pin ${pin.name}!`);

              // Emit badge earned event to user if they're connected
              if (this.io) {
                const nsp = this.io.of('/realtime');
                nsp.to(`user:${userId.toString()}`).emit('badge:earned', {
                  badges: allEarnedBadges,
                  trigger: 'pin_visit',
                  pinName: pin.name,
                });
              }
            }
          } catch (badgeError) {
            logger.error('Error processing badge event for pin visit:', badgeError);
          }

          // Add to visited set to avoid re-processing in this check
          visitedPinIds.add(pin._id.toString());
        }
      }
    } catch (error) {
      logger.error('Error in checkAndVisitNearbyPins:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const locationGateway = new LocationGateway();