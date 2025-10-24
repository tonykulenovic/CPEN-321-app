import mongoose from 'mongoose';
import axios from 'axios';
import { userModel } from '../models/user.model';
import logger from '../utils/logger.util';

// Configuration
const DEV_TOKEN = process.env.DEV_AUTH_TOKEN || 'dev-token-12345';
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const SIMULATION_DURATION = 5 * 60 * 1000; // 5 minutes
const UPDATE_INTERVAL = 2000; // 2 seconds

// UBC Vancouver coordinates and boundaries
const UBC_CENTER = { lat: 49.2606, lng: -123.2460 };
const UBC_BOUNDS = {
  north: 49.2750,
  south: 49.2450,
  east: -123.2200,
  west: -123.2700
};

interface SimulatedUser {
  id: string;
  name: string;
  username: string;
  currentLocation: { lat: number; lng: number };
  targetLocation: { lat: number; lng: number };
  speed: number; // degrees per update
  path: { lat: number; lng: number }[]; // Track movement path
}

class LocationSimulator {
  private simulatedUsers: SimulatedUser[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Initialize simulator with real user IDs
   */
  async initialize(userIds: string[]): Promise<void> {
    console.log('🚀 Initializing Location Simulator with real users...');
    
    try {
      // Validate and load real users
      for (const userId of userIds) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          console.error(`❌ Invalid user ID: ${userId}`);
          continue;
        }

        const user = await userModel.findById(new mongoose.Types.ObjectId(userId));
        if (!user) {
          console.error(`❌ User not found: ${userId}`);
          continue;
        }

        // Create simulated user object
        const simulatedUser: SimulatedUser = {
          id: user._id.toString(),
          name: user.name,
          username: user.username,
          currentLocation: this.generateRandomLocationInUBC(),
          targetLocation: this.generateRandomLocationInUBC(),
          speed: 0.0001 + Math.random() * 0.0002, // Random walking speed
          path: [],
        };

        // Add starting location to path
        simulatedUser.path.push({ ...simulatedUser.currentLocation });

        this.simulatedUsers.push(simulatedUser);
        console.log(`👤 Added user to simulation: ${user.name} (@${user.username}) - ID: ${user._id}`);
      }

      if (this.simulatedUsers.length === 0) {
        throw new Error('No valid users found for simulation');
      }

      console.log(`✅ Initialization complete with ${this.simulatedUsers.length} users!`);
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      throw error;
    }
  }

  private generateRandomLocationInUBC(): { lat: number; lng: number } {
    return {
      lat: UBC_BOUNDS.south + Math.random() * (UBC_BOUNDS.north - UBC_BOUNDS.south),
      lng: UBC_BOUNDS.west + Math.random() * (UBC_BOUNDS.east - UBC_BOUNDS.west),
    };
  }

  private moveUserTowardsTarget(user: SimulatedUser): void {
    const dx = user.targetLocation.lng - user.currentLocation.lng;
    const dy = user.targetLocation.lat - user.currentLocation.lat;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < user.speed) {
      // Reached target, set new random target
      user.targetLocation = this.generateRandomLocationInUBC();
      console.log(`🎯 ${user.username} reached target, setting new destination`);
    } else {
      // Move towards target
      const moveX = (dx / distance) * user.speed;
      const moveY = (dy / distance) * user.speed;
      
      user.currentLocation.lng += moveX;
      user.currentLocation.lat += moveY;

      // Add to path (keep last 50 points)
      user.path.push({ ...user.currentLocation });
      if (user.path.length > 50) {
        user.path.shift();
      }
    }
  }

  private async updateUserLocation(user: SimulatedUser): Promise<void> {
    try {
      const response = await axios.post(
        `${BASE_URL}/location/my-location`,
        {
          lat: user.currentLocation.lat,
          lng: user.currentLocation.lng,
          accuracyM: 5,
        },
        {
          headers: {
            'Authorization': `Bearer ${DEV_TOKEN}`,
            'x-dev-user-id': user.id,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      if (response.status === 201) {
        console.log(`📍 ${user.username}: (${user.currentLocation.lat.toFixed(4)}, ${user.currentLocation.lng.toFixed(4)})`);
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.error(`❌ Cannot connect to server. Make sure backend is running on ${BASE_URL}`);
      } else {
        console.error(`❌ Failed to update location for ${user.username}:`, error.message);
      }
    }
  }

  async startSimulation(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Simulation already running');
      return;
    }

    console.log(`🎬 Starting location simulation for ${this.simulatedUsers.length} users...`);
    console.log(`⏱️  Duration: ${SIMULATION_DURATION / 1000}s, Interval: ${UPDATE_INTERVAL / 1000}s`);
    console.log('📱 Users will move around UBC campus in real-time');
    console.log('🗺️  You can track their movements on the frontend map');
    
    this.isRunning = true;
    let updateCount = 0;
    const maxUpdates = SIMULATION_DURATION / UPDATE_INTERVAL;

    this.intervalId = setInterval(async () => {
      updateCount++;
      console.log(`\n🔄 Update ${updateCount}/${maxUpdates}`);

      // Move and update each user
      const updatePromises = this.simulatedUsers.map(async (user) => {
        this.moveUserTowardsTarget(user);
        await this.updateUserLocation(user);
      });

      await Promise.all(updatePromises);

      // Stop after duration
      if (updateCount >= maxUpdates) {
        await this.stopSimulation();
      }
    }, UPDATE_INTERVAL);

    // Auto-stop after simulation duration
    setTimeout(() => {
      if (this.isRunning) {
        this.stopSimulation();
      }
    }, SIMULATION_DURATION);
  }

  async stopSimulation(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('\n🛑 Stopping simulation...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Simulation stopped');
    this.printMovementSummary();
  }

  printUserInfo(): void {
    console.log('\n👥 Users in Simulation:');
    console.log('====================================');
    this.simulatedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (@${user.username})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Current: (${user.currentLocation.lat.toFixed(4)}, ${user.currentLocation.lng.toFixed(4)})`);
      console.log(`   Target: (${user.targetLocation.lat.toFixed(4)}, ${user.targetLocation.lng.toFixed(4)})`);
      console.log(`   Speed: ${user.speed.toFixed(6)} degrees/update`);
      console.log('');
    });
    
    console.log('🔧 Dev Token Configuration:');
    console.log(`   Authorization: Bearer ${DEV_TOKEN}`);
    console.log(`   x-dev-user-id: <user_id_from_above>`);
    console.log('');
  }

  private printMovementSummary(): void {
    console.log('\n📊 Movement Summary:');
    console.log('====================================');
    this.simulatedUsers.forEach((user) => {
      const pathLength = user.path.length;
      if (pathLength > 1) {
        const start = user.path[0];
        const end = user.path[pathLength - 1];
        const totalDistance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
        console.log(`${user.username}: Moved ${totalDistance.toFixed(0)}m over ${pathLength} updates`);
      }
    });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  getSimulatedUsers(): SimulatedUser[] {
    return this.simulatedUsers;
  }
}

// CLI interface for running the simulator
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run simulate:users <user_id1> [user_id2] [user_id3] ...');
    console.log('');
    console.log('Example:');
    console.log('  npm run simulate:users 507f1f77bcf86cd799439011');
    console.log('  npm run simulate:users 507f1f77bcf86cd799439011 507f1f77bcf86cd799439012');
    console.log('');
    console.log('First, find user IDs by querying your database or checking user profiles.');
    process.exit(1);
  }

  const userIds = args;
  const simulator = new LocationSimulator();
  
  try {
    // Connect to database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cpen321');
      console.log('✅ Connected to MongoDB');
    }

    await simulator.initialize(userIds);
    simulator.printUserInfo();

    console.log('\n🚀 Starting simulation in 3 seconds...');
    console.log('💡 Tip: Open your frontend map to watch users move in real-time!');
    await new Promise(resolve => setTimeout(resolve, 3000));

    await simulator.startSimulation();

    // Cleanup on exit
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received interrupt signal');
      await simulator.stopSimulation();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Simulation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { LocationSimulator };