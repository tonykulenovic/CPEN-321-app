package com.cpen321.usermanagement.data.repository

import com.cpen321.usermanagement.data.remote.api.AdminInterface
import com.cpen321.usermanagement.data.remote.dto.User
import com.cpen321.usermanagement.utils.JsonUtils
import javax.inject.Inject

class AdminRepositoryImpl @Inject constructor(
    private val adminApi: AdminInterface
) : AdminRepository {

    override suspend fun getAllUsers(): Result<List<User>> {
        return try {
            val response = adminApi.getAllUsers()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data.users)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    "Failed to fetch users"
                )
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun suspendUser(userId: String): Result<Unit> {
        return try {
            val response = adminApi.suspendUser(userId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    "Failed to suspend user"
                )
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun unsuspendUser(userId: String): Result<Unit> {
        return try {
            val response = adminApi.unsuspendUser(userId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    "Failed to unsuspend user"
                )
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteUser(userId: String): Result<Unit> {
        return try {
            val response = adminApi.deleteUser(userId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    "Failed to delete user"
                )
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

