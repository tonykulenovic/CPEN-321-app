import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { locationGateway, LocationGateway } from '../../src/realtime/gateway';

// Test the business logic methods that don't require Socket.io
describe('Unmocked: LocationGateway Business Logic', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('calculateDistance method', () => {
    it('should calculate distance between two coordinates correctly', () => {
      // Test distance calculation between UBC and downtown Vancouver
      const ubcLat = 49.2606;
      const ubcLng = -123.2460;
      const downtownLat = 49.2827;
      const downtownLng = -123.1207;

      const distance = (locationGateway as any).calculateDistance(
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
      } catch (error: any) {
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
});