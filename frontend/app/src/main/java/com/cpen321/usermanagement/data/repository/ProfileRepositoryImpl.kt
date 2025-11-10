package com.cpen321.usermanagement.data.repository

import android.content.Context
import android.net.Uri
import android.util.Log
import com.cpen321.usermanagement.data.local.preferences.TokenManager
import com.cpen321.usermanagement.data.remote.api.ImageInterface
import com.cpen321.usermanagement.data.remote.api.RetrofitClient
import com.cpen321.usermanagement.data.remote.api.UserInterface
import com.cpen321.usermanagement.data.remote.dto.UpdateProfileRequest
import com.cpen321.usermanagement.data.remote.dto.User
import com.cpen321.usermanagement.data.remote.dto.FriendProfileData
import com.cpen321.usermanagement.utils.JsonUtils.parseErrorMessage
import com.cpen321.usermanagement.utils.MediaUtils.uriToFile
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    private val userInterface: UserInterface,
    private val tokenManager: TokenManager
) : ProfileRepository {

    companion object {
        private const val TAG = "ProfileRepositoryImpl"
    }

    override suspend fun getProfile(): Result<User> {
        return try {
            val response = userInterface.getProfile("") // Auth header is handled by interceptor
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!.user)
            } else {
                val errorBodyString = response.errorBody()?.string()
                val errorMessage =
                    parseErrorMessage(errorBodyString, "Failed to fetch user information.")
                Log.e(TAG, "Failed to get profile: $errorMessage")
                tokenManager.clearToken()
                RetrofitClient.setAuthToken(null)
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout while getting profile", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed while getting profile", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error while getting profile", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error while getting profile: ${e.code()}", e)
            Result.failure(e)
        }
    }

    override suspend fun getFriendProfile(userId: String): Result<FriendProfileData> {
        return try {
            val response = userInterface.getFriendProfile("", userId)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data)
            } else {
                val errorMessage = parseErrorMessage(
                    response.errorBody()?.string(),
                    "Failed to fetch friend profile"
                )
                Log.e(TAG, "Failed to get friend profile: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout getting friend profile", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed getting friend profile", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error getting friend profile", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error getting friend profile: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error getting friend profile", e)
            Result.failure(e)
        }
    }

    override suspend fun updateProfile(name: String, username: String, bio: String): Result<User> {
        return try {
            val request = UpdateProfileRequest(name = name, username = username, bio = bio)
            val response = userInterface.updateProfile("", request)
            
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!.user)
            } else {
                val errorMessage = parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to update profile"
                )
                Log.e(TAG, "Update profile failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout updating profile", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed updating profile", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error updating profile", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error updating profile: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error updating profile", e)
            Result.failure(e)
        }
    }

    override suspend fun uploadProfilePicture(pictureUri: Uri): Result<String> {
        return try {
            val file = uriToFile(context, pictureUri)
            val requestFile = file.asRequestBody("image/*".toMediaType())
            val body = MultipartBody.Part.createFormData("media", file.name, requestFile)
            
            val imageInterface = RetrofitClient.imageInterface
            val response = imageInterface.uploadPicture("", body) // Auth header is handled by interceptor
            
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!.image)
            } else {
                val errorBodyString = response.errorBody()?.string()
                val errorMessage = parseErrorMessage(errorBodyString, "Failed to upload profile picture.")
                Log.e(TAG, "Failed to upload profile picture: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout uploading profile picture", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed uploading profile picture", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error uploading profile picture", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error uploading profile picture: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Exception while uploading profile picture", e)
            Result.failure(e)
        }
    }

    override suspend fun deleteAccount(): Result<Unit> {
        return try {
            val response = userInterface.deleteProfile("") // Auth header is handled by interceptor
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorBodyString = response.errorBody()?.string()
                val errorMessage = parseErrorMessage(errorBodyString, "Failed to delete account.")
                Log.e(TAG, "Failed to delete account: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout while deleting account", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed while deleting account", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error while deleting account", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error while deleting account: ${e.code()}", e)
            Result.failure(e)
        }
    }

    override suspend fun updateFcmToken(token: String): Result<Unit> {
        Log.i(TAG, "📤 [PROFILE-REPO] Starting FCM token update...")
        Log.d(TAG, "🔑 [PROFILE-REPO] Token preview: ${token.take(30)}...${token.takeLast(10)}")
        Log.d(TAG, "📏 [PROFILE-REPO] Token length: ${token.length} characters")
        
        return try {
            Log.d(TAG, "🔨 [PROFILE-REPO] Creating request object...")
            val request = com.cpen321.usermanagement.data.remote.dto.NotificationTokenRequest(token)
            Log.d(TAG, "✅ [PROFILE-REPO] Request created successfully")
            
            Log.d(TAG, "🌐 [PROFILE-REPO] Sending FCM token to backend...")
            val startTime = System.currentTimeMillis()
            val response = userInterface.updateFcmToken("", request)
            val duration = System.currentTimeMillis() - startTime
            
            Log.d(TAG, "📊 [PROFILE-REPO] Response received in ${duration}ms")
            Log.d(TAG, "📈 [PROFILE-REPO] Response code: ${response.code()}")
            Log.d(TAG, "✅ [PROFILE-REPO] Response successful: ${response.isSuccessful}")
            
            if (response.isSuccessful) {
                Log.i(TAG, "🎉 [PROFILE-REPO] FCM token updated successfully!")
                Log.d(TAG, "📝 [PROFILE-REPO] Response body: ${response.body()?.message}")
                Result.success(Unit)
            } else {
                Log.e(TAG, "💥 [PROFILE-REPO] Failed to update FCM token")
                Log.e(TAG, "📈 [PROFILE-REPO] HTTP Status: ${response.code()}")
                
                val errorBodyString = response.errorBody()?.string()
                Log.e(TAG, "📝 [PROFILE-REPO] Error body: $errorBodyString")
                
                val errorMessage = parseErrorMessage(
                    errorBodyString,
                    "Failed to update FCM token"
                )
                Log.e(TAG, "💬 [PROFILE-REPO] Parsed error: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "⏰ [PROFILE-REPO] Network timeout updating FCM token", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "🌐 [PROFILE-REPO] Network connection failed updating FCM token", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "💾 [PROFILE-REPO] IO error updating FCM token", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "🌐 [PROFILE-REPO] HTTP error updating FCM token: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "💥 [PROFILE-REPO] Unexpected error updating FCM token", e)
            e.printStackTrace()
            Result.failure(e)
        }
    }

    override suspend fun removeFcmToken(): Result<Unit> {
        return try {
            val response = userInterface.removeFcmToken("")
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = parseErrorMessage(
                    response.errorBody()?.string(),
                    "Failed to remove FCM token"
                )
                Log.e(TAG, "Failed to remove FCM token: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout removing FCM token", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed removing FCM token", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error removing FCM token", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error removing FCM token: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error removing FCM token", e)
            Result.failure(e)
        }
    }

    override suspend fun updatePrivacy(request: com.cpen321.usermanagement.data.remote.dto.UpdatePrivacyRequest): Result<com.cpen321.usermanagement.data.remote.dto.User> {
        return try {
            val response = userInterface.updatePrivacy("", request)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!.user)
            } else {
                val errorMessage = parseErrorMessage(
                    response.errorBody()?.string(),
                    "Failed to update privacy settings"
                )
                Log.e(TAG, "Failed to update privacy settings: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout updating privacy settings", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed updating privacy settings", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error updating privacy settings", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error updating privacy settings: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error updating privacy settings", e)
            Result.failure(e)
        }
    }
}
