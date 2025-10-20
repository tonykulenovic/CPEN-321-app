package com.cpen321.usermanagement.data.remote.dto

data class UpdateProfileRequest(
    val name: String? = null,
    val username: String? = null,
    val bio: String? = null,
    val profilePicture: String? = null
)

data class ProfileData(
    val user: User
)

data class User(
    val _id: String,
    val email: String,
    val name: String,
    val username: String,
    val bio: String?,
    val profilePicture: String,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class UploadImageData(
    val image: String
)