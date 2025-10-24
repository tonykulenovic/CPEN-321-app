import mongoose from 'mongoose';
import { userModel } from '../models/user.model';

/**
 * Helper script to find user IDs in the database for simulation
 */
async function listUsers() {
  try {
    // Connect to database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cpen321');
      console.log('✅ Connected to MongoDB');
    }

    // Get all users with basic info
    const users = await userModel.searchUsers('', 50); // Empty query to get all users
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      process.exit(1);
    }

    console.log(`\n👥 Found ${users.length} users in database:`);
    console.log('====================================');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (@${user.username})`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Privacy: ${user.privacy?.location?.sharing || 'not set'}`);
      console.log('');
    });

    console.log('🚀 To run simulation with these users:');
    console.log('====================================');
    
    // Show example commands
    if (users.length >= 1) {
      console.log(`Single user: npm run simulate:users ${users[0]._id}`);
    }
    
    if (users.length >= 2) {
      console.log(`Multiple users: npm run simulate:users ${users[0]._id} ${users[1]._id}`);
    }
    
    if (users.length >= 3) {
      const allIds = users.slice(0, 3).map(u => u._id).join(' ');
      console.log(`First 3 users: npm run simulate:users ${allIds}`);
    }

    console.log('');
    console.log('💡 Tip: Users with location.sharing = "live" will be more realistic for testing');

  } catch (error) {
    console.error('❌ Error listing users:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  listUsers();
}

export { listUsers };