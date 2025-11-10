import axios from 'axios';
import { describe, test, beforeEach, expect, jest } from '@jest/globals';

// Mock axios first before importing the service
jest.mock('axios');
const mockedAxios = jest.mocked(axios);

// Import after mocking
import { PlacesApiService } from '../../src/services/places.service';

describe('PlacesApiService Coverage Tests', () => {
  let service: PlacesApiService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (PlacesApiService as any).instance = undefined;
    // Set the correct API key
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  test('should return empty array when no API key is configured', async () => {
    // Ensure no API key
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.MAPS_API_KEY;
    
    service = PlacesApiService.getInstance();
    
    const result = await service.getNearbyDiningOptions(
      49.2827, -123.1207, 1000, 'lunch'
    );
    
    expect(result).toEqual([]);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test('should handle axios errors gracefully', async () => {
    // Set API key
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    service = PlacesApiService.getInstance();
    
    // Mock axios to throw error
    mockedAxios.post.mockRejectedValue(new Error('Network error'));
    
    const result = await service.getNearbyDiningOptions(
      49.2827, -123.1207, 1000, 'lunch'
    );
    
    expect(result).toEqual([]);
  });

  test('should handle empty response data', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    service = PlacesApiService.getInstance();
    
    // Mock empty response
    mockedAxios.post.mockResolvedValue({
      data: {}
    });
    
    const result = await service.getNearbyDiningOptions(
      49.2827, -123.1207, 1000, 'lunch'
    );
    
    expect(result).toEqual([]);
  });

  test('should handle null places in response', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    service = PlacesApiService.getInstance();
    
    mockedAxios.post.mockResolvedValue({
      data: { places: null }
    });
    
    const result = await service.getNearbyDiningOptions(
      49.2827, -123.1207, 1000, 'lunch'
    );
    
    expect(result).toEqual([]);
  });

  test('should process places and filter by required fields', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    service = PlacesApiService.getInstance();
    
    const mockResponse = {
      data: {
        places: [
          // Invalid - no displayName
          {
            formattedAddress: 'Address 1',
            location: { latitude: 49.2828, longitude: -123.1208 }
          },
          // Invalid - no location
          {
            displayName: { text: 'Place 2' },
            formattedAddress: 'Address 2'
          },
          // Valid place
          {
            displayName: { text: 'Valid Restaurant' },
            formattedAddress: '123 Valid St',
            location: { latitude: 49.2828, longitude: -123.1208 },
            rating: 4.5,
            priceLevel: 'PRICE_LEVEL_MODERATE',
            currentOpeningHours: { openNow: true },
            types: ['restaurant'],
            editorialSummary: { text: 'Great food' }
          }
        ]
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockResponse);
    
    const result = await service.getNearbyDiningOptions(
      49.2827, -123.1207, 10000, 'lunch'
    );
    
    // Should only include the valid place
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid Restaurant');
    expect(result[0].address).toBe('123 Valid St');
    expect(result[0].rating).toBe(4.5);
    expect(result[0].isOpen).toBe(true);
    expect(result[0].description).toBe('Great food');
  });

  test('should filter out places beyond radius', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    service = PlacesApiService.getInstance();
    
    const mockResponse = {
      data: {
        places: [
          {
            displayName: { text: 'Far Place' },
            formattedAddress: 'Far Address',
            location: { latitude: 50.0000, longitude: -124.0000 } // Very far
          },
          {
            displayName: { text: 'Near Place' },
            formattedAddress: 'Near Address', 
            location: { latitude: 49.2828, longitude: -123.1208 } // Close
          }
        ]
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockResponse);
    
    const result = await service.getNearbyDiningOptions(
      49.2827, -123.1207, 500, 'lunch' // Small radius
    );
    
    // Should only include the near place
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Near Place');
  });

  test('should use meal type filters correctly', async () => {
    service = PlacesApiService.getInstance();
    
    mockedAxios.post.mockResolvedValue({ data: { places: [] } });
    
    // Test breakfast filters
    await service.getNearbyDiningOptions(49.2827, -123.1207, 1000, 'breakfast');
    expect(mockedAxios.post).toHaveBeenNthCalledWith(1,
      expect.any(String),
      expect.objectContaining({
        includedTypes: ['cafe', 'bakery', 'breakfast_restaurant']
      }),
      expect.any(Object)
    );
    
    // Test dinner filters
    await service.getNearbyDiningOptions(49.2827, -123.1207, 1000, 'dinner');
    expect(mockedAxios.post).toHaveBeenNthCalledWith(2,
      expect.any(String),
      expect.objectContaining({
        includedTypes: ['restaurant', 'meal_delivery', 'fine_dining_restaurant', 'pizza_restaurant']
      }),
      expect.any(Object)
    );
  });

  test('should use default parameters', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    service = PlacesApiService.getInstance();
    
    mockedAxios.post.mockResolvedValue({ data: { places: [] } });
    
    // Call without radius and meal type
    await service.getNearbyDiningOptions(49.2827, -123.1207);
    
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        locationRestriction: expect.objectContaining({
          circle: expect.objectContaining({
            radius: 1500 // Default radius
          })
        })
      }),
      expect.any(Object)
    );
  });

  test('should handle price level mapping', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
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
          },
          {
            displayName: { text: 'No Price Place' },
            formattedAddress: 'Address',
            location: { latitude: 49.2828, longitude: -123.1208 }
          }
        ]
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockResponse);
    
    const result = await service.getNearbyDiningOptions(
      49.2827, -123.1207, 10000, 'lunch'
    );
    
    expect(result[0].priceLevel).toBe(1); // FREE -> 1
    expect(result[1].priceLevel).toBe(4); // VERY_EXPENSIVE -> 4
    expect(result[2].priceLevel).toBe(2); // Default -> 2
  });

  test('should calculate meal suitability scores', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    service = PlacesApiService.getInstance();
    
    const mockResponse = {
      data: {
        places: [
          {
            displayName: { text: 'Test Cafe' },
            formattedAddress: 'Address',
            location: { latitude: 49.2828, longitude: -123.1208 },
            types: ['cafe', 'bakery']
          }
        ]
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockResponse);
    
    const result = await service.getNearbyDiningOptions(
      49.2827, -123.1207, 10000, 'breakfast'
    );
    
    expect(result[0].mealSuitability).toHaveProperty('breakfast');
    expect(result[0].mealSuitability).toHaveProperty('lunch');
    expect(result[0].mealSuitability).toHaveProperty('dinner');
    // Cafe should be good for breakfast
    expect(result[0].mealSuitability.breakfast).toBeGreaterThan(5);
  });
});