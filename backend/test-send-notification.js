#!/usr/bin/env node

/**
 * Test sending a notification to a specific user
 * Usage: node test-send-notification.js <userEmail>
 * Example: node test-send-notification.js user@example.com
 */

const mongoose = require('mongoose');
const admin = require('firebase-admin');

// Get user email from command line
const userEmail = process.argv[2];

if (!userEmail) {
    console.error('❌ Usage: node test-send-notification.js <userEmail>');
    console.error('   Example: node test-send-notification.js user@example.com');
    process.exit(1);
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable not set');
    console.error('   Set it with: export MONGODB_URI="your-connection-string"');
    process.exit(1);
}

// Initialize Firebase
try {
    const serviceAccount = require('./firebase.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'cpen-321-900e0'
    });
    console.log('✅ Firebase Admin SDK initialized\n');
} catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    process.exit(1);
}

// User schema
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    fcmToken: String,
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function testSendNotification() {
    try {
        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find user by email
        console.log(`🔍 Looking for user: ${userEmail}`);
        const user = await User.findOne({ email: userEmail }).lean();

        if (!user) {
            console.error(`❌ User not found with email: ${userEmail}`);
            await mongoose.disconnect();
            process.exit(1);
        }

        console.log(`✅ Found user: ${user.name}`);
        console.log(`   User ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);

        if (!user.fcmToken) {
            console.error('❌ User does not have an FCM token!');
            console.log('   The user needs to login on the Android app first.');
            await mongoose.disconnect();
            process.exit(1);
        }

        console.log(`✅ User has FCM token: ${user.fcmToken.substring(0, 30)}...\n`);

        // Prepare notification
        const message = {
            token: user.fcmToken,
            notification: {
                title: 'Test Notification from Debug Script',
                body: `Hi ${user.name}! This is a test notification.`,
            },
            data: {
                type: 'test',
                timestamp: new Date().toISOString(),
                testId: 'debug-script-test',
            },
            android: {
                notification: {
                    channelId: 'friend_activity_channel',
                    priority: 'high',
                    defaultSound: true,
                },
            },
        };

        console.log('📤 Attempting to send notification...');
        console.log('   Title:', message.notification.title);
        console.log('   Body:', message.notification.body);
        console.log('   Channel ID:', message.android.notification.channelId);
        console.log('   Token:', user.fcmToken.substring(0, 30) + '...\n');

        // Send notification
        const response = await admin.messaging().send(message);
        
        console.log('✅✅✅ SUCCESS! Notification sent! ✅✅✅');
        console.log(`   Message ID: ${response}\n`);

        console.log('='.repeat(70));
        console.log('CHECK YOUR DEVICE NOW!');
        console.log('='.repeat(70));
        console.log('');
        console.log('You should see a notification with:');
        console.log(`   Title: "Test Notification from Debug Script"`);
        console.log(`   Body: "Hi ${user.name}! This is a test notification."`);
        console.log('');
        console.log('If you DID receive it: ✅ Notifications are working!');
        console.log('   → The issue might be with the friend request flow specifically');
        console.log('');
        console.log('If you DID NOT receive it:');
        console.log('   1. Check the Android app is running (foreground or background)');
        console.log('   2. Check notification permissions are granted');
        console.log('   3. Check device is connected to internet');
        console.log('   4. Try force-stopping and restarting the app');
        console.log('   5. Check if notification channel exists in app');
        console.log('');

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nFull error details:');
        console.error(error);

        console.log('\n='.repeat(70));
        console.log('DIAGNOSIS:');
        console.log('='.repeat(70));

        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
            console.log('\n❌ The FCM token is INVALID or EXPIRED');
            console.log('\nPossible causes:');
            console.log('   1. User logged out and got a new token');
            console.log('   2. App was uninstalled and reinstalled');
            console.log('   3. Token expired (FCM tokens can expire)');
            console.log('   4. Using emulator without proper Google Play Services');
            console.log('\nSOLUTION:');
            console.log('   1. Clear app data on the device');
            console.log('   2. Login again on the Android app');
            console.log('   3. Run this test script again');
            console.log('');

        } else if (error.code === 'messaging/invalid-argument') {
            console.log('\n❌ The notification message format is INVALID');
            console.log('\nThis is a code issue. Check:');
            console.log('   1. All data fields must be strings');
            console.log('   2. Notification structure is correct');
            console.log('   3. Channel ID is valid');
            console.log('');

        } else if (error.code === 'messaging/authentication-error') {
            console.log('\n❌ Firebase AUTHENTICATION FAILED');
            console.log('\nCheck:');
            console.log('   1. firebase.json service account file is correct');
            console.log('   2. Service account has "Firebase Cloud Messaging Admin" role');
            console.log('   3. Project ID matches: cpen-321-900e0');
            console.log('');

        } else if (error.code === 'messaging/third-party-auth-error') {
            console.log('\n❌ Firebase service account CREDENTIALS are invalid');
            console.log('\nSOLUTION:');
            console.log('   1. Go to Firebase Console → Project Settings');
            console.log('   2. Service Accounts tab');
            console.log('   3. Generate new private key');
            console.log('   4. Replace backend/firebase.json with the new file');
            console.log('');

        } else {
            console.log('\n❌ Unknown error occurred');
            console.log('\nTry:');
            console.log('   1. Check Firebase Console for service health');
            console.log('   2. Verify the service account has proper permissions');
            console.log('   3. Check if Firebase Messaging API is enabled');
            console.log('');
        }

        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

// Run the test
testSendNotification();

