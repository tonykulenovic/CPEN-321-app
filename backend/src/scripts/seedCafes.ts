import mongoose from 'mongoose';
import axios from 'axios';
import { pinModel } from '../models/pin.model';
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

// UBC Vancouver campus coordinates
const UBC_CENTER = {
  lat: 49.2606,
  lng: -123.2460
};

const SEARCH_RADIUS = 1500; // 1.5km radius to cover main campus

export async function seedCafes(): Promise<void> {
  try {
    logger.info('☕ Starting cafe seeding with Google Places API...');

    // Check if Google Maps API key is configured
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      logger.warn('⚠️  GOOGLE_MAPS_API_KEY not found in environment variables. Skipping cafe seeding.');
      logger.info('💡 To enable cafe seeding, add GOOGLE_MAPS_API_KEY to your .env file');
      return;
    }

    // Search for cafes near UBC using Google Places API (New)
    logger.info(`🔍 Searching for cafes within ${SEARCH_RADIUS}m of UBC campus...`);
    
    const url = 'https://places.googleapis.com/v1/places:searchNearby';
    const response = await axios.post<PlacesResponse>(
      url,
      {
        includedTypes: ['cafe'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: UBC_CENTER.lat,
              longitude: UBC_CENTER.lng,
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

    if (!response.data || (!response.data.places && !response.data.results)) {
      logger.error(`❌ Google Places API error: Invalid response`);
      if (response.data.error_message) {
        logger.error(`   ${response.data.error_message}`);
      }
      return;
    }

    // Handle both new API format (places) and legacy format (results)
    const cafes = response.data.places ?? response.data.results;
    
    if (!cafes || cafes.length === 0) {
      logger.info('No cafes found. Seeding complete.');
      return;
    }
    
    logger.info(`📍 Found ${cafes.length} cafes from Google Places API`);

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

    // Upsert cafe pins
    let createdCount = 0;
    let updatedCount = 0;

    for (const cafe of cafes) {
      try {
        // Extract location from either new or legacy API format
        const lat = cafe.location?.latitude ?? cafe.geometry?.location.lat;
        const lng = cafe.location?.longitude ?? cafe.geometry?.location.lng;
        
        if (!lat || !lng) {
          logger.warn(`⚠️  Skipping cafe without location: ${cafe.displayName?.text ?? cafe.name}`);
          continue;
        }

        // Extract name and address from either API format
        const name = (cafe.displayName?.text ?? cafe.name) ?? 'Unnamed Cafe';
        const address = (cafe.formattedAddress ?? cafe.vicinity) ?? 'Cafe near UBC campus';
        
        // Extract opening hours from either API format
        const isOpen = cafe.currentOpeningHours?.openNow ?? cafe.opening_hours?.open_now;

        const cafeData = {
          name: name,
          description: address,
          category: PinCategory.SHOPS_SERVICES,
          location: {
            latitude: lat,
            longitude: lng,
            address,
          },
          metadata: {
            subtype: 'cafe', // Add subtype to distinguish from restaurants
            openingHours: isOpen !== undefined 
              ? (isOpen ? 'Open now' : 'Closed')
              : undefined,
            amenities: cafe.types?.filter((t: string) => t !== 'cafe' && t !== 'point_of_interest') ?? undefined,
          },
          rating: {
            upvotes: Math.floor(cafe.rating ?? 0),
            downvotes: 0,
            voters: [],
          },
          imageUrl: cafe.photos && cafe.photos.length > 0 
            ? (cafe.photos[0].name 
                ? `https://places.googleapis.com/v1/${cafe.photos[0].name}/media?maxHeightPx=400&maxWidthPx=400&key=${process.env.GOOGLE_MAPS_API_KEY}`
                : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${cafe.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`)
            : undefined,
        };

        // Upsert cafe pin using name and location as unique identifier
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const result = await (pinModel as any).pin.updateOne(
          {
            isPreSeeded: true,
            'metadata.subtype': 'cafe',
            name: cafeData.name,
            'location.latitude': { 
              $gte: cafeData.location.latitude - 0.0001, 
              $lte: cafeData.location.latitude + 0.0001 
            },
            'location.longitude': { 
              $gte: cafeData.location.longitude - 0.0001, 
              $lte: cafeData.location.longitude + 0.0001 
            },
          },
          {
            $set: {
              ...cafeData,
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
          logger.info(`  ✓ Created: ${cafeData.name}`);
        } else if (result.modifiedCount > 0) {
          updatedCount++;
          logger.info(`  ♻️  Updated: ${cafeData.name}`);
        } else {
          logger.info(`  ━ No changes: ${cafeData.name}`);
        }
      } catch (error) {
        logger.error(`  ✗ Failed to upsert ${cafe.name}:`, error);
      }
    }

    // Get current cafe names for cleanup (use same extraction logic as above)
    const currentCafeNames = cafes
      .map((c: PlaceResult) => (c.displayName?.text ?? c.name) ?? 'Unnamed Cafe')
      .filter((name: string) => name !== 'Unnamed Cafe');
    
    // Delete pre-seeded cafes that are no longer in Google Places results
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const deleteResult = await (pinModel as any).pin.deleteMany({
      isPreSeeded: true,
      category: PinCategory.SHOPS_SERVICES,
      'metadata.subtype': 'cafe',
      name: { $nin: currentCafeNames }
    });

    logger.info(`🎉 Cafe seeding complete! Created: ${createdCount}, Updated: ${updatedCount}, Deleted: ${deleteResult.deletedCount}, Total: ${cafes.length}`);
    
  } catch (error) {
    logger.error('❌ Cafe seeding failed:', error);
    // Don't throw - we want the server to start even if seeding fails
  }
}

