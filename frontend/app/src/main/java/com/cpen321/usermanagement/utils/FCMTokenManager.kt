package com.cpen321.usermanagement.utils

import android.util.Log
import com.cpen321.usermanagement.data.repository.ProfileRepository
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FCMTokenManager @Inject constructor(
    private val profileRepository: ProfileRepository
) {
    companion object {
        private const val TAG = "FCMTokenManager"
    }

    /**
     * Get current FCM token and send it to backend
     * Call this after successful login
     */
    suspend fun registerFCMToken() {
        try {
            // Get current FCM token
            val token = FirebaseMessaging.getInstance().token.await()
            Log.d(TAG, "📱 Retrieved FCM token: ${token.take(20)}...")
            
            // Send to backend
            val result = profileRepository.updateFcmToken(token)
            if (result.isSuccess) {
                Log.d(TAG, "✅ FCM token successfully registered with backend")
            } else {
                Log.e(TAG, "❌ Failed to register FCM token: ${result.exceptionOrNull()?.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error registering FCM token", e)
        }
    }
}