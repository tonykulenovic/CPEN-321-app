import mongoose from 'mongoose';
import { PinModel } from '../models/pin.model';
import { PinCategory } from '../types/pins.types';
import logger from '../utils/logger.util';

const UBC_LIBRARIES = [
  {
    name: "Irving K. Barber Learning Centre",
    category: PinCategory.STUDY,
    description: "Main learning centre with Chapman Learning Commons, collaborative areas, and technology-enabled study rooms. Houses Music, Art & Architecture Library, Rare Books & Special Collections, and University Archives.",
    location: {
      latitude: 49.267627,
      longitude: -123.252686,
      address: "1961 East Mall, Vancouver, BC"
    },
    metadata: {
      capacity: 800,
      openingHours: "24/7 during term",
      amenities: ["WiFi", "Computers", "Printing", "Group Study", "Café", "Outlets", "Music Library", "Art Library", "Archives"],
      crowdLevel: "busy"
    }
  },
  {
    name: "Walter C. Koerner Library",
    category: PinCategory.STUDY,
    description: "Main library with extensive study spaces, group rooms, and 24/7 access during exams. Great for quiet individual study. Note: Education Library collections are being relocated here.",
    location: {
      latitude: 49.266639,
      longitude: -123.255191,
      address: "1958 Main Mall, Vancouver, BC"
    },
    metadata: {
      capacity: 500,
      openingHours: "Mon-Fri: 8am-11pm, Sat-Sun: 10am-10pm",
      amenities: ["WiFi", "Printing", "Group Rooms", "Silent Study", "Outlets", "24/7 Access During Exams"],
      crowdLevel: "moderate"
    }
  },
  {
    name: "Asian Library",
    category: PinCategory.STUDY,
    description: "Specialized collection focusing on East Asian materials. Excellent quiet study space with unique resources.",
    location: {
      latitude: 49.266765,
      longitude: -123.258728,
      address: "1871 West Mall, Asian Centre, Vancouver, BC"
    },
    metadata: {
      capacity: 100,
      openingHours: "Mon-Fri: 9am-9pm, Sat-Sun: 12pm-6pm",
      amenities: ["WiFi", "Silent Study", "Specialized Collections", "East Asian Resources"],
      crowdLevel: "quiet"
    }
  },
  {
    name: "Woodward Library",
    category: PinCategory.STUDY,
    description: "Biomedical Branch Library for health sciences with quiet study areas, medical resources, and specialized collections for medicine, nursing, and related fields.",
    location: {
      latitude: 49.2644912,
      longitude: -123.2472591,
      address: "2198 Health Sciences Mall, Vancouver, BC"
    },
    metadata: {
      capacity: 200,
      openingHours: "Mon-Fri: 8am-10pm, Sat-Sun: 10am-8pm",
      amenities: ["WiFi", "Silent Study", "Medical Collections", "Health Sciences Resources", "Outlets"],
      crowdLevel: "quiet"
    }
  },
  {
    name: "X̱wi7x̱wa Library",
    category: PinCategory.STUDY,
    description: "First Nations House of Learning library with Indigenous collections, resources, and culturally supportive study space.",
    location: {
      latitude: 49.265557,
      longitude: -123.25696,
      address: "1985 West Mall, First Nations Longhouse, Vancouver, BC"
    },
    metadata: {
      capacity: 80,
      openingHours: "Mon-Fri: 9am-5pm",
      amenities: ["WiFi", "Indigenous Collections", "Cultural Resources", "Community Space"],
      crowdLevel: "quiet"
    }
  },
  {
    name: "Law Library",
    category: PinCategory.STUDY,
    description: "Peter A. Allard School of Law library with extensive legal collections, study carrels, and research support.",
    location: {
      latitude: 49.270013,
      longitude: -123.253306,
      address: "1822 East Mall, Allard Hall, Vancouver, BC"
    },
    metadata: {
      capacity: 250,
      openingHours: "Mon-Fri: 8am-11pm, Sat-Sun: 10am-10pm",
      amenities: ["WiFi", "Legal Collections", "Study Carrels", "Research Support", "Silent Study"],
      crowdLevel: "moderate"
    }
  }
];

export async function seedLibraries() {
  try {
    logger.info('🏛️  Checking library seeding...');
    
    const pinModel = new PinModel();
    const User = mongoose.model('User');
    
    // Check if any libraries exist (just for logging)
    const existingLibraries = await (pinModel as any).pin.countDocuments({ isPreSeeded: true });

    if (existingLibraries > 0) {
      logger.info(`♻️  Found ${existingLibraries} existing libraries. Syncing with latest data...`);
    } else {
      logger.info(`🆕 No existing libraries found. Creating new library pins...`);
    }

    // Find or create system user
    let systemUser = await User.findOne({ email: 'system@universe.app' });

    if (!systemUser) {
      logger.info('Creating system user for library pins...');
      systemUser = await User.create({
        email: 'system@universe.app',
        name: 'UniVerse System',
        username: 'universe_system',
        profilePicture: 'https://i.imgur.com/placeholder.png',
        bio: 'Official UBC library locations',
        googleId: 'system'
      });
    }

    // Clean up pre-seeded libraries that are no longer in the UBC_LIBRARIES array
    const currentLibraryNames = UBC_LIBRARIES.map(lib => lib.name);
    const deleteResult = await (pinModel as any).pin.deleteMany({
      isPreSeeded: true,
      category: PinCategory.STUDY, // Only delete STUDY category (libraries)
      name: { $nin: currentLibraryNames } // Delete if name is NOT in current list
    });

    if (deleteResult.deletedCount > 0) {
      logger.info(`🗑️  Removed ${deleteResult.deletedCount} outdated library pins`);
    }

    // Upsert library pins (update if exists, create if not)
    let createdCount = 0;
    let updatedCount = 0;

    for (const libraryData of UBC_LIBRARIES) {
      try {
        const result = await (pinModel as any).pin.updateOne(
          { 
            name: libraryData.name,
            isPreSeeded: true 
          },
          { 
            $set: {
              ...libraryData,
              createdBy: systemUser._id,
              isPreSeeded: true,
              status: 'active',
              visibility: 'public'
            }
          },
          { 
            upsert: true // Create if doesn't exist, update if it does
          }
        );
        
        if (result.upsertedCount > 0) {
          createdCount++;
          logger.info(`  ✓ Created: ${libraryData.name}`);
        } else if (result.modifiedCount > 0) {
          updatedCount++;
          logger.info(`  ♻️  Updated: ${libraryData.name}`);
        } else {
          logger.info(`  ━ No changes: ${libraryData.name}`);
        }
      } catch (error) {
        logger.error(`  ✗ Failed to upsert ${libraryData.name}:`, error);
      }
    }

    logger.info(`🎉 Library seeding complete! Created: ${createdCount}, Updated: ${updatedCount}, Deleted: ${deleteResult.deletedCount}, Total: ${UBC_LIBRARIES.length}`);
    
  } catch (error) {
    logger.error('❌ Library seeding failed:', error);
  }
}