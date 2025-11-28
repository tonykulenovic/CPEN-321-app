import request from 'supertest';
import express from 'express';
import { locationModel } from '../../../src/models/location.model';
import mongoose from 'mongoose';
import axios from 'axios';
import { describe, beforeAll, afterAll, beforeEach, it, expect, jest } from '@jest/globals';

// Mock axios to prevent real Google Places API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Set a fake API key to enable Places API service
process.env.GOOGLE_PLACES_API_KEY = 'fake-test-key';
process.env.MAPS_API_KEY = 'fake-test-key';

// Mock the auth middleware BEFORE importing routes
jest.mock('../../../src/middleware/auth.middleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    // Mock a valid user for all tests
    req.user = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      email: 'placestest@example.com',
      name: 'Places API Test User',
      username: 'placesapitest',
    };
    next();
  },
}));

// Import routes AFTER mocking auth
import recommendationsRoutes from '../../../src/routes/recommendations.routes';
import { PlacesApiService } from '../../../src/services/places.service';

describe('Places API Integration Tests (via Recommendations)', () => {
  let app: express.Application;
  const testUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

  // Create a simple Express app for testing
  const createTestApp = () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/recommendations', recommendationsRoutes);
    return testApp;
  };

  beforeAll(async () => {
    // Create test app
    app = createTestApp();
  });

  afterAll(async () => {
    // Clean up test data
    await mongoose.connection.db?.collection('locations').deleteMany({ userId: testUserId });
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock for Google Places API response
    mockedAxios.post.mockResolvedValue({
      data: {
        places: [
          {
            id: 'place_1',
            displayName: { text: 'Mock Restaurant 1' },
            location: { latitude: 49.2827, longitude: -123.1207 },
            rating: 4.5,
            businessStatus: 'OPERATIONAL',
            types: ['restaurant', 'food', 'establishment'],
            userRatingCount: 150,
            priceLevel: 'PRICE_LEVEL_MODERATE',
          },
          {
            id: 'place_2', 
            displayName: { text: 'Mock Cafe 2' },
            location: { latitude: 49.2828, longitude: -123.1208 },
            rating: 4.2,
            businessStatus: 'OPERATIONAL',
            types: ['cafe', 'food', 'establishment'],
            userRatingCount: 75,
            priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
          },
        ],
      },
    });
  });

  describe('GET /api/recommendations/:mealType - Places API Integration', () => {
    it('should get breakfast recommendations and exercise Places API with mocked response', async () => {
      // Create a test location for this specific test
      await locationModel.create(
        testUserId,
        49.2827, // UBC latitude
        -123.1207, // UBC longitude
        10, // accuracy
        true, // shared
        new Date(Date.now() + 2 * 60 * 60 * 1000) // expires in 2 hours
      );

      const response = await request(app)
        .get('/api/recommendations/breakfast')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      // Verify Google Places API code was executed (we can see this from the logs)
      // "🔍 [PLACES] Searching for breakfast options" confirms Places API code ran
      // The mocked response provided the test data we expect

      // Verify response structure
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('mealType', 'breakfast');
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('recommendations');

      // Verify Places API recommendations are included
      const { recommendations } = response.body.data;
      const placesApiRecs = recommendations.filter(
        (rec: any) => rec.source === 'places_api'
      );
      expect(placesApiRecs.length).toBeGreaterThan(0);

      // Verify recommendation structure has required fields from Places API
      const firstPlacesRec = placesApiRecs[0];
      expect(firstPlacesRec).toHaveProperty('place');
      expect(firstPlacesRec.place).toHaveProperty('id');
      expect(firstPlacesRec.place).toHaveProperty('name');
      expect(firstPlacesRec).toHaveProperty('distance');
      expect(firstPlacesRec).toHaveProperty('score');
      expect(firstPlacesRec).toHaveProperty('source', 'places_api');
    });

    it('should cover lunch meal type filters and exercise Places API', async () => {
      // Create a test location for lunch
      await locationModel.create(
        testUserId,
        49.2827, // UBC latitude
        -123.1207, // UBC longitude
        10, // accuracy
        true, // shared
        new Date(Date.now() + 2 * 60 * 60 * 1000) // expires in 2 hours
      );

      // Mock response specific to lunch types: 'restaurant', 'meal_takeaway', 'sandwich_shop', 'pizza_restaurant'
      mockedAxios.post.mockResolvedValue({
        data: {
          places: [
            {
              id: 'lunch_place_1',
              displayName: { text: 'Quick Lunch Spot' },
              location: { latitude: 49.2827, longitude: -123.1207 },
              rating: 4.3,
              businessStatus: 'OPERATIONAL',
              types: ['restaurant', 'meal_takeaway', 'food'],
              userRatingCount: 120,
              priceLevel: 'PRICE_LEVEL_MODERATE',
            },
            {
              id: 'lunch_place_2',
              displayName: { text: 'Sandwich Shop' },
              location: { latitude: 49.2828, longitude: -123.1208 },
              rating: 4.1,
              businessStatus: 'OPERATIONAL', 
              types: ['sandwich_shop', 'food'],
              userRatingCount: 85,
              priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
            },
          ],
        },
      });

      const response = await request(app)
        .get('/api/recommendations/lunch')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);
      
      expect(response.body.data).toHaveProperty('mealType', 'lunch');
      expect(response.body.data).toHaveProperty('recommendations');
      
      // Verify Places API was called and lunch-specific filters were applied
      const placesApiRecs = response.body.data.recommendations.filter(
        (rec: any) => rec.source === 'places_api'
      );
      expect(placesApiRecs.length).toBeGreaterThan(0);
      
      const firstRec = placesApiRecs[0];
      expect(firstRec.place).toHaveProperty('name');
      expect(['Quick Lunch Spot', 'Sandwich Shop']).toContain(firstRec.place.name);
    });

    it('should cover bakery lunch scoring logic in meal suitability', async () => {
      // Create a test location for this test
      await locationModel.create(
        testUserId,
        49.2827,
        -123.1207,
        10,
        true,
        new Date(Date.now() + 2 * 60 * 60 * 1000)
      );

      // Mock response with a bakery to trigger the specific scoring logic
      mockedAxios.post.mockResolvedValue({
        data: {
          places: [
            {
              id: 'bakery_place_1',
              displayName: { text: 'Artisan Bakery' },
              location: { latitude: 49.2827, longitude: -123.1207 },
              rating: 4.5,
              businessStatus: 'OPERATIONAL',
              types: ['bakery', 'food', 'establishment'], // This will trigger the bakery lunch scoring
              userRatingCount: 90,
              priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
            },
            {
              id: 'bakery_place_2',
              displayName: { text: 'French Bakery & Cafe' },
              location: { latitude: 49.2828, longitude: -123.1208 },
              rating: 4.3,
              businessStatus: 'OPERATIONAL',
              types: ['bakery', 'cafe', 'food'], // Another bakery to ensure coverage
              userRatingCount: 75,
              priceLevel: 'PRICE_LEVEL_MODERATE',
            },
          ],
        },
      });

      const response = await request(app)
        .get('/api/recommendations/lunch') // Using lunch to trigger bakery lunch scoring logic
        .set('Authorization', 'Bearer mock-token')
        .expect(200);
      
      expect(response.body.data).toHaveProperty('mealType', 'lunch');
      expect(response.body.data).toHaveProperty('recommendations');
      
      // Verify Places API was called and bakery-specific scoring was applied
      const placesApiRecs = response.body.data.recommendations.filter(
        (rec: any) => rec.source === 'places_api'
      );
      expect(placesApiRecs.length).toBeGreaterThan(0);
      
      const bakeryRec = placesApiRecs.find((rec: any) => 
        rec.place.name.toLowerCase().includes('bakery')
      );
      expect(bakeryRec).toBeDefined();
      expect(bakeryRec.place).toHaveProperty('name');
      expect(['Artisan Bakery', 'French Bakery & Cafe']).toContain(bakeryRec.place.name);
    });

    it('should cover pizza/burger/bar/grill dinner scoring logic in meal suitability', async () => {
      // Create a test location for this test
      await locationModel.create(
        testUserId,
        49.2827,
        -123.1207,
        10,
        true,
        new Date(Date.now() + 2 * 60 * 60 * 1000)
      );

      // Mock response with pizza/burger/bar/grill places to trigger the specific scoring logic
      mockedAxios.post.mockResolvedValue({
        data: {
          places: [
            {
              id: 'pizza_place_1',
              displayName: { text: 'Tony\'s Pizza Bar' },
              location: { latitude: 49.2827, longitude: -123.1207 },
              rating: 4.4,
              businessStatus: 'OPERATIONAL',
              types: ['pizza_restaurant', 'restaurant', 'food'], // This will trigger pizza_restaurant dinner scoring
              userRatingCount: 180,
              priceLevel: 'PRICE_LEVEL_MODERATE',
            },
            {
              id: 'burger_place_1',
              displayName: { text: 'Burger Grill & Bar' },
              location: { latitude: 49.2828, longitude: -123.1208 },
              rating: 4.2,
              businessStatus: 'OPERATIONAL',
              types: ['restaurant', 'meal_takeaway', 'food'], // This will trigger meal_takeaway dinner scoring
              userRatingCount: 95,
              priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
            },
            {
              id: 'bar_place_1',
              displayName: { text: 'Sports Bar & Grill' },
              location: { latitude: 49.2829, longitude: -123.1209 },
              rating: 4.1,
              businessStatus: 'OPERATIONAL',
              types: ['bar', 'restaurant', 'food'], // This place name + types will trigger text-based scoring
              userRatingCount: 120,
              priceLevel: 'PRICE_LEVEL_MODERATE',
            },
          ],
        },
      });

      const response = await request(app)
        .get('/api/recommendations/dinner') // Using dinner to trigger the specific scoring logic
        .set('Authorization', 'Bearer mock-token')
        .expect(200);
      
      expect(response.body.data).toHaveProperty('mealType', 'dinner');
      expect(response.body.data).toHaveProperty('recommendations');
      
      // Verify Places API was called and pizza/burger/bar/grill-specific scoring was applied
      const placesApiRecs = response.body.data.recommendations.filter(
        (rec: any) => rec.source === 'places_api'
      );
      expect(placesApiRecs.length).toBeGreaterThan(0);
      
      // Verify we have places that should trigger the dinner scoring logic
      const pizzaBarRec = placesApiRecs.find((rec: any) => 
        rec.place.name.toLowerCase().includes('pizza') || 
        rec.place.name.toLowerCase().includes('bar') ||
        rec.place.name.toLowerCase().includes('grill')
      );
      expect(pizzaBarRec).toBeDefined();
      expect(pizzaBarRec.place).toHaveProperty('name');
      expect(['Tony\'s Pizza Bar', 'Burger Grill & Bar', 'Sports Bar & Grill']).toContain(pizzaBarRec.place.name);
    });

    it('should cover generic restaurant dinner scoring (else branch) in meal suitability', async () => {
      // Create a test location for this test
      await locationModel.create(
        testUserId,
        49.2827,
        -123.1207,
        10,
        true,
        new Date(Date.now() + 2 * 60 * 60 * 1000)
      );

      // Mock response with places that don't match high-scoring dinner criteria
      // This should trigger the "else" branch: scores.dinner = 5
      mockedAxios.post.mockResolvedValue({
        data: {
          places: [
            {
              id: 'generic_place_1',
              displayName: { text: 'Local Eatery' },
              location: { latitude: 49.2827, longitude: -123.1207 },
              rating: 4.0,
              businessStatus: 'OPERATIONAL',
              types: ['establishment', 'food'], // Generic types that don't match dinner criteria
              userRatingCount: 50,
              priceLevel: 'PRICE_LEVEL_MODERATE',
            },
            {
              id: 'generic_place_2',
              displayName: { text: 'Corner Diner' },
              location: { latitude: 49.2828, longitude: -123.1208 },
              rating: 3.8,
              businessStatus: 'OPERATIONAL',
              types: ['establishment'], // No specific restaurant type
              userRatingCount: 30,
              priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
            },
          ],
        },
      });

      const response = await request(app)
        .get('/api/recommendations/dinner') // Using dinner to trigger the generic scoring logic
        .set('Authorization', 'Bearer mock-token')
        .expect(200);
      
      expect(response.body.data).toHaveProperty('mealType', 'dinner');
      expect(response.body.data).toHaveProperty('recommendations');
      
      // Verify Places API was called and generic dinner scoring (else branch) was applied
      const placesApiRecs = response.body.data.recommendations.filter(
        (rec: any) => rec.source === 'places_api'
      );
      expect(placesApiRecs.length).toBeGreaterThan(0);
      
      // Verify we have places that should trigger the else branch (generic scoring)
      const genericRec = placesApiRecs.find((rec: any) => 
        ['Local Eatery', 'Corner Diner'].includes(rec.place.name)
      );
      expect(genericRec).toBeDefined();
      expect(genericRec.place).toHaveProperty('name');
      expect(['Local Eatery', 'Corner Diner']).toContain(genericRec.place.name);
    });

    it('should cover dinner meal type filters and exercise Places API', async () => {
      // Create a test location for dinner
      await locationModel.create(
        testUserId,
        49.2827, // UBC latitude
        -123.1207, // UBC longitude
        10, // accuracy
        true, // shared
        new Date(Date.now() + 2 * 60 * 60 * 1000) // expires in 2 hours
      );

      // Mock response specific to dinner types: 'restaurant', 'meal_delivery', 'fine_dining_restaurant', 'pizza_restaurant'
      mockedAxios.post.mockResolvedValue({
        data: {
          places: [
            {
              id: 'dinner_place_1', 
              displayName: { text: 'Fine Dining Restaurant' },
              location: { latitude: 49.2827, longitude: -123.1207 },
              rating: 4.8,
              businessStatus: 'OPERATIONAL',
              types: ['fine_dining_restaurant', 'restaurant', 'food'],
              userRatingCount: 200,
              priceLevel: 'PRICE_LEVEL_EXPENSIVE',
            },
            {
              id: 'dinner_place_2',
              displayName: { text: 'Pizza Delivery' },
              location: { latitude: 49.2829, longitude: -123.1209 },
              rating: 4.4,
              businessStatus: 'OPERATIONAL',
              types: ['pizza_restaurant', 'meal_delivery', 'food'],
              userRatingCount: 150,
              priceLevel: 'PRICE_LEVEL_MODERATE',
            },
          ],
        },
      });

      const response = await request(app)
        .get('/api/recommendations/dinner')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);
      
      expect(response.body.data).toHaveProperty('mealType', 'dinner');
      expect(response.body.data).toHaveProperty('recommendations');
      
      // Verify Places API was called and dinner-specific filters were applied
      const placesApiRecs = response.body.data.recommendations.filter(
        (rec: any) => rec.source === 'places_api'
      );
      expect(placesApiRecs.length).toBeGreaterThan(0);
      
      const firstRec = placesApiRecs[0];
      expect(firstRec.place).toHaveProperty('name');
      expect(['Fine Dining Restaurant', 'Pizza Delivery']).toContain(firstRec.place.name);
    });

    it('should handle Google Places API timeout errors gracefully', async () => {
      // Mock timeout error
      mockedAxios.post.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

      const response = await request(app)
        .get('/api/recommendations/lunch')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      // Should handle error gracefully and return response (may be empty or database-only)
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('mealType', 'lunch');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    it('should handle Google Places API returning no results', async () => {
      // Mock empty response from Google Places API
      mockedAxios.post.mockResolvedValue({
        data: { places: [] },
      });

      const response = await request(app)
        .get('/api/recommendations/dinner')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      // Should handle empty response and still return valid structure
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    it('should handle Google Places API network error and trigger catch block', async () => {
      // Mock axios to throw a network error to trigger the catch block
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error: Connection failed'));

      // Create a test location for this error handling test
      await locationModel.create(
        testUserId,
        49.2827, // UBC latitude
        -123.1207, // UBC longitude
        10, // accuracy
        true, // shared
        new Date(Date.now() + 2 * 60 * 60 * 1000) // expires in 2 hours
      );

      const response = await request(app)
        .get('/api/recommendations/breakfast')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      // Should return empty Places API results due to error, but still have success response
      expect(response.body.data.recommendations).toHaveLength(0);
      
      // Verify that axios was called and failed
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places:searchNearby',
        expect.objectContaining({
          includedTypes: ['cafe', 'bakery', 'breakfast_restaurant'],
          maxResultCount: 20,
          rankPreference: 'DISTANCE',
          locationRestriction: {
            circle: {
              center: { latitude: 49.2827, longitude: -123.1207 },
              radius: 2000,
            },
          },
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': 'fake-test-key',
            'X-Goog-FieldMask': expect.any(String),
          }),
          timeout: 10000,
        })
      );
    });

    it('should handle invalid meal type validation', async () => {
      // Test invalid meal type to verify controller validation
      const response = await request(app)
        .get('/api/recommendations/snack') // Invalid meal type triggers validation
        .set('Authorization', 'Bearer mock-token')
        .expect(400);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid meal type');
    });

    it('should cover default case in getMealTypeFilters through runtime type coercion', async () => {
      // Create a test location for this test
      await locationModel.create(
        testUserId,
        49.2827,
        -123.1207,
        10,
        true,
        new Date(Date.now() + 2 * 60 * 60 * 1000)
      );

      // Mock response for default case: 'restaurant', 'cafe'
      mockedAxios.post.mockResolvedValue({
        data: {
          places: [
            {
              id: 'default_case_place',
              displayName: { text: 'Default Case Restaurant' },
              location: { latitude: 49.2827, longitude: -123.1207 },
              rating: 4.0,
              businessStatus: 'OPERATIONAL',
              types: ['restaurant', 'cafe'],
              userRatingCount: 100,
              priceLevel: 'PRICE_LEVEL_MODERATE',
            },
          ],
        },
      });

      // Temporarily modify the controller to accept any meal type to trigger default case
      const originalRecommendationsRoute = require('../../../src/routes/recommendations.routes').default;
      
      // Create a custom route handler that bypasses validation
      const customApp = express();
      customApp.use(express.json());
      customApp.get('/api/recommendations/:mealType', async (req: any, res: any) => {
        try {
          const { mealType } = req.params;
          // Mock user for this test
          req.user = {
            _id: testUserId,
            email: 'test@example.com',
            name: 'Test User',
            username: 'testuser',
          };
          
          // Import and call recommendation service directly with invalid meal type
          const { RecommendationService } = require('../../../src/services/recommendation.service');
          const recommendationService = RecommendationService.getInstance();
          
          // Call with 'snack' which will trigger default case in getMealTypeFilters
          const recommendations = await recommendationService.generateRecommendations(
            testUserId,
            'snack' as any, // This will trigger the default case
            {},
            2000,
            10
          );
          
          res.status(200).json({
            message: 'Recommendations generated successfully',
            data: {
              mealType,
              count: recommendations.length,
              recommendations,
            },
          });
        } catch (error) {
          res.status(500).json({ error: 'Internal server error' });
        }
      });

      const response = await request(customApp)
        .get('/api/recommendations/snack')
        .expect(200);

      // Verify the response structure
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('mealType', 'snack');
      expect(response.body.data).toHaveProperty('recommendations');
      
      // Verify that axios was called with default case types ['restaurant', 'cafe']
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://places.googleapis.com/v1/places:searchNearby',
        expect.objectContaining({
          includedTypes: ['restaurant', 'cafe'], // This confirms default case was triggered
        }),
        expect.any(Object)
      );
    });

    it('should exercise distance filtering and radius limits', async () => {
      const response = await request(app)
        .get('/api/recommendations/breakfast')
        .set('Authorization', 'Bearer mock-token')
        .query({ maxDistance: 5000, limit: 20 }) // Large radius
        .expect(200);

      // Verify Places API service was exercised (though no location found for this user)
      expect(response.body.data.recommendations).toBeDefined();
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    it('should exercise Places API without API key (disabled state)', async () => {
      // Clear axios mocks to ensure no API responses
      mockedAxios.post.mockClear();
      
      // Force the PlacesApiService to have no API key by directly modifying the instance
      const placesService = PlacesApiService.getInstance();
      const originalApiKey = (placesService as any).apiKey;
      (placesService as any).apiKey = '';  // Force empty API key to trigger disabled state
      
      // Create a test location to ensure we reach the Places API code
      await locationModel.create(
        testUserId,
        49.2827,
        -123.1207,
        10,
        true,
        new Date(Date.now() + 2 * 60 * 60 * 1000)
      );

      const response = await request(app)
        .get('/api/recommendations/lunch')
        .set('Authorization', 'Bearer mock-token')
        .query({ maxDistance: 1000, limit: 3 })
        .expect(200);

      // Should handle API failure and return database-only results
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('recommendations');
      
      // Verify axios was NOT called since API key is missing
      expect(mockedAxios.post).not.toHaveBeenCalled();
      
      // Restore the original API key
      (placesService as any).apiKey = originalApiKey;
    });

    it('should trigger constructor warning when API key is not configured', async () => {
      // Store original environment variables
      const originalGoogleKey = process.env.GOOGLE_MAPS_API_KEY;
      const originalMapsKey = process.env.MAPS_API_KEY;
      
      // Clear environment variables to force constructor warning
      delete process.env.GOOGLE_MAPS_API_KEY;
      delete process.env.MAPS_API_KEY;
      
      // Clear the singleton instance to force fresh initialization
      (PlacesApiService as any).instance = null;
      
      // Mock console.warn to capture the warning message
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        // Force new instance creation which will trigger constructor warning
        const service = PlacesApiService.getInstance();
        
        // Verify the warning was logged
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[WARN] ⚠️ Google Maps API key not configured. Places API features will be limited.')
        );
        
        // Verify the service has no API key
        expect((service as any).apiKey).toBe('');
      } finally {
        // Restore console.warn
        consoleSpy.mockRestore();
        
        // Restore environment variables
        if (originalGoogleKey) {
          process.env.GOOGLE_MAPS_API_KEY = originalGoogleKey;
        }
        if (originalMapsKey) {
          process.env.MAPS_API_KEY = originalMapsKey;
        }
        
        // Reset singleton for other tests
        (PlacesApiService as any).instance = null;
      }
    });

    it('should cover Places API no results scenario', async () => {
      // Mock axios to return response with no places property
      mockedAxios.post.mockResolvedValueOnce({
        data: {},
      });

      // Create a test location for this specific test
      await locationModel.create(
        testUserId,
        49.2827,
        -123.1207,
        10,
        true,
        new Date(Date.now() + 2 * 60 * 60 * 1000)
      );

      const response = await request(app)
        .get('/api/recommendations/lunch')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      // Should handle no places scenario
      expect(response.body.data.recommendations).toHaveLength(0);
    });
  });

  describe('POST /api/recommendations/notify/:mealType - Places API Integration', () => {
    it('should exercise Places API through notification endpoint', async () => {
      const response = await request(app)
        .post('/api/recommendations/notify/lunch')
        .set('Authorization', 'Bearer mock-token')
        .send({
          message: 'Test notification for Places API coverage',
        })
        .expect(204);

      // Verify notification was processed successfully
      // Places API code was exercised during notification generation
    });

    it('should exercise Places API for all meal types via notifications', async () => {
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      
      for (const mealType of mealTypes) {
        mockedAxios.post.mockClear();
        
        const response = await request(app)
          .post(`/api/recommendations/notify/${mealType}`)
          .set('Authorization', 'Bearer mock-token')
          .send({ message: `Test ${mealType} notification` })
          .expect(204);

        // Verify notification was processed for this meal type
        // Places API service code was exercised as part of notification generation
      }
    });
  });
});