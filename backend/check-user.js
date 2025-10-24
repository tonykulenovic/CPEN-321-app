const mongoose = require('mongoose');

// Define the user schema inline
const userSchema = new mongoose.Schema(
  {
    email: String,
    username: String,
    privacy: {
      location: {
        sharing: { type: String, default: 'off' },
        precisionMeters: { type: Number, default: 30 },
      },
    },
  },
  { collection: 'users' }
);

const User = mongoose.model('User', userSchema);

async function checkUser() {
  try {
    await mongoose.connect(
      'mongodb+srv://makac1896_db_user:rUFWw41UEx7mKxiu@sandbox-1.gwqvi1m.mongodb.net/?retryWrites=true&w=majority&appName=sandbox-1'
    );

    // Check both users - Maka and Tomas
    const maka = await User.findById('68f6ae6002b320718fc9482f');
    console.log('Maka user record:');
    console.log(JSON.stringify(maka, null, 2));

    console.log('\n---\n');

    const tomas = await User.findById('68f6ab1bbeb725bab56c9b7d');
    console.log('Tomas user record:');
    console.log(JSON.stringify(tomas, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();
