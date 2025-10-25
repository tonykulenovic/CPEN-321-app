# Push Notifications Testing Guide

## Issues Fixed

### 1. ✅ Notification Channel ID Mismatch (MAIN ISSUE)
**Problem:** Backend was using `friend_activities` but Android app expected `friend_activity_channel`

**Fix:** Updated `backend/src/config/firebase.ts` to use `friend_activity_channel`

### 2. ✅ Missing POST_NOTIFICATIONS Permission
**Problem:** Android 13+ requires explicit permission to show notifications

**Fix:** Added `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />` to AndroidManifest.xml

### 3. ✅ Firebase Configuration Verified
- Firebase Admin SDK: ✅ Installed (`firebase-admin@13.5.0`)
- Firebase initialized on startup: ✅ Yes (line 34 in `backend/src/index.ts`)
- Project IDs match: ✅ Both use `cpen-321-900e0`
- Service account file: ✅ Present (`backend/firebase.json`)

---

## Testing Steps

### Step 1: Restart Backend Server
The channel ID change requires restarting the backend:

```bash
cd backend
npm run dev
```

Look for this log:
```
✅ Firebase Admin SDK initialized with service account
```

### Step 2: Test FCM Token Registration

1. **Launch the Android app**
2. **Login with a test account**
3. **Check Android logs** (Logcat):
   ```
   🔥 New FCM token received: [token...]
   🔥 FCM token successfully sent to backend
   📱 FCM token updated for user [username]
   ```

4. **Verify in MongoDB** that the user's `fcmToken` field is populated:
   ```bash
   # Connect to your MongoDB
   db.users.findOne({ email: "test@example.com" }, { fcmToken: 1, name: 1 })
   ```

### Step 3: Test Friend Request Notification

**Scenario:** User A sends friend request to User B

1. **Device 1 (Sender)**: Login as User A
2. **Device 2 (Receiver)**: Login as User B (ensure app is running)
3. **Device 1**: Send friend request to User B
4. **Check Backend Logs**:
   ```
   📲 Sent friend request notification to [User B name]
   Successfully sent message: [message-id]
   ```

5. **Check Device 2 (Receiver)**:
   - Should see notification appear in system tray
   - Title: "New Friend Request"
   - Body: "[User A name] sent you a friend request"

### Step 4: Test Friend Request Accepted Notification

1. **Device 2 (Receiver)**: Accept the friend request
2. **Check Backend Logs**:
   ```
   📲 Sent friend request accepted notification to [User A name]
   ```

3. **Check Device 1 (Sender)**:
   - Should see notification appear
   - Title: "Friend Request Accepted"
   - Body: "[User B name] accepted your friend request"

---

## Debugging If Notifications Still Don't Work

### Check 1: FCM Token Registration
**Android Logs:**
```bash
# Filter for FCM logs
adb logcat | grep -i "FCM\|Firebase"
```

**Expected logs:**
- `🔥 Firebase Messaging Service created`
- `🔥 New FCM token received: ...`
- `✅ FCM token successfully registered with backend`

### Check 2: Backend Notification Sending
**Backend Logs:**
```bash
# Look for these patterns
grep "FCM token" backend.log
grep "Sent friend request notification" backend.log
```

**Expected:**
- `📱 FCM token updated for user [name]`
- `📲 Sent friend request notification to [name]`
- `Successfully sent message: [message-id]`

**If you see errors:**
- `No FCM token for user` → Token not registered (check Step 2)
- `Error sending notification` → Check Firebase service account permissions

### Check 3: Android Notification Channel
**Test manually in Android:**
```kotlin
// Check if notification channel exists
val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
val channel = notificationManager.getNotificationChannel("friend_activity_channel")
if (channel == null) {
    Log.e("TEST", "❌ Notification channel not created!")
}
```

### Check 4: POST_NOTIFICATIONS Permission (Android 13+)
**Check if permission is granted:**
```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
        != PackageManager.PERMISSION_GRANTED) {
        Log.e("TEST", "❌ POST_NOTIFICATIONS permission NOT granted!")
        // Request permission
        ActivityCompat.requestPermissions(this, 
            arrayOf(Manifest.permission.POST_NOTIFICATIONS), 100)
    }
}
```

### Check 5: Firebase Service Account Permissions
Verify the service account in `backend/firebase.json` has correct permissions:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project `cpen-321-900e0`
3. Settings → Service Accounts
4. Verify the service account has "Firebase Cloud Messaging Admin" role

---

## Common Issues

### Issue: "No FCM token for user"
**Cause:** FCM token not registered on backend
**Solution:** 
1. Check if `FCMTokenManager.registerFCMToken()` is called after login
2. Verify in logs: `✅ FCM token successfully registered with backend`

### Issue: "Error sending notification: Requested entity was not found"
**Cause:** Invalid FCM token or token expired
**Solution:** 
1. Clear app data and re-login
2. Token will be regenerated and re-registered

### Issue: Notifications work in foreground but not background
**Cause:** Android power management killing the app
**Solution:**
1. Disable battery optimization for the app
2. Settings → Apps → Your App → Battery → Unrestricted

### Issue: "messaging/invalid-argument"
**Cause:** Malformed notification payload
**Solution:** Check `backend/src/config/firebase.ts` - ensure all fields are strings in the `data` object

---

## Manual Testing with cURL

You can test the backend directly:

```bash
# 1. Get your auth token (login via app and check logs)
TOKEN="your-jwt-token"

# 2. Send friend request
curl -X POST http://localhost:3000/api/friends/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toUserId": "receiver-user-id"}'

# Expected response:
# {
#   "message": "Friend request sent successfully",
#   "data": { "requestId": "...", "status": "pending" }
# }

# Check backend logs for:
# 📲 Sent friend request notification to [user name]
```

---

## Success Criteria

✅ **All of these should work:**
1. FCM token is generated when app starts
2. FCM token is sent to backend and saved in MongoDB
3. Friend request triggers notification on receiver's device
4. Friend request acceptance triggers notification on sender's device
5. Tapping notification opens the app
6. Notification appears both in foreground and background

---

## Next Steps If Everything Works

1. Test on physical devices (not just emulators)
2. Test with app in background/killed state
3. Test with multiple users
4. Add notification sound/vibration customization
5. Add notification actions (e.g., "Accept" button directly in notification)

