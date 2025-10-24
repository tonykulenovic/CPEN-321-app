package com.cpen321.usermanagement.data.repository

import android.util.Log
import com.cpen321.usermanagement.data.remote.api.RetrofitClient
import com.cpen321.usermanagement.data.remote.dto.*
import com.cpen321.usermanagement.utils.JsonUtils
import javax.inject.Inject

class FriendsRepositoryImpl @Inject constructor() : FriendsRepository {
    
    private val friendsInterface = RetrofitClient.friendsInterface
    
    companion object {
        private const val TAG = "FriendsRepository"
    }
    
    override suspend fun getFriends(): Result<List<FriendSummary>> {
        return try {
            val response = friendsInterface.getFriends()
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to get friends"
                )
                Log.e(TAG, "Get friends failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting friends", e)
            Result.failure(e)
        }
    }
    
    override suspend fun sendFriendRequest(toUserId: String): Result<String> {
        return try {
            val request = SendFriendRequestDto(toUserId)
            val response = friendsInterface.sendFriendRequest(request)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!.requestId)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to send friend request"
                )
                Log.e(TAG, "Send friend request failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending friend request", e)
            Result.failure(e)
        }
    }
    
    override suspend fun getFriendRequests(): Result<List<FriendRequestSummary>> {
        return try {
            val response = friendsInterface.getFriendRequests(inbox = "true")
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to get friend requests"
                )
                Log.e(TAG, "Get friend requests failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting friend requests", e)
            Result.failure(e)
        }
    }
    
    override suspend fun acceptFriendRequest(requestId: String): Result<Unit> {
        return try {
            val response = friendsInterface.acceptFriendRequest(requestId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to accept friend request"
                )
                Log.e(TAG, "Accept friend request failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error accepting friend request", e)
            Result.failure(e)
        }
    }
    
    override suspend fun declineFriendRequest(requestId: String): Result<Unit> {
        return try {
            val response = friendsInterface.declineFriendRequest(requestId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to decline friend request"
                )
                Log.e(TAG, "Decline friend request failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error declining friend request", e)
            Result.failure(e)
        }
    }
    
    override suspend fun removeFriend(friendId: String): Result<Unit> {
        return try {
            val response = friendsInterface.removeFriend(friendId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to remove friend"
                )
                Log.e(TAG, "Remove friend failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error removing friend", e)
            Result.failure(e)
        }
    }

    override suspend fun searchUsers(query: String): Result<List<UserSearchResult>> {
        return try {
            val response = friendsInterface.searchUsers(query)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to search users"
                )
                Log.e(TAG, "Search users failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error searching users", e)
            Result.failure(e)
        }
    }

    override suspend fun getFriendsLocations(): Result<List<FriendLocation>> {
        return try {
            val response = friendsInterface.getFriendsLocations()
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to get friends locations"
                )
                Log.e(TAG, "Get friends locations failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting friends locations", e)
            Result.failure(e)
        }
    }
}