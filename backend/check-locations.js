const mongoose = require('mongoose');

// Define the location schema inline
const locationSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    lat: Number,
    lng: Number,
    accuracyM: Number,
    createdAt: Date,
  },
  { collection: 'locations' }
);

const Location = mongoose.model('Location', locationSchema);

async function checkLocations() {
  try {
    await mongoose.connect(
      'mongodb+srv://makac1896_db_user:rUFWw41UEx7mKxiu@sandbox-1.gwqvi1m.mongodb.net/?retryWrites=true&w=majority&appName=sandbox-1'
    );

    const locations = await Location.find({
      userId: new mongoose.Types.ObjectId('68f6ab1bbeb725bab56c9b7d'),
    })
      .sort({ createdAt: -1 })
      .limit(5);
    console.log('Tomas recent locations:');
    console.log(JSON.stringify(locations, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLocations();
