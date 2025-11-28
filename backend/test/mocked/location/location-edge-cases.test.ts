import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

import * as locationController from '../../../src/controllers/location.controller';
import { locationGateway } from '../../../src/realtime/gateway';
import { userModel } from '../../../src/models/user.model';

describe('Location Controller - Mocked Edge Cases', () => {
  let app: express.Application;
  let testUser: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create test user
    testUser = await (userModel as any).user.create({
      name: `Test User ${Date.now()}`,
      username: `testuser_${Date.now()}`,
      email: `testuser_${Date.now()}@example.com`,
      googleId: `google_${Date.now()}`,
      password: 'password123',
      privacy: {
        allowFriendRequestsFrom: 'everyone',
      },
    });

    // Create app with routes that skip auth middleware (to test controller defensive checks)
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware that doesn't set req.user
    app.use((req: any, _res: any, next: any) => {
      // Intentionally don't set req.user to test defensive checks
      next();
    });

    // Add routes directly calling controllers
    app.put('/api/me/location', (req, res) => void locationController.upsertMyLocation(req, res));
    app.get('/api/friends/locations', (req, res) => void locationController.getFriendsLocations(req, res));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Input: upsertMyLocation without authenticated user (req.user missing)
  // Expected status code: 401
  // Expected behavior: Controller defensive check catches missing user
  // Expected output: Unauthorized error
  test('upsertMyLocation handles missing req.user', async () => {
    const res = await request(app)
      .put('/api/me/location')
      .send({
        lat: 49.2827,
        lng: -123.1207,
      })
      .expect(401);

    expect(res.body).toHaveProperty('message', 'Unauthorized');
  });

  // Input: upsertMyLocation with gateway throwing error
  // Expected status code: 500
  // Expected behavior: Catches error and returns 500
  // Expected output: Internal server error
  test('upsertMyLocation handles gateway errors', async () => {
    // Create app with authenticated user
    const authApp = express();
    authApp.use(express.json());
    
    authApp.use((req: any, _res: any, next: any) => {
      req.user = testUser;
      next();
    });

    authApp.put('/api/me/location', (req, res) => void locationController.upsertMyLocation(req, res));

    // Mock locationGateway.reportLocation to throw error
    jest.spyOn(locationGateway, 'reportLocation').mockRejectedValue(
      new Error('Gateway error')
    );

    const res = await request(authApp)
      .put('/api/me/location')
      .send({
        lat: 49.2827,
        lng: -123.1207,
      })
      .expect(500);

    expect(res.body).toHaveProperty('message', 'Internal server error');
  });

  // Input: getFriendsLocations without authenticated user
  // Expected status code: 401
  // Expected behavior: Controller defensive check catches missing user
  // Expected output: Unauthorized error
  test('getFriendsLocations handles missing req.user', async () => {
    const res = await request(app)
      .get('/api/friends/locations')
      .expect(401);

    expect(res.body).toHaveProperty('message', 'Unauthorized');
  });

  // Input: getFriendsLocations with authenticated user and no friends
  // Expected status code: 200
  // Expected behavior: Returns empty array
  // Expected output: Success with empty data array
  test('getFriendsLocations returns empty array when no friends', async () => {
    // Create app with authenticated user
    const authApp = express();
    authApp.use(express.json());
    
    authApp.use((req: any, _res: any, next: any) => {
      req.user = testUser;
      next();
    });

    authApp.get('/api/friends/locations', (req, res) => void locationController.getFriendsLocations(req, res));

    // Mock getFriendsLocations to return empty array
    jest.spyOn(locationGateway, 'getFriendsLocations').mockResolvedValue([]);

    const res = await request(authApp)
      .get('/api/friends/locations')
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Friends locations retrieved successfully');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  // Input: getFriendsLocations with friends having locations
  // Expected status code: 200
  // Expected behavior: Returns formatted friend locations
  // Expected output: Success with friend location data
  test('getFriendsLocations returns friend locations', async () => {
    // Create app with authenticated user
    const authApp = express();
    authApp.use(express.json());
    
    authApp.use((req: any, _res: any, next: any) => {
      req.user = testUser;
      next();
    });

    authApp.get('/api/friends/locations', (req, res) => void locationController.getFriendsLocations(req, res));

    // Mock getFriendsLocations to return friend locations
    const mockLocations = [
      {
        userId: new mongoose.Types.ObjectId(),
        lat: 49.2827,
        lng: -123.1207,
        accuracyM: 10,
        createdAt: new Date(),
        expiresAt: new Date(),
        visible: true,
      },
      {
        userId: new mongoose.Types.ObjectId(),
        lat: 40.7128,
        lng: -74.0060,
        accuracyM: 15,
        createdAt: new Date(),
        expiresAt: new Date(),
        visible: true,
      },
    ];

    jest.spyOn(locationGateway, 'getFriendsLocations').mockResolvedValue(mockLocations as any);

    const res = await request(authApp)
      .get('/api/friends/locations')
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Friends locations retrieved successfully');
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    
    // Verify first location format
    expect(res.body.data[0]).toHaveProperty('userId');
    expect(res.body.data[0]).toHaveProperty('lat', 49.2827);
    expect(res.body.data[0]).toHaveProperty('lng', -123.1207);
    expect(res.body.data[0]).toHaveProperty('accuracyM', 10);
    expect(res.body.data[0]).toHaveProperty('ts');
    
    // Verify second location format
    expect(res.body.data[1]).toHaveProperty('userId');
    expect(res.body.data[1]).toHaveProperty('lat', 40.7128);
    expect(res.body.data[1]).toHaveProperty('lng', -74.0060);
    expect(res.body.data[1]).toHaveProperty('accuracyM', 15);
    expect(res.body.data[1]).toHaveProperty('ts');
  });

  // Input: getFriendsLocations with gateway throwing error
  // Expected status code: 500
  // Expected behavior: Catches error and returns 500
  // Expected output: Internal server error
  test('getFriendsLocations handles gateway errors', async () => {
    // Create app with authenticated user
    const authApp = express();
    authApp.use(express.json());
    
    authApp.use((req: any, _res: any, next: any) => {
      req.user = testUser;
      next();
    });

    authApp.get('/api/friends/locations', (req, res) => void locationController.getFriendsLocations(req, res));

    // Mock getFriendsLocations to throw error
    jest.spyOn(locationGateway, 'getFriendsLocations').mockRejectedValue(
      new Error('Gateway error')
    );

    const res = await request(authApp)
      .get('/api/friends/locations')
      .expect(500);

    expect(res.body).toHaveProperty('message', 'Internal server error');
  });
});
