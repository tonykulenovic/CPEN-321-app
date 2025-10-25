# Simple Firebase Push Notifications Setup

## What's Already Done ✅

- **Android**: Firebase SDK integrated, messaging service configured
- **Backend**: Firebase Admin SDK installed, notification service ready, service account configured
- **Integration**: FCM tokens automatically sent to backend
- **Credentials**: Firebase service account key (`firebase.json`) already added

## Ready to Use! (1 Step)

### Just Start the Backend

```bash
cd backend
npm run dev
```

Then send a friend request from the mobile app - you should get a push notification!

## How It Works

1. **User logs in** → Android gets FCM token from Firebase
2. **Token sent to backend** → Stored via existing user endpoints
3. **Friend request sent** → Backend automatically sends push notification
4. **Notification appears** → Android shows notification with proper styling

## That's It!

No complex setup needed. The system automatically sends notifications for:

- New friend requests
- Accepted friend requests

Just add your Firebase credentials and it works!
