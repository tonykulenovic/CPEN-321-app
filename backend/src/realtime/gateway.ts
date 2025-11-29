import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { locationModel } from '../models/location.model';
import { friendshipModel } from '../models/friendship.model';
import { userModel } from '../models/user.model';
import { pinModel } from '../models/pin.model';
import { ILocation } from '../types/friends.types';
import { BadgeService } from '../services/badge.service';
import { BadgeRequirementType } from '../types/badge.types';
import { PinCategory } from '../types/pins.types';
import logger from '../utils/logger.util';

// Location tracking subscription map
const locationTrackers = new Map<string, Set<string>>(); // friendId -> Set<viewerIds>
const socketToUser = new Map<string, mongoose.Types.ObjectId>(); // socketId -> userId
const userHeartbeats = new Map<string, ReturnType<typeof setInterval>>(); // userId -> heartbeat interval

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
      logger.info(`📍 reportLocation called for user ${userId.toString()}: lat=${lat}, lng=${lng}`);
      
      // 1. Get user's privacy settings
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const locationPrivacy = user.privacy?.location ?? { sharing: 'off', precisionMeters: 30 };
      logger.info(`🔒 User ${userId.toString()} privacy settings: sharing=${locationPrivacy.sharing}`);

      // 2. ALWAYS check for nearby pins first (even if sharing is off)
      // Pin visiting is a personal feature that doesn't require location sharing
      try {
        await this.checkAndVisitNearbyPins(userId, lat, lng);
      } catch (error) {
        logger.error('Error checking nearby pins:', error);
        // Don't fail if pin checking fails
      }

      // 3. Apply location approximation if needed (for friend sharing)
      let finalLat = lat;
      let finalLng = lng;
      let finalAccuracyM = accuracyM;
      const willShareWithFriends = locationPrivacy.sharing !== 'off';

      if (locationPrivacy.sharing === 'approximate') {
        // Apply approximation based on precisionMeters setting
        const precision = locationPrivacy.precisionMeters;
        finalAccuracyM = Math.max(accuracyM, precision);
        
        // Add some random offset within precision range
        const offset = precision / 111000; // Convert meters to degrees (approximate)
        // eslint-disable-next-line security/detect-insecure-randomness
        finalLat += (Math.random() - 0.5) * offset;
        // eslint-disable-next-line security/detect-insecure-randomness
        finalLng += (Math.random() - 0.5) * offset;
      }

      // 4. ALWAYS store location in database (needed for recommendations, pin visits, etc.)
      // Use original lat/lng for storage when not sharing, approximated for sharing
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const location = await locationModel.create(
        userId,
        willShareWithFriends ? finalLat : lat, // Use original location when not sharing
        willShareWithFriends ? finalLng : lng,
        willShareWithFriends ? finalAccuracyM : accuracyM,
        willShareWithFriends, // Set shared flag based on privacy
        expiresAt
      );

      // 5. Only broadcast to friends if location sharing is enabled
      if (willShareWithFriends) {
        const locationData = {
        lat: finalLat,
        lng: finalLng,
        accuracyM: finalAccuracyM,
        ts: location.createdAt.toISOString(),
        };

        logger.info(`📡 Broadcasting location update for user ${userId.toString()} to subscribed friends`);
        await this.broadcastLocationUpdate(userId, locationData);
        
        // Also broadcast to ALL friends so they know this user is sharing
        // (helps friends who haven't subscribed yet to see the location)
        await this.broadcastFriendStartedSharing(userId, locationData);
        
        logger.info(`✅ Location saved and shared with friends for user ${userId.toString()}`);
      } else {
        logger.info(`✅ Location saved (not shared with friends due to privacy settings) for user ${userId.toString()}`);
      }

      return {
        shared: willShareWithFriends,
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
      
      // Find and delete orphaned friendships (where friendId is null due to deleted users)
      const orphanedFriendshipIds = friendships
        .filter(f => {
          const friendData = f.friendId as { _id?: mongoose.Types.ObjectId } | null;
          return !friendData || !friendData._id;
        })
        .map(f => f._id);

      if (orphanedFriendshipIds.length > 0) {
        logger.warn(`⚠️ Found ${orphanedFriendshipIds.length} orphaned friendships for user ${userId.toString()} - deleting...`);
        // Delete orphaned friendships asynchronously (don't block the response)
        Promise.all(orphanedFriendshipIds.map(id => friendshipModel.deleteById(id)))
          .then(() => {
            logger.info(`✅ Cleaned up ${orphanedFriendshipIds.length} orphaned friendships`);
          })
          .catch(error => {
            logger.error('❌ Error cleaning up orphaned friendships:', error);
          });
      }

      const validFriendships = friendships.filter(f => {
        const friendData = f.friendId as { _id?: mongoose.Types.ObjectId } | null;
        return friendData && friendData._id;
      });
      
      const friendsWithLocationSharing = validFriendships.filter(f => f.shareLocation);

      // 2. Get fresh locations for those friends (within last 5 minutes)
      const friendIds = friendsWithLocationSharing.map(f => 
        (f.friendId as { _id?: mongoose.Types.ObjectId })._id ?? f.friendId
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
        const locationSharing = friend.privacy?.location?.sharing ?? 'off';
        
        // Skip if location sharing is explicitly disabled
        // Handle legacy "on" value as "live"
        if (locationSharing === 'off') {
          continue;
        }

        // Apply approximation if needed
        if (locationSharing === 'approximate') {
          const precision = friend.privacy.location.precisionMeters || 30;
          const offset = precision / 111000;
          // eslint-disable-next-line security/detect-insecure-randomness
          location.lat += (Math.random() - 0.5) * offset;
          // eslint-disable-next-line security/detect-insecure-randomness
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
      const locationSharing = friend?.privacy.location.sharing ?? 'off';
      if (!friend || locationSharing === 'off') {
        throw new Error('Friend has location sharing disabled');
      }

      // 3. Add to tracking map
      const friendIdStr = friendId.toString();
      const viewerIdStr = viewerId.toString();
      
      if (!locationTrackers.has(friendIdStr)) {
        locationTrackers.set(friendIdStr, new Set());
      }
      locationTrackers.get(friendIdStr)?.add(viewerIdStr);

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
        this.untrackFriendLocation(viewerId, friendId).catch(() => {});
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
   * Broadcast that a friend started sharing their location
   * This notifies ALL friends so they can start tracking
   */
  async broadcastFriendStartedSharing(
    userId: mongoose.Types.ObjectId,
    locationData: { lat: number; lng: number; accuracyM: number; ts: string }
  ): Promise<void> {
    if (!this.io) return;

    try {
      // Get all accepted friends of this user
      const friendships = await friendshipModel.findUserFriendships(userId, 'accepted');
      
      if (friendships.length === 0) {
        logger.debug(`No friends to notify for user ${userId.toString()}`);
        return;
      }

      const nsp = this.io.of('/realtime');
      const userIdStr = userId.toString();
      
      logger.info(`📡 Broadcasting friend:started:sharing to ${friendships.length} friends of user ${userIdStr}`);

      for (const friendship of friendships) {
        // Determine friend's ID
        const friendId = friendship.userId.toString() === userIdStr 
          ? friendship.friendId 
          : friendship.userId;
        
        nsp.to(`user:${friendId.toString()}`).emit('friend:started:sharing', {
          friendId: userIdStr,
          ...locationData,
        });
        logger.debug(`📡 Notified ${friendId.toString()} that friend ${userIdStr} started sharing`);
      }
    } catch (error) {
      logger.error('Error broadcasting friend started sharing:', error);
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
          next(new Error('Authentication error: No token provided')); return;
        }

        // Development bypass with dev token
        const devToken = process.env.DEV_AUTH_TOKEN;
        const devUserId = socket.handshake.headers['x-dev-user-id'] as string;
        
        if (devToken && token === devToken && devUserId && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line security/detect-console-log-non-literal
          console.log(`[DEV] Socket.io using dev token bypass for user ID: ${devUserId}`);
          
          if (!mongoose.Types.ObjectId.isValid(devUserId)) {
            next(new Error('Invalid dev user ID')); return;
          }

          const user = await userModel.findById(new mongoose.Types.ObjectId(devUserId));
          if (!user) {
            next(new Error('Dev user not found')); return;
          }

          // Store user ID in socket data
          socket.data.userId = new mongoose.Types.ObjectId(devUserId);
          socketToUser.set(String(socket.id), new mongoose.Types.ObjectId(devUserId));
          
          next();
          return;
        }

        // Verify JWT token
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          next(new Error('JWT_SECRET not configured'));
          return;
        }
        const decoded = jwt.verify(token, secret) as { id?: string } | undefined;
        if (!decoded?.id) {
          next(new Error('Invalid token'));
          return;
        }
        const userId = new mongoose.Types.ObjectId(decoded.id);
        
        // Store user ID in socket data
        socket.data.userId = userId;
        socketToUser.set(String(socket.id), userId);
        
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

      logger.info(`🟢 User ${userId.toString()} connected to realtime namespace (Socket ID: ${socket.id})`);

      // Update lastActiveAt immediately on connection
      userModel.updateLastActiveAt(userId).catch((error: unknown) => {
        logger.error('Error updating lastActiveAt on connect:', error);
      });

      // Set up heartbeat to update lastActiveAt every 5 minutes
      const heartbeatInterval = setInterval(() => {
        (async () => {
          try {
            await userModel.updateLastActiveAt(userId);
            logger.debug(`💓 Heartbeat: Updated lastActiveAt for user ${userId.toString()}`);
          } catch (error) {
            logger.error('Error in heartbeat update:', error);
          }
        })().catch(() => {});
      }, 5 * 60 * 1000); // 5 minutes

      userHeartbeats.set(userIdStr, heartbeatInterval);

      // Handle location tracking subscription
      socket.on('location:track', async (payload: { friendId: string; durationSec?: number }) => {
        try {
          const friendId = new mongoose.Types.ObjectId(payload.friendId);
          const duration = payload.durationSec ?? 300; // 5 minutes default

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
          
          logger.info(`📍 location:ping received from user ${userId.toString()}: lat=${lat}, lng=${lng}, accuracy=${accuracyM}`);
          
          const result = await this.reportLocation(userId, lat, lng, accuracyM);
          
          logger.info(`✅ location:ping processed for user ${userId.toString()}, shared=${result.shared}`);
          socket.emit('location:ping:ack', result);
        } catch (error) {
          logger.error(`❌ Error in location:ping for user ${userId.toString()}:`, error);
          socket.emit('location:ping:error', {
            error: error instanceof Error ? error.message : 'Failed to update location',
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason: string) => {
        logger.info(`User ${userId.toString()} disconnected from realtime namespace:`, reason);

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
        
        socketToUser.delete(String(socket.id));
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

      const visitedPinIds = new Set((user.visitedPins as mongoose.Types.ObjectId[]).map((id: mongoose.Types.ObjectId) => id.toString()));

      // Search for pins within a reasonable radius (100m to be safe)
      // Use a high limit to get ALL nearby pins (pagination would cut off results)
      const nearbyPins = await pinModel.search({
        latitude: userLat,
        longitude: userLng,
        radius: 100, // Search within 100m
        page: 1,
        limit: 1000, // High limit to ensure we get all pins within radius
      });

      const librariesInSearch = nearbyPins.pins.filter(p => p.category === PinCategory.STUDY).length;
      logger.info(`🔍 Checking ${nearbyPins.pins.length} nearby pins for visits (${librariesInSearch} libraries). Already visited: ${visitedPinIds.size} pins.`);

      // Check each pin for exact proximity (50m)
      for (const pin of nearbyPins.pins) {
        // Skip if already visited
        if (visitedPinIds.has(pin._id.toString())) {
          // Log libraries at INFO level to debug badge issues
          if (pin.category === PinCategory.STUDY) {
            logger.info(`⏭️  Skipping already visited LIBRARY: ${pin.name}`);
          } else {
            logger.debug(`⏭️  Skipping already visited pin: ${pin.name}`);
          }
          continue;
        }

        // Calculate exact distance
        const distance = this.calculateDistance(
          userLat,
          userLng,
          pin.location.latitude,
          pin.location.longitude
        );

        // Log distance for ALL unvisited pins (especially libraries)
        if (pin.category === PinCategory.STUDY || (pin.category === PinCategory.SHOPS_SERVICES && pin.metadata?.subtype === 'cafe')) {
          logger.info(`📏 Distance to ${pin.name} (${pin.category}${pin.metadata?.subtype ? '/' + pin.metadata.subtype : ''}): ${distance.toFixed(2)}m`);
        }

        // If within 50 meters, mark as visited
        if (distance <= 50) {
          logger.info(`📍 User ${userId.toString()} is within ${distance.toFixed(2)}m of pin ${pin._id.toString()} (${pin.name}). Auto-visiting...`);

          // Prepare increments based on pin category
          const increments: Record<string, number> = { 'stats.pinsVisited': 1 };

          // Track category-specific visits (only for pre-seeded pins)
          if (pin.isPreSeeded) {
            if (pin.category === PinCategory.STUDY) {
              increments['stats.librariesVisited'] = 1;
              logger.info(`📚 Incrementing library visit count (pre-seeded)`);
            } else if (pin.category === PinCategory.SHOPS_SERVICES) {
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
            let allEarnedBadges: unknown[] = [];

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
                distance,
              },
            });
            allEarnedBadges = allEarnedBadges.concat(visitBadges);

            // Category-specific badge events (only for pre-seeded pins)
            logger.info(`🔍 [REALTIME] Pin visit - isPreSeeded: ${pin.isPreSeeded}, category: ${pin.category}, subtype: ${pin.metadata?.subtype}`);
            
            if (pin.isPreSeeded) {
              if (pin.category === PinCategory.STUDY) {
                logger.info(`📚 [REALTIME] Processing library badge event for: ${pin.name}`);
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
                logger.info(`📚 [REALTIME] Library badge event returned ${libraryBadges.length} badges`);
                allEarnedBadges = allEarnedBadges.concat(libraryBadges);
              } else if (pin.category === PinCategory.SHOPS_SERVICES) {
                // Check subtype for specific badge events
                const subtype = pin.metadata?.subtype;
                logger.info(`🏪 [REALTIME] Shops/services pin - subtype: ${subtype}`);
                
                if (subtype === 'cafe') {
                  logger.info(`☕ [REALTIME] Processing cafe badge event for: ${pin.name}`);
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
                  logger.info(`☕ [REALTIME] Cafe badge event returned ${cafeBadges.length} badges`);
                  allEarnedBadges = allEarnedBadges.concat(cafeBadges);
                } else if (subtype === 'restaurant') {
                  logger.info(`🍽️  [REALTIME] Processing restaurant badge event for: ${pin.name}`);
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
                } else {
                  logger.warn(`⚠️  [REALTIME] Shops/services pin with missing or unknown subtype: ${subtype}`);
                }
              }
            } else {
              logger.info(`ℹ️  [REALTIME] Pin is not pre-seeded, skipping category-specific badge events`);
            }

            if (allEarnedBadges.length > 0) {
              logger.info(`🏆 User ${userId.toString()} earned ${allEarnedBadges.length} badge(s) from visiting pin ${pin.name}!`);

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

  /**
   * Broadcast pin created event to all connected users
   */
  async broadcastPinCreated(pin: unknown): Promise<void> {
    if (!this.io) return;
    
    const nsp = this.io.of('/realtime');
    nsp.emit('pin:created', {
      pin
    });
    
    logger.info(`📍 Broadcasting pin created: ${(pin as { _id: { toString: () => string } })._id.toString()}`);
  }

  /**
   * Broadcast pin updated event to all connected users
   */
  async broadcastPinUpdated(pin: unknown): Promise<void> {
    if (!this.io) return;
    
    const nsp = this.io.of('/realtime');
    nsp.emit('pin:updated', {
      pin: pin
    });
    
    logger.info(`📍 Broadcasting pin updated: ${(pin as { _id: { toString: () => string } })._id.toString()}`);
  }

  /**
   * Broadcast pin deleted event to all connected users
   */
  async broadcastPinDeleted(pinId: string): Promise<void> {
    if (!this.io) return;
    
    const nsp = this.io.of('/realtime');
    nsp.emit('pin:deleted', {
      pinId
    });
    
    logger.info(`📍 Broadcasting pin deleted: ${pinId}`);
  }
}

// Create singleton instance
export const locationGateway = new LocationGateway();