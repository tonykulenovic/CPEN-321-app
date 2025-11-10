import { describe, test, beforeEach, expect, jest } from '@jest/globals';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('socket.io');
jest.mock('../../src/models/location.model');
jest.mock('../../src/models/friendship.model');
jest.mock('../../src/models/user.model');
jest.mock('../../src/models/pin.model');
jest.mock('../../src/services/badge.service');
jest.mock('../../src/utils/logger.util');
jest.mock('jsonwebtoken');

// Import after mocking
import { LocationGateway } from '../../src/realtime/gateway';
import { locationModel } from '../../src/models/location.model';
import { friendshipModel } from '../../src/models/friendship.model';
import { userModel } from '../../src/models/user.model';
import { pinModel } from '../../src/models/pin.model';
import { BadgeService } from '../../src/services/badge.service';
import jwt from 'jsonwebtoken';

const mockedLocationModel = jest.mocked(locationModel);
const mockedFriendshipModel = jest.mocked(friendshipModel);
const mockedUserModel = jest.mocked(userModel);
const mockedPinModel = jest.mocked(pinModel);
const mockedBadgeService = jest.mocked(BadgeService);
const mockedJwt = jest.mocked(jwt);
const MockedServer = jest.mocked(SocketIOServer);

describe('LocationGateway Mocked Unit Tests', () => {
  let gateway: LocationGateway;
  let testUserId: mongoose.Types.ObjectId;
  let testFriendId: mongoose.Types.ObjectId;
  let mockHttpServer: HttpServer;
  let mockSocketIOServer: jest.Mocked<SocketIOServer>;
  let mockNamespace: any;
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    gateway = new LocationGateway();
    testUserId = new mongoose.Types.ObjectId();
    testFriendId = new mongoose.Types.ObjectId();
    
    // Mock HTTP server
    mockHttpServer = {} as HttpServer;
    
    // Mock Socket.IO namespace and socket
    mockNamespace = {
      use: jest.fn(),
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    
    mockSocket = {
      id: 'test-socket-id',
      data: { userId: testUserId },
      join: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      handshake: {
        auth: { token: 'test-token' },
        headers: { 'x-dev-user-id': testUserId.toString() }
      }
    };
    
    // Mock Socket.IO server
    mockSocketIOServer = {
      of: jest.fn().mockReturnValue(mockNamespace),
    } as any;
    
    MockedServer.mockImplementation(() => mockSocketIOServer);

    // Setup default mock returns
    mockedUserModel.findById.mockResolvedValue({
      _id: testUserId,
      privacy: { location: { sharing: 'live', precisionMeters: 30 } },
      visitedPins: [],
      stats: { pinsVisited: 0 }
    } as any);

    mockedLocationModel.create.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      userId: testUserId,
      lat: 49.2827,
      lng: -123.1207,
      accuracyM: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any);

    mockedPinModel.search.mockResolvedValue({
      pins: [],
      total: 0
    } as any);

    mockedLocationModel.findFriendsLocations.mockResolvedValue([]);

    mockedBadgeService.processBadgeEvent.mockResolvedValue([]);

    // Setup JWT_SECRET for auth tests
    process.env.JWT_SECRET = 'test-secret';

    // Mock mongoose.model for the User model used in checkAndVisitNearbyPins
    const mockUserModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ visitedPins: [] })
      }),
      findByIdAndUpdate: jest.fn().mockResolvedValue({})
    };
    (mongoose.model as jest.Mock) = jest.fn().mockReturnValue(mockUserModel);
  });

  describe('initialization', () => {
    test('should initialize Socket.IO server correctly', () => {
      gateway.initialize(mockHttpServer);

      expect(MockedServer).toHaveBeenCalledWith(mockHttpServer, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });

      expect(mockSocketIOServer.of).toHaveBeenCalledWith('/realtime');
      expect(mockNamespace.use).toHaveBeenCalledWith(expect.any(Function));
      expect(mockNamespace.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    test('should setup authentication middleware', () => {
      gateway.initialize(mockHttpServer);

      // Verify that authentication middleware was set up
      expect(mockNamespace.use).toHaveBeenCalledTimes(1);
      const authMiddleware = mockNamespace.use.mock.calls[0][0];
      expect(typeof authMiddleware).toBe('function');
    });

    test('should setup connection handler', () => {
      gateway.initialize(mockHttpServer);

      expect(mockNamespace.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('reportLocation method', () => {
    test('should handle user with location sharing OFF', async () => {
      mockedUserModel.findById.mockResolvedValue({
        _id: testUserId,
        privacy: { location: { sharing: 'off' } },
        visitedPins: []
      } as any);

      const result = await gateway.reportLocation(testUserId, 49.2827, -123.1207, 10);

      expect(result.shared).toBe(false);
      expect(result).toHaveProperty('expiresAt');
      expect(mockedLocationModel.create).not.toHaveBeenCalled();
    });

    test('should handle user with location sharing LIVE', async () => {
      const result = await gateway.reportLocation(testUserId, 49.2827, -123.1207, 10);

      expect(result.shared).toBe(true);
      expect(result).toHaveProperty('expiresAt');
      expect(mockedLocationModel.create).toHaveBeenCalledWith(
        testUserId,
        49.2827,
        -123.1207,
        10,
        true,
        expect.any(Date)
      );
    });

    test('should handle user with location sharing APPROXIMATE', async () => {
      mockedUserModel.findById.mockResolvedValue({
        _id: testUserId,
        privacy: { location: { sharing: 'approximate', precisionMeters: 100 } },
        visitedPins: []
      } as any);

      const result = await gateway.reportLocation(testUserId, 49.2827, -123.1207, 15);

      expect(result.shared).toBe(true);
      expect(mockedLocationModel.create).toHaveBeenCalled();
      
      // Verify that coordinates might be approximated
      const createCall = mockedLocationModel.create.mock.calls[0];
      expect(createCall[1]).toBeCloseTo(49.2827, 2); // Allow some approximation
      expect(createCall[2]).toBeCloseTo(-123.1207, 2); // Allow some approximation
      expect(createCall[3]).toBeGreaterThanOrEqual(15); // Accuracy should be at least original
    });

    test('should handle legacy "on" value as "live"', async () => {
      mockedUserModel.findById.mockResolvedValue({
        _id: testUserId,
        privacy: { location: { sharing: 'on' as any } },
        visitedPins: []
      } as any);

      const result = await gateway.reportLocation(testUserId, 49.2827, -123.1207, 10);

      expect(result.shared).toBe(true);
      expect(mockedLocationModel.create).toHaveBeenCalled();
    });

    test('should check for nearby pins even when sharing is OFF', async () => {
      mockedUserModel.findById.mockResolvedValue({
        _id: testUserId,
        privacy: { location: { sharing: 'off' } },
        visitedPins: []
      } as any);

      await gateway.reportLocation(testUserId, 49.2827, -123.1207, 10);

      expect(mockedPinModel.search).toHaveBeenCalledWith({
        latitude: 49.2827,
        longitude: -123.1207,
        radius: 100,
        page: 1,
        limit: 1000
      });
    });

    test('should handle user not found error', async () => {
      mockedUserModel.findById.mockResolvedValue(null);

      await expect(
        gateway.reportLocation(testUserId, 49.2827, -123.1207, 10)
      ).rejects.toThrow('User not found');
    });

    test('should handle pin checking errors gracefully', async () => {
      mockedPinModel.search.mockRejectedValue(new Error('Pin search failed'));

      // Should still complete successfully despite pin checking error
      const result = await gateway.reportLocation(testUserId, 49.2827, -123.1207, 10);

      expect(result.shared).toBe(true);
      expect(mockedLocationModel.create).toHaveBeenCalled();
    });

    test('should process nearby pin visits correctly', async () => {
      const mockPin = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Cafe',
        category: 'shops_services',
        metadata: { subtype: 'cafe' },
        location: { latitude: 49.2827, longitude: -123.1207 },
        isPreSeeded: true
      };

      mockedPinModel.search.mockResolvedValue({
        pins: [mockPin],
        total: 1,
        page: 1,
        totalPages: 1
      });

      // Mock user model update
      const mockUser = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            visitedPins: [] // User hasn't visited any pins yet
          })
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({})
      };
      mongoose.model = jest.fn().mockReturnValue(mockUser);

      await gateway.reportLocation(testUserId, 49.2827, -123.1207, 10);

      expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          $push: { visitedPins: mockPin._id },
          $inc: expect.objectContaining({
            'stats.pinsVisited': 1,
            'stats.cafesVisited': 1
          })
        })
      );

      expect(mockedBadgeService.processBadgeEvent).toHaveBeenCalledTimes(2); // General visit + cafe specific
    });
  });

  describe('getFriendsLocations method', () => {
    test('should return empty array when no friends exist', async () => {
      mockedFriendshipModel.findUserFriendships.mockResolvedValue([]);

      const result = await gateway.getFriendsLocations(testUserId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test('should filter friends without location sharing', async () => {
      mockedFriendshipModel.findUserFriendships.mockResolvedValue([
        { friendId: testFriendId, shareLocation: false, status: 'accepted' }
      ] as any);

      const result = await gateway.getFriendsLocations(testUserId);

      expect(result).toHaveLength(0);
    });

    test('should get locations for friends with location sharing', async () => {
      mockedFriendshipModel.findUserFriendships.mockResolvedValue([
        { 
          friendId: { _id: testFriendId }, 
          shareLocation: true, 
          status: 'accepted' 
        }
      ] as any);

      mockedLocationModel.findFriendsLocations.mockResolvedValue([
        {
          userId: testFriendId,
          lat: 49.2827,
          lng: -123.1207,
          accuracyM: 10,
          createdAt: new Date()
        }
      ] as any);

      mockedUserModel.findById.mockResolvedValue({
        _id: testFriendId,
        privacy: { location: { sharing: 'live' } }
      } as any);

      const result = await gateway.getFriendsLocations(testUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        userId: testFriendId,
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 10
      });
    });

    test('should filter out friends with location sharing OFF', async () => {
      mockedFriendshipModel.findUserFriendships.mockResolvedValue([
        { 
          friendId: { _id: testFriendId }, 
          shareLocation: true, 
          status: 'accepted' 
        }
      ] as any);

      mockedLocationModel.findFriendsLocations.mockResolvedValue([
        {
          userId: testFriendId,
          lat: 49.2827,
          lng: -123.1207,
          accuracyM: 10,
          createdAt: new Date()
        }
      ] as any);

      mockedUserModel.findById.mockResolvedValue({
        _id: testFriendId,
        privacy: { location: { sharing: 'off' } }
      } as any);

      const result = await gateway.getFriendsLocations(testUserId);

      expect(result).toHaveLength(0);
    });

    test('should apply approximation for friends with approximate sharing', async () => {
      mockedFriendshipModel.findUserFriendships.mockResolvedValue([
        { 
          friendId: { _id: testFriendId }, 
          shareLocation: true, 
          status: 'accepted' 
        }
      ] as any);

      const originalLocation = {
        userId: testFriendId,
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 10,
        createdAt: new Date()
      };

      mockedLocationModel.findFriendsLocations.mockResolvedValue([originalLocation] as any);

      mockedUserModel.findById.mockResolvedValue({
        _id: testFriendId,
        privacy: { location: { sharing: 'approximate', precisionMeters: 50 } }
      } as any);

      const result = await gateway.getFriendsLocations(testUserId);

      expect(result).toHaveLength(1);
      // Coordinates should be approximated (different from original)
      expect(result[0].lat).not.toBe(49.2827);
      expect(result[0].lng).not.toBe(-123.1207);
      expect(result[0].accuracyM).toBeGreaterThanOrEqual(50);
    });

    test('should handle errors gracefully', async () => {
      mockedFriendshipModel.findUserFriendships.mockRejectedValue(new Error('Database error'));

      await expect(
        gateway.getFriendsLocations(testUserId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('trackFriendLocation method', () => {
    test('should reject tracking when friendship does not exist', async () => {
      mockedFriendshipModel.findByUserAndFriend.mockResolvedValue(null);

      await expect(
        gateway.trackFriendLocation(testUserId, testFriendId, 300)
      ).rejects.toThrow('Not authorized to track this friend\'s location');
    });

    test('should reject tracking when friendship status is not accepted', async () => {
      mockedFriendshipModel.findByUserAndFriend.mockResolvedValue({
        status: 'pending',
        shareLocation: true
      } as any);

      await expect(
        gateway.trackFriendLocation(testUserId, testFriendId, 300)
      ).rejects.toThrow('Not authorized to track this friend\'s location');
    });

    test('should reject tracking when location sharing is disabled', async () => {
      mockedFriendshipModel.findByUserAndFriend.mockResolvedValue({
        status: 'accepted',
        shareLocation: false
      } as any);

      await expect(
        gateway.trackFriendLocation(testUserId, testFriendId, 300)
      ).rejects.toThrow('Not authorized to track this friend\'s location');
    });

    test('should reject tracking when friend has location sharing disabled', async () => {
      mockedFriendshipModel.findByUserAndFriend.mockResolvedValue({
        status: 'accepted',
        shareLocation: true
      } as any);

      mockedUserModel.findById.mockResolvedValue({
        _id: testFriendId,
        privacy: { location: { sharing: 'off' } }
      } as any);

      await expect(
        gateway.trackFriendLocation(testUserId, testFriendId, 300)
      ).rejects.toThrow('Friend has location sharing disabled');
    });

    test('should successfully track friend location when authorized', async () => {
      mockedFriendshipModel.findByUserAndFriend.mockResolvedValue({
        status: 'accepted',
        shareLocation: true
      } as any);

      mockedUserModel.findById.mockResolvedValue({
        _id: testFriendId,
        privacy: { location: { sharing: 'live' } }
      } as any);

      mockedLocationModel.findByUserId.mockResolvedValue({
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 10,
        createdAt: new Date()
      } as any);

      // Should complete without throwing
      await expect(
        gateway.trackFriendLocation(testUserId, testFriendId, 300)
      ).resolves.toBeUndefined();
    });

    test('should handle case when friend has no current location', async () => {
      mockedFriendshipModel.findByUserAndFriend.mockResolvedValue({
        status: 'accepted',
        shareLocation: true
      } as any);

      mockedUserModel.findById.mockResolvedValue({
        _id: testFriendId,
        privacy: { location: { sharing: 'live' } }
      } as any);

      mockedLocationModel.findByUserId.mockResolvedValue(null);

      await expect(
        gateway.trackFriendLocation(testUserId, testFriendId, 300)
      ).resolves.toBeUndefined();
    });
  });

  describe('untrackFriendLocation method', () => {
    test('should handle untracking without errors', async () => {
      await expect(
        gateway.untrackFriendLocation(testUserId, testFriendId)
      ).resolves.toBeUndefined();
    });

    test('should handle untracking non-existent subscription', async () => {
      // Should not throw even if no tracking exists
      await expect(
        gateway.untrackFriendLocation(testUserId, testFriendId)
      ).resolves.toBeUndefined();
    });
  });

  describe('calculateDistance method (private)', () => {
    test('should calculate distance correctly', () => {
      // Access private method for testing (bind to preserve `this`)
      const calculateDistance = (gateway as any).calculateDistance.bind(gateway);

      // Test distance between two known points (UBC and downtown Vancouver)
      const distance = calculateDistance(49.2606, -123.2460, 49.2827, -123.1207);

      expect(distance).toBeGreaterThan(9000);
      expect(distance).toBeLessThan(15000);
      expect(typeof distance).toBe('number');
    });

    test('should return 0 for same coordinates', () => {
      const calculateDistance = (gateway as any).calculateDistance.bind(gateway);
      const distance = calculateDistance(49.2827, -123.1207, 49.2827, -123.1207);

      expect(distance).toBe(0);
    });

    test('should calculate short distances accurately', () => {
      const calculateDistance = (gateway as any).calculateDistance.bind(gateway);
      const distance = calculateDistance(49.2827, -123.1207, 49.2836, -123.1207);

      // Should be approximately 100 meters
      expect(distance).toBeGreaterThan(80);
      expect(distance).toBeLessThan(120);
    });
  });

  describe('checkAndVisitNearbyPins method (private)', () => {
    test('should handle no nearby pins', async () => {
      const checkAndVisitNearbyPins = (gateway as any).checkAndVisitNearbyPins.bind(gateway);

      mockedPinModel.search.mockResolvedValue({
        pins: [],
        total: 0,
        page: 1,
        totalPages: 1
      });

      // Should complete without errors
      await expect(
        checkAndVisitNearbyPins(testUserId, 49.2827, -123.1207)
      ).resolves.toBeUndefined();
    });

    test('should process pin visits for nearby pins', async () => {
      const checkAndVisitNearbyPins = (gateway as any).checkAndVisitNearbyPins.bind(gateway);

      const mockPin = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Library',
        category: 'study',
        location: { latitude: 49.2827, longitude: -123.1207 }, // Same location (0m distance)
        isPreSeeded: true
      };

      mockedPinModel.search.mockResolvedValue({
        pins: [mockPin],
        total: 1,
        page: 1,
        totalPages: 1
      });

      const mockUser = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ visitedPins: [] })
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({})
      };
      mongoose.model = jest.fn().mockReturnValue(mockUser);

      await checkAndVisitNearbyPins(testUserId, 49.2827, -123.1207);

      expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          $push: { visitedPins: mockPin._id },
          $inc: expect.objectContaining({
            'stats.pinsVisited': 1,
            'stats.librariesVisited': 1
          })
        })
      );
    });

    test('should skip already visited pins', async () => {
      const checkAndVisitNearbyPins = (gateway as any).checkAndVisitNearbyPins.bind(gateway);
      const pinId = new mongoose.Types.ObjectId();

      const mockPin = {
        _id: pinId,
        name: 'Already Visited Pin',
        category: 'study',
        location: { latitude: 49.2827, longitude: -123.1207 },
        isPreSeeded: true
      };

      mockedPinModel.search.mockResolvedValue({
        pins: [mockPin],
        total: 1,
        page: 1,
        totalPages: 1
      });

      const mockUser = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ visitedPins: [pinId] })
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({})
      };
      mongoose.model = jest.fn().mockReturnValue(mockUser);

      await checkAndVisitNearbyPins(testUserId, 49.2827, -123.1207);

      // Should not call update since pin is already visited
      expect(mockUser.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test('should skip pins that are too far away', async () => {
      const checkAndVisitNearbyPins = (gateway as any).checkAndVisitNearbyPins.bind(gateway);

      const mockPin = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Far Away Pin',
        category: 'study',
        location: { latitude: 49.3827, longitude: -123.1207 }, // ~11km away
        isPreSeeded: true
      };

      mockedPinModel.search.mockResolvedValue({
        pins: [mockPin],
        total: 1,
        page: 1,
        totalPages: 1
      });

      const mockUser = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ visitedPins: [] })
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({})
      };
      mongoose.model = jest.fn().mockReturnValue(mockUser);

      await checkAndVisitNearbyPins(testUserId, 49.2827, -123.1207);

      // Should not visit pins that are > 50m away
      expect(mockUser.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test('should handle badge processing errors gracefully', async () => {
      const checkAndVisitNearbyPins = (gateway as any).checkAndVisitNearbyPins.bind(gateway);

      const mockPin = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Pin',
        category: 'study',
        location: { latitude: 49.2827, longitude: -123.1207 },
        isPreSeeded: true
      };

      mockedPinModel.search.mockResolvedValue({
        pins: [mockPin],
        total: 1,
        page: 1,
        totalPages: 1
      });

      const mockUser = {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ visitedPins: [] })
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({})
      };
      mongoose.model = jest.fn().mockReturnValue(mockUser);

      mockedBadgeService.processBadgeEvent.mockRejectedValue(new Error('Badge service error'));

      // Should complete despite badge error
      await expect(
        checkAndVisitNearbyPins(testUserId, 49.2827, -123.1207)
      ).resolves.toBeUndefined();

      expect(mockUser.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('broadcastLocationUpdate method (private)', () => {
    test('should handle broadcasting when no io instance', async () => {
      const broadcastLocationUpdate = (gateway as any).broadcastLocationUpdate.bind(gateway);

      // Should complete without errors when io is null
      await expect(
        broadcastLocationUpdate(testUserId, {
          lat: 49.2827,
          lng: -123.1207,
          accuracyM: 10,
          ts: new Date().toISOString()
        })
      ).resolves.toBeUndefined();
    });

    test('should broadcast to subscribed users when io is available', async () => {
      // Initialize gateway with mock server first
      gateway.initialize(mockHttpServer);

      const sendLocationUpdate = (gateway as any).sendLocationUpdate.bind(gateway);
      
      // Mock the namespace.to().emit() chain
      const mockRoom = {
        emit: jest.fn()
      };
      mockNamespace.to.mockReturnValue(mockRoom);

      // Test sendLocationUpdate directly since we can't easily mock module-level locationTrackers
      await sendLocationUpdate(testFriendId, testUserId, {
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 10,
        ts: new Date().toISOString()
      });

      expect(mockNamespace.to).toHaveBeenCalledWith(`user:${testFriendId.toString()}`);
      expect(mockRoom.emit).toHaveBeenCalledWith('location:update', {
        friendId: testUserId.toString(),
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 10,
        ts: expect.any(String)
      });
    });
  });

  describe('JWT authentication', () => {
    test('should verify JWT tokens correctly', async () => {
      gateway.initialize(mockHttpServer);

      const authMiddleware = mockNamespace.use.mock.calls[0][0];
      const mockNext = jest.fn();
      const mockSocket = {
        handshake: {
          auth: { token: 'valid-jwt-token' },
          headers: {}
        },
        data: {}
      };

      mockedJwt.verify.mockReturnValue({ id: testUserId.toString() });

      await authMiddleware(mockSocket, mockNext);

      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-jwt-token', process.env.JWT_SECRET);
      expect(mockSocket.data.userId).toEqual(testUserId);
      expect(mockNext).toHaveBeenCalledWith();
    });

    test('should handle missing token', async () => {
      gateway.initialize(mockHttpServer);

      const authMiddleware = mockNamespace.use.mock.calls[0][0];
      const mockNext = jest.fn();
      const mockSocket = {
        handshake: {
          auth: {},
          headers: {}
        },
        data: {}
      };

      await authMiddleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication error: No token provided'
        })
      );
    });

    test('should handle invalid JWT token', async () => {
      gateway.initialize(mockHttpServer);

      const authMiddleware = mockNamespace.use.mock.calls[0][0];
      const mockNext = jest.fn();
      const mockSocket = {
        handshake: {
          auth: { token: 'invalid-token' },
          headers: {}
        },
        data: {}
      };

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authMiddleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed'
        })
      );
    });

    test('should handle dev token bypass in non-production', async () => {
      const testUserIdLocal = new mongoose.Types.ObjectId();
      const originalNodeEnv = process.env.NODE_ENV;
      const originalDevToken = process.env.DEV_AUTH_TOKEN;
      const originalJwtSecret = process.env.JWT_SECRET;

      process.env.NODE_ENV = 'development';
      process.env.DEV_AUTH_TOKEN = 'dev-token';
      process.env.JWT_SECRET = 'test-secret';

      gateway.initialize(mockHttpServer);

      const authMiddleware = mockNamespace.use.mock.calls[0][0];
      const mockNext = jest.fn();
      const mockSocket = {
        handshake: {
          auth: { token: 'dev-token' },
          headers: { 'x-dev-user-id': testUserIdLocal.toString() }
        },
        data: {},
        id: 'test-socket-id' // Add socket ID
      };

      mockedUserModel.findById.mockResolvedValue({
        _id: testUserIdLocal
      } as any);

      await authMiddleware(mockSocket, mockNext).catch((error: any) => {
        console.log('Caught error in auth middleware:', error);
      });

      expect(mockSocket.data.userId).toBeDefined();
      expect(mockSocket.data.userId.toString()).toEqual(testUserIdLocal.toString());
      expect(mockNext).toHaveBeenCalledWith();

      // Restore environment
      process.env.NODE_ENV = originalNodeEnv;
      process.env.DEV_AUTH_TOKEN = originalDevToken;
      process.env.JWT_SECRET = originalJwtSecret;
    });
  });
});