import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { locationModel } from '../models/location.model';
import { friendshipModel } from '../models/friendship.model';
import { userModel } from '../models/user.model';
import { LocationUpdateEvent, ILocation } from '../types/friends.types';
import logger from '../utils/logger.util';

// Location tracking subscription map
const locationTrackers = new Map<string, Set<string>>(); // friendId -> Set<viewerIds>
const socketToUser = new Map<string, mongoose.Types.ObjectId>(); // socketId -> userId

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

      // 2. Get locations for those friends
      const friendIds = friendsWithLocationSharing.map(f => 
        f.friendId._id || f.friendId
      );
      const locations = await locationModel.findFriendsLocations(friendIds);

      // 3. Filter based on privacy settings and apply approximation
      const filteredLocations: ILocation[] = [];
      
      for (const location of locations) {
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
    nsp.use(async (socket: Socket, next) => {
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
      socket.join(`user:${userId.toString()}`);

      logger.info(`🟢 User ${userId} connected to realtime namespace (Socket ID: ${socket.id})`);

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
      socket.on('disconnect', (reason) => {
        logger.info(`User ${userId} disconnected from realtime namespace:`, reason);
        
        // Clean up tracking subscriptions for this user
        const userIdStr = userId.toString();
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
}

// Create singleton instance
export const locationGateway = new LocationGateway();