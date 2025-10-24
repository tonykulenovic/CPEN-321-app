const mongoose = require('mongoose');
require('dotenv').config();

async function debugFriendshipDirection() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const makaUserId = '68f6ae6002b320718fc9482f'; // Maka (you)
  const tomasUserId = '68f6ab1bbeb725bab56c9b7d'; // Tomas (TGF - being simulated)

  console.log('🔍 Debugging friendship direction for location sharing...');
  console.log(`👤 Maka (you): ${makaUserId}`);
  console.log(`👥 Tomas (TGF): ${tomasUserId}`);
  console.log('');

  // Check ALL friendship records between these users
  console.log('📋 Checking ALL friendship records...');
  const allFriendships = await db
    .collection('friendships')
    .find({
      $or: [
        {
          userId: new mongoose.Types.ObjectId(makaUserId),
          friendId: new mongoose.Types.ObjectId(tomasUserId),
        },
        {
          userId: new mongoose.Types.ObjectId(tomasUserId),
          friendId: new mongoose.Types.ObjectId(makaUserId),
        },
      ],
    })
    .toArray();

  console.log(`Found ${allFriendships.length} friendship records:`);
  allFriendships.forEach((f, i) => {
    const userLabel = f.userId.toString() === makaUserId ? 'Maka' : 'Tomas';
    const friendLabel = f.friendId.toString() === makaUserId ? 'Maka' : 'Tomas';

    console.log(
      `${i + 1}. ${userLabel} (${f.userId}) → ${friendLabel} (${f.friendId})`
    );
    console.log(`   Status: ${f.status}`);
    console.log(`   ShareLocation: ${f.shareLocation}`);
    console.log(`   RequestedBy: ${f.requestedBy}`);
    console.log(
      `   Meaning: ${userLabel} can ${f.shareLocation ? 'SEE' : 'NOT see'} ${friendLabel}'s location`
    );
    console.log('');
  });

  // Check specifically what Maka needs to see Tomas's location
  const makaCanSeeTomasRecord = allFriendships.find(
    f =>
      f.userId.toString() === makaUserId &&
      f.friendId.toString() === tomasUserId
  );

  console.log("🎯 For Maka to see Tomas's location, we need:");
  console.log(`   userId: ${makaUserId} (Maka)`);
  console.log(`   friendId: ${tomasUserId} (Tomas)`);
  console.log(`   shareLocation: true`);
  console.log('');

  if (!makaCanSeeTomasRecord) {
    console.log("❌ MISSING: No record found for Maka to see Tomas's location");
    console.log('🔧 Creating the missing friendship record...');

    const result = await db.collection('friendships').insertOne({
      userId: new mongoose.Types.ObjectId(makaUserId),
      friendId: new mongoose.Types.ObjectId(tomasUserId),
      status: 'accepted',
      shareLocation: true,
      closeFriend: false,
      requestedBy: new mongoose.Types.ObjectId(makaUserId), // or tomasUserId, doesn't matter for accepted friendships
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Created missing friendship record:', result.insertedId);
  } else if (makaCanSeeTomasRecord.shareLocation !== true) {
    console.log('❌ FOUND but shareLocation is false');
    console.log('🔧 Updating shareLocation to true...');

    await db
      .collection('friendships')
      .updateOne(
        { _id: makaCanSeeTomasRecord._id },
        { $set: { shareLocation: true, updatedAt: new Date() } }
      );

    console.log('✅ Updated shareLocation to true');
  } else {
    console.log('✅ CORRECT: Record exists with shareLocation: true');
  }

  // Also check Tomas's location data and privacy
  console.log("📍 Checking Tomas's recent location data...");
  const recentLocations = await db
    .collection('locations')
    .find({
      userId: new mongoose.Types.ObjectId(tomasUserId),
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();

  console.log(`Found ${recentLocations.length} recent locations for Tomas:`);
  recentLocations.forEach((loc, i) => {
    const timeAgo = Math.round(
      (Date.now() - loc.createdAt.getTime()) / (1000 * 60)
    );
    console.log(
      `${i + 1}. (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}) - Shared: ${loc.shared} - ${timeAgo}min ago`
    );
  });

  // Check Tomas's privacy settings
  console.log("🔒 Checking Tomas's privacy settings...");
  const tomasUser = await db.collection('users').findOne({
    _id: new mongoose.Types.ObjectId(tomasUserId),
  });

  if (tomasUser) {
    console.log('Tomas privacy:', JSON.stringify(tomasUser.privacy, null, 2));
  }

  await mongoose.disconnect();
  console.log(
    "\n🔧 Changes made! Try refreshing your app now to see Tomas's location on the map!"
  );
}

debugFriendshipDirection().catch(console.error);
