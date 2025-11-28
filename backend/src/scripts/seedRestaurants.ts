import mongoose from 'mongoose';
import axios from 'axios';
import logger from '../utils/logger.util';
import { PinCategory, PinStatus, PinVisibility } from '../types/pins.types';

// Google Places API (New) response types
interface PlaceLocation {
  latitude: number;
  longitude: number;
}

interface PlacePhoto {
  name: string; // New API uses photo name/URI
  photo_reference?: string; // Legacy API fallback
}

interface PlaceResult {
  // New API fields
  displayName?: {
    text: string;
  };
  formattedAddress?: string;
  location?: PlaceLocation;
  rating?: number;
  currentOpeningHours?: {
    openNow?: boolean;
  };
  types?: string[];
  photos?: PlacePhoto[];
  
  // Legacy API fields (fallback)
  name?: string;
  vicinity?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
  };
}

interface PlacesResponse {
  places?: PlaceResult[]; // New API
  results?: PlaceResult[]; // Legacy API fallback
  status?: string;
  error_message?: string;
}

// UBC Vancouver campus coordinates - multiple search centers to get more restaurants
const UBC_SEARCH_REGIONS = [
  {
    name: 'North Campus',
    lat: 49.2650, // North side (near Marine Drive)
    lng: -123.2500,
  },
  {
    name: 'South Campus', 
    lat: 49.2570, // South side (near SW Marine Drive)
    lng: -123.2420,
  },
  {
    name: 'East Campus',
    lat: 49.2606, // East side (near Main Mall)
    lng: -123.2380,
  },
  {
    name: 'West Campus',
    lat: 49.2606, // West side (near Wesbrook Mall)
    lng: -123.2540,
  },
  {
    name: 'Central Campus',
    lat: 49.2606, // Main campus center
    lng: -123.2460,
  },
];

const SEARCH_RADIUS = 800; // Smaller radius per region to avoid too much overlap

export async function seedRestaurants(): Promise<void> {
  try {
    logger.info('🍽️  Starting restaurant seeding with Google Places API...');

    // Check if Google Maps API key is configured
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      logger.warn('⚠️  GOOGLE_MAPS_API_KEY not found in environment variables. Skipping restaurant seeding.');
      logger.info('💡 To enable restaurant seeding, add GOOGLE_MAPS_API_KEY to your .env file');
      return;
    }

    // First, get all existing cafes to check for overlap
    logger.info('📍 Fetching existing cafes to check for overlap...');
    const Pin = mongoose.model('Pin');
    const existingCafes = await Pin.find({
      isPreSeeded: true,
      category: PinCategory.SHOPS_SERVICES,
      'metadata.subtype': 'cafe' // Only get cafes, not other restaurants
    }).lean();

    logger.info(`Found ${existingCafes.length} existing cafes for overlap check`);

    // Search for restaurants in multiple regions to get more results
    logger.info(`🔍 Searching for restaurants across ${UBC_SEARCH_REGIONS.length} campus regions...`);
    
    const url = 'https://places.googleapis.com/v1/places:searchNearby';
    const allRestaurants: PlaceResult[] = [];
    
    // Fetch restaurants from each region
    for (const region of UBC_SEARCH_REGIONS) {
      logger.info(`  📍 Searching ${region.name} (${SEARCH_RADIUS}m radius)...`);
      
      try {
        const response = await axios.post<PlacesResponse>(
          url,
          {
            includedTypes: ['restaurant'],
            maxResultCount: 20, // Maximum allowed by Google Places API (New)
            locationRestriction: {
              circle: {
                center: {
                  latitude: region.lat,
                  longitude: region.lng,
                },
                radius: SEARCH_RADIUS,
              },
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
              'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.currentOpeningHours,places.types,places.photos',
            },
          }
        );

        const regionRestaurants = response.data?.places ?? response.data?.results;
        if (regionRestaurants) {
          if (regionRestaurants && regionRestaurants.length > 0) {
            allRestaurants.push(...regionRestaurants);
            logger.info(`    ✓ Found ${regionRestaurants.length} restaurants in ${region.name}`);
          } else {
            logger.info(`    • No restaurants found in ${region.name}`);
          }
        }
        
        // Add small delay between region requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        logger.error(`    ✗ Failed to fetch restaurants from ${region.name}:`, error);
        // Continue with other regions even if one fails
      }
    }

    logger.info(`📊 Total restaurants fetched from all regions: ${allRestaurants.length}`);

    // Remove duplicate restaurants - check both location AND name for robust deduplication
    const uniqueRestaurants: PlaceResult[] = [];
    const seenLocations = new Set<string>();
    const seenNames = new Set<string>();
    
    for (const restaurant of allRestaurants) {
      const lat = restaurant.location?.latitude ?? restaurant.geometry?.location.lat;
      const lng = restaurant.location?.longitude ?? restaurant.geometry?.location.lng;
      const name = ((restaurant.displayName?.text ?? restaurant.name) ?? '').toLowerCase().trim();
      
      if (!lat || !lng || !name) continue;
      
      // Create a location key rounded to 4 decimal places (~11m precision)
      const locationKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      
      // Check both location AND name to catch all duplicates
      const isDuplicateLocation = seenLocations.has(locationKey);
      const isDuplicateName = seenNames.has(name);
      
      if (!isDuplicateLocation && !isDuplicateName) {
        seenLocations.add(locationKey);
        seenNames.add(name);
        uniqueRestaurants.push(restaurant);
      } else {
        const reason = isDuplicateLocation && isDuplicateName 
          ? 'location & name' 
          : isDuplicateLocation 
            ? 'location' 
            : 'name';
        logger.info(`    🔄 Skipping duplicate (${reason}): ${restaurant.displayName?.text ?? restaurant.name}`);
      }
    }
    
    logger.info(`✅ Removed ${allRestaurants.length - uniqueRestaurants.length} duplicate restaurants`);
    logger.info(`📍 Unique restaurants after deduplication: ${uniqueRestaurants.length}`);

    const restaurants = uniqueRestaurants;
    
    if (restaurants.length === 0) {
      logger.info('No restaurants found. Seeding complete.');
      return;
    }
    
    logger.info(`📍 Found ${restaurants.length} restaurants from Google Places API`);

    // Find or create system user for pre-seeded pins
    const UserModel = mongoose.model('User');
    let systemUser = await UserModel.findOne({ googleId: 'system' });
    
    if (!systemUser) {
      logger.info('Creating system user for pre-seeded pins...');
      systemUser = await UserModel.create({
        googleId: 'system',
        email: 'system@universe.app',
        name: 'UniVerse System',
        username: 'universe_system',
        profilePicture: 'https://example.com/system-avatar.png',
        bio: 'System account for pre-seeded content',
      });
    }

    // Filter out restaurants that have the same name as cafes
    const nonDuplicateRestaurants = [];
    let excludedCount = 0;

    // Create a set of cafe names (lowercase) for quick lookup
    const cafeNames = new Set(existingCafes.map((cafe: unknown) => {
      const cafeObj = cafe as { name: string };
      return cafeObj.name.toLowerCase();
    }));

    for (const restaurant of restaurants) {
      const lat = restaurant.location?.latitude ?? restaurant.geometry?.location.lat;
      const lng = restaurant.location?.longitude ?? restaurant.geometry?.location.lng;
      
      if (!lat || !lng) {
        logger.warn(`⚠️  Skipping restaurant without location: ${restaurant.displayName?.text ?? restaurant.name}`);
        continue;
      }

      // Check if this restaurant has the same name as an existing cafe
      const restaurantName = ((restaurant.displayName?.text ?? restaurant.name) ?? '').toLowerCase();
      
      if (cafeNames.has(restaurantName)) {
        logger.info(`  🚫 Excluding "${restaurant.displayName?.text ?? restaurant.name}" - duplicate name with cafe`);
        excludedCount++;
      } else {
        nonDuplicateRestaurants.push(restaurant);
      }
    }

    logger.info(`✅ ${nonDuplicateRestaurants.length} restaurants after excluding ${excludedCount} duplicate names with cafes`);

    // Upsert restaurant pins
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const restaurant of nonDuplicateRestaurants) {
      try {
        // Extract location from either new or legacy API format
        const lat = restaurant.location?.latitude ?? restaurant.geometry?.location.lat;
        const lng = restaurant.location?.longitude ?? restaurant.geometry?.location.lng;
        
        if (!lat || !lng) {
          continue; // Already checked above, but being safe
        }

        // Extract name and address from either API format
        const name = (restaurant.displayName?.text ?? restaurant.name) ?? 'Unnamed Restaurant';
        const address = (restaurant.formattedAddress ?? restaurant.vicinity) ?? 'Restaurant near UBC campus';
        
        // Extract opening hours from either API format
        const isOpen = restaurant.currentOpeningHours?.openNow ?? restaurant.opening_hours?.open_now;

        const restaurantData = {
          name,
          description: address,
          category: PinCategory.SHOPS_SERVICES,
          location: {
            latitude: lat,
            longitude: lng,
            address,
          },
          metadata: {
            subtype: 'restaurant', // Add subtype to distinguish from cafes
            openingHours: isOpen !== undefined 
              ? (isOpen ? 'Open now' : 'Closed')
              : undefined,
            amenities: restaurant.types?.filter((t: string) => t !== 'restaurant' && t !== 'point_of_interest') ?? undefined,
          },
          rating: {
            upvotes: Math.floor(restaurant.rating ?? 0),
            downvotes: 0,
            voters: [],
          },
          imageUrl: restaurant.photos && restaurant.photos.length > 0 
            ? (restaurant.photos[0].name 
                ? `https://places.googleapis.com/v1/${restaurant.photos[0].name}/media?maxHeightPx=400&maxWidthPx=400&key=${process.env.GOOGLE_MAPS_API_KEY}`
                : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${restaurant.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`)
            : undefined,
        };

        // Upsert restaurant pin using name and location as unique identifier
        const result = await Pin.updateOne(
          {
            isPreSeeded: true,
            'metadata.subtype': 'restaurant',
            name: restaurantData.name,
            'location.latitude': { 
              $gte: restaurantData.location.latitude - 0.0001, 
              $lte: restaurantData.location.latitude + 0.0001 
            },
            'location.longitude': { 
              $gte: restaurantData.location.longitude - 0.0001, 
              $lte: restaurantData.location.longitude + 0.0001 
            },
          },
          {
            $set: {
              ...restaurantData,
              createdBy: systemUser._id,
              isPreSeeded: true,
              status: PinStatus.ACTIVE,
              visibility: PinVisibility.PUBLIC
            }
          },
          { 
            upsert: true
          }
        );
        
        if (result.upsertedCount > 0) {
          createdCount++;
          logger.info(`  ✓ Created: ${restaurantData.name}`);
        } else if (result.modifiedCount > 0) {
          updatedCount++;
          logger.info(`  ♻️  Updated: ${restaurantData.name}`);
        } else {
          logger.info(`  ━ No changes: ${restaurantData.name}`);
        }
      } catch (error) {
        logger.error(`  ✗ Failed to upsert ${restaurant.name}:`, error);
      }
    }

    // Get current restaurant names for cleanup (use same extraction logic as above)
    const currentRestaurantNames = nonDuplicateRestaurants
      .map((r: PlaceResult) => (r.displayName?.text ?? r.name) ?? 'Unnamed Restaurant')
      .filter((name: string) => name !== 'Unnamed Restaurant');
    
    // Delete pre-seeded restaurants that are no longer in Google Places results
    const deleteResult = await Pin.deleteMany({
      isPreSeeded: true,
      category: PinCategory.SHOPS_SERVICES,
      'metadata.subtype': 'restaurant',
      name: { $nin: currentRestaurantNames }
    });

    logger.info(`🎉 Restaurant seeding complete! Created: ${createdCount}, Updated: ${updatedCount}, Deleted: ${deleteResult.deletedCount}, Excluded: ${excludedCount}, Total: ${nonDuplicateRestaurants.length}`);
    
  } catch (error) {
    logger.error('❌ Restaurant seeding failed:', error);
    // Don't throw - we want the server to start even if seeding fails
  }
}

