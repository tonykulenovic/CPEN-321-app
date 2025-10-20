package com.cpen321.usermanagement.data.repository

import com.cpen321.usermanagement.data.remote.dto.*

interface FriendsRepository {
    suspend fun getFriends(): Result<List<FriendSummary>>
    suspend fun sendFriendRequest(toUserId: String): Result<String>
    suspend fun getFriendRequests(): Result<List<FriendRequestSummary>>
    suspend fun acceptFriendRequest(requestId: String): Result<Unit>
    suspend fun declineFriendRequest(requestId: String): Result<Unit>
    suspend fun removeFriend(friendId: String): Result<Unit>
    suspend fun searchUsers(query: String): Result<List<UserSearchResult>>
}