package com.cpen321.usermanagement.data.remote.api

import com.cpen321.usermanagement.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface FriendsInterface {
    @GET("friends")
    suspend fun getFriends(
        @Query("limit") limit: Int? = null
    ): Response<FriendsListResponse>
    
    @POST("friends/requests")
    suspend fun sendFriendRequest(
        @Body request: SendFriendRequestDto
    ): Response<SendFriendRequestResponse>
    
    @GET("friends/requests")
    suspend fun getFriendRequests(
        @Query("inbox") inbox: String = "true",
        @Query("limit") limit: Int? = null
    ): Response<FriendRequestsResponse>
    
    @POST("friends/requests/{id}/accept")
    suspend fun acceptFriendRequest(
        @Path("id") requestId: String
    ): Response<FriendActionResponse>
    
    @POST("friends/requests/{id}/decline")
    suspend fun declineFriendRequest(
        @Path("id") requestId: String
    ): Response<FriendActionResponse>
    
    @DELETE("friends/{friendId}")
    suspend fun removeFriend(
        @Path("friendId") friendId: String
    ): Response<FriendActionResponse>
    
    // User search endpoint
    @GET("users/search")
    suspend fun searchUsers(
        @Query("q") query: String,
        @Query("limit") limit: Int? = null
    ): Response<UserSearchResponse>
    
    // Friends locations endpoint
    @GET("friends/locations")
    suspend fun getFriendsLocations(): Response<FriendsLocationsResponse>
}