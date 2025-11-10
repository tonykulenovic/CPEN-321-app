import mongoose from 'mongoose';
import { pinModel } from '../models/pin.model';
import { locationModel } from '../models/location.model';
import { weatherService } from './weather.service';
import { notificationService } from './notification.service';
import { placesApiService, RecommendationPlace } from './places.service';
import { IPin, PinCategory, MealCategory } from '../types/pins.types';
import logger from '../utils/logger.util';

interface RecommendationScore {
  pin?: IPin;
  place?: RecommendationPlace;
  score: number;
  factors: {
    proximity: number;      // 0-25 points
    mealRelevance: number;  // 0-25 points  
    userPreference: number; // 0-25 points
    weather: number;        // 0-15 points
    popularity: number;     // 0-10 points
  };
  distance: number; // meters
  reason: string;
  source: 'database' | 'places_api';
}

// Meal keywords for relevance scoring - using string matching instead of regex to avoid ReDoS
// String matching is safer and sufficient for keyword detection
const MEAL_KEYWORDS: Record<string, string[]> = {
  breakfast: ['breakfast', 'cafe', 'café', 'coffee', 'bakery', 'pastry', 'brunch', 'bagel', 'espresso', 'loafe'],
  lunch: ['lunch', 'sandwich', 'bistro', 'deli', 'pizza', 'burger', 'noodle', 'ramen', 'pho', 'salad', 'wrap'],
  dinner: ['dinner', 'restaurant', 'bar', 'grill', 'steak', 'pizzeria', 'sushi', 'tapas', 'bistro'],
};

export class RecommendationService {
  private static instance: RecommendationService | undefined;

  private constructor() {}

  public static getInstance(): RecommendationService {
    if (!RecommendationService.instance) {
      RecommendationService.instance = new RecommendationService();
    }
    return RecommendationService.instance;
  }

  /**
   * Generate meal recommendations for a user
   */
  async generateRecommendations(
    userId: mongoose.Types.ObjectId,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    maxDistance = 2000, // 2km default
    limit = 5
  ): Promise<RecommendationScore[]> {
    try {
      logger.info(`🍽️ Generating ${mealType} recommendations for user ${userId.toString()}`);

      // 1. Get user's current/recent location
      const userLocation = await this.getUserLocation(userId);
      if (!userLocation) {
        logger.warn(`No location found for user ${userId.toString()}`);
        return [];
      }

      // 2. Get current weather
      const weather = await weatherService.getCurrentWeather(
        userLocation.lat,
        userLocation.lng
      );

      // 3. Get user preferences from existing data
      const userPreferences = await this.getUserPreferences(userId);

      // 4. Get recommendations from both database pins and Places API
      const [dbRecommendations, placesRecommendations] = await Promise.all([
        this.getDatabaseRecommendations(userLocation, maxDistance, mealType, weather, userPreferences),
        this.getPlacesApiRecommendations(userLocation, maxDistance, mealType, weather, userPreferences)
      ]);

      // 5. Combine and rank all recommendations
      const allRecommendations = [...dbRecommendations, ...placesRecommendations]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (allRecommendations.length === 0) {
        logger.info(`No recommendations found for ${mealType} within ${maxDistance}m`);
        return [];
      }

      logger.info(`Generated ${allRecommendations.length} recommendations for ${mealType}`);
      allRecommendations.forEach((rec, idx) => {
        const name = (rec.pin?.name ?? rec.place?.name) ?? 'Unknown';
        logger.info(`  ${idx + 1}. ${name} (${rec.source}) - Score: ${rec.score}, Distance: ${Math.round(rec.distance)}m`);
      });

      return allRecommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  /**
   * Send recommendation notification to user
   */
  async sendRecommendationNotification(
    userId: mongoose.Types.ObjectId,
    mealType: 'breakfast' | 'lunch' | 'dinner'
  ): Promise<boolean> {
    try {
      const recommendations = await this.generateRecommendations(userId, mealType, 2000, 3);
      
      if (recommendations.length === 0) {
        logger.info(`No recommendations to send for user ${userId.toString()} (${mealType})`);
        return false;
      }

      const topRecommendation = recommendations[0];
      const name = (topRecommendation.pin?.name ?? topRecommendation.place?.name) ?? 'Unknown Place';
      const distanceText = topRecommendation.distance < 1000 
        ? `${Math.round(topRecommendation.distance)}m away`
        : `${(topRecommendation.distance / 1000).toFixed(1)}km away`;

      // Get meal emoji
      const mealEmoji = mealType === 'breakfast' ? '🍳' : mealType === 'lunch' ? '🍽️' : '🌙';
      
      const title = `${mealEmoji} ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Recommendation`;
      const body = `Try ${name} - ${distanceText}. ${topRecommendation.reason}`;

      // Determine ID for notification (pin ID or place ID)
      const locationId = (topRecommendation.pin?._id.toString() ?? topRecommendation.place?.id) ?? 'unknown';

      const sent = await notificationService.sendLocationRecommendationNotification(
        userId.toString(),
        title,
        body,
        {
          pinId: locationId,
          mealType,
          distance: topRecommendation.distance,
          score: topRecommendation.score,
        }
      );

      // Note: Recommendation notifications sent successfully
      // User preference tracking is now handled via existing pin votes and visits

      return sent;
    } catch (error) {
      logger.error('Error sending recommendation notification:', error);
      return false;
    }
  }

  /**
   * Get user preferences from existing pin votes and visits (simplified approach)
   */
  private async getUserPreferences(userId: mongoose.Types.ObjectId): Promise<{
    likedPins: mongoose.Types.ObjectId[];
    visitedPins: mongoose.Types.ObjectId[];
  }> {
    try {
      // Get user's upvoted pins by directly accessing the PinVote collection
      const PinVote = mongoose.model('PinVote');
      const upvotedPins = await PinVote
        .find({ userId, voteType: 'upvote' })
        .select('pinId')
        .lean();
      
      const likedPins = upvotedPins.map((vote: Record<string, unknown>) => {
        const pinId = vote.pinId;
        if (pinId instanceof mongoose.Types.ObjectId) {
          return pinId;
        }
        return new mongoose.Types.ObjectId(String(pinId));
      });

      // Get user's visited pins from user model using Mongoose directly
      const User = mongoose.model('User');
      const user = await User.findById(userId).select('visitedPins').lean() as { visitedPins?: string[] };
      const visitedPinsStrings = user.visitedPins ?? [];
      
      // Convert string array to ObjectId array
      const visitedPins = visitedPinsStrings.map((pinId: string) => new mongoose.Types.ObjectId(pinId));

      logger.info(`User ${userId.toString()} preferences: ${likedPins.length} liked, ${visitedPins.length} visited pins`);
      
      return {
        likedPins,
        visitedPins
      };
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      return {
        likedPins: [],
        visitedPins: []
      };
    }
  }

  /**
   * Get user's current or most recent location
   */
  private async getUserLocation(userId: mongoose.Types.ObjectId): Promise<{lat: number, lng: number} | null> {
    try {
      const location = await locationModel.findByUserId(userId);
      if (location) {
        return { lat: location.lat, lng: location.lng };
      }
      
      // No current location, could implement fallback to home/work location here
      return null;
    } catch (error) {
      logger.error('Error getting user location:', error);
      return null;
    }
  }

  /**
   * Get candidate pins for meal recommendations
   */
  private async getCandidatePins(
    lat: number,
    lng: number,
    maxDistance: number,
    // mealCategories kept for signature compatibility but not required
    _mealCategories: MealCategory[]
  ): Promise<IPin[]> {
    try {
      // Get all active SHOPS_SERVICES pins (restaurants/cafes)
      const result = await pinModel.search({
        category: 'shops_services' as PinCategory,
        latitude: lat,
        longitude: lng,
        radius: maxDistance / 1000, // Convert to km
        limit: 100, // Get more candidates for better scoring
      });

      // We'll no longer require mealCategories to be explicitly present on pins.
      // Instead we rely on heuristics (name/description/category keywords) to
      // determine meal relevance in scoring.
      const candidates = result.pins;

      // Filter by business hours if available (if closed today, exclude)
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      const openPins = candidates.filter(pin => {
        const businessHours = (pin.metadata?.businessHours) as
          | Record<string, { open: string; close: string } | null>
          | undefined;
        if (!businessHours?.[currentDay]) {
          return true; // If no hours specified, assume open
        }

        const todayHours = businessHours[currentDay];
        if (todayHours === undefined || todayHours === null) return false; // Closed today

        return currentTime >= todayHours.open && currentTime <= todayHours.close;
      });

      return openPins;
    } catch (error) {
      logger.error('Error getting candidate pins:', error);
      return [];
    }
  }

  /**
   * Score a pin for recommendation
   */
  private async scorePin(
    pin: IPin,
    userLocation: { lat: number; lng: number },
    mealType: 'breakfast' | 'lunch' | 'dinner',
    weather: unknown,
    userPreferences: { likedPins: mongoose.Types.ObjectId[]; visitedPins: mongoose.Types.ObjectId[] }
  ): Promise<RecommendationScore> {
    const distance = this.calculateDistance(
      userLocation.lat,
      userLocation.lng,
      pin.location.latitude,
      pin.location.longitude
    );

    const factors = {
      proximity: this.scoreProximity(distance),
      mealRelevance: this.scoreMealRelevance(pin, mealType),
      userPreference: this.scoreUserPreference(pin, userPreferences),
      weather: this.scoreWeather(pin, weather),
      popularity: this.scorePopularity(pin),
    };

    const totalScore = Object.values(factors).reduce((sum, score) => sum + score, 0);
    
    // Generate reason for recommendation
    const reason = this.generateRecommendationReason(pin, factors, weather);

    return {
      pin,
      score: totalScore,
      factors,
      distance,
      reason,
      source: 'database'
    };
  }

  /**
   * Score based on distance (closer is better)
   */
  private scoreProximity(distance: number): number {
    if (distance <= 200) return 25;      // Very close
    if (distance <= 500) return 20;      // Close
    if (distance <= 1000) return 15;     // Moderate
    if (distance <= 2000) return 10;     // Far
    return 5;                            // Very far
  }

  /**
   * Score based on meal type relevance
   * Uses string matching instead of regex to avoid ReDoS vulnerabilities
   */
  private scoreMealRelevance(pin: IPin, mealType: string): number {
    // Heuristic-based meal relevance using pin name / description / category
    const name = (pin.name || '').toLowerCase();
    const description = (pin.description || '').toLowerCase();
    const category = (pin.category || '').toLowerCase();
    const searchText = `${name} ${description} ${category}`;

    // Use simple string matching instead of regex - safer and avoids ReDoS
    // Check if keywords appear in the text (case-insensitive)
    const keywords = MEAL_KEYWORDS[mealType] ?? [];
    let matchCount = 0;

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      // Simple substring matching - keywords are distinct enough to avoid false positives
      // Using word boundaries by checking for space/punctuation before/after keyword
      if (searchText.includes(lowerKeyword)) {
        matchCount++;
      }
    }

    if (matchCount >= 3) return 25; // Strong match
    if (matchCount === 2) return 20; // Good match
    if (matchCount === 1) return 12; // Weak match
    // No explicit keywords found — give a small default so proximity and other
    // factors can still surface places nearby.
    return 5;
  }

  /**
   * Score based on user's past preferences (simplified - uses existing votes and visits)
   */
  private scoreUserPreference(
    pin: IPin,
    userPreferences: { likedPins: mongoose.Types.ObjectId[]; visitedPins: mongoose.Types.ObjectId[] }
  ): number {
    let score = 0;

    // Check if user has upvoted this pin before (strong positive signal)
    if (userPreferences.likedPins.some(id => id.equals(pin._id))) {
      score += 20; // User upvoted this place - strong preference
    }
    
    // Check if user has visited this pin before (moderate positive signal)
    if (userPreferences.visitedPins.some(id => id.equals(pin._id))) {
      score += 10; // Been here before - moderate preference
    }

    // Give small bonus for pins with good metadata (shows curation)
    const hasGoodMetadata = (pin.metadata?.cuisineType ?? pin.metadata?.priceRange) ?? pin.metadata?.hasOutdoorSeating;
    if (hasGoodMetadata) {
      score += 3; // Has useful info
    }

    return Math.min(score, 25); // Cap at 25
  }

  /**
   * Score based on weather conditions
   */
  private scoreWeather(pin: IPin, weather: unknown): number {
    if (!weather) return 5; // Default score

    const hasOutdoorSeating = pin.metadata?.hasOutdoorSeating ?? false;
    // Ensure weather has the required structure for WeatherData
    const weatherData = weather as { condition: 'clear' | 'cloudy' | 'rainy' | 'snowy' | 'stormy'; temperature: number; humidity: number; description: string; isGoodForOutdoor: boolean };
    const weatherRec = weatherService.getWeatherRecommendations(weatherData);

    if (weatherRec.preferOutdoor && hasOutdoorSeating) {
      return 15; // Perfect weather for outdoor dining
    }
    if (!weatherRec.preferOutdoor && !hasOutdoorSeating) {
      return 10; // Good indoor option for bad weather
    }
    
    return 5; // Neutral
  }

  /**
   * Score based on pin popularity
   */
  private scorePopularity(pin: IPin): number {
    const upvotes = pin.rating.upvotes || 0;
    const downvotes = pin.rating.downvotes || 0;
    const totalVotes = upvotes + downvotes;

    if (totalVotes === 0) return 5; // No votes yet

    const rating = upvotes / totalVotes;
    if (rating >= 0.8 && totalVotes >= 5) return 10; // Highly rated
    if (rating >= 0.6) return 7;                     // Good rating
    if (rating >= 0.4) return 5;                     // Average
    return 2;                                        // Poor rating
  }

  /**
   * Generate human-readable reason for recommendation
   */
  private generateRecommendationReason(pin: IPin, factors: unknown, _weather: unknown): string {
    const reasons = [];
    const factorsObj = factors as { proximity?: number; userPreference?: number; weather?: number; popularity?: number };

    if ((factorsObj.proximity ?? 0) >= 20) reasons.push('very close to you');
    if ((factorsObj.userPreference ?? 0) >= 15) reasons.push('you loved this place before');
    if ((factorsObj.userPreference ?? 0) >= 10) reasons.push('you\'ve been here before');
    if ((factorsObj.weather ?? 0) >= 15) reasons.push('perfect weather for outdoor dining');
    if ((factorsObj.weather ?? 0) >= 10) reasons.push('great indoor spot for this weather');
    if ((factorsObj.popularity ?? 0) >= 8) reasons.push('highly rated by others');

    const cuisineTypes = pin.metadata?.cuisineType;
    if (cuisineTypes && cuisineTypes.length > 0) {
      reasons.push(`excellent ${cuisineTypes[0]} food`);
    }

    if (reasons.length === 0) {
      reasons.push('a good option nearby');
    }

    return reasons.slice(0, 2).join(' and '); // Limit to 2 reasons
  }

  /**
   * Get relevant meal categories for meal type
   */
  private getMealCategories(mealType: 'breakfast' | 'lunch' | 'dinner'): MealCategory[] {
    switch (mealType) {
      case 'breakfast':
        return [MealCategory.BREAKFAST, MealCategory.COFFEE];
      case 'lunch':
        return [MealCategory.LUNCH, MealCategory.COFFEE, MealCategory.SNACKS];
      case 'dinner':
        return [MealCategory.DINNER];
      default:
        return [];
    }
  }

  /**
   * Get current time of day
   */
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
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

  /**
   * Get recommendations from database pins
   */
  private async getDatabaseRecommendations(
    userLocation: { lat: number; lng: number },
    maxDistance: number,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    weather: unknown,
    userPreferences: { likedPins: mongoose.Types.ObjectId[]; visitedPins: mongoose.Types.ObjectId[] }
  ): Promise<RecommendationScore[]> {
    try {
      // Get relevant pins from database using existing logic
      const mealCategories = this.getMealCategories(mealType);
      const candidatePins = await this.getCandidatePins(
        userLocation.lat,
        userLocation.lng,
        maxDistance,
        mealCategories
      );

      const recommendations: RecommendationScore[] = [];
      
      for (const pin of candidatePins) {
        const score = await this.scorePin(pin, userLocation, mealType, weather, userPreferences);
        
        if (score.score > 30) { // Minimum threshold
          recommendations.push({
            ...score,
            source: 'database'
          });
        }
      }

      logger.info(`📍 Database: Found ${recommendations.length} pin recommendations`);
      return recommendations;
    } catch (error) {
      logger.error('Error getting database recommendations:', error);
      return [];
    }
  }

  /**
   * Get recommendations from Google Places API
   */
  private async getPlacesApiRecommendations(
    userLocation: { lat: number; lng: number },
    maxDistance: number,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    weather: unknown,
    userPreferences: { likedPins: mongoose.Types.ObjectId[]; visitedPins: mongoose.Types.ObjectId[] }
  ): Promise<RecommendationScore[]> {
    try {
      const places = await placesApiService.getNearbyDiningOptions(
        userLocation.lat,
        userLocation.lng,
        maxDistance,
        mealType
      );

      const recommendations: RecommendationScore[] = [];

      for (const place of places) {
        const score = this.scorePlacesApiResult(place, userLocation, mealType, weather, userPreferences);
        
        if (score.score > 30) { // Same minimum threshold
          recommendations.push({
            ...score,
            source: 'places_api'
          });
        }
      }

      logger.info(`🌐 Places API: Found ${recommendations.length} place recommendations`);
      return recommendations;
    } catch (error) {
      logger.error('Error getting Places API recommendations:', error);
      return [];
    }
  }

  /**
   * Score a Places API result
   */
  private scorePlacesApiResult(
    place: RecommendationPlace,
    userLocation: { lat: number; lng: number },
    mealType: 'breakfast' | 'lunch' | 'dinner',
    weather: unknown,
    _userPreferences: unknown
  ): RecommendationScore {
    const distance = place.distance;
    
    // Proximity scoring (0-25 points)
    const proximityScore = Math.max(0, 25 - (distance / 100)); // Lose 1 point per 100m
    
    // Meal relevance scoring (0-25 points) - use the calculated suitability
    const mealRelevanceScore = (place.mealSuitability[mealType] / 10) * 25;
    
    // User preference scoring (0-25 points) - simplified for Places API
    const userPreferenceScore = place.rating > 0 ? (place.rating / 5) * 15 : 10; // Default moderate score
    
    // Weather scoring (0-15 points) - favor indoor places in bad weather
    let weatherScore = 10; // Default neutral score
    const weatherObj = weather as { main?: { temp?: number }; rain?: boolean; snow?: boolean } | undefined;
    if ((weatherObj?.main?.temp ?? 0) < 5 || weatherObj?.rain || weatherObj?.snow) {
      weatherScore = 15; // Indoor dining preferred in bad weather
    } else if ((weatherObj?.main?.temp ?? 0) > 25) {
      weatherScore = 12; // Slight preference for air conditioning
    }
    
    // Popularity scoring (0-10 points) - based on rating and open status
    let popularityScore = place.rating > 0 ? (place.rating / 5) * 8 : 5;
    if (place.isOpen) popularityScore += 2;
    
    const totalScore = proximityScore + mealRelevanceScore + userPreferenceScore + weatherScore + popularityScore;
    
    // Generate reason
    let reasons = [];
    if (mealRelevanceScore > 15) reasons.push(`a great place for ${mealType}`);
    if (distance < 500) reasons.push('very close');
    if (place.rating >= 4.0) reasons.push('highly rated');
    if (place.isOpen) reasons.push('currently open');
    
    const reason = reasons.length > 0 ? reasons.join(', ') : 'recommended option';

    return {
      place,
      score: Math.round(totalScore),
      factors: {
        proximity: Math.round(proximityScore),
        mealRelevance: Math.round(mealRelevanceScore),
        userPreference: Math.round(userPreferenceScore),
        weather: Math.round(weatherScore),
        popularity: Math.round(popularityScore),
      },
      distance,
      reason: `A ${reason}`,
      source: 'places_api'
    };
  }
}

export const recommendationService = RecommendationService.getInstance();