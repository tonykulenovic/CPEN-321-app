package com.cpen321.usermanagement.data.remote.dto

// Request DTOs
data class SendFriendRequestDto(
    val toUserId: String
)

// Response DTOs
data class FriendSummary(
    val userId: String,
    val displayName: String,
    val photoUrl: String? = null,
    val bio: String? = null,
    val shareLocation: Boolean
)

data class FriendRequestSummary(
    val _id: String,
    val from: FriendRequestUser,
    val createdAt: String
)

data class FriendRequestUser(
    val userId: String,
    val displayName: String,
    val photoUrl: String? = null
)

data class FriendsListResponse(
    val message: String,
    val data: List<FriendSummary>? = null
)

data class FriendRequestsResponse(
    val message: String,
    val data: List<FriendRequestSummary>? = null
)

data class SendFriendRequestResponse(
    val message: String,
    val data: SendFriendRequestData? = null
)

data class SendFriendRequestData(
    val requestId: String,
    val status: String
)

data class FriendActionResponse(
    val message: String,
    val data: FriendActionData? = null
)

data class FriendActionData(
    val status: String? = null,
    val success: Boolean? = null
)

// User Search DTOs
data class UserSearchResult(
    val _id: String,
    val username: String,
    val displayName: String,
    val photoUrl: String? = null
)

data class UserSearchResponse(
    val message: String,
    val data: List<UserSearchResult>? = null
)