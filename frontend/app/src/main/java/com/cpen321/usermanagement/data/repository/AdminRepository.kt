package com.cpen321.usermanagement.data.repository

import com.cpen321.usermanagement.data.remote.dto.User

interface AdminRepository {
    suspend fun getAllUsers(): Result<List<User>>
    suspend fun suspendUser(userId: String): Result<Unit>
    suspend fun unsuspendUser(userId: String): Result<Unit>
    suspend fun deleteUser(userId: String): Result<Unit>
}

