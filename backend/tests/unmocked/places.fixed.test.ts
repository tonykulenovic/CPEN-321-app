import axios from 'axios';
import { describe, test, beforeEach, expect, jest, afterEach } from '@jest/globals';

// Mock axios first before importing the service
jest.mock('axios');
const mockedAxios = jest.mocked(axios);

// Import after mocking
import { PlacesApiService } from '../../src/services/places.service';

describe('Fixed PlacesApiService Tests', () => {
  let service: PlacesApiService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton properly
    (PlacesApiService as any).instance = undefined;
    
    // Set the correct API key environment variable
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
    delete process.env.MAPS_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.MAPS_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
  });

  test('should handle no API key scenario', async () => {
    // Remove API key
    delete process.env.GOOGLE_MAPS_API_KEY;
    service = PlacesApiService.getInstance();
    
    const result = await service.getNearbyDiningOptions(49.2827, -123.1207, 1000, 'lunch');
    
    expect(result).toEqual([]);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test('should make API call with correct parameters', async () => {
    service = PlacesApiService.getInstance();
    
    mockedAxios.post.mockResolvedValue({
      data: { places: [] }
    });
    
    await service.getNearbyDiningOptions(49.2827, -123.1207, 1000, 'breakfast');
    
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://places.googleapis.com/v1/places:searchNearby',
      expect.objectContaining({
        includedTypes: ['cafe', 'bakery', 'breakfast_restaurant'], // Correct filters
        locationRestriction: {
          circle: {
            center: { latitude: 49.2827, longitude: -123.1207 },
            radius: 1000
          }
        },
        maxResultCount: 20,
        rankPreference: 'DISTANCE'
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Goog-Api-Key': 'test-api-key'
        })
      })
    );
  });

  test('should process places correctly', async () => {
    service = PlacesApiService.getInstance();
    
    const mockResponse = {
      data: {
        places: [{
          displayName: { text: 'Test Restaurant' },
          formattedAddress: '123 Test St',
          location: { latitude: 49.2828, longitude: -123.1208 },
          rating: 4.5,
          priceLevel: 'PRICE_LEVEL_MODERATE',
          currentOpeningHours: { openNow: true },
          types: ['restaurant']
        }]
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockResponse);
    
    const result = await service.getNearbyDiningOptions(49.2827, -123.1207, 10000, 'lunch');
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Restaurant');
    expect(result[0].priceLevel).toBe(2); // MODERATE = 2, not 3
  });

  test('should handle price levels correctly', async () => {
    service = PlacesApiService.getInstance();
    
    const mockResponse = {
      data: {
        places: [
          {
            displayName: { text: 'Free Place' },
            formattedAddress: 'Address',
            location: { latitude: 49.2828, longitude: -123.1208 },
            priceLevel: 'PRICE_LEVEL_FREE'
          },
          {
            displayName: { text: 'Expensive Place' },
            formattedAddress: 'Address',
            location: { latitude: 49.2828, longitude: -123.1208 },
            priceLevel: 'PRICE_LEVEL_VERY_EXPENSIVE'
          }
        ]
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockResponse);
    
    const result = await service.getNearbyDiningOptions(49.2827, -123.1207, 10000, 'lunch');
    
    expect(result[0].priceLevel).toBe(1); // FREE = 1
    expect(result[1].priceLevel).toBe(4); // VERY_EXPENSIVE = 4, not 5
  });
});