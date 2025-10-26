package com.cpen321.usermanagement

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.cpen321.usermanagement.ui.navigation.AppNavigation
import com.cpen321.usermanagement.ui.theme.ProvideFontSizes
import com.cpen321.usermanagement.ui.theme.ProvideSpacing
import com.cpen321.usermanagement.ui.theme.UserManagementTheme
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    companion object {
        private const val TAG = "MainActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        // Check notification permissions
        checkNotificationPermissions()
        
        // Test FCM token retrieval directly in MainActivity (as per article)
        testFCMTokenRetrieval()
        
        setContent {
            UserManagementTheme {
                UserManagementApp()
            }
        }
    }

    private fun checkNotificationPermissions() {
        Log.d(TAG, "🔍 [MAIN] Checking notification permissions...")
        
        // Check if notifications are enabled at app level
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val areNotificationsEnabled = notificationManager.areNotificationsEnabled()
        
        Log.d(TAG, "📱 [MAIN] SDK Version: ${Build.VERSION.SDK_INT}")
        Log.d(TAG, "🔔 [MAIN] Notifications enabled: $areNotificationsEnabled")
        
        // Check for POST_NOTIFICATIONS permission (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val hasNotificationPermission = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            
            Log.d(TAG, "🔐 [MAIN] POST_NOTIFICATIONS permission: $hasNotificationPermission")
            
            if (!hasNotificationPermission) {
                Log.w(TAG, "⚠️ [MAIN] WARNING: POST_NOTIFICATIONS permission not granted!")
                Log.d(TAG, "📋 [MAIN] Requesting notification permission...")
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    1001
                )
            }
        }
        
        // Check specific notification channel
        val channel = notificationManager.getNotificationChannel("friend_activity_channel")
        if (channel != null) {
            Log.d(TAG, "📺 [MAIN] Channel 'friend_activity_channel' exists")
            Log.d(TAG, "   📛 Name: ${channel.name}")
            Log.d(TAG, "   ⚙️ Importance: ${channel.importance}")
            Log.d(TAG, "   🔔 Can show badge: ${channel.canShowBadge()}")
            Log.d(TAG, "   💡 Lights enabled: ${channel.shouldShowLights()}")
            Log.d(TAG, "   📳 Vibration enabled: ${channel.shouldVibrate()}")
        } else {
            Log.w(TAG, "⚠️ [MAIN] Channel 'friend_activity_channel' not found!")
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1001) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "🎉 [MAIN] POST_NOTIFICATIONS permission granted!")
            } else {
                Log.w(TAG, "❌ [MAIN] POST_NOTIFICATIONS permission denied!")
            }
        }
    }

    private fun testFCMTokenRetrieval() {
        Log.d(TAG, "🔥 [MAIN] Testing FCM token retrieval...")
        
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w(TAG, "💥 [MAIN] Fetching FCM registration token failed", task.exception)
                Log.e(TAG, "   📊 Exception type: ${task.exception?.javaClass?.simpleName}")
                Log.e(TAG, "   💬 Exception message: ${task.exception?.message}")
                return@addOnCompleteListener
            }

            // Get the registration token
            val token = task.result
            Log.i(TAG, "🎉 [MAIN] FCM registration token retrieved successfully!")
            Log.d(TAG, "🔑 [MAIN] Token preview: ${token.take(30)}...${token.takeLast(10)}")
            Log.d(TAG, "📏 [MAIN] Token length: ${token.length} characters")
            Log.d(TAG, "📱 [MAIN] Full token: $token")
            
            // This token should be sent to your server for targeting this device
            Log.d(TAG, "💡 [MAIN] This token should match what's sent to backend")
        }
    }
}

@Composable
fun UserManagementApp() {
    ProvideSpacing {
        ProvideFontSizes {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background
            ) {
                AppNavigation()
            }
        }
    }
}
