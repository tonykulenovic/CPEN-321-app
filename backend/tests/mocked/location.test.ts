import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

import locationRoutes from '../../src/routes/location.routes';
import friendsRoutes from '../../src/routes/friends.routes';
import { locationGateway } from '../../src/realtime/gateway';

// Mock all external dependencies
jest.mock('../../src/realtime/gateway');
jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Test User',
      email: 'test@example.com',
      username: 'testuser'
    };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/', locationRoutes); // PUT /location
app.use('/friends', friendsRoutes); // GET /friends/locations

const mockLocationGateway = locationGateway as jest.Mocked<typeof locationGateway>;

describe('Mocked: PUT /location', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: locationGateway.reportLocation succeeds with sharing enabled
  // Input: valid latitude and longitude coordinates
  // Expected status code: 201
  // Expected behavior: location is updated and shared with friends
  // Expected output: success message with sharing status and expiration
  test('Update location successfully with sharing enabled', async () => {
    const mockLocationResult = {
      shared: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    mockLocationGateway.reportLocation.mockResolvedValueOnce(mockLocationResult);

    const response = await request(app)
      .put('/location')
      .send({
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 10
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Location updated successfully');
    expect(response.body.data.shared).toBe(true);
    expect(response.body.data.expiresAt).toBeDefined();
    expect(mockLocationGateway.reportLocation).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      49.2827,
      -123.1207,
      10
    );
  });

  // Mocked behavior: locationGateway.reportLocation succeeds with sharing disabled
  // Input: valid coordinates but user has location sharing off
  // Expected status code: 201
  // Expected behavior: location is processed but not shared
  // Expected output: success message with shared=false
  test('Update location successfully with sharing disabled', async () => {
    const mockLocationResult = {
      shared: false,
      expiresAt: new Date().toISOString()
    };

    mockLocationGateway.reportLocation.mockResolvedValueOnce(mockLocationResult);

    const response = await request(app)
      .put('/location')
      .send({
        lat: 49.2827,
        lng: -123.1207
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Location updated successfully');
    expect(response.body.data.shared).toBe(false);
    expect(mockLocationGateway.reportLocation).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      49.2827,
      -123.1207,
      0 // Default accuracy when not provided
    );
  });

  // Mocked behavior: validation error for invalid coordinates
  // Input: invalid latitude (out of range)
  // Expected status code: 400
  // Expected behavior: validation fails
  // Expected output: validation error message
  test('Invalid latitude coordinate', async () => {
    const response = await request(app)
      .put('/location')
      .send({
        lat: 91, // Invalid: latitude must be between -90 and 90
        lng: -123.1207
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid request body');
    expect(response.body.errors).toBeDefined();
    expect(mockLocationGateway.reportLocation).not.toHaveBeenCalled();
  });

  // Mocked behavior: validation error for invalid coordinates
  // Input: invalid longitude (out of range)
  // Expected status code: 400
  // Expected behavior: validation fails
  // Expected output: validation error message
  test('Invalid longitude coordinate', async () => {
    const response = await request(app)
      .put('/location')
      .send({
        lat: 49.2827,
        lng: 181 // Invalid: longitude must be between -180 and 180
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid request body');
    expect(response.body.errors).toBeDefined();
    expect(mockLocationGateway.reportLocation).not.toHaveBeenCalled();
  });

  // Mocked behavior: validation error for missing required fields
  // Input: missing latitude coordinate
  // Expected status code: 400
  // Expected behavior: validation fails
  // Expected output: validation error message
  test('Missing required latitude', async () => {
    const response = await request(app)
      .put('/location')
      .send({
        lng: -123.1207
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid request body');
    expect(response.body.errors).toBeDefined();
    expect(mockLocationGateway.reportLocation).not.toHaveBeenCalled();
  });

  // Mocked behavior: validation error for missing required fields
  // Input: missing longitude coordinate
  // Expected status code: 400
  // Expected behavior: validation fails
  // Expected output: validation error message
  test('Missing required longitude', async () => {
    const response = await request(app)
      .put('/location')
      .send({
        lat: 49.2827
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid request body');
    expect(response.body.errors).toBeDefined();
    expect(mockLocationGateway.reportLocation).not.toHaveBeenCalled();
  });

  // Mocked behavior: locationGateway.reportLocation throws error
  // Input: valid coordinates but service error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Location service error', async () => {
    mockLocationGateway.reportLocation.mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await request(app)
      .put('/location')
      .send({
        lat: 49.2827,
        lng: -123.1207
      });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    expect(mockLocationGateway.reportLocation).toHaveBeenCalledTimes(1);
  });
});

describe('Mocked: GET /friends/locations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mocked behavior: locationGateway.getFriendsLocations returns friend locations
  // Input: authenticated user request
  // Expected status code: 200
  // Expected behavior: returns filtered friend locations based on privacy settings
  // Expected output: array of friend locations with coordinates and timestamps
  test('Get friends locations successfully', async () => {
    const mockFriendLocations = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
        userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 15,
        createdAt: new Date('2023-10-31T10:00:00Z')
      },
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'),
        userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        lat: 49.2844,
        lng: -123.1089,
        accuracyM: 8,
        createdAt: new Date('2023-10-31T10:02:00Z')
      }
    ];

    mockLocationGateway.getFriendsLocations.mockResolvedValueOnce(mockFriendLocations as unknown);

    const response = await request(app).get('/friends/locations');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Friends locations retrieved successfully');
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toEqual({
      userId: '507f1f77bcf86cd799439012',
      lat: 49.2827,
      lng: -123.1207,
      accuracyM: 15,
      ts: '2023-10-31T10:00:00.000Z'
    });
    expect(response.body.data[1]).toEqual({
      userId: '507f1f77bcf86cd799439013',
      lat: 49.2844,
      lng: -123.1089,
      accuracyM: 8,
      ts: '2023-10-31T10:02:00.000Z'
    });
    expect(mockLocationGateway.getFriendsLocations).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
    );
  });

  // Mocked behavior: locationGateway.getFriendsLocations returns empty array
  // Input: user with no friends sharing location
  // Expected status code: 200
  // Expected behavior: returns empty array
  // Expected output: empty location array
  test('No friends sharing location', async () => {
    mockLocationGateway.getFriendsLocations.mockResolvedValueOnce([]);

    const response = await request(app).get('/friends/locations');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Friends locations retrieved successfully');
    expect(response.body.data).toHaveLength(0);
    expect(mockLocationGateway.getFriendsLocations).toHaveBeenCalledWith(
      new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
    );
  });

  // Mocked behavior: locationGateway.getFriendsLocations returns approximate locations
  // Input: friends with approximate location sharing settings
  // Expected status code: 200
  // Expected behavior: returns approximated coordinates based on privacy settings
  // Expected output: friend locations with reduced precision
  test('Get approximate friends locations', async () => {
    const mockApproximateLocations = [
      {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
        userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        lat: 49.283, // Slightly approximated
        lng: -123.121, // Slightly approximated  
        accuracyM: 30, // Increased accuracy radius
        createdAt: new Date('2023-10-31T10:00:00Z')
      }
    ];

    mockLocationGateway.getFriendsLocations.mockResolvedValueOnce(mockApproximateLocations as unknown);

    const response = await request(app).get('/friends/locations');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Friends locations retrieved successfully');
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].accuracyM).toBe(30); // Reduced precision
    expect(mockLocationGateway.getFriendsLocations).toHaveBeenCalledTimes(1);
  });

  // Mocked behavior: locationGateway.getFriendsLocations throws error
  // Input: valid request but service error occurs
  // Expected status code: 500
  // Expected behavior: error handling
  // Expected output: internal server error message
  test('Location service error when getting friends locations', async () => {
    mockLocationGateway.getFriendsLocations.mockRejectedValueOnce(new Error('Database query failed'));

    const response = await request(app).get('/friends/locations');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Internal server error');
    expect(mockLocationGateway.getFriendsLocations).toHaveBeenCalledTimes(1);
  });
});