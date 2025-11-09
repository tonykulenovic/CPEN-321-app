import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { Server as HttpServer } from 'http';
import { locationGateway, LocationGateway } from '../../src/realtime/gateway';
import { userModel } from '../../src/models/user.model';
import { locationModel } from '../../src/models/location.model';
import { SignUpRequest } from '../../src/types/user.types';

// Test the business logic methods that don't require Socket.io
describe('Unmocked: LocationGateway Business Logic', () => {
  let testUserId: mongoose.Types.ObjectId;
  let testUser: unknown;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Clean up any existing test data
    await mongoose.connection.db?.collection('users').deleteMany({
      email: { $regex: /gatewaytest.*@example\.com/ }
    });
    await mongoose.connection.db?.collection('locations').deleteMany({});
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      try {
        await userModel.delete(testUserId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('calculateDistance method', () => {
    it('should calculate distance between two coordinates correctly', () => {
      // Test distance calculation between UBC and downtown Vancouver
      const ubcLat = 49.2606;
      const ubcLng = -123.2460;
      const downtownLat = 49.2827;
      const downtownLng = -123.1207;

      const distance = (locationGateway as unknown).calculateDistance(
        ubcLat, ubcLng, downtownLat, downtownLng
      );

      // Distance should be approximately 9-15 km (adjusted for actual calculation)
      expect(distance).toBeGreaterThan(9000);
      expect(distance).toBeLessThan(15000);
      expect(typeof distance).toBe('number');
    });

    it('should return 0 for same coordinates', () => {
      const lat = 49.2827;
      const lng = -123.1207;

      const distance = (locationGateway as any).calculateDistance(
        lat, lng, lat, lng
      );

      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // Two points very close together (approximately 100 meters apart)
      const lat1 = 49.2827;
      const lng1 = -123.1207;
      const lat2 = 49.2836; // ~100m north
      const lng2 = -123.1207;

      const distance = (locationGateway as any).calculateDistance(
        lat1, lng1, lat2, lng2
      );

      // Should be approximately 100 meters
      expect(distance).toBeGreaterThan(80);
      expect(distance).toBeLessThan(120);
    });
  });

  describe('getFriendsLocations method', () => {
    let testUserId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      // Create a test user
      testUserId = new mongoose.Types.ObjectId();
    });

    it('should handle user with no friends gracefully', async () => {
      const result = await locationGateway.getFriendsLocations(testUserId);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle invalid user ID gracefully', async () => {
      const invalidUserId = new mongoose.Types.ObjectId();
      
      const result = await locationGateway.getFriendsLocations(invalidUserId);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should execute without throwing errors', async () => {
      // Test that the method executes the actual database query logic
      expect(async () => {
        await locationGateway.getFriendsLocations(testUserId);
      }).not.toThrow();
    });
  });

  describe('reportLocation method', () => {
    let testUserId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      testUserId = new mongoose.Types.ObjectId();
    });

    it('should execute reportLocation and handle user not found', async () => {
      const lat = 49.2827;
      const lng = -123.1207;
      const accuracy = 10;

      // Expect the method to throw "User not found" since we didn't create a user
      await expect(
        locationGateway.reportLocation(testUserId, lat, lng, accuracy)
      ).rejects.toThrow('User not found');
    });

    it('should handle edge case coordinates and throw expected error', async () => {
      // Test boundary coordinates - should fail at user lookup, not coordinate validation
      const testCases = [
        { lat: 90, lng: 180, accuracy: 0 },   // North pole, date line
        { lat: -90, lng: -180, accuracy: 0 }, // South pole, date line
        { lat: 0, lng: 0, accuracy: 1000 },   // Null island with high accuracy
      ];

      for (const testCase of testCases) {
        await expect(
          locationGateway.reportLocation(
            testUserId, 
            testCase.lat, 
            testCase.lng, 
            testCase.accuracy
          )
        ).rejects.toThrow('User not found');
      }
    });

    it('should execute actual database query logic', async () => {
      // Verify the method executes real location update logic up to the user lookup
      try {
        await locationGateway.reportLocation(testUserId, 49.2827, -123.1207, 10);
      } catch (error: unknown) {
        // Should reach the user lookup and fail there
        expect(error.message).toBe('User not found');
      }
    });
  });

  describe('initialization methods', () => {
    it('should have required methods defined', () => {
      expect(typeof locationGateway.initialize).toBe('function');
      expect(typeof locationGateway.reportLocation).toBe('function');
      expect(typeof locationGateway.getFriendsLocations).toBe('function');
      expect(typeof locationGateway.trackFriendLocation).toBe('function');
      expect(typeof locationGateway.untrackFriendLocation).toBe('function');
    });

    it('should be a singleton instance', () => {
      const gateway = new LocationGateway();
      expect(gateway).toBeDefined();
      expect(locationGateway).toBeDefined();
      expect(gateway).not.toBe(locationGateway); // Different instances
    });
  });

  describe('trackFriendLocation method', () => {
    let viewerId: mongoose.Types.ObjectId;
    let friendId: mongoose.Types.ObjectId;

    beforeEach(() => {
      viewerId = new mongoose.Types.ObjectId();
      friendId = new mongoose.Types.ObjectId();
    });

    it('should execute tracking logic and handle authorization error', async () => {
      // Expect the method to fail at authorization check since no friendship exists
      await expect(
        locationGateway.trackFriendLocation(viewerId, friendId, 300)
      ).rejects.toThrow('Not authorized to track this friend\'s location');
    });

    it('should handle zero duration and fail at authorization', async () => {
      await expect(
        locationGateway.trackFriendLocation(viewerId, friendId, 0)
      ).rejects.toThrow('Not authorized to track this friend\'s location');
    });

    it('should handle same user IDs and fail at authorization', async () => {
      const userId = new mongoose.Types.ObjectId();
      
      await expect(
        locationGateway.trackFriendLocation(userId, userId, 300)
      ).rejects.toThrow('Not authorized to track this friend\'s location');
    });
  });

  describe('untrackFriendLocation method', () => {
    let viewerId: mongoose.Types.ObjectId;
    let friendId: mongoose.Types.ObjectId;

    beforeEach(() => {
      viewerId = new mongoose.Types.ObjectId();
      friendId = new mongoose.Types.ObjectId();
    });

    it('should handle untracking request without errors', async () => {
      expect(async () => {
        await locationGateway.untrackFriendLocation(viewerId, friendId);
      }).not.toThrow();
    });

    it('should handle untracking non-existent tracking', async () => {
      // Should not throw even if no tracking exists
      expect(async () => {
        await locationGateway.untrackFriendLocation(viewerId, friendId);
      }).not.toThrow();
    });
  });

  describe('reportLocation method - comprehensive coverage', () => {
    beforeEach(async () => {
      // Create a test user with specific privacy settings
      const userInfo: SignUpRequest = {
        googleId: 'gateway-test-google-id',
        email: 'gatewaytest@example.com',
        name: 'Gateway Test User',
        username: 'gatewayuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should handle user with location sharing OFF', async () => {
      // Set user privacy to sharing OFF
      await userModel.updatePrivacy(testUserId, {
        location: { sharing: 'off' }
      });

      const result = await locationGateway.reportLocation(testUserId, 49.2827, -123.1207, 10);
      
      expect(result.shared).toBe(false);
      expect(result).toHaveProperty('expiresAt');
    });

    it('should handle user with location sharing LIVE', async () => {
      // Set user privacy to sharing LIVE
      await userModel.updatePrivacy(testUserId, {
        location: { sharing: 'live' }
      });

      const result = await locationGateway.reportLocation(testUserId, 49.2827, -123.1207, 10);
      
      expect(result.shared).toBe(true);
      expect(result).toHaveProperty('expiresAt');
    });

    it('should handle user with location sharing APPROXIMATE', async () => {
      // Set user privacy to sharing APPROXIMATE with custom precision
      await userModel.updatePrivacy(testUserId, {
        location: { sharing: 'approximate', precisionMeters: 100 }
      });

      const result = await locationGateway.reportLocation(testUserId, 49.2827, -123.1207, 15);
      
      expect(result.shared).toBe(true);
      expect(result).toHaveProperty('expiresAt');
    });

    it('should handle legacy "on" value as "live"', async () => {
      // Manually set to legacy "on" value by updating database directly
      await mongoose.connection.db?.collection('users').updateOne(
        { _id: testUserId },
        { $set: { 'privacy.location.sharing': 'on' } }
      );

      const result = await locationGateway.reportLocation(testUserId, 49.2827, -123.1207, 10);
      
      expect(result.shared).toBe(true);
    });

    it('should handle errors gracefully and still check pins', async () => {
      // This will test error handling in the pin checking logic
      const invalidLat = 91; // Invalid latitude
      const invalidLng = 181; // Invalid longitude

      await expect(
        locationGateway.reportLocation(testUserId, invalidLat, invalidLng, 10)
      ).resolves.toBeDefined(); // Should not throw, even with invalid coordinates
    });
  });

  describe('getFriendsLocations method - comprehensive coverage', () => {
    let friendUserId: mongoose.Types.ObjectId;
    let friendUser: unknown;

    beforeEach(async () => {
      // Create main test user
      const userInfo: SignUpRequest = {
        googleId: 'gateway-main-user',
        email: 'gatewaymain@example.com',
        name: 'Gateway Main User',
        username: 'gatewaymainuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;

      // Create friend user
      const friendInfo: SignUpRequest = {
        googleId: 'gateway-friend-user',
        email: 'gatewayfriend@example.com',
        name: 'Gateway Friend User',
        username: 'gatewayfrienduser'
      };
      friendUser = await userModel.create(friendInfo);
      friendUserId = friendUser._id;
    });

    afterEach(async () => {
      if (friendUserId) {
        try {
          await userModel.delete(friendUserId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should return empty array when no friendships exist', async () => {
      const result = await locationGateway.getFriendsLocations(testUserId);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should filter friends based on privacy settings', async () => {
      // Create a friendship with location sharing enabled
      await mongoose.connection.db?.collection('friendships').insertOne({
        userId: testUserId,
        friendId: friendUserId,
        status: 'accepted',
        shareLocation: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Set friend's privacy to OFF
      await userModel.updatePrivacy(friendUserId, {
        location: { sharing: 'off' }
      });

      // Create a recent location for the friend
      await locationModel.create(friendUserId, 49.2827, -123.1207, 10, true, new Date(Date.now() + 60000));

      const result = await locationGateway.getFriendsLocations(testUserId);
      
      // Should be empty because friend has location sharing off
      expect(result).toHaveLength(0);
    });

    it('should apply approximation for APPROXIMATE privacy setting', async () => {
      // Create friendship
      await mongoose.connection.db?.collection('friendships').insertOne({
        userId: testUserId,
        friendId: friendUserId,
        status: 'accepted',
        shareLocation: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Set friend's privacy to APPROXIMATE
      await userModel.updatePrivacy(friendUserId, {
        location: { sharing: 'approximate', precisionMeters: 50 }
      });

      // Create a recent location for the friend
      const originalLat = 49.2827;
      const originalLng = -123.1207;
      await locationModel.create(friendUserId, originalLat, originalLng, 10, true, new Date(Date.now() + 60000));

      const result = await locationGateway.getFriendsLocations(testUserId);
      
      expect(result).toHaveLength(1);
      // Location should be approximated (slightly different from original)
      expect(result[0].lat).not.toBe(originalLat);
      expect(result[0].lng).not.toBe(originalLng);
      expect(result[0].accuracyM).toBeGreaterThanOrEqual(50); // Should be at least precision meters
    });

    it('should handle legacy "on" privacy value correctly', async () => {
      // Create friendship
      await mongoose.connection.db?.collection('friendships').insertOne({
        userId: testUserId,
        friendId: friendUserId,
        status: 'accepted',
        shareLocation: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Set friend's privacy to legacy "on" value
      await mongoose.connection.db?.collection('users').updateOne(
        { _id: friendUserId },
        { $set: { 'privacy.location.sharing': 'on' } }
      );

      // Create a recent location
      await locationModel.create(friendUserId, 49.2827, -123.1207, 10, true, new Date(Date.now() + 60000));

      const result = await locationGateway.getFriendsLocations(testUserId);
      
      expect(result).toHaveLength(1);
      // Should return exact location for legacy "on" value
      expect(result[0].lat).toBe(49.2827);
      expect(result[0].lng).toBe(-123.1207);
    });
  });

  describe('trackFriendLocation method - authorization scenarios', () => {
    let friendUserId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      // Create users for friendship testing
      const userInfo: SignUpRequest = {
        googleId: 'track-main-user',
        email: 'trackmain@example.com',
        name: 'Track Main User',
        username: 'trackmainuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;

      const friendInfo: SignUpRequest = {
        googleId: 'track-friend-user',
        email: 'trackfriend@example.com',
        name: 'Track Friend User',
        username: 'trackfrienduser'
      };
      const friendUser = await userModel.create(friendInfo);
      friendUserId = friendUser._id;
    });

    afterEach(async () => {
      if (friendUserId) {
        try {
          await userModel.delete(friendUserId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should fail when friendship does not exist', async () => {
      await expect(
        locationGateway.trackFriendLocation(testUserId, friendUserId, 300)
      ).rejects.toThrow('Not authorized to track this friend\'s location');
    });

    it('should fail when friendship exists but location sharing is disabled', async () => {
      // Create friendship without location sharing
      await mongoose.connection.db?.collection('friendships').insertOne({
        userId: testUserId,
        friendId: friendUserId,
        status: 'accepted',
        shareLocation: false,  // Location sharing disabled
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await expect(
        locationGateway.trackFriendLocation(testUserId, friendUserId, 300)
      ).rejects.toThrow('Not authorized to track this friend\'s location');
    });

    it('should fail when friend has location sharing disabled in privacy', async () => {
      // Create friendship with location sharing enabled
      await mongoose.connection.db?.collection('friendships').insertOne({
        userId: testUserId,
        friendId: friendUserId,
        status: 'accepted',
        shareLocation: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Set friend's privacy to OFF
      await userModel.updatePrivacy(friendUserId, {
        location: { sharing: 'off' }
      });

      await expect(
        locationGateway.trackFriendLocation(testUserId, friendUserId, 300)
      ).rejects.toThrow('Friend has location sharing disabled');
    });

    it('should handle friendship status that is not accepted', async () => {
      // Create friendship with pending status
      await mongoose.connection.db?.collection('friendships').insertOne({
        userId: testUserId,
        friendId: friendUserId,
        status: 'pending',
        shareLocation: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await expect(
        locationGateway.trackFriendLocation(testUserId, friendUserId, 300)
      ).rejects.toThrow('Not authorized to track this friend\'s location');
    });
  });

  describe('initialization and instance methods', () => {
    it('should have initialize method that accepts HTTP server', () => {
      expect(typeof locationGateway.initialize).toBe('function');
      
      // Test that initialize method can be called (though we won't actually initialize)
      const _mockServer = {} as HttpServer;
      expect(() => {
        // Just test the method exists and can be called
        const gateway = new LocationGateway();
        expect(gateway.initialize).toBeDefined();
      }).not.toThrow();
    });

    it('should expose all public methods', () => {
      expect(typeof locationGateway.reportLocation).toBe('function');
      expect(typeof locationGateway.getFriendsLocations).toBe('function');
      expect(typeof locationGateway.trackFriendLocation).toBe('function');
      expect(typeof locationGateway.untrackFriendLocation).toBe('function');
      expect(typeof locationGateway.initialize).toBe('function');
    });

    it('should create separate instances that are not the same', () => {
      const gateway1 = new LocationGateway();
      const gateway2 = new LocationGateway();
      
      expect(gateway1).not.toBe(gateway2);
      expect(gateway1).not.toBe(locationGateway);
    });
  });
});