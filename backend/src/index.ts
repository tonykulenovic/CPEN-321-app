import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { connectDB } from './config/database';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler.middleware';
import router from './routes/routes';
import path from 'path';
import { locationGateway } from './realtime/gateway';
import { BadgeService } from './services/badge.service';
import { seedLibraries } from './scripts/seedLibraries';
import { seedCafes } from './scripts/seedCafes';
import { firebaseService } from './config/firebase';

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
connectDB().then(() => {
  // Initialize badges after database connection is established
  BadgeService.initializeDefaultBadges()
    .then(() => {
      console.log('✅ Badge system initialized');
    })
    .catch(err => {
      console.error('⚠️  Failed to initialize badges:', err);
    });
  
  // Seed UBC libraries
  seedLibraries()
    .catch(err => {
      console.error('⚠️  Failed to seed libraries:', err);
    });
  
  // Seed cafes near UBC using Google Places API
  seedCafes()
    .catch(err => {
      console.error('⚠️  Failed to seed cafes:', err);
    });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io enabled for real-time location updates`);
});
