package com.cpen321.usermanagement.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.cpen321.usermanagement.MainActivity
import com.cpen321.usermanagement.R
import com.cpen321.usermanagement.data.local.preferences.TokenManager
import com.cpen321.usermanagement.data.repository.ProfileRepository
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class PushNotificationService : FirebaseMessagingService() {

    @Inject
    lateinit var tokenManager: TokenManager

    @Inject
    lateinit var profileRepository: ProfileRepository

    companion object {
        private const val TAG = "PushNotificationService"
        private const val CHANNEL_ID = "friend_activity_channel"
        private const val CHANNEL_NAME = "Friend Activity"
        private const val CHANNEL_DESCRIPTION = "Notifications for friend-related activities"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        Log.d(TAG, "🔥 Firebase Messaging Service created")
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.i(TAG, "🆕 [FCM-SERVICE] New FCM token received!")
        Log.d(TAG, "🔑 [FCM-SERVICE] Token preview: ${token.take(30)}...${token.takeLast(10)}")
        Log.d(TAG, "📏 [FCM-SERVICE] Token length: ${token.length} characters")
        Log.d(TAG, "⏰ [FCM-SERVICE] Token received at: ${System.currentTimeMillis()}")
        
        // Save token locally and send to backend
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Log.d(TAG, "💾 [FCM-SERVICE] Saving token locally...")
                tokenManager.saveFcmToken(token)
                Log.d(TAG, "✅ [FCM-SERVICE] Token saved locally")
                
                Log.d(TAG, "📤 [FCM-SERVICE] Sending token to backend...")
                val startTime = System.currentTimeMillis()
                val result = profileRepository.updateFcmToken(token)
                val duration = System.currentTimeMillis() - startTime
                
                if (result.isSuccess) {
                    Log.i(TAG, "🎉 [FCM-SERVICE] Token successfully sent to backend in ${duration}ms")
                } else {
                    Log.e(TAG, "� [FCM-SERVICE] Failed to send token to backend in ${duration}ms")
                    Log.e(TAG, "   💬 Error: ${result.exceptionOrNull()?.message}")
                    result.exceptionOrNull()?.printStackTrace()
                }
            } catch (e: Exception) {
                Log.e(TAG, "� [FCM-SERVICE] Exception in onNewToken:", e)
                e.printStackTrace()
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.i(TAG, "� [FCM-SERVICE] Push notification received!")
        Log.d(TAG, "📍 [FCM-SERVICE] From: ${remoteMessage.from}")
        Log.d(TAG, "🆔 [FCM-SERVICE] Message ID: ${remoteMessage.messageId}")
        Log.d(TAG, "⏰ [FCM-SERVICE] Received at: ${System.currentTimeMillis()}")
        Log.d(TAG, "📱 [FCM-SERVICE] Message type: ${remoteMessage.messageType}")
        Log.d(TAG, "🎯 [FCM-SERVICE] To: ${remoteMessage.to}")

        try {
            // Handle data payload
            if (remoteMessage.data.isNotEmpty()) {
                Log.d(TAG, "� [FCM-SERVICE] Data payload found (${remoteMessage.data.size} keys)")
                Log.d(TAG, "📋 [FCM-SERVICE] Data: ${remoteMessage.data}")
                Log.d(TAG, "🔄 [FCM-SERVICE] Processing data message...")
                handleDataMessage(remoteMessage.data)
                Log.d(TAG, "✅ [FCM-SERVICE] Data message processed")
            } else {
                Log.w(TAG, "⚠️ [FCM-SERVICE] No data payload found")
            }

            // Handle notification payload
            remoteMessage.notification?.let { notification ->
                Log.d(TAG, "� [FCM-SERVICE] Notification payload found")
                Log.d(TAG, "🏷️ [FCM-SERVICE] Title: '${notification.title}'")
                Log.d(TAG, "📝 [FCM-SERVICE] Body: '${notification.body}'")
                Log.d(TAG, "🎨 [FCM-SERVICE] Icon: '${notification.icon}'")
                Log.d(TAG, "🏞️ [FCM-SERVICE] Image URL: '${notification.imageUrl}'")
                Log.d(TAG, "🔊 [FCM-SERVICE] Sound: '${notification.sound}'")
                
                Log.d(TAG, "🔔 [FCM-SERVICE] Showing notification from payload...")
                showNotification(
                    title = notification.title ?: "Friend Activity",
                    body = notification.body ?: "",
                    data = remoteMessage.data
                )
                Log.d(TAG, "✅ [FCM-SERVICE] Notification from payload displayed")
            } ?: run {
                Log.d(TAG, "📭 [FCM-SERVICE] No notification payload found")
            }
            
            Log.i(TAG, "🏁 [FCM-SERVICE] Message processing complete")
        } catch (e: Exception) {
            Log.e(TAG, "💥 [FCM-SERVICE] Error processing message:", e)
            e.printStackTrace()
        }
    }

    private fun handleDataMessage(data: Map<String, String>) {
        Log.d(TAG, "🔄 [FCM-DATA] Starting data message handling...")
        
        val type = data["type"]
        val title = data["title"]
        val body = data["body"]
        val senderId = data["senderId"]
        val senderName = data["senderName"]
        
        Log.d(TAG, "� [FCM-DATA] Type: '$type'")
        Log.d(TAG, "🏷️ [FCM-DATA] Title: '$title'")
        Log.d(TAG, "📝 [FCM-DATA] Body: '$body'")
        Log.d(TAG, "👤 [FCM-DATA] Sender ID: '$senderId'")
        Log.d(TAG, "📛 [FCM-DATA] Sender Name: '$senderName'")
        
        try {
            when (type) {
                "friend_request_received" -> {
                    Log.d(TAG, "👋 [FCM-DATA] Processing friend request received")
                    showNotification(
                        title = title ?: "New Friend Request",
                        body = body ?: "You have a new friend request",
                        data = data
                    )
                    Log.d(TAG, "✅ [FCM-DATA] Friend request notification shown")
                }
                "friend_request_accepted" -> {
                    Log.d(TAG, "🤝 [FCM-DATA] Processing friend request accepted")
                    showNotification(
                        title = title ?: "Friend Request Accepted",
                        body = body ?: "Your friend request was accepted",
                        data = data
                    )
                    Log.d(TAG, "✅ [FCM-DATA] Friend accepted notification shown")
                }
                "friend_online" -> {
                    Log.d(TAG, "🟢 [FCM-DATA] Processing friend online notification")
                    showNotification(
                        title = title ?: "Friend is Online",
                        body = body ?: "A friend is now online and on campus",
                        data = data
                    )
                    Log.d(TAG, "✅ [FCM-DATA] Friend online notification shown")
                }
                else -> {
                    Log.w(TAG, "❓ [FCM-DATA] Unknown notification type: '$type'")
                    if (title != null && body != null) {
                        Log.d(TAG, "🔄 [FCM-DATA] Showing generic notification for unknown type")
                        showNotification(title, body, data)
                        Log.d(TAG, "✅ [FCM-DATA] Generic notification shown")
                    } else {
                        Log.w(TAG, "⚠️ [FCM-DATA] Cannot show notification - missing title or body")
                    }
                }
            }
            Log.d(TAG, "🏁 [FCM-DATA] Data message handling complete")
        } catch (e: Exception) {
            Log.e(TAG, "💥 [FCM-DATA] Error handling data message:", e)
            e.printStackTrace()
        }
    }

    private fun showNotification(title: String, body: String, data: Map<String, String>) {
        Log.d(TAG, "🔔 [FCM-NOTIFY] Starting notification display...")
        Log.d(TAG, "🏷️ [FCM-NOTIFY] Title: '$title'")
        Log.d(TAG, "📝 [FCM-NOTIFY] Body: '$body'")
        Log.d(TAG, "📦 [FCM-NOTIFY] Data keys: ${data.keys}")
        
        try {
            // Create intent with notification data
            Log.d(TAG, "🎯 [FCM-NOTIFY] Creating intent...")
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                // Add any extra data from the notification
                data.forEach { (key, value) ->
                    putExtra(key, value)
                    Log.d(TAG, "📎 [FCM-NOTIFY] Added extra: $key = $value")
                }
            }
            Log.d(TAG, "✅ [FCM-NOTIFY] Intent created with ${data.size} extras")

            // Create pending intent
            Log.d(TAG, "⏳ [FCM-NOTIFY] Creating pending intent...")
            val pendingIntent = PendingIntent.getActivity(
                this, 
                0, 
                intent, 
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )
            Log.d(TAG, "✅ [FCM-NOTIFY] Pending intent created")

            // Build notification
            Log.d(TAG, "🔨 [FCM-NOTIFY] Building notification...")
            val notificationId = System.currentTimeMillis().toInt()
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Check notification permissions and channel before building
            val areNotificationsEnabled = notificationManager.areNotificationsEnabled()
            val channel = notificationManager.getNotificationChannel(CHANNEL_ID)
            val channelImportance = channel?.importance
            
            Log.d(TAG, "🔍 [FCM-NOTIFY] Pre-build checks:")
            Log.d(TAG, "   🔔 Notifications enabled: $areNotificationsEnabled")
            Log.d(TAG, "   📺 Channel exists: ${channel != null}")
            Log.d(TAG, "   ⚙️ Channel importance: $channelImportance")
            
            val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info) // Using system icon for better compatibility
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH) // Changed to HIGH
                .setDefaults(NotificationCompat.DEFAULT_ALL) // Add defaults for sound/vibration
                .setContentIntent(pendingIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Make sure it shows on lock screen
            
            Log.d(TAG, "🆔 [FCM-NOTIFY] Notification ID: $notificationId")
            Log.d(TAG, "📺 [FCM-NOTIFY] Channel ID: $CHANNEL_ID")
            Log.d(TAG, "🎨 [FCM-NOTIFY] Using system dialog icon for compatibility")
            Log.d(TAG, "✅ [FCM-NOTIFY] Notification built successfully")

            // Show notification
            Log.d(TAG, "📤 [FCM-NOTIFY] Showing notification...")
            try {
                notificationManager.notify(notificationId, notificationBuilder.build())
                
                // Verify notification was actually posted
                val activeNotifications = notificationManager.activeNotifications
                val wasPosted = activeNotifications.any { it.id == notificationId }
                
                Log.i(TAG, "🎉 [FCM-NOTIFY] Notification sent to system!")
                Log.d(TAG, "   📋 Title: '$title'")
                Log.d(TAG, "   📝 Body: '$body'")
                Log.d(TAG, "   🆔 ID: $notificationId")
                Log.d(TAG, "   ✅ Posted successfully: $wasPosted")
                Log.d(TAG, "   📊 Active notifications: ${activeNotifications.size}")
                
                if (!wasPosted) {
                    Log.w(TAG, "⚠️ [FCM-NOTIFY] WARNING: Notification not found in active notifications!")
                }
            } catch (e: Exception) {
                Log.e(TAG, "💥 [FCM-NOTIFY] Exception when posting notification:", e)
                e.printStackTrace()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "💥 [FCM-NOTIFY] Error showing notification:", e)
            e.printStackTrace()
        }
    }

    private fun createNotificationChannel() {
        Log.d(TAG, "🏗️ [FCM-CHANNEL] Creating notification channel...")
        
        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH  // Changed to HIGH for better visibility
        ).apply {
            description = CHANNEL_DESCRIPTION
            enableLights(true)
            enableVibration(true)
            setShowBadge(true)
        }

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.createNotificationChannel(channel)
        
        // Check if notifications are enabled
        val areNotificationsEnabled = notificationManager.areNotificationsEnabled()
        val channelImportance = notificationManager.getNotificationChannel(CHANNEL_ID)?.importance
        
        Log.i(TAG, "🔥 [FCM-CHANNEL] Notification channel created: $CHANNEL_NAME")
        Log.d(TAG, "📋 [FCM-CHANNEL] Channel ID: $CHANNEL_ID")
        Log.d(TAG, "⚙️ [FCM-CHANNEL] Channel importance: $channelImportance")
        Log.d(TAG, "🔔 [FCM-CHANNEL] Notifications enabled: $areNotificationsEnabled")
        
        if (!areNotificationsEnabled) {
            Log.w(TAG, "⚠️ [FCM-CHANNEL] WARNING: Notifications are disabled for this app!")
        }
        
        if (channelImportance == NotificationManager.IMPORTANCE_NONE) {
            Log.w(TAG, "⚠️ [FCM-CHANNEL] WARNING: Channel importance is NONE - notifications won't show!")
        }
    }
}