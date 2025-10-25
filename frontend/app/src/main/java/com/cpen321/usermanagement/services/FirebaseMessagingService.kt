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
        Log.d(TAG, "🔥 New FCM token received: $token")
        
        // Save token locally and send to backend
        CoroutineScope(Dispatchers.IO).launch {
            tokenManager.saveFcmToken(token)
            
            // Send token to backend server using existing ProfileRepository
            try {
                val result = profileRepository.updateFcmToken(token)
                if (result.isSuccess) {
                    Log.d(TAG, "🔥 FCM token successfully sent to backend")
                } else {
                    Log.e(TAG, "🔥 Failed to send FCM token to backend: ${result.exceptionOrNull()?.message}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "🔥 Error sending FCM token to backend", e)
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "🔥 Push notification received from: ${remoteMessage.from}")

        // Handle data payload
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "🔥 Message data payload: ${remoteMessage.data}")
            handleDataMessage(remoteMessage.data)
        }

        // Handle notification payload
        remoteMessage.notification?.let { notification ->
            Log.d(TAG, "🔥 Message notification: ${notification.title} - ${notification.body}")
            showNotification(
                title = notification.title ?: "Friend Activity",
                body = notification.body ?: "",
                data = remoteMessage.data
            )
        }
    }

    private fun handleDataMessage(data: Map<String, String>) {
        val type = data["type"]
        val title = data["title"]
        val body = data["body"]
        
        Log.d(TAG, "🔥 Handling data message - Type: $type, Title: $title, Body: $body")
        
        when (type) {
            "friend_request_received" -> {
                showNotification(
                    title = title ?: "New Friend Request",
                    body = body ?: "You have a new friend request",
                    data = data
                )
            }
            "friend_request_accepted" -> {
                showNotification(
                    title = title ?: "Friend Request Accepted",
                    body = body ?: "Your friend request was accepted",
                    data = data
                )
            }
            "friend_online" -> {
                showNotification(
                    title = title ?: "Friend is Online",
                    body = body ?: "A friend is now online and on campus",
                    data = data
                )
            }
            else -> {
                Log.w(TAG, "🔥 Unknown notification type: $type")
                if (title != null && body != null) {
                    showNotification(title, body, data)
                }
            }
        }
    }

    private fun showNotification(title: String, body: String, data: Map<String, String>) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            // Add any extra data from the notification
            data.forEach { (key, value) ->
                putExtra(key, value)
            }
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent, 
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground) // You may want to create a custom icon
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notificationBuilder.build())
        
        Log.d(TAG, "🔥 Notification displayed: $title - $body")
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = CHANNEL_DESCRIPTION
        }

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.createNotificationChannel(channel)
        
        Log.d(TAG, "🔥 Notification channel created: $CHANNEL_NAME")
    }
}