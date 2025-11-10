import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from '../config/database';
import logger from '../utils/logger.util';
import { PinVisibility } from '../types/pins.types';
import '../models/pin.model'; // Import to register the schema

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migratePinVisibility() {
  try {
    logger.info('🔄 Starting pin visibility migration...');
    
    // Connect to database
    await connectDB();
    
    const pinModel = mongoose.model('Pin');
    
    // Update all pins that don't have a visibility field or have it as undefined
    const result = await pinModel.updateMany(
      { 
        $or: [
          { visibility: { $exists: false } },
          { visibility: null }
        ]
      },
      { 
        $set: { visibility: PinVisibility.PUBLIC }
      }
    );
    
    logger.info(`✅ Migration complete! Updated ${result.modifiedCount} pins to have PUBLIC visibility`);
    
    // Show summary
    const visibilityCounts = await pinModel.aggregate([
      {
        $group: {
          _id: '$visibility',
          count: { $sum: 1 }
        }
      }
    ]);
    
    logger.info('📊 Current visibility distribution:');
    visibilityCounts.forEach((item: any) => {
      logger.info(`  ${item._id ?? 'undefined'}: ${item.count} pins`);
    });
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

void migratePinVisibility();

