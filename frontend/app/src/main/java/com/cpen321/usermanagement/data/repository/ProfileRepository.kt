package com.cpen321.usermanagement.data.repository

import android.net.Uri
import com.cpen321.usermanagement.data.remote.dto.User
import com.cpen321.usermanagement.data.remote.dto.FriendProfileData

interface ProfileRepository {
    suspend fun getProfile(): Result<User>
    suspend fun getFriendProfile(userId: String): Result<FriendProfileData>
    suspend fun updateProfile(name: String, username: String, bio: String): Result<User>
    suspend fun uploadProfilePicture(pictureUri: Uri): Result<String>
    suspend fun deleteAccount(): Result<Unit>
    
    // FCM Token management for push notifications
    suspend fun updateFcmToken(token: String): Result<Unit>
    suspend fun removeFcmToken(): Result<Unit>
    
    // Privacy settings management
    suspend fun updatePrivacy(request: com.cpen321.usermanagement.data.remote.dto.UpdatePrivacyRequest): Result<User>
}