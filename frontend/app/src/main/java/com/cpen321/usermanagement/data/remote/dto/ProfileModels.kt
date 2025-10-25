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
    val isAdmin: Boolean = false,
    val isSuspended: Boolean = false,
    val privacy: PrivacySettings? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class PrivacySettings(
    val profileVisibleTo: String = "friends", // "friends", "everyone", "private"
    val showBadgesTo: String = "friends", // "friends", "everyone", "private"  
    val location: LocationPrivacy = LocationPrivacy(),
    val allowFriendRequestsFrom: String = "everyone" // "everyone", "friendsOfFriends", "noOne"
)

data class LocationPrivacy(
    val sharing: String = "off", // "off", "live", "approximate"
    val precisionMeters: Int = 30
)

data class UpdatePrivacyRequest(
    val profileVisibleTo: String? = null,
    val showBadgesTo: String? = null,
    val location: LocationPrivacy? = null,
    val allowFriendRequestsFrom: String? = null
)

data class UploadImageData(
    val image: String
)