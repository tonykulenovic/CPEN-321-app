import axios from 'axios';
import logger from '../utils/logger.util';

interface WeatherData {
  condition: 'clear' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
  temperature: number; // Celsius
  humidity: number; // Percentage
  description: string;
  isGoodForOutdoor: boolean;
}

export class WeatherService {
  private static instance: WeatherService;
  private readonly API_KEY = process.env.OPENWEATHER_API_KEY;
  private readonly BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

  private constructor() {}

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  /**
   * Get current weather for a location
   */
  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData | null> {
    try {
      if (!this.API_KEY) {
        logger.warn('OpenWeather API key not configured, using mock weather data');
        return this.getMockWeather();
      }

      const response = await axios.get(this.BASE_URL, {
        params: {
          lat,
          lon: lng,
          appid: this.API_KEY,
          units: 'metric', // Celsius
        },
        timeout: 5000, // 5 second timeout
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = response.data as any; // OpenWeather API response
      const weatherCode = data.weather[0].id as number;
      const temperature = data.main.temp as number;
      const humidity = data.main.humidity as number;
      const description = data.weather[0].description as string;

      return {
        condition: this.mapWeatherCondition(weatherCode),
        temperature,
        humidity,
        description,
        isGoodForOutdoor: this.isGoodForOutdoor(weatherCode, temperature),
      };
    } catch (error) {
      logger.error('Error fetching weather data:', error);
      // Return mock data as fallback
      return this.getMockWeather();
    }
  }

  /**
   * Get weather recommendations for dining
   */
  getWeatherRecommendations(weather: WeatherData): {
    preferOutdoor: boolean;
    suggestions: string[];
  } {
    const { condition, temperature, isGoodForOutdoor } = weather;

    if (isGoodForOutdoor && temperature > 15 && temperature < 30) {
      return {
        preferOutdoor: true,
        suggestions: [
          'Perfect weather for outdoor dining!',
          'Great day to sit on a patio',
          'Enjoy the fresh air while eating',
        ],
      };
    }

    if (condition === 'rainy' || condition === 'stormy' || condition === 'snowy') {
      return {
        preferOutdoor: false,
        suggestions: [
          'Cozy indoor spots recommended',
          'Perfect weather for a warm meal inside',
          'Stay dry and comfortable indoors',
        ],
      };
    }

    if (temperature < 5) {
      return {
        preferOutdoor: false,
        suggestions: [
          'Warm up with hot food indoors',
          'Perfect weather for hot coffee or tea',
          'Cozy indoor atmosphere recommended',
        ],
      };
    }

    if (temperature > 35) {
      return {
        preferOutdoor: false,
        suggestions: [
          'Cool down with air conditioning',
          'Perfect for cold drinks and indoor dining',
          'Escape the heat inside',
        ],
      };
    }

    return {
      preferOutdoor: true,
      suggestions: ['Nice weather for dining out'],
    };
  }

  /**
   * Map OpenWeather condition codes to our simplified conditions
   */
  private mapWeatherCondition(weatherCode: number): WeatherData['condition'] {
    if (weatherCode >= 200 && weatherCode < 300) return 'stormy'; // Thunderstorm
    if (weatherCode >= 300 && weatherCode < 600) return 'rainy'; // Drizzle/Rain
    if (weatherCode >= 600 && weatherCode < 700) return 'snowy'; // Snow
    if (weatherCode >= 701 && weatherCode < 800) return 'cloudy'; // Atmosphere (fog, etc)
    if (weatherCode === 800) return 'clear'; // Clear sky
    if (weatherCode > 800) return 'cloudy'; // Clouds
    return 'clear'; // Default
  }

  /**
   * Determine if weather is good for outdoor activities
   */
  private isGoodForOutdoor(weatherCode: number, temperature: number): boolean {
    // Bad weather conditions
    if (weatherCode >= 200 && weatherCode < 700) return false; // Storms, rain, snow, fog
    
    // Temperature extremes
    if (temperature < 0 || temperature > 40) return false;
    
    return true;
  }

  /**
   * Return mock weather data when API is not available
   */
  private getMockWeather(): WeatherData {
    // Generate somewhat realistic mock data
    const conditions: WeatherData['condition'][] = ['clear', 'cloudy', 'rainy'];
    // eslint-disable-next-line security/detect-insecure-randomness
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    // eslint-disable-next-line security/detect-insecure-randomness
    const temperature = Math.floor(Math.random() * 30) + 5; // 5-35°C
    
    return {
      condition: randomCondition,
      temperature,
      // eslint-disable-next-line security/detect-insecure-randomness
      humidity: Math.floor(Math.random() * 50) + 30, // 30-80%
      description: `Mock ${randomCondition} weather`,
      isGoodForOutdoor: randomCondition === 'clear' && temperature > 10 && temperature < 30,
    };
  }
}

export const weatherService = WeatherService.getInstance();