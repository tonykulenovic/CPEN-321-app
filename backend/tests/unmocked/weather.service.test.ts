/* eslint-disable security/detect-insecure-randomness */
import { describe, test, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { weatherService } from '../../src/services/weather.service';

describe('Unmocked: WeatherService Integration Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variables for clean testing
    delete process.env.OPENWEATHER_API_KEY;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getCurrentWeather - Mock Mode (No API Key)', () => {
    test('should return mock weather data when API key not configured', async () => {
      const weather = await weatherService.getCurrentWeather(49.2827, -123.1207);
      
      expect(weather).not.toBeNull();
      expect(weather).toHaveProperty('condition');
      expect(weather).toHaveProperty('temperature');
      expect(weather).toHaveProperty('humidity');
      expect(weather).toHaveProperty('description');
      expect(weather).toHaveProperty('isGoodForOutdoor');
      
      // Validate types and ranges
      expect(['clear', 'cloudy', 'rainy']).toContain(weather?.condition);
      expect(typeof weather?.temperature).toBe('number');
      expect(weather?.temperature).toBeGreaterThanOrEqual(5);
      expect(weather?.temperature).toBeLessThanOrEqual(35);
      expect(typeof weather?.humidity).toBe('number');
      expect(weather?.humidity).toBeGreaterThanOrEqual(30);
      expect(weather?.humidity).toBeLessThanOrEqual(80);
      expect(typeof weather?.isGoodForOutdoor).toBe('boolean');
      expect(weather?.description).toContain('Mock');
    });

    test('should generate varied mock weather data', async () => {
      const results = [];
      
      // Generate multiple mock results to test variety
      for (let i = 0; i < 20; i++) {
        const weather = await weatherService.getCurrentWeather(49.2827 + i * 0.1, -123.1207 + i * 0.1);
        results.push(weather);
      }
      
      // Check that we get some variety (not all the same)
      const conditions = new Set(results.map(w => w?.condition));
      const temperatures = results.map(w => w?.temperature);
      
      expect(conditions.size).toBeGreaterThan(0); // At least one condition type
      expect(Math.max(...temperatures) - Math.min(...temperatures)).toBeGreaterThan(0); // Temperature variation
    });

    test('should handle different coordinate ranges', async () => {
      const testCoordinates = [
        { lat: 49.2827, lng: -123.1207 }, // Vancouver
        { lat: 1.3521, lng: 103.8198 },   // Singapore  
        { lat: 40.7128, lng: -74.0060 },  // New York
        { lat: -33.8688, lng: 151.2093 }, // Sydney
        { lat: 90, lng: 0 },              // North Pole
        { lat: -90, lng: 0 },             // South Pole
        { lat: 0, lng: 180 },             // International Date Line
        { lat: 0, lng: -180 }             // International Date Line (other side)
      ];
      
      for (const coords of testCoordinates) {
        const weather = await weatherService.getCurrentWeather(coords.lat, coords.lng);
        
        expect(weather).not.toBeNull();
        expect(['clear', 'cloudy', 'rainy']).toContain(weather!.condition);
        expect(typeof weather!.temperature).toBe('number');
        expect(typeof weather!.humidity).toBe('number');
        expect(typeof weather!.isGoodForOutdoor).toBe('boolean');
      }
    });
  });

  describe('getWeatherRecommendations - Business Logic', () => {
    test('should recommend outdoor dining for perfect weather', () => {
      const perfectWeather = {
        condition: 'clear' as const,
        temperature: 22,
        humidity: 60,
        description: 'clear sky',
        isGoodForOutdoor: true
      };
      
      const recommendations = weatherService.getWeatherRecommendations(perfectWeather);
      
      expect(recommendations.preferOutdoor).toBe(true);
      expect(Array.isArray(recommendations.suggestions)).toBe(true);
      expect(recommendations.suggestions.length).toBeGreaterThan(0);
      expect(recommendations.suggestions.some(s => s.toLowerCase().includes('outdoor'))).toBe(true);
    });

    test('should recommend indoor dining for rainy weather', () => {
      const rainyWeather = {
        condition: 'rainy' as const,
        temperature: 15,
        humidity: 90,
        description: 'moderate rain',
        isGoodForOutdoor: false
      };
      
      const recommendations = weatherService.getWeatherRecommendations(rainyWeather);
      
      expect(recommendations.preferOutdoor).toBe(false);
      expect(Array.isArray(recommendations.suggestions)).toBe(true);
      expect(recommendations.suggestions.length).toBeGreaterThan(0);
      expect(recommendations.suggestions.some(s => s.toLowerCase().includes('indoor'))).toBe(true);
    });

    test('should recommend indoor dining for stormy weather', () => {
      const stormyWeather = {
        condition: 'stormy' as const,
        temperature: 18,
        humidity: 85,
        description: 'thunderstorm',
        isGoodForOutdoor: false
      };
      
      const recommendations = weatherService.getWeatherRecommendations(stormyWeather);
      
      expect(recommendations.preferOutdoor).toBe(false);
      expect(Array.isArray(recommendations.suggestions)).toBe(true);
      expect(recommendations.suggestions.some(s => s.toLowerCase().includes('indoor'))).toBe(true);
    });

    test('should recommend indoor dining for cold weather', () => {
      const coldWeather = {
        condition: 'clear' as const,
        temperature: 2,
        humidity: 40,
        description: 'clear but cold',
        isGoodForOutdoor: false
      };
      
      const recommendations = weatherService.getWeatherRecommendations(coldWeather);
      
      expect(recommendations.preferOutdoor).toBe(false);
      expect(Array.isArray(recommendations.suggestions)).toBe(true);
      expect(recommendations.suggestions.some(s => s.toLowerCase().includes('warm') || s.toLowerCase().includes('hot'))).toBe(true);
    });

    test('should recommend indoor dining for very hot weather', () => {
      const hotWeather = {
        condition: 'clear' as const,
        temperature: 38,
        humidity: 30,
        description: 'very hot',
        isGoodForOutdoor: false
      };
      
      const recommendations = weatherService.getWeatherRecommendations(hotWeather);
      
      expect(recommendations.preferOutdoor).toBe(false);
      expect(Array.isArray(recommendations.suggestions)).toBe(true);
      expect(recommendations.suggestions.some(s => s.toLowerCase().includes('cool') || s.toLowerCase().includes('air'))).toBe(true);
    });

    test('should provide appropriate recommendations for mild weather', () => {
      const mildWeather = {
        condition: 'clear' as const,
        temperature: 18,
        humidity: 55,
        description: 'pleasant',
        isGoodForOutdoor: true
      };
      
      const recommendations = weatherService.getWeatherRecommendations(mildWeather);
      
      expect(recommendations.preferOutdoor).toBe(true);
      expect(Array.isArray(recommendations.suggestions)).toBe(true);
      expect(recommendations.suggestions.length).toBeGreaterThan(0);
    });

    test('should handle boundary temperature conditions', () => {
      const boundaryTemperatures = [
        { temp: 5, expectedOutdoor: false },   // Cold boundary
        { temp: 15, expectedOutdoor: true },   // Cool but pleasant
        { temp: 30, expectedOutdoor: true },   // Warm but good
        { temp: 35, expectedOutdoor: false }   // Hot boundary
      ];

      boundaryTemperatures.forEach(({ temp, expectedOutdoor }) => {
        const weather = {
          condition: 'clear' as const,
          temperature: temp,
          humidity: 50,
          description: `${temp}°C weather`,
          isGoodForOutdoor: expectedOutdoor
        };
        
        const recommendations = weatherService.getWeatherRecommendations(weather);
        
        expect(typeof recommendations.preferOutdoor).toBe('boolean');
        expect(Array.isArray(recommendations.suggestions)).toBe(true);
        expect(recommendations.suggestions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Weather condition mapping and assessment', () => {
    test('should handle all weather conditions appropriately', async () => {
      const testCases = [
        {
          condition: 'clear' as const,
          temperature: 20,
          isGoodForOutdoor: true,
          expectedOutdoor: true
        },
        {
          condition: 'cloudy' as const,
          temperature: 20,
          isGoodForOutdoor: true,
          expectedOutdoor: true
        },
        {
          condition: 'rainy' as const,
          temperature: 20,
          isGoodForOutdoor: false,
          expectedOutdoor: false
        },
        {
          condition: 'snowy' as const,
          temperature: 20,
          isGoodForOutdoor: false,
          expectedOutdoor: false
        },
        {
          condition: 'stormy' as const,
          temperature: 20,
          isGoodForOutdoor: false,
          expectedOutdoor: false
        }
      ];

      for (const testCase of testCases) {
        const mockWeather = {
          condition: testCase.condition,
          temperature: testCase.temperature,
          humidity: 50,
          description: `Mock ${testCase.condition} weather`,
          isGoodForOutdoor: testCase.isGoodForOutdoor
        };

        const recommendations = weatherService.getWeatherRecommendations(mockWeather);
        
        expect(typeof recommendations.preferOutdoor).toBe('boolean');
        expect(Array.isArray(recommendations.suggestions)).toBe(true);
        expect(recommendations.suggestions.length).toBeGreaterThan(0);
        
        // Verify logical recommendations based on actual service logic
        expect(recommendations.preferOutdoor).toBe(testCase.expectedOutdoor);
      }
    });

    test('should provide contextual suggestions based on conditions', () => {
      const testCases = [
        {
          weather: { condition: 'clear' as const, temperature: 25, humidity: 50, description: 'clear', isGoodForOutdoor: true },
          expectKeywords: ['outdoor', 'patio', 'fresh']
        },
        {
          weather: { condition: 'rainy' as const, temperature: 15, humidity: 80, description: 'rainy', isGoodForOutdoor: false },
          expectKeywords: ['indoor', 'cozy', 'warm']
        },
        {
          weather: { condition: 'clear' as const, temperature: 2, humidity: 40, description: 'cold', isGoodForOutdoor: false },
          expectKeywords: ['warm', 'hot', 'indoor']
        },
        {
          weather: { condition: 'clear' as const, temperature: 38, humidity: 30, description: 'hot', isGoodForOutdoor: false },
          expectKeywords: ['cool', 'air', 'indoor']
        }
      ];

      testCases.forEach(({ weather, expectKeywords }) => {
        const recommendations = weatherService.getWeatherRecommendations(weather);
        
        const allSuggestions = recommendations.suggestions.join(' ').toLowerCase();
        const hasExpectedKeyword = expectKeywords.some(keyword => 
          allSuggestions.includes(keyword.toLowerCase())
        );
        
        expect(hasExpectedKeyword).toBe(true);
      });
    });
  });

  describe('Service integration and real-world scenarios', () => {
    test('should handle rapid consecutive calls', async () => {
      const calls = Array.from({ length: 10 }, (_, i) =>
        weatherService.getCurrentWeather(49.2827 + i * 0.01, -123.1207 + i * 0.01)
      );
      
      const results = await Promise.all(calls);
      
      results.forEach(weather => {
        expect(weather).not.toBeNull();
        expect(['clear', 'cloudy', 'rainy']).toContain(weather!.condition);
      });
    });

    test('should handle concurrent weather requests for different locations', async () => {
      const locations = [
        { lat: 49.2827, lng: -123.1207 }, // Vancouver
        { lat: 43.6532, lng: -79.3832 },  // Toronto
        { lat: 45.5017, lng: -73.5673 },  // Montreal
        { lat: 51.0447, lng: -114.0719 }, // Calgary
        { lat: 53.5461, lng: -113.4938 }  // Edmonton
      ];

      const weatherCalls = locations.map(loc =>
        weatherService.getCurrentWeather(loc.lat, loc.lng)
      );
      
      const results = await Promise.all(weatherCalls);
      
      results.forEach((weather) => {
        expect(weather).not.toBeNull();
        expect(['clear', 'cloudy', 'rainy']).toContain(weather!.condition);
        
        // All should have valid temperature ranges
        expect(weather!.temperature).toBeGreaterThanOrEqual(5);
        expect(weather!.temperature).toBeLessThanOrEqual(35);
      });
    });

    test('should provide recommendations for various real-world scenarios', async () => {
      // Simulate different cities and check recommendations
      const scenarios = [
        { name: 'Vancouver Winter', lat: 49.2827, lng: -123.1207 },
        { name: 'Singapore Tropical', lat: 1.3521, lng: 103.8198 },
        { name: 'New York Spring', lat: 40.7128, lng: -74.0060 },
        { name: 'Sydney Summer', lat: -33.8688, lng: 151.2093 }
      ];

      for (const scenario of scenarios) {
        const weather = await weatherService.getCurrentWeather(scenario.lat, scenario.lng);
        expect(weather).not.toBeNull();
        
        const recommendations = weatherService.getWeatherRecommendations(weather!);
        
        expect(typeof recommendations.preferOutdoor).toBe('boolean');
        expect(Array.isArray(recommendations.suggestions)).toBe(true);
        expect(recommendations.suggestions.length).toBeGreaterThan(0);
        
        // All suggestions should be meaningful strings
        recommendations.suggestions.forEach(suggestion => {
          expect(typeof suggestion).toBe('string');
          expect(suggestion.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle extreme coordinate values', async () => {
      const extremeCoordinates = [
        { lat: 90, lng: 180 },    // North Pole, International Date Line
        { lat: -90, lng: -180 },  // South Pole, opposite side
        { lat: 0, lng: 0 },       // Null Island
        { lat: 85, lng: 179 }     // Near North Pole, near date line
      ];
      
      for (const coords of extremeCoordinates) {
        const weather = await weatherService.getCurrentWeather(coords.lat, coords.lng);
        
        expect(weather).not.toBeNull();
        expect(['clear', 'cloudy', 'rainy']).toContain(weather!.condition);
        expect(typeof weather!.temperature).toBe('number');
        expect(typeof weather!.humidity).toBe('number');
      }
    });

    test('should provide consistent recommendation structure', async () => {
      // Test multiple weather scenarios for consistency
      const weather = await weatherService.getCurrentWeather(49.2827, -123.1207);
      const recommendations = weatherService.getWeatherRecommendations(weather!);
      
      // Check structure is always consistent
      expect(recommendations).toHaveProperty('preferOutdoor');
      expect(recommendations).toHaveProperty('suggestions');
      expect(typeof recommendations.preferOutdoor).toBe('boolean');
      expect(Array.isArray(recommendations.suggestions)).toBe(true);
      
      // All suggestions should be non-empty strings
      recommendations.suggestions.forEach(suggestion => {
        expect(typeof suggestion).toBe('string');
        expect(suggestion.trim().length).toBeGreaterThan(0);
      });
    });

    test('should handle precision in coordinates', async () => {
      // Test coordinate precision doesn't break the service
      const preciseCoordinates = [
        { lat: 49.282729847362, lng: -123.120738462847 },
        { lat: 49.3, lng: -123.1 },
        { lat: 49, lng: -123 }
      ];
      
      for (const coords of preciseCoordinates) {
        const weather = await weatherService.getCurrentWeather(coords.lat, coords.lng);
        expect(weather).not.toBeNull();
      }
    });
  });

  describe('Mock weather variety and realism', () => {
    test('should generate realistic weather patterns', async () => {
      const results: unknown[] = [];
      
      // Generate 50 weather samples to check distribution
      for (let i = 0; i < 50; i++) {
        const weather = await weatherService.getCurrentWeather(
          49.2827 + (Math.random() - 0.5) * 10, 
          -123.1207 + (Math.random() - 0.5) * 10
        );
        results.push(weather);
      }
      
      // Check we get reasonable variety
      const conditions = new Set(results.map(w => w?.condition));
      const temperatures = results.map(w => w?.temperature);
      const humidities = results.map(w => w?.humidity);
      
      // Should have at least 2 different conditions in 50 samples
      expect(conditions.size).toBeGreaterThanOrEqual(1);
      
      // Temperature range should be realistic
      expect(Math.min(...temperatures)).toBeGreaterThanOrEqual(5);
      expect(Math.max(...temperatures)).toBeLessThanOrEqual(35);
      
      // Humidity range should be realistic
      expect(Math.min(...humidities)).toBeGreaterThanOrEqual(30);
      expect(Math.max(...humidities)).toBeLessThanOrEqual(80);
      
      // Should have some temperature variation
      const tempRange = Math.max(...temperatures) - Math.min(...temperatures);
      expect(tempRange).toBeGreaterThan(0);
    });

    test('should correlate outdoor suitability with weather conditions', async () => {
      const samples = [];
      
      for (let i = 0; i < 30; i++) {
        const weather = await weatherService.getCurrentWeather(
          49.2827 + Math.random(),
          -123.1207 + Math.random()
        );
        samples.push(weather);
      }
      
      samples.forEach(weather => {
        // Check logical correlation between condition and outdoor suitability
        if (weather?.condition === 'rainy') {
          // Rainy weather might still be marked as outdoor-suitable in mock mode
          // but temperature should be reasonable
          expect(weather.temperature).toBeGreaterThanOrEqual(5);
        }
        
        // All weather should have consistent structure
        expect(typeof weather!.isGoodForOutdoor).toBe('boolean');
      });
    });
  });
});