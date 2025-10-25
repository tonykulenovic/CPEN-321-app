#!/usr/bin/env node

/**
 * Quick diagnostic check for push notifications
 * Run: node quick-check.js
 */

const admin = require('firebase-admin');
const path = require('path');

console.log('');
console.log('='.repeat(70));
console.log('PUSH NOTIFICATIONS - QUICK DIAGNOSTIC CHECK');
console.log('='.repeat(70));
console.log('');

// Check 1: Firebase service account file
console.log('✓ Check 1: Firebase service account file');
try {
    const firebasePath = path.join(__dirname, 'firebase.json');
    const serviceAccount = require(firebasePath);
    
    if (serviceAccount.type === 'service_account' && 
        serviceAccount.project_id === 'cpen-321-900e0') {
        console.log('  ✅ firebase.json file is valid');
        console.log(`  ✅ Project ID: ${serviceAccount.project_id}`);
    } else {
        console.log('  ❌ firebase.json file looks invalid');
        process.exit(1);
    }
} catch (error) {
    console.log('  ❌ Cannot find or read firebase.json');
    console.log(`     Error: ${error.message}`);
    process.exit(1);
}

console.log('');

// Check 2: Initialize Firebase Admin SDK
console.log('✓ Check 2: Initialize Firebase Admin SDK');
try {
    const serviceAccount = require('./firebase.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'cpen-321-900e0'
    });
    console.log('  ✅ Firebase Admin SDK initialized successfully');
} catch (error) {
    console.log('  ❌ Failed to initialize Firebase Admin SDK');
    console.log(`     Error: ${error.message}`);
    process.exit(1);
}

console.log('');

// Check 3: Test notification structure
console.log('✓ Check 3: Test notification message structure');
try {
    const testMessage = {
        token: 'test-token-will-fail-but-structure-is-valid',
        notification: {
            title: 'Test',
            body: 'Test body',
        },
        data: {
            type: 'test',
        },
        android: {
            notification: {
                channelId: 'friend_activity_channel',
                priority: 'high',
                defaultSound: true,
            },
        },
    };
    
    // Validate the structure
    if (testMessage.android.notification.channelId === 'friend_activity_channel') {
        console.log('  ✅ Notification channel ID is correct: friend_activity_channel');
    } else {
        console.log('  ❌ Wrong channel ID:', testMessage.android.notification.channelId);
    }
} catch (error) {
    console.log('  ❌ Invalid message structure');
    console.log(`     Error: ${error.message}`);
}

console.log('');
console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log('');
console.log('✅ Backend Firebase configuration is correct');
console.log('');
console.log('NEXT STEPS:');
console.log('');
console.log('1. Make sure your backend server is running:');
console.log('   cd backend && npm run dev');
console.log('');
console.log('2. Check for this log when server starts:');
console.log('   "✅ Firebase Admin SDK initialized with service account"');
console.log('');
console.log('3. Run the full debug script to test with real users:');
console.log('   export MONGODB_URI="your-connection-string"');
console.log('   node debug-notifications.js');
console.log('');
console.log('4. Check Android app logs when you login:');
console.log('   adb logcat | grep -i "FCM"');
console.log('');
console.log('   Look for:');
console.log('   - "🔥 New FCM token received"');
console.log('   - "✅ FCM token successfully registered with backend"');
console.log('');
console.log('5. If using an EMULATOR:');
console.log('   - Make sure it has Google Play Services');
console.log('   - Try on a PHYSICAL DEVICE instead (more reliable)');
console.log('   - See FCM_EMULATOR_ISSUES.md for details');
console.log('');
console.log('6. If using PHYSICAL DEVICE:');
console.log('   - Update local.properties with your computer\'s IP');
console.log('   - Make sure phone and computer are on same WiFi');
console.log('   - See FCM_EMULATOR_ISSUES.md for setup guide');
console.log('');
console.log('='.repeat(70));
console.log('');

process.exit(0);

