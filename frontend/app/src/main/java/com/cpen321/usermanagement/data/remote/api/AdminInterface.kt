package com.cpen321.usermanagement.data.remote.api

import com.cpen321.usermanagement.data.remote.dto.User
import retrofit2.Response
import retrofit2.http.*

data class AllUsersResponse(
    val message: String,
    val data: AllUsersData
)

data class AllUsersData(
    val users: List<User>,
    val total: Int
)

data class UserActionResponse(
    val message: String,
    val data: UserActionData?
)

data class UserActionData(
    val user: User
)

interface AdminInterface {
    @GET("users/admin/all")
    suspend fun getAllUsers(): Response<AllUsersResponse>

    @PATCH("users/admin/{id}/suspend")
    suspend fun suspendUser(@Path("id") userId: String): Response<UserActionResponse>

    @PATCH("users/admin/{id}/unsuspend")
    suspend fun unsuspendUser(@Path("id") userId: String): Response<UserActionResponse>

    @DELETE("users/admin/{id}")
    suspend fun deleteUser(@Path("id") userId: String): Response<UserActionResponse>
}

