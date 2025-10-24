const mongoose = require('mongoose');
require('dotenv').config();

async function debugLocationRetrieval() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const yourUserId = '68f6ae6002b320718fc9482f'; // You (Makatendeka)
  const friendUserId = '68f6ab1bbeb725bab56c9b7d'; // Friend (Tomas)

  console.log('🔍 Debugging location retrieval step by step...\n');

  // Step 1: Check friendships
  console.log('Step 1: Finding accepted friendships with location sharing...');
  const friendships = await db
    .collection('friendships')
    .find({
      userId: new mongoose.Types.ObjectId(yourUserId),
      status: 'accepted',
    })
    .toArray();

  console.log(`Found ${friendships.length} accepted friendships:`);
  friendships.forEach(f => {
    console.log(`  ${f.friendId} - shareLocation: ${f.shareLocation}`);
  });

  const friendsWithSharing = friendships.filter(f => f.shareLocation);
  console.log(
    `Friends with location sharing enabled: ${friendsWithSharing.length}\n`
  );

  if (friendsWithSharing.length === 0) {
    console.log('❌ No friends with location sharing enabled');
    await mongoose.disconnect();
    return;
  }

  // Step 2: Check raw locations in database
  console.log('Step 2: Checking raw location data...');
  const friendIds = friendsWithSharing.map(f => f.friendId);
  console.log(
    'Looking for locations for friend IDs:',
    friendIds.map(id => id.toString())
  );

  const rawLocations = await db
    .collection('locations')
    .find({
      userId: { $in: friendIds },
    })
    .sort({ createdAt: -1 })
    .toArray();

  console.log(`Found ${rawLocations.length} raw location records:`);
  rawLocations.forEach((loc, i) => {
    console.log(`  ${i + 1}. User: ${loc.userId}`);
    console.log(`     Location: (${loc.lat}, ${loc.lng})`);
    console.log(`     Shared: ${loc.shared}`);
    console.log(`     Expires: ${loc.expiresAt}`);
    console.log(`     Created: ${loc.createdAt}`);
    console.log(`     Is Expired: ${new Date() > new Date(loc.expiresAt)}\n`);
  });

  // Step 3: Filter for non-expired, shared locations
  console.log('Step 3: Filtering for valid locations...');
  const validLocations = rawLocations.filter(
    loc => new Date() < new Date(loc.expiresAt) && loc.shared === true
  );

  console.log(
    `Valid (non-expired, shared) locations: ${validLocations.length}`
  );
  validLocations.forEach((loc, i) => {
    console.log(
      `  ${i + 1}. User: ${loc.userId} at (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`
    );
  });

  // Step 4: Test the aggregation pipeline
  console.log('\nStep 4: Testing aggregation pipeline...');
  const aggregationResult = await db
    .collection('locations')
    .aggregate([
      {
        $match: {
          userId: { $in: friendIds },
          expiresAt: { $gt: new Date() },
          shared: true,
        },
      },
      {
        $sort: { userId: 1, createdAt: -1 },
      },
      {
        $group: {
          _id: '$userId',
          latestLocation: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: { newRoot: '$latestLocation' },
      },
    ])
    .toArray();

  console.log(`Aggregation result: ${aggregationResult.length} locations`);
  aggregationResult.forEach((loc, i) => {
    console.log(
      `  ${i + 1}. User: ${loc.userId} at (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`
    );
  });

  // Step 5: Check user privacy settings
  console.log('\nStep 5: Checking user privacy settings...');
  for (const loc of aggregationResult) {
    const user = await db.collection('users').findOne({ _id: loc.userId });
    if (user) {
      console.log(`User ${user.name} (${user._id}):`);
      console.log(
        `  Privacy location sharing: ${user.privacy?.location?.sharing || 'not set'}`
      );
      console.log(
        `  Should be included: ${user.privacy?.location?.sharing !== 'off'}`
      );
    }
  }

  await mongoose.disconnect();

  console.log(
    '\n💡 If you see valid locations but the API returns empty data,'
  );
  console.log('   the issue is likely in the privacy filtering logic.');
}

debugLocationRetrieval().catch(console.error);
