const mongoose = require('mongoose');

// Define schema inline
const PinSchema = new mongoose.Schema({
  name: String,
  category: String,
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  isPreSeeded: Boolean
}, { collection: 'pins' });

const Pin = mongoose.model('Pin', PinSchema);

async function checkLibraryCoordinates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cpen321');
    console.log(`📍 Database: ${mongoose.connection.db.databaseName}`);
    console.log('✅ MongoDB connected\n');

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📦 Collections in database:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    console.log('');

    // Try all variations
    const allPins = await Pin.find({}).select('name category location isPreSeeded').lean();
    console.log(`📊 Total pins in database: ${allPins.length}\n`);
    
    const studyPins = allPins.filter(p => p.category === 'study');
    console.log(`📚 Study category pins: ${studyPins.length}`);
    
    const preSeededPins = allPins.filter(p => p.isPreSeeded === true);
    console.log(`🌱 Pre-seeded pins: ${preSeededPins.length}\n`);
    
    const libraries = studyPins.filter(p => p.isPreSeeded === true);

    console.log('📚 Library Coordinates in Database:\n');
    libraries.forEach(lib => {
      console.log(`${lib.name}:`);
      console.log(`  Lat: ${lib.location.latitude}`);
      console.log(`  Lng: ${lib.location.longitude}`);
      console.log(`  Address: ${lib.location.address}\n`);
    });

    console.log(`\n📊 Total libraries found: ${libraries.length}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkLibraryCoordinates();

