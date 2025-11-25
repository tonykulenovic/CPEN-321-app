import axios from 'axios';
/* eslint-disable security/detect-non-literal-regexp */
import logger from '../utils/logger.util';

interface PlaceLocation {
  latitude: number;
  longitude: number;
}

interface PlaceResult {
  displayName?: { text: string };
  formattedAddress?: string;
  location?: PlaceLocation;
  rating?: number;
  priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE';
  currentOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  types?: string[];
  businessStatus?: string;
  editorialSummary?: { text: string };
}

interface PlacesResponse {
  places?: PlaceResult[];
}

export interface RecommendationPlace {
  id: string;
  name: string;
  address: string;
  location: { latitude: number; longitude: number };
  rating: number;
  priceLevel: number; // 1-4 scale
  isOpen: boolean;
  types: string[];
  distance: number; // meters
  description?: string;
  mealSuitability: {
    breakfast: number; // 0-10 score
    lunch: number;
    dinner: number;
  };
}

export class PlacesApiService {
  private static instance: PlacesApiService | undefined;
  private readonly apiKey: string;

  private constructor() {
    this.apiKey = (process.env.GOOGLE_MAPS_API_KEY ?? process.env.MAPS_API_KEY) ?? '';
    if (!this.apiKey) {
      logger.warn('⚠️ Google Maps API key not configured. Places API features will be limited.');
    }
  }

  public static getInstance(): PlacesApiService {
    if (!PlacesApiService.instance) {
      PlacesApiService.instance = new PlacesApiService();
    }
    return PlacesApiService.instance;
  }

  /**
   * Get nearby restaurants/cafes for recommendations
   */
  async getNearbyDiningOptions(
    lat: number,
    lng: number,
    radius = 1500, // 1.5km default
    mealType: 'breakfast' | 'lunch' | 'dinner' = 'lunch'
  ): Promise<RecommendationPlace[]> {
    if (!this.apiKey) {
      logger.warn('Places API disabled - no API key available');
      return [];
    }

    try {
      const includedTypes = this.getMealTypeFilters(mealType);
      
      logger.info(`🔍 [PLACES] Searching for ${mealType} options near (${lat}, ${lng}) within ${radius}m`);
      
      const url = 'https://places.googleapis.com/v1/places:searchNearby';
      const response = await axios.post<PlacesResponse>(
        url,
        {
          includedTypes,
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius,
            },
          },
          rankPreference: 'DISTANCE', // Prioritize closer places
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.currentOpeningHours,places.types,places.businessStatus,places.editorialSummary',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (!response.data.places) {
        logger.info('📍 [PLACES] No places found from API');
        return [];
      }

      const places = response.data.places
        .filter(place => place.location && place.displayName?.text)
        .map(place => this.transformToRecommendationPlace(place, lat, lng, mealType))
        .filter(place => place.distance <= radius); // Ensure within radius

      logger.info(`✅ [PLACES] Found ${places.length} dining options for ${mealType}`);
      return places;
    } catch (error) {
      logger.error('❌ [PLACES] Error fetching nearby places:', error);
      return [];
    }
  }

  /**
   * Get place types to search based on meal type
   */
  private getMealTypeFilters(mealType: 'breakfast' | 'lunch' | 'dinner'): string[] {
    switch (mealType) {
      case 'breakfast':
        return ['cafe', 'bakery', 'breakfast_restaurant'];
      case 'lunch':
        return ['restaurant', 'meal_takeaway', 'sandwich_shop', 'pizza_restaurant'];
      case 'dinner':
        return ['restaurant', 'meal_delivery', 'fine_dining_restaurant', 'pizza_restaurant'];
      default:
        return ['restaurant', 'cafe'];
    }
  }

  /**
   * Transform Places API result to our recommendation format
   */
  private transformToRecommendationPlace(
    place: PlaceResult,
    userLat: number,
    userLng: number,
    mealType: 'breakfast' | 'lunch' | 'dinner'
  ): RecommendationPlace {
    const distance = this.calculateDistance(
      userLat,
      userLng,
      place.location?.latitude ?? 0,
      place.location?.longitude ?? 0
    );

    const types = place.types ?? [];
    const name = place.displayName?.text ?? 'Unknown Place';
    const description = (place.editorialSummary?.text ?? place.formattedAddress) ?? '';

    return {
      id: `places_${name.replace(/\s+/g, '_').toLowerCase()}`,
      name,
      address: place.formattedAddress ?? '',
      location: place.location ?? { latitude: 0, longitude: 0 },
      rating: place.rating ?? 0,
      priceLevel: this.mapPriceLevel(place.priceLevel),
      isOpen: place.currentOpeningHours?.openNow ?? true,
      types,
      distance: Math.round(distance),
      description,
      mealSuitability: this.calculateMealSuitability(name, description, types, mealType),
    };
  }

  /**
   * Calculate meal suitability scores based on place data
   */
  private calculateMealSuitability(
    name: string,
    description: string,
    types: string[],
    currentMealType: 'breakfast' | 'lunch' | 'dinner'
  ): { breakfast: number; lunch: number; dinner: number } {
    const text = `${name} ${description}`.toLowerCase();
    const typeStr = types.join(' ').toLowerCase();

    const scores = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
    };

    // Breakfast scoring
    if (/\b(cafe|coffee|bakery|breakfast|brunch|pastry|espresso|latte)\b/.test(text) ||
        /\b(cafe|bakery|breakfast_restaurant)\b/.test(typeStr)) {
      scores.breakfast = 8;
    } else if (/\b(sandwich|bagel|muffin|croissant)\b/.test(text)) {
      scores.breakfast = 6;
    } else if (/\b(restaurant)\b/.test(typeStr)) {
      scores.breakfast = 3; // Some restaurants serve breakfast
    }

    // Lunch scoring
    if (/\b(lunch|sandwich|salad|soup|deli|bistro|pizza|burger|noodle|pho|ramen)\b/.test(text) ||
        /\b(meal_takeaway|sandwich_shop|pizza_restaurant)\b/.test(typeStr)) {
      scores.lunch = 8;
    } else if (/\b(restaurant|cafe)\b/.test(typeStr)) {
      scores.lunch = 7; // Most restaurants serve lunch
    } else if (/\b(bakery)\b/.test(typeStr)) {
      scores.lunch = 4; // Some bakeries have lunch options
    }

    // Dinner scoring
    if (/\b(dinner|fine.dining|steakhouse|sushi|italian|french|indian|thai|chinese)\b/.test(text) ||
        /\b(restaurant|fine_dining_restaurant|meal_delivery)\b/.test(typeStr)) {
      scores.dinner = 8;
    } else if (/\b(pizza|burger|bar|grill)\b/.test(text) ||
             /\b(pizza_restaurant|meal_takeaway)\b/.test(typeStr)) {
      scores.dinner = 7;
    } else if (/\b(cafe)\b/.test(typeStr)) {
      scores.dinner = 2; // Most cafes don't serve dinner
    }

    // Boost score for current meal type
    scores[currentMealType] = Math.min(10, scores[currentMealType] + 2);

    return scores;
  }

  /**
   * Map Google Places price level to 1-4 scale
   */
  private mapPriceLevel(priceLevel?: string): number {
    if (!priceLevel) return 2; // Default moderate pricing
    
    switch (priceLevel) {
      case 'PRICE_LEVEL_FREE':
      case 'PRICE_LEVEL_INEXPENSIVE':
        return 1;
      case 'PRICE_LEVEL_MODERATE':
        return 2;
      case 'PRICE_LEVEL_EXPENSIVE':
        return 3;
      case 'PRICE_LEVEL_VERY_EXPENSIVE':
        return 4;
      default:
        return 2;
    }
  }

  /**
   * Calculate distance between two points in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Convert to meters
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const placesApiService = PlacesApiService.getInstance();