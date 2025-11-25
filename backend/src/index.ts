import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import path from 'path';

import { connectDB } from './config/database';
import { firebaseService } from './config/firebase';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler.middleware';
import { locationGateway } from './realtime/gateway';
import router from './routes/routes';
import { seedCafes } from './scripts/seedCafes';
import { seedLibraries } from './scripts/seedLibraries';
import { seedRestaurants } from './scripts/seedRestaurants';
import { BadgeService } from './services/badge.service';
import { recommendationScheduler } from './services/recommendationScheduler.service';

dotenv.config();


const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

app.use('/api', router);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('*', notFoundHandler);
app.use(errorHandler);

// Initialize location gateway with Socket.io
locationGateway.initialize(httpServer);

// Initialize Firebase for push notifications
firebaseService.initialize();

// Connect to database and initialize system data
void connectDB().then(async () => {
  console.log('\n🔄 Initializing system data...\n');
  
  try {
    // Initialize badges first (required for badge tracking)
    console.log('1️⃣  Initializing badge system...');
    await BadgeService.initializeDefaultBadges();
    console.log('   ✅ Badge system initialized\n');
    
    // Seed UBC libraries
    console.log('2️⃣  Seeding UBC libraries...');
    await seedLibraries();
    console.log('   ✅ Libraries seeded\n');
    
    // Seed cafes near UBC using Google Places API
    console.log('3️⃣  Seeding UBC cafes from Google Places API...');
    await seedCafes();
    console.log('   ✅ Cafes seeded\n');
    
    // Seed restaurants near UBC using Google Places API
    console.log('4️⃣  Seeding UBC restaurants from Google Places API...');
    await seedRestaurants();
    console.log('   ✅ Restaurants seeded\n');
    
    console.log('🎉 All system data initialized successfully!\n');
    
    // Final verification summary
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mongoose = require('mongoose');
    const badgeCount = await mongoose.connection.collection('badges').countDocuments();
    const libraryCount = await mongoose.connection.collection('pins').countDocuments({
      isPreSeeded: true,
      category: 'study'
    });
    const cafeCount = await mongoose.connection.collection('pins').countDocuments({
      isPreSeeded: true,
      category: 'shops_services',
      'metadata.subtype': 'cafe'
    });
    const restaurantCount = await mongoose.connection.collection('pins').countDocuments({
      isPreSeeded: true,
      category: 'shops_services',
      'metadata.subtype': 'restaurant'
    });
    
    // eslint-disable-next-line security/detect-console-log-non-literal
    console.log('📊 System Data Summary:');
    // eslint-disable-next-line security/detect-console-log-non-literal
    console.log(`   • Badges: ${badgeCount}`);
    // eslint-disable-next-line security/detect-console-log-non-literal
    console.log(`   • Pre-seeded Libraries: ${libraryCount}`);
    // eslint-disable-next-line security/detect-console-log-non-literal
    console.log(`   • Pre-seeded Cafes: ${cafeCount}`);
    // eslint-disable-next-line security/detect-console-log-non-literal
    console.log(`   • Pre-seeded Restaurants: ${restaurantCount}`);
    // eslint-disable-next-line security/detect-console-log-non-literal
    console.log(`   • Total Pre-seeded Pins: ${libraryCount + cafeCount + restaurantCount}\n`);
    
  } catch (err) {
    console.error('❌ Failed to initialize system data:', err);
  }
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line security/detect-console-log-non-literal
  console.log(`🚀 Server running on port ${PORT}`);
  // eslint-disable-next-line security/detect-console-log-non-literal
  console.log(`📡 Socket.io enabled for real-time location updates`);
  
  // Start recommendation scheduler
  recommendationScheduler.startScheduler();
  // eslint-disable-next-line security/detect-console-log-non-literal
  console.log(`⏰ Recommendation scheduler started`);
});

// Export app for testing
export default app;
export { app };
