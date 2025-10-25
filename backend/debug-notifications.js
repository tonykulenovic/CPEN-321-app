/**
 * Debug script to test push notifications
 * Run: node debug-notifications.js
 */

const mongoose = require('mongoose');
const admin = require('firebase-admin');
const path = require('path');

// MongoDB connection string (replace with your actual connection string)
const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-connection-string';

// Initialize Firebase
try {
    const serviceAccount = require('./firebase.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'cpen-321-900e0'
    });
    console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    process.exit(1);
}

// Define User schema
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    fcmToken: String,
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function debugNotifications() {
    try {
        // Connect to MongoDB
        console.log('\n📡 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // 1. Check all users and their FCM tokens
        console.log('='.repeat(60));
        console.log('STEP 1: Checking all users and their FCM tokens');
        console.log('='.repeat(60));
        
        const users = await User.find({}, 'name email fcmToken').lean();
        console.log(`\nFound ${users.length} users:\n`);
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.email})`);
            console.log(`   User ID: ${user._id}`);
            console.log(`   Has FCM Token: ${user.fcmToken ? '✅ YES' : '❌ NO'}`);
            if (user.fcmToken) {
                console.log(`   Token: ${user.fcmToken.substring(0, 30)}...`);
            }
            console.log('');
        });

        // 2. Check if there are any users without FCM tokens
        const usersWithoutTokens = users.filter(u => !u.fcmToken);
        if (usersWithoutTokens.length > 0) {
            console.log('⚠️  Warning: Found users without FCM tokens:');
            usersWithoutTokens.forEach(u => {
                console.log(`   - ${u.name} (${u.email})`);
            });
            console.log('\n   Action: These users need to login on the Android app to register their FCM token\n');
        }

        // 3. Test sending notification to first user with token
        const usersWithTokens = users.filter(u => u.fcmToken);
        if (usersWithTokens.length === 0) {
            console.log('❌ No users with FCM tokens found. Cannot test notifications.');
            console.log('   Action: Login on the Android app first to register an FCM token\n');
            await mongoose.disconnect();
            return;
        }

        console.log('='.repeat(60));
        console.log('STEP 2: Testing notification sending');
        console.log('='.repeat(60));
        
        const testUser = usersWithTokens[0];
        console.log(`\nTesting with user: ${testUser.name} (${testUser.email})`);
        console.log(`FCM Token: ${testUser.fcmToken.substring(0, 30)}...\n`);

        // Try to send a test notification
        try {
            const message = {
                token: testUser.fcmToken,
                notification: {
                    title: 'Test Notification',
                    body: 'This is a test notification from the debug script',
                },
                data: {
                    type: 'test',
                    timestamp: new Date().toISOString(),
                },
                android: {
                    notification: {
                        channelId: 'friend_activity_channel',
                        priority: 'high',
                        defaultSound: true,
                    },
                },
            };

            console.log('📤 Sending test notification...');
            const response = await admin.messaging().send(message);
            console.log('✅ Notification sent successfully!');
            console.log(`   Message ID: ${response}\n`);
            
            console.log('='.repeat(60));
            console.log('SUCCESS! Notifications are working!');
            console.log('='.repeat(60));
            console.log('\nIf you did NOT receive the notification on your device:');
            console.log('1. Check the Android app is running or in background');
            console.log('2. Check notification permissions are granted (Android Settings)');
            console.log('3. Check the notification channel exists in the app');
            console.log('4. Check device is connected to internet');
            console.log('5. Try force-stopping and restarting the app\n');
            
        } catch (error) {
            console.error('❌ Failed to send notification:');
            console.error(`   Error Code: ${error.code || 'N/A'}`);
            console.error(`   Error Message: ${error.message}`);
            
            console.log('\n='.repeat(60));
            console.log('DIAGNOSIS:');
            console.log('='.repeat(60));
            
            if (error.code === 'messaging/invalid-registration-token' || 
                error.code === 'messaging/registration-token-not-registered') {
                console.log('\n❌ FCM Token is invalid or expired');
                console.log('   Action: The user needs to login again on the Android app to get a new token\n');
            } else if (error.code === 'messaging/invalid-argument') {
                console.log('\n❌ Invalid message format');
                console.log('   Action: Check the notification payload structure\n');
            } else if (error.code === 'messaging/authentication-error') {
                console.log('\n❌ Firebase authentication failed');
                console.log('   Action: Check your firebase.json service account file\n');
            } else {
                console.log('\n❌ Unknown error');
                console.log('   Action: Check the error details above\n');
            }
        }

        // 4. Test with multiple users if available
        if (usersWithTokens.length > 1) {
            console.log('='.repeat(60));
            console.log('STEP 3: Listing all testable users');
            console.log('='.repeat(60));
            console.log('\nYou can test friend requests between these users:\n');
            usersWithTokens.forEach((user, index) => {
                console.log(`${index + 1}. ${user.name}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   User ID: ${user._id}`);
                console.log('');
            });
        }

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

// Run the debug script
debugNotifications();

