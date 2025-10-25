package com.cpen321.usermanagement.data.local.preferences

import android.content.Context
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

class TokenManager(private val context: Context) {

    companion object {
        private const val TAG = "TokenManager"
    }

    private val tokenKey = stringPreferencesKey("auth_token")
    private val fcmTokenKey = stringPreferencesKey("fcm_token")

    suspend fun saveToken(token: String) {
        try {
            context.dataStore.edit { preferences ->
                preferences[tokenKey] = token
            }
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error while saving token", e)
            throw e
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied to save token", e)
            throw e
        }
    }

    fun getToken(): Flow<String?> {
        return try {
            context.dataStore.data.map { preferences ->
                preferences[tokenKey]
            }
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error while getting token flow", e)
            throw e
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied to get token flow", e)
            throw e
        }
    }

    suspend fun getTokenSync(): String? {
        return try {
            val token = context.dataStore.data.first()[tokenKey]
            token
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error while getting token synchronously", e)
            null
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied to get token synchronously", e)
            null
        }
    }

    suspend fun clearToken() {
        try {
            context.dataStore.edit { preferences ->
                preferences.remove(tokenKey)
            }
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error while clearing token", e)
            throw e
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied to clear token", e)
            throw e
        }
    }

    // FCM Token management
    suspend fun saveFcmToken(token: String) {
        try {
            context.dataStore.edit { preferences ->
                preferences[fcmTokenKey] = token
            }
            Log.d(TAG, "🔥 FCM token saved successfully")
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error while saving FCM token", e)
            throw e
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied to save FCM token", e)
            throw e
        }
    }

    suspend fun getFcmToken(): String? {
        return try {
            val token = context.dataStore.data.first()[fcmTokenKey]
            Log.d(TAG, "🔥 FCM token retrieved: ${if (token != null) "exists" else "null"}")
            token
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error while getting FCM token synchronously", e)
            null
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied to get FCM token synchronously", e)
            null
        }
    }

    suspend fun clearFcmToken() {
        try {
            context.dataStore.edit { preferences ->
                preferences.remove(fcmTokenKey)
            }
            Log.d(TAG, "🔥 FCM token cleared")
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error while clearing FCM token", e)
            throw e
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied to clear FCM token", e)
            throw e
        }
    }
}
