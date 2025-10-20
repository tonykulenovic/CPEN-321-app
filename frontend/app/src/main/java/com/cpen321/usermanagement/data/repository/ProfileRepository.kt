package com.cpen321.usermanagement.data.repository

import android.net.Uri
import com.cpen321.usermanagement.data.remote.dto.User

interface ProfileRepository {
    suspend fun getProfile(): Result<User>
    suspend fun updateProfile(name: String, username: String, bio: String): Result<User>
    suspend fun uploadProfilePicture(pictureUri: Uri): Result<String>
    suspend fun deleteAccount(): Result<Unit>
}