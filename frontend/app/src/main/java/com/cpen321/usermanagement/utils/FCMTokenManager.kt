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
            Log.d(TAG, "🔄 [FCM] Starting FCM token registration process...")
            
            // Get current FCM token
            Log.d(TAG, "📱 [FCM] Requesting token from Firebase Messaging...")
            val startTime = System.currentTimeMillis()
            val token = FirebaseMessaging.getInstance().token.await()
            val tokenRetrievalTime = System.currentTimeMillis() - startTime
            
            Log.d(TAG, "✅ [FCM] Retrieved FCM token in ${tokenRetrievalTime}ms")
            Log.d(TAG, "🔑 [FCM] Token preview: ${token.take(30)}...${token.takeLast(10)}")
            Log.d(TAG, "📏 [FCM] Token length: ${token.length} characters")
            
            // Send to backend
            Log.d(TAG, "📤 [FCM] Sending token to backend...")
            val backendStartTime = System.currentTimeMillis()
            val result = profileRepository.updateFcmToken(token)
            val backendTime = System.currentTimeMillis() - backendStartTime
            
            if (result.isSuccess) {
                Log.i(TAG, "🎉 [FCM] Token successfully registered with backend in ${backendTime}ms")
                Log.d(TAG, "📊 [FCM] Total registration time: ${System.currentTimeMillis() - startTime}ms")
            } else {
                Log.e(TAG, "💥 [FCM] Failed to register FCM token with backend:")
                Log.e(TAG, "   📊 Backend call took: ${backendTime}ms")
                Log.e(TAG, "   💬 Error: ${result.exceptionOrNull()?.message}")
                Log.e(TAG, "   📋 Exception type: ${result.exceptionOrNull()?.javaClass?.simpleName}")
                result.exceptionOrNull()?.printStackTrace()
            }
        } catch (e: Exception) {
            Log.e(TAG, "💥 [FCM] Exception during FCM token registration:", e)
            Log.e(TAG, "   📊 Exception type: ${e.javaClass.simpleName}")
            Log.e(TAG, "   💬 Exception message: ${e.message}")
            Log.e(TAG, "   📋 Stack trace:")
            e.printStackTrace()
        }
    }
}