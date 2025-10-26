package com.cpen321.usermanagement.data.remote.dto

import com.google.gson.annotations.SerializedName

// Friend Profile DTOs
data class FriendProfileData(
    @SerializedName("userId") val userId: String,
    @SerializedName("name") val name: String,
    @SerializedName("username") val username: String,
    @SerializedName("email") val email: String,
    @SerializedName("bio") val bio: String?,
    @SerializedName("campus") val campus: String?,
    @SerializedName("profilePicture") val profilePicture: String?,
    @SerializedName("isOnline") val isOnline: Boolean,
    @SerializedName("friendsCount") val friendsCount: Int,
    @SerializedName("badgesCount") val badgesCount: Int,
    @SerializedName("stats") val stats: FriendStats,
    @SerializedName("badges") val badges: List<UserBadge>
)

data class FriendStats(
    @SerializedName("pinsCreated") val pinsCreated: Int,
    @SerializedName("pinsVisited") val pinsVisited: Int,
    @SerializedName("locationsExplored") val locationsExplored: Int,
    @SerializedName("librariesVisited") val librariesVisited: Int,
    @SerializedName("cafesVisited") val cafesVisited: Int,
    @SerializedName("restaurantsVisited") val restaurantsVisited: Int
)

data class FriendProfileResponse(
    @SerializedName("message") val message: String,
    @SerializedName("data") val data: FriendProfileData
)

