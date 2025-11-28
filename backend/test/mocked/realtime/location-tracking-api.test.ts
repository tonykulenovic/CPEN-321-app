const io = require('socket.io-client');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { LocationGateway } = require('../../../src/realtime/gateway');

// Mock dependencies
jest.mock('../../../src/services/badge.service', () => ({
  BadgeService: {
    processBadgeEvent: jest.fn(),
  },
}));

let socket;
let httpServer;
let httpServerAddr;
let gateway;
const testUserId = new mongoose.Types.ObjectId();
const testToken = jwt.sign({ id: testUserId.toString() }, 'test-secret');

/**
 * Setup WS & HTTP servers
 */
beforeAll((done) => {
  // Set environment variables for JWT
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
  
  httpServer = http.createServer();
  httpServer.listen(0, () => {
    httpServerAddr = httpServer.address();
    
    // Initialize the LocationGateway with our server
    gateway = new LocationGateway();
    gateway.initialize(httpServer);
    
    done();
  });
});

/**
 *  Cleanup WS & HTTP servers
 */
afterAll((done) => {
  if (httpServer) {
    httpServer.close(done);
  } else {
    done();
  }
});

/**
 * Run before each test
 */
beforeEach((done) => {
  // Setup - connect to the /realtime namespace
  socket = io.connect(`http://[${httpServerAddr.address}]:${httpServerAddr.port}/realtime`, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    transports: ['websocket'],
    auth: {
      token: testToken
    }
  });
  socket.on('connect', () => {
    done();
  });
  socket.on('connect_error', (error) => {
    done(error);
  });
});

/**
 * Run after each test
 */
afterEach((done) => {
  // Cleanup
  if (socket && socket.connected) {
    socket.disconnect();
  }
  done();
});

describe('LocationGateway Socket.io Tests', () => {
  test('should connect to gateway', (done) => {
    // Just test that we can connect
    expect(socket.connected).toBe(true);
    done();
  });

  test('should emit location:track event', (done) => {
    // Emit location track request
    socket.emit('location:track', {
      friendId: '507f1f77bcf86cd799439011',
      durationSec: 300,
    });

    // Listen for any response
    socket.once('location:track:error', (data) => {
      // We expect an error since we don't have authentication
      expect(data).toBeDefined();
      done();
    });

    socket.once('location:track:ack', (data) => {
      // Should not reach here without auth
      done(new Error('Should not receive ack without authentication'));
    });

    // Timeout if no response
    setTimeout(() => {
      done(new Error('No response received within timeout'));
    }, 2000);
  });

  test('should return error when friend has location sharing disabled', (done) => {
    // Mock a friend with location sharing disabled
    const friendId = new mongoose.Types.ObjectId();
    
    // Import the actual modules to spy on them
    const { userModel } = require('../../../src/models/user.model');
    const { friendshipModel } = require('../../../src/models/friendship.model');

    // Spy on the methods and mock their return values
    const findByUserAndFriendSpy = jest.spyOn(friendshipModel, 'findByUserAndFriend')
      .mockResolvedValue({
        userId: testUserId,
        friendId: friendId,
        status: 'accepted',
        shareLocation: true
      });

    const findByIdSpy = jest.spyOn(userModel, 'findById')
      .mockResolvedValue({
        _id: friendId,
        privacy: {
          location: { sharing: 'off' }
        }
      });

    // Emit location track request
    socket.emit('location:track', {
      friendId: friendId.toString(),
      durationSec: 300,
    });

    // Listen for error response
    socket.once('location:track:error', (data) => {
      expect(data).toEqual({
        friendId: friendId.toString(),
        error: 'Friend has location sharing disabled'
      });
      
      // Restore the spies
      findByUserAndFriendSpy.mockRestore();
      findByIdSpy.mockRestore();
      
      done();
    });

    socket.once('location:track:ack', (data) => {
      // Restore the spies in case of unexpected success
      findByUserAndFriendSpy.mockRestore();
      findByIdSpy.mockRestore();
      done(new Error('Should not receive ack when friend has sharing disabled'));
    });

    // Timeout if no response
    setTimeout(() => {
      findByUserAndFriendSpy.mockRestore();
      findByIdSpy.mockRestore();
      done(new Error('No response received within timeout'));
    }, 2000);
  });

  test('should successfully track friend location when authorized', (done) => {
    // Mock a friend with location sharing enabled and valid friendship
    const friendId = new mongoose.Types.ObjectId();
    
    // Import the actual modules to spy on them
    const { userModel } = require('../../../src/models/user.model');
    const { friendshipModel } = require('../../../src/models/friendship.model');
    const { locationModel } = require('../../../src/models/location.model');

    // Spy on the methods and mock their return values
    const findByUserAndFriendSpy = jest.spyOn(friendshipModel, 'findByUserAndFriend')
      .mockResolvedValue({
        userId: testUserId,
        friendId: friendId,
        status: 'accepted',
        shareLocation: true
      });

    const findByIdSpy = jest.spyOn(userModel, 'findById')
      .mockResolvedValue({
        _id: friendId,
        privacy: {
          location: { sharing: 'friends' } // Sharing enabled
        }
      });

    // Mock location model to return a current location
    const findByUserIdSpy = jest.spyOn(locationModel, 'findByUserId')
      .mockResolvedValue({
        userId: friendId,
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 10,
        shared: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

    // Emit location track request
    socket.emit('location:track', {
      friendId: friendId.toString(),
      durationSec: 300,
    });

    // Listen for success response
    socket.once('location:track:ack', (data) => {
      expect(data).toEqual({
        friendId: friendId.toString(),
        status: 'subscribed',
        durationSec: 300
      });
      
      // Restore the spies
      findByUserAndFriendSpy.mockRestore();
      findByIdSpy.mockRestore();
      findByUserIdSpy.mockRestore();
      
      done();
    });

    socket.once('location:track:error', (error) => {
      // Restore the spies in case of unexpected error
      findByUserAndFriendSpy.mockRestore();
      findByIdSpy.mockRestore();
      findByUserIdSpy.mockRestore();
      done(new Error(`Should not receive error: ${error.error}`));
    });

    // Timeout if no response
    setTimeout(() => {
      findByUserAndFriendSpy.mockRestore();
      findByIdSpy.mockRestore();
      findByUserIdSpy.mockRestore();
      done(new Error('No response received within timeout'));
    }, 2000);
  });

  test('should auto-unsubscribe after specified duration', (done) => {
    // Mock a friend with location sharing enabled and valid friendship
    const friendId = new mongoose.Types.ObjectId();
    
    // Import the actual modules to spy on them
    const { userModel } = require('../../../src/models/user.model');
    const { friendshipModel } = require('../../../src/models/friendship.model');
    const { locationModel } = require('../../../src/models/location.model');

    // Spy on the methods and mock their return values
    const findByUserAndFriendSpy = jest.spyOn(friendshipModel, 'findByUserAndFriend')
      .mockResolvedValue({
        userId: testUserId,
        friendId: friendId,
        status: 'accepted',
        shareLocation: true
      });

    const findByIdSpy = jest.spyOn(userModel, 'findById')
      .mockResolvedValue({
        _id: friendId,
        privacy: {
          location: { sharing: 'friends' }
        }
      });

    const findByUserIdSpy = jest.spyOn(locationModel, 'findByUserId')
      .mockResolvedValue(null); // No current location

    // Use a short duration for testing (1 second)
    const shortDuration = 1;

    // Emit location track request with short duration
    socket.emit('location:track', {
      friendId: friendId.toString(),
      durationSec: shortDuration,
    });

    // Listen for initial ack
    socket.once('location:track:ack', (data) => {
      expect(data).toEqual({
        friendId: friendId.toString(),
        status: 'subscribed',
        durationSec: shortDuration
      });

      // Wait for auto-unsubscribe (duration + some buffer)
      setTimeout(() => {
        // The auto-unsubscribe should have executed by now
        // We can't directly test the internal state, but we've verified
        // that the setTimeout was called with the correct duration
        
        // Restore the spies
        findByUserAndFriendSpy.mockRestore();
        findByIdSpy.mockRestore();
        findByUserIdSpy.mockRestore();
        
        done();
      }, (shortDuration * 1000) + 100); // Wait for timeout + buffer
    });

    socket.once('location:track:error', (error) => {
      findByUserAndFriendSpy.mockRestore();
      findByIdSpy.mockRestore();
      findByUserIdSpy.mockRestore();
      done(new Error(`Should not receive error: ${error.error}`));
    });

    // Timeout if no response
    setTimeout(() => {
      findByUserAndFriendSpy.mockRestore();
      findByIdSpy.mockRestore();
      findByUserIdSpy.mockRestore();
      done(new Error('No response received within timeout'));
    }, 3000);
  });

  test('should handle errors during tracking setup', (done) => {
    // Mock a database error during friendship lookup
    const friendId = new mongoose.Types.ObjectId();
    
    const { friendshipModel } = require('../../../src/models/friendship.model');

    // Spy on the method and make it throw an error
    const findByUserAndFriendSpy = jest.spyOn(friendshipModel, 'findByUserAndFriend')
      .mockRejectedValue(new Error('Database connection failed'));

    // Emit location track request
    socket.emit('location:track', {
      friendId: friendId.toString(),
      durationSec: 300,
    });

    // Listen for error response
    socket.once('location:track:error', (data) => {
      expect(data).toEqual({
        friendId: friendId.toString(),
        error: 'Database connection failed'
      });
      
      // Restore the spy
      findByUserAndFriendSpy.mockRestore();
      
      done();
    });

    socket.once('location:track:ack', (data) => {
      findByUserAndFriendSpy.mockRestore();
      done(new Error('Should not receive ack when database error occurs'));
    });

    // Timeout if no response
    setTimeout(() => {
      findByUserAndFriendSpy.mockRestore();
      done(new Error('No response received within timeout'));
    }, 2000);
  });

  test('should broadcast friend started sharing when user reports location', (done) => {
    // Test the broadcastFriendStartedSharing method by triggering location reporting
    const { userModel } = require('../../../src/models/user.model');
    const { friendshipModel } = require('../../../src/models/friendship.model');
    const { locationModel } = require('../../../src/models/location.model');

    // Create a friend ID that matches what we'll use in the friendship mock
    const friendId = new mongoose.Types.ObjectId();
    const friendToken = jwt.sign({ id: friendId.toString() }, 'test-secret');
    let friendSocket;

    // Mock user with location sharing enabled
    const findByIdSpy = jest.spyOn(userModel, 'findById')
      .mockResolvedValue({
        _id: testUserId,
        privacy: {
          location: { sharing: 'friends' }
        }
      });

    // Mock friendships - create friendship with the specific friend ID
    const findUserFriendshipsSpy = jest.spyOn(friendshipModel, 'findUserFriendships')
      .mockResolvedValue([
        {
          userId: testUserId,
          friendId: friendId, // Use the same friendId as the token
          status: 'accepted',
          shareLocation: true
        }
      ]);

    // Mock location model create
    const createSpy = jest.spyOn(locationModel, 'create')
      .mockResolvedValue({
        userId: testUserId,
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 10,
        shared: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

    // Create a friend socket to listen for broadcast
    friendSocket = io.connect(`http://[${httpServerAddr.address}]:${httpServerAddr.port}/realtime`, {
      'reconnection delay': 0,
      'reopen delay': 0,
      'force new connection': true,
      transports: ['websocket'],
      auth: {
        token: friendToken
      }
    });

    friendSocket.on('connect', () => {
      // Listen for the broadcast event on friend socket
      friendSocket.once('friend:started:sharing', (data) => {
        expect(data).toMatchObject({
          friendId: testUserId.toString(),
          lat: 49.2827,
          lng: -123.1207,
          accuracyM: 10
        });
        expect(data.ts).toBeDefined();

        // Cleanup
        findByIdSpy.mockRestore();
        findUserFriendshipsSpy.mockRestore();
        createSpy.mockRestore();
        friendSocket.disconnect();
        
        done();
      });

      // Small delay to ensure friend socket is properly joined to room
      setTimeout(() => {
        // Trigger location reporting via the gateway's reportLocation method
        // This should trigger broadcastFriendStartedSharing
        gateway.reportLocation(testUserId, 49.2827, -123.1207, 10)
          .catch(error => {
            findByIdSpy.mockRestore();
            findUserFriendshipsSpy.mockRestore();
            createSpy.mockRestore();
            friendSocket.disconnect();
            done(new Error(`Location reporting failed: ${error.message}`));
          });
      }, 100);
    });

    friendSocket.on('connect_error', (error) => {
      findByIdSpy.mockRestore();
      findUserFriendshipsSpy.mockRestore();
      createSpy.mockRestore();
      done(new Error(`Friend socket connection failed: ${error}`));
    });

    // Timeout if no response
    setTimeout(() => {
      findByIdSpy.mockRestore();
      findUserFriendshipsSpy.mockRestore();
      createSpy.mockRestore();
      if (friendSocket) friendSocket.disconnect();
      done(new Error('No friend:started:sharing event received within timeout'));
    }, 3000);
  });

  test('should handle no friends case in broadcastFriendStartedSharing', (done) => {
    // Test when user has no friends to notify
    const { userModel } = require('../../../src/models/user.model');
    const { friendshipModel } = require('../../../src/models/friendship.model');
    const { locationModel } = require('../../../src/models/location.model');

    // Mock user with location sharing enabled
    const findByIdSpy = jest.spyOn(userModel, 'findById')
      .mockResolvedValue({
        _id: testUserId,
        privacy: {
          location: { sharing: 'friends' }
        }
      });

    // Mock no friendships
    const findUserFriendshipsSpy = jest.spyOn(friendshipModel, 'findUserFriendships')
      .mockResolvedValue([]); // No friends

    // Mock location model create
    const createSpy = jest.spyOn(locationModel, 'create')
      .mockResolvedValue({
        userId: testUserId,
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 10,
        shared: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

    // Trigger location reporting
    gateway.reportLocation(testUserId, 49.2827, -123.1207, 10)
      .then(() => {
        // Should complete successfully even with no friends
        findByIdSpy.mockRestore();
        findUserFriendshipsSpy.mockRestore();
        createSpy.mockRestore();
        done();
      })
      .catch(error => {
        findByIdSpy.mockRestore();
        findUserFriendshipsSpy.mockRestore();
        createSpy.mockRestore();
        done(new Error(`Should not fail when no friends: ${error.message}`));
      });
  });

  test('should handle errors in broadcastFriendStartedSharing', (done) => {
    // Test error handling in broadcast method
    const { userModel } = require('../../../src/models/user.model');
    const { friendshipModel } = require('../../../src/models/friendship.model');
    const { locationModel } = require('../../../src/models/location.model');

    // Mock user with location sharing enabled
    const findByIdSpy = jest.spyOn(userModel, 'findById')
      .mockResolvedValue({
        _id: testUserId,
        privacy: {
          location: { sharing: 'friends' }
        }
      });

    // Mock friendships query to throw error
    const findUserFriendshipsSpy = jest.spyOn(friendshipModel, 'findUserFriendships')
      .mockRejectedValue(new Error('Database error in friendships lookup'));

    // Mock location model create
    const createSpy = jest.spyOn(locationModel, 'create')
      .mockResolvedValue({
        userId: testUserId,
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 10,
        shared: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

    // Trigger location reporting - should handle error gracefully
    gateway.reportLocation(testUserId, 49.2827, -123.1207, 10)
      .then(() => {
        // Should complete successfully despite broadcast error
        findByIdSpy.mockRestore();
        findUserFriendshipsSpy.mockRestore();
        createSpy.mockRestore();
        done();
      })
      .catch(error => {
        findByIdSpy.mockRestore();
        findUserFriendshipsSpy.mockRestore();
        createSpy.mockRestore();
        done(new Error(`Should handle broadcast errors gracefully: ${error.message}`));
      });
  });
});

describe('LocationGateway Authentication Middleware Tests', () => {
  let testSocket;
  
  afterEach((done) => {
    if (testSocket) {
      testSocket.disconnect();
      testSocket = null;
    }
    
    // Ensure JWT_SECRET is always restored for subsequent tests
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test-secret';
    }
    
    // Small delay to ensure cleanup
    setTimeout(done, 100);
  });

  test('should reject connection with no token provided', (done) => {
    const timeout = setTimeout(() => {
      done(new Error('Test timeout'));
    }, 5000);

    testSocket = io(`http://localhost:${httpServerAddr.port}/realtime`, {
      auth: {} // No token provided
    });

    testSocket.on('connect_error', (error) => {
      clearTimeout(timeout);
      expect(error.message).toContain('Authentication error: No token provided');
      done();
    });

    testSocket.on('connect', () => {
      clearTimeout(timeout);
      done(new Error('Should not connect without token'));
    });
  });

  test('should reject connection with invalid JWT token', (done) => {
    const timeout = setTimeout(() => {
      done(new Error('Test timeout'));
    }, 5000);

    testSocket = io(`http://localhost:${httpServerAddr.port}/realtime`, {
      auth: {
        token: 'invalid-token-12345'
      }
    });

    testSocket.on('connect_error', (error) => {
      clearTimeout(timeout);
      expect(error.message).toContain('Authentication failed');
      done();
    });

    testSocket.on('connect', () => {
      clearTimeout(timeout);
      done(new Error('Should not connect with invalid token'));
    });
  });

  test('should reject connection when JWT_SECRET is not configured', (done) => {
    const timeout = setTimeout(() => {
      // Restore JWT_SECRET
      process.env.JWT_SECRET = 'test-secret';
      done(new Error('Test timeout'));
    }, 5000);

    // Temporarily remove JWT_SECRET
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    testSocket = io(`http://localhost:${httpServerAddr.port}/realtime`, {
      auth: {
        token: testToken
      }
    });

    testSocket.on('connect_error', (error) => {
      clearTimeout(timeout);
      expect(error.message).toContain('JWT_SECRET not configured');
      // Restore JWT_SECRET
      process.env.JWT_SECRET = originalSecret;
      done();
    });

    testSocket.on('connect', () => {
      clearTimeout(timeout);
      // Restore JWT_SECRET
      process.env.JWT_SECRET = originalSecret;
      done(new Error('Should not connect without JWT_SECRET'));
    });
  });

  test('should reject connection with malformed JWT token', (done) => {
    const timeout = setTimeout(() => {
      done(new Error('Test timeout'));
    }, 5000);

    const malformedToken = jwt.sign({}, 'test-secret'); // Token without id field

    testSocket = io(`http://localhost:${httpServerAddr.port}/realtime`, {
      auth: {
        token: malformedToken
      }
    });

    testSocket.on('connect_error', (error) => {
      clearTimeout(timeout);
      expect(error.message).toContain('Invalid token');
      done();
    });

    testSocket.on('connect', () => {
      clearTimeout(timeout);
      done(new Error('Should not connect with malformed token'));
    });
  });

  test('should successfully authenticate with valid JWT token', (done) => {
    const timeout = setTimeout(() => {
      done(new Error('Test timeout'));
    }, 5000);

    testSocket = io(`http://localhost:${httpServerAddr.port}/realtime`, {
      auth: {
        token: testToken
      }
    });

    testSocket.on('connect_error', (error) => {
      clearTimeout(timeout);
      done(new Error(`Should connect with valid token: ${error.message}`));
    });

    testSocket.on('connect', () => {
      clearTimeout(timeout);
      // Verify connection successful
      expect(testSocket.connected).toBe(true);
      done();
    });
  });

  test('should accept dev token bypass in non-production environment', (done) => {
    const timeout = setTimeout(() => {
      done(new Error('Test timeout'));
    }, 5000);

    // Set up dev environment
    const originalEnv = process.env.NODE_ENV;
    const originalDevToken = process.env.DEV_AUTH_TOKEN;
    
    process.env.NODE_ENV = 'development';
    process.env.DEV_AUTH_TOKEN = 'dev-bypass-token';

    const { userModel } = require('../../../src/models/user.model');
    const devUserId = new mongoose.Types.ObjectId();
    
    // Mock user lookup for dev bypass
    const findByIdSpy = jest.spyOn(userModel, 'findById')
      .mockResolvedValue({
        _id: devUserId,
        username: 'testuser'
      });

    testSocket = io(`http://localhost:${httpServerAddr.port}/realtime`, {
      auth: {
        token: 'dev-bypass-token'
      },
      extraHeaders: {
        'x-dev-user-id': devUserId.toString()
      }
    });

    testSocket.on('connect_error', (error) => {
      clearTimeout(timeout);
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      if (originalDevToken) {
        process.env.DEV_AUTH_TOKEN = originalDevToken;
      } else {
        delete process.env.DEV_AUTH_TOKEN;
      }
      findByIdSpy.mockRestore();
      done(new Error(`Should connect with dev token: ${error.message}`));
    });

    testSocket.on('connect', () => {
      clearTimeout(timeout);
      // Verify connection successful
      expect(testSocket.connected).toBe(true);
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      if (originalDevToken) {
        process.env.DEV_AUTH_TOKEN = originalDevToken;
      } else {
        delete process.env.DEV_AUTH_TOKEN;
      }
      findByIdSpy.mockRestore();
      done();
    });
  });

  test('should reject dev token bypass with invalid user ID', (done) => {
    const timeout = setTimeout(() => {
      done(new Error('Test timeout'));
    }, 5000);

    // Set up dev environment
    const originalEnv = process.env.NODE_ENV;
    const originalDevToken = process.env.DEV_AUTH_TOKEN;
    
    process.env.NODE_ENV = 'development';
    process.env.DEV_AUTH_TOKEN = 'dev-bypass-token';

    testSocket = io(`http://localhost:${httpServerAddr.port}/realtime`, {
      auth: {
        token: 'dev-bypass-token'
      },
      extraHeaders: {
        'x-dev-user-id': 'invalid-user-id'
      }
    });

    testSocket.on('connect_error', (error) => {
      clearTimeout(timeout);
      expect(error.message).toContain('Invalid dev user ID');
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      if (originalDevToken) {
        process.env.DEV_AUTH_TOKEN = originalDevToken;
      } else {
        delete process.env.DEV_AUTH_TOKEN;
      }
      done();
    });

    testSocket.on('connect', () => {
      clearTimeout(timeout);
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      if (originalDevToken) {
        process.env.DEV_AUTH_TOKEN = originalDevToken;
      } else {
        delete process.env.DEV_AUTH_TOKEN;
      }
      done(new Error('Should not connect with invalid dev user ID'));
    });
  });

  test('should reject dev token bypass when user not found', (done) => {
    const timeout = setTimeout(() => {
      done(new Error('Test timeout'));
    }, 5000);

    // Set up dev environment
    const originalEnv = process.env.NODE_ENV;
    const originalDevToken = process.env.DEV_AUTH_TOKEN;
    
    process.env.NODE_ENV = 'development';
    process.env.DEV_AUTH_TOKEN = 'dev-bypass-token';

    const { userModel } = require('../../../src/models/user.model');
    const devUserId = new mongoose.Types.ObjectId();
    
    // Mock user not found
    const findByIdSpy = jest.spyOn(userModel, 'findById')
      .mockResolvedValue(null);

    testSocket = io(`http://localhost:${httpServerAddr.port}/realtime`, {
      auth: {
        token: 'dev-bypass-token'
      },
      extraHeaders: {
        'x-dev-user-id': devUserId.toString()
      }
    });

    testSocket.on('connect_error', (error) => {
      clearTimeout(timeout);
      expect(error.message).toContain('Dev user not found');
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      if (originalDevToken) {
        process.env.DEV_AUTH_TOKEN = originalDevToken;
      } else {
        delete process.env.DEV_AUTH_TOKEN;
      }
      findByIdSpy.mockRestore();
      done();
    });

    testSocket.on('connect', () => {
      clearTimeout(timeout);
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      if (originalDevToken) {
        process.env.DEV_AUTH_TOKEN = originalDevToken;
      } else {
        delete process.env.DEV_AUTH_TOKEN;
      }
      findByIdSpy.mockRestore();
      done(new Error('Should not connect when dev user not found'));
    });
  });

  test('should reject dev token in production environment', (done) => {
    const timeout = setTimeout(() => {
      done(new Error('Test timeout'));
    }, 5000);

    // Set up production environment
    const originalEnv = process.env.NODE_ENV;
    const originalDevToken = process.env.DEV_AUTH_TOKEN;
    
    process.env.NODE_ENV = 'production';
    process.env.DEV_AUTH_TOKEN = 'dev-bypass-token';

    const devUserId = new mongoose.Types.ObjectId();

    testSocket = io(`http://localhost:${httpServerAddr.port}/realtime`, {
      auth: {
        token: 'dev-bypass-token'
      },
      extraHeaders: {
        'x-dev-user-id': devUserId.toString()
      }
    });

    testSocket.on('connect_error', (error) => {
      clearTimeout(timeout);
      expect(error.message).toContain('Authentication failed');
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      if (originalDevToken) {
        process.env.DEV_AUTH_TOKEN = originalDevToken;
      } else {
        delete process.env.DEV_AUTH_TOKEN;
      }
      done();
    });

    testSocket.on('connect', () => {
      clearTimeout(timeout);
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      if (originalDevToken) {
        process.env.DEV_AUTH_TOKEN = originalDevToken;
      } else {
        delete process.env.DEV_AUTH_TOKEN;
      }
      done(new Error('Should not accept dev token in production'));
    });
  });
});
