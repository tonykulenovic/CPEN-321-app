import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { userModel } from '../../src/models/user.model';
import { SignUpRequest } from '../../src/types/user.types';

describe('Unmocked: User Model', () => {
  let testUserId: mongoose.Types.ObjectId;
  let testUser: unknown;

  beforeEach(async () => {
    // Clean up any existing test data
    await mongoose.connection.db?.collection('users').deleteMany({
      email: { $regex: /test.*@example\.com/ }
    });
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

  describe('create method', () => {
    it('should successfully create a new user', async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-12345',
        email: 'test.user@example.com',
        name: 'Test User',
        username: 'testuser123'
      };

      const createdUser = await userModel.create(userInfo);
      testUserId = createdUser._id;

      expect(createdUser).toBeDefined();
      expect(createdUser.googleId).toBe(userInfo.googleId);
      expect(createdUser.email).toBe(userInfo.email.toLowerCase());
      expect(createdUser.name).toBe(userInfo.name);
      expect(createdUser.username).toBe(userInfo.username);
      expect(createdUser.friendsCount).toBe(0);
      expect(createdUser.badgesCount).toBe(0);
      expect(createdUser.isAdmin).toBe(false);
      expect(createdUser.isSuspended).toBe(false);
      
      // Check privacy defaults
      expect(createdUser.privacy.profileVisibleTo).toBe('friends');
      expect(createdUser.privacy.showBadgesTo).toBe('friends');
      expect(createdUser.privacy.allowFriendRequestsFrom).toBe('everyone');
      expect(createdUser.privacy.location.sharing).toBe('off');
      expect(createdUser.privacy.location.precisionMeters).toBe(30);

      // Check stats defaults
      expect(createdUser.stats.pinsCreated).toBe(0);
      expect(createdUser.stats.pinsVisited).toBe(0);
      expect(createdUser.stats.librariesVisited).toBe(0);
      expect(createdUser.stats.cafesVisited).toBe(0);
      expect(createdUser.stats.restaurantsVisited).toBe(0);
    });

    it('should handle validation errors during creation', async () => {
      const invalidUserInfo = {
        googleId: '',  // Invalid - required field
        email: 'invalid-email',  // Invalid email format
        name: '',  // Invalid - required field
        username: ''  // Invalid - required field
      };

      await expect(userModel.create(invalidUserInfo as any))
        .rejects.toThrow('Invalid update data');
    });
  });

  describe('findById method', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-findbyid',
        email: 'findbyid@example.com',
        name: 'Find By ID User',
        username: 'finduserbyid'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should find existing user by ID', async () => {
      const foundUser = await userModel.findById(testUserId);
      
      expect(foundUser).toBeDefined();
      expect(foundUser?._id.toString()).toBe(testUserId.toString());
      expect(foundUser!.email).toBe('findbyid@example.com');
      expect(foundUser?.name).toBe('Find By ID User');
    });

    it('should return null for non-existent user ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const foundUser = await userModel.findById(nonExistentId);
      
      expect(foundUser).toBeNull();
    });
  });

  describe('findByGoogleId method', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'unique-google-id-12345',
        email: 'googleuser@example.com',
        name: 'Google User',
        username: 'googleuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should find existing user by Google ID', async () => {
      const foundUser = await userModel.findByGoogleId('unique-google-id-12345');
      
      expect(foundUser).toBeDefined();
      expect(foundUser?.googleId).toBe('unique-google-id-12345');
      expect(foundUser?.email).toBe('googleuser@example.com');
    });

    it('should return null for non-existent Google ID', async () => {
      const foundUser = await userModel.findByGoogleId('non-existent-google-id');
      
      expect(foundUser).toBeNull();
    });
  });

  describe('findByUsername method', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-username',
        email: 'usernametest@example.com',
        name: 'Username Test',
        username: 'uniqueusername123'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should find existing user by username', async () => {
      const foundUser = await userModel.findByUsername('uniqueusername123');
      
      expect(foundUser).toBeDefined();
      expect(foundUser!.username).toBe('uniqueusername123');
      expect(foundUser?.name).toBe('Username Test');
    });

    it('should return null for non-existent username', async () => {
      const foundUser = await userModel.findByUsername('nonexistentusername');
      
      expect(foundUser).toBeNull();
    });
  });

  describe('update method', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-update',
        email: 'updatetest@example.com',
        name: 'Update Test User',
        username: 'updateuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should successfully update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio description',
        campus: 'UBC'
      };

      const updatedUser = await userModel.update(testUserId, updateData);
      
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.name).toBe('Updated Name');
      expect(updatedUser?.bio).toBe('Updated bio description');
      expect(updatedUser!.campus).toBe('UBC');
      expect(updatedUser?.email).toBe('updatetest@example.com'); // Unchanged
    });

    it('should return null when updating non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { name: 'New Name' };

      const result = await userModel.update(nonExistentId, updateData);
      
      expect(result).toBeNull();
    });
  });

  describe('searchUsers method', () => {
    let user1Id: mongoose.Types.ObjectId;
    let user2Id: mongoose.Types.ObjectId;

    beforeEach(async () => {
      // Create multiple users for search testing
      const user1Info: SignUpRequest = {
        googleId: 'search-google-1',
        email: 'searchuser1@example.com',
        name: 'Alice Johnson',
        username: 'alice_j'
      };
      const user2Info: SignUpRequest = {
        googleId: 'search-google-2',
        email: 'searchuser2@example.com',
        name: 'Bob Smith',
        username: 'bob_smith'
      };

      const user1 = await userModel.create(user1Info);
      const user2 = await userModel.create(user2Info);
      user1Id = user1._id;
      user2Id = user2._id;
    });

    afterEach(async () => {
      // Clean up search test users
      if (user1Id) await userModel.delete(user1Id);
      if (user2Id) await userModel.delete(user2Id);
    });

    it('should find users by username search', async () => {
      const results = await userModel.searchUsers('alice');
      
      expect(results.length).toBeGreaterThan(0);
      const foundUser = results.find(u => u.username === 'alice_j');
      expect(foundUser).toBeDefined();
      expect(foundUser?.name).toBe('Alice Johnson');
      
      // Check that only expected fields are returned
      expect(foundUser).toHaveProperty('_id');
      expect(foundUser).toHaveProperty('username');
      expect(foundUser).toHaveProperty('name');
      expect(foundUser).toHaveProperty('privacy');
      // searchUsers only returns specific fields, googleId is not included in projection
      expect(Object.keys(foundUser!)).not.toContain('googleId');
    });

    it('should find users by name search', async () => {
      const results = await userModel.searchUsers('Johnson');
      
      expect(results.length).toBeGreaterThan(0);
      const foundUser = results.find(u => u.name === 'Alice Johnson');
      expect(foundUser).toBeDefined();
    });

    it('should limit search results', async () => {
      const results = await userModel.searchUsers('searchuser', 1);
      
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array for no matches', async () => {
      const results = await userModel.searchUsers('nonexistentsearchterm12345');
      
      expect(results).toEqual([]);
    });
  });

  describe('updatePrivacy method', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-privacy',
        email: 'privacytest@example.com',
        name: 'Privacy Test User',
        username: 'privacyuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should update profile visibility setting', async () => {
      const privacyUpdates = {
        profileVisibleTo: 'everyone'
      };

      const updatedUser = await userModel.updatePrivacy(testUserId, privacyUpdates);
      
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.privacy.profileVisibleTo).toBe('everyone');
      expect(updatedUser!.privacy.showBadgesTo).toBe('friends'); // Should remain unchanged
    });

    it('should update multiple privacy settings', async () => {
      const privacyUpdates = {
        profileVisibleTo: 'private',
        showBadgesTo: 'everyone',
        allowFriendRequestsFrom: 'friendsOfFriends'
      };

      const updatedUser = await userModel.updatePrivacy(testUserId, privacyUpdates);
      
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.privacy.profileVisibleTo).toBe('private');
      expect(updatedUser?.privacy.showBadgesTo).toBe('everyone');
      expect(updatedUser?.privacy.allowFriendRequestsFrom).toBe('friendsOfFriends');
    });

    it('should update location privacy settings', async () => {
      const privacyUpdates = {
        location: {
          sharing: 'live',
          precisionMeters: 50
        }
      };

      const updatedUser = await userModel.updatePrivacy(testUserId, privacyUpdates);
      
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.privacy.location.sharing).toBe('live');
      expect(updatedUser?.privacy.location.precisionMeters).toBe(50);
    });

    it('should handle partial location updates', async () => {
      const privacyUpdates = {
        location: {
          sharing: 'approximate'
          // precisionMeters not specified - should remain unchanged
        }
      };

      const updatedUser = await userModel.updatePrivacy(testUserId, privacyUpdates);
      
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.privacy.location.sharing).toBe('approximate');
      expect(updatedUser?.privacy.location.precisionMeters).toBe(30); // Default value
    });
  });

  describe('incrementFriendsCount method', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-friends',
        email: 'friendscount@example.com',
        name: 'Friends Count User',
        username: 'friendscountuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should increment friends count by 1 (default)', async () => {
      await userModel.incrementFriendsCount(testUserId);
      
      const updatedUser = await userModel.findById(testUserId);
      expect(updatedUser?.friendsCount).toBe(1);
    });

    it('should increment friends count by specified amount', async () => {
      await userModel.incrementFriendsCount(testUserId, 3);
      
      const updatedUser = await userModel.findById(testUserId);
      expect(updatedUser?.friendsCount).toBe(3);
    });

    it('should decrement friends count with negative increment', async () => {
      // First set count to 5
      await userModel.incrementFriendsCount(testUserId, 5);
      // Then decrement by 2
      await userModel.incrementFriendsCount(testUserId, -2);
      
      const updatedUser = await userModel.findById(testUserId);
      expect(updatedUser!.friendsCount).toBe(3);
    });
  });

  describe('FCM token methods', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-fcm',
        email: 'fcmtest@example.com',
        name: 'FCM Test User',
        username: 'fcmuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should update FCM token', async () => {
      const fcmToken = 'test-fcm-token-12345';
      
      const updatedUser = await userModel.updateFcmToken(testUserId, fcmToken);
      
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.fcmToken).toBe(fcmToken);
      expect(updatedUser).toHaveProperty('_id');
      expect(updatedUser).toHaveProperty('name');
    });

    it('should remove FCM token', async () => {
      // First set a token
      await userModel.updateFcmToken(testUserId, 'test-token');
      
      // Then remove it
      const updatedUser = await userModel.removeFcmToken(testUserId);
      
      expect(updatedUser).toBeDefined();
      expect(updatedUser?.fcmToken).toBeUndefined();
    });

    it('should return null when updating FCM token for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const result = await userModel.updateFcmToken(nonExistentId, 'test-token');
      
      expect(result).toBeNull();
    });
  });

  describe('getOnlineStatus method', () => {
    let user1Id: mongoose.Types.ObjectId;
    let user2Id: mongoose.Types.ObjectId;

    beforeEach(async () => {
      // Create test users
      const user1Info: SignUpRequest = {
        googleId: 'online-test-1',
        email: 'online1@example.com',
        name: 'Online User 1',
        username: 'onlineuser1'
      };
      const user2Info: SignUpRequest = {
        googleId: 'online-test-2',
        email: 'online2@example.com',
        name: 'Online User 2',
        username: 'onlineuser2'
      };

      const user1 = await userModel.create(user1Info);
      const user2 = await userModel.create(user2Info);
      user1Id = user1._id;
      user2Id = user2._id;
    });

    afterEach(async () => {
      if (user1Id) await userModel.delete(user1Id);
      if (user2Id) await userModel.delete(user2Id);
    });

    it('should return online status for users', async () => {
      // Update one user to be recently active
      await userModel.updateLastActiveAt(user1Id);
      
      const onlineStatus = await userModel.getOnlineStatus([user1Id, user2Id], 10);
      
      expect(onlineStatus).toBeInstanceOf(Map);
      expect(onlineStatus.has(user1Id.toString())).toBe(true);
      expect(onlineStatus.has(user2Id.toString())).toBe(true);
      
      // user1 should be online (recently updated), but both users are created recently
      // so both will be considered online within the 10 minute threshold
      expect(onlineStatus.get(user1Id.toString())).toBe(true);
      expect(onlineStatus.get(user2Id.toString())).toBe(true); // Both created recently, both online
    });

    it('should handle empty user list', async () => {
      const onlineStatus = await userModel.getOnlineStatus([]);
      
      expect(onlineStatus).toBeInstanceOf(Map);
      expect(onlineStatus.size).toBe(0);
    });

    it('should use custom minutes threshold', async () => {
      // Create user with old lastActiveAt timestamp
      const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      await mongoose.connection.db?.collection('users').updateOne(
        { _id: user1Id },
        { $set: { lastActiveAt: pastTime } }
      );

      const onlineStatus = await userModel.getOnlineStatus([user1Id], 0.001); // Very small threshold
      
      expect(onlineStatus.get(user1Id.toString())).toBe(false); // Should be offline with tiny threshold
    });
  });

  describe('updateLastActiveAt method', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-active',
        email: 'activetest@example.com',
        name: 'Active Test User',
        username: 'activeuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should update last active timestamp', async () => {
      const beforeUpdate = new Date();
      
      await userModel.updateLastActiveAt(testUserId);
      
      const updatedUser = await userModel.findById(testUserId);
      expect(updatedUser?.lastActiveAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('updateLoginStreak method', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-streak',
        email: 'streaktest@example.com',
        name: 'Streak Test User',
        username: 'streakuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should initialize login streak for first login', async () => {
      const streak = await userModel.updateLoginStreak(testUserId);
      
      expect(streak).toBe(1);
      
      const updatedUser = await userModel.findById(testUserId);
      expect(updatedUser!.loginTracking.currentStreak).toBe(1);
      expect(updatedUser?.loginTracking.longestStreak).toBe(1);
      expect(updatedUser?.loginTracking.lastLoginDate).toBeDefined();
    });

    it('should return same streak for same day login', async () => {
      // First login
      await userModel.updateLoginStreak(testUserId);
      
      // Second login same day
      const streak = await userModel.updateLoginStreak(testUserId);
      
      expect(streak).toBe(1); // Should remain 1
    });

    it('should handle user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await expect(userModel.updateLoginStreak(nonExistentId))
        .rejects.toThrow('Failed to update login streak');
    });
  });

  describe('recommendation methods', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-recommendation',
        email: 'recommendationtest@example.com',
        name: 'Recommendation Test User',
        username: 'recommendationuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    describe('canReceiveRecommendation method', () => {
      it('should allow recommendation on first check (new day)', async () => {
        const canReceive = await userModel.canReceiveRecommendation(testUserId, 'breakfast');
        
        expect(canReceive).toBe(true);
      });

      it('should prevent duplicate recommendations same day', async () => {
        // First recommendation
        await userModel.canReceiveRecommendation(testUserId, 'breakfast');
        await userModel.markRecommendationSent(testUserId, 'breakfast');
        
        // Second attempt same day
        const canReceive = await userModel.canReceiveRecommendation(testUserId, 'breakfast');
        
        expect(canReceive).toBe(false);
      });

      it('should allow different meal types same day', async () => {
        await userModel.canReceiveRecommendation(testUserId, 'breakfast');
        await userModel.markRecommendationSent(testUserId, 'breakfast');
        
        const canReceiveLunch = await userModel.canReceiveRecommendation(testUserId, 'lunch');
        
        expect(canReceiveLunch).toBe(true);
      });

      it('should handle non-existent user', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        
        const canReceive = await userModel.canReceiveRecommendation(nonExistentId, 'breakfast');
        
        expect(canReceive).toBe(false);
      });
    });

    describe('markRecommendationSent method', () => {
      it('should mark recommendation as sent', async () => {
        const result = await userModel.markRecommendationSent(testUserId, 'lunch');
        
        expect(result).toBe(true);
        
        // Verify it was marked - need to wait for a new day check since canReceiveRecommendation
        // will reset the daily counters if it's a new day
        const user = await userModel.findById(testUserId);
        expect(user?.recommendations?.lunch).toBe(true);
      });

      it('should handle non-existent user', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        
        const result = await userModel.markRecommendationSent(nonExistentId, 'dinner');
        
        expect(result).toBe(false);
      });
    });
  });

  describe('findByIdWithBadges method', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-badges',
        email: 'badgestest@example.com',
        name: 'Badges Test User',
        username: 'badgesuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should throw error when UserBadge model not available', async () => {
      // The UserBadge model schema is not registered in test environment
      await expect(userModel.findByIdWithBadges(testUserId))
        .rejects.toThrow('Failed to find user with badges');
    });

    it('should return null for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // For non-existent users, the method returns null before attempting populate
      const result = await userModel.findByIdWithBadges(nonExistentId);
      expect(result).toBeNull();
    });
  });

  describe('findAll method', () => {
    let createdUserIds: mongoose.Types.ObjectId[] = [];

    beforeEach(async () => {
      // Create a few test users
      const users = [
        {
          googleId: 'findall-1',
          email: 'findall1@example.com',
          name: 'FindAll User 1',
          username: 'findalluser1'
        },
        {
          googleId: 'findall-2',
          email: 'findall2@example.com',
          name: 'FindAll User 2',
          username: 'findalluser2'
        }
      ];

      for (const userInfo of users) {
        const user = await userModel.create(userInfo);
        createdUserIds.push(user._id);
      }
    });

    afterEach(async () => {
      // Clean up created users
      for (const userId of createdUserIds) {
        try {
          await userModel.delete(userId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      createdUserIds = [];
    });

    it('should return all users with limited fields', async () => {
      const allUsers = await userModel.findAll();
      
      expect(Array.isArray(allUsers)).toBe(true);
      expect(allUsers.length).toBeGreaterThanOrEqual(2); // At least our test users
      
      // Check that only expected fields are included
      const testUser = allUsers.find(u => u.email === 'findall1@example.com');
      expect(testUser).toBeDefined();
      expect(testUser).toHaveProperty('_id');
      expect(testUser).toHaveProperty('name');
      expect(testUser).toHaveProperty('email');
      expect(testUser).toHaveProperty('username');
      expect(testUser).toHaveProperty('lastActiveAt');
      expect(testUser).toHaveProperty('createdAt');
      
      // Should not include sensitive fields like googleId
      expect(Object.keys(testUser!)).not.toContain('googleId');
    });
  });

  describe('delete method', () => {
    beforeEach(async () => {
      const userInfo: SignUpRequest = {
        googleId: 'test-google-id-delete',
        email: 'deletetest@example.com',
        name: 'Delete Test User',
        username: 'deleteuser'
      };
      testUser = await userModel.create(userInfo);
      testUserId = testUser._id;
    });

    it('should successfully delete user', async () => {
      await userModel.delete(testUserId);
      
      // Verify user is deleted
      const deletedUser = await userModel.findById(testUserId);
      expect(deletedUser).toBeNull();
      
      // Clear testUserId to avoid cleanup attempt
      testUserId = null as unknown;
    });

    it('should handle deletion of non-existent user gracefully', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      // Should not throw error even if user doesn't exist
      await expect(userModel.delete(nonExistentId))
        .resolves.toBeUndefined();
    });
  });
});
