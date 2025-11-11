package com.cpen321.usermanagement.data.repository

import android.util.Log
import com.cpen321.usermanagement.data.remote.api.RetrofitClient
import com.cpen321.usermanagement.data.remote.dto.*
import com.cpen321.usermanagement.utils.JsonUtils
import javax.inject.Inject

class PinRepositoryImpl @Inject constructor() : PinRepository {
    
    private val pinInterface = RetrofitClient.pinInterface
    
    companion object {
        private const val TAG = "PinRepository"
    }
    
    override suspend fun createPin(request: CreatePinRequest): Result<Pin> {
        return try {
            val response = pinInterface.createPin(request)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!.pin)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to create pin"
                )
                Log.e(TAG, "Create pin failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout creating pin", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed creating pin", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error creating pin", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error creating pin: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error creating pin", e)
            Result.failure(e)
        }
    }
    
    override suspend fun getPin(pinId: String): Result<Pin> {
        return try {
            val response = pinInterface.getPin(pinId)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!.pin)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to get pin"
                )
                Log.e(TAG, "Get pin failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout getting pin", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed getting pin", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error getting pin", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error getting pin: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error getting pin", e)
            Result.failure(e)
        }
    }
    
    override suspend fun updatePin(pinId: String, request: UpdatePinRequest): Result<Pin> {
        return try {
            val response = pinInterface.updatePin(pinId, request)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!.pin)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to update pin"
                )
                Log.e(TAG, "Update pin failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout updating pin", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed updating pin", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error updating pin", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error updating pin: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error updating pin", e)
            Result.failure(e)
        }
    }
    
    override suspend fun deletePin(pinId: String): Result<Unit> {
        return try {
            val response = pinInterface.deletePin(pinId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to delete pin"
                )
                Log.e(TAG, "Delete pin failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout deleting pin", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed deleting pin", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error deleting pin", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error deleting pin: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error deleting pin", e)
            Result.failure(e)
        }
    }
    
    override suspend fun searchPins(
        category: PinCategory?,
        latitude: Double?,
        longitude: Double?,
        radius: Double?,
        search: String?,
        page: Int,
        limit: Int
    ): Result<PinsListData> {
        return try {
            val categoryString = category?.name?.lowercase()
            val response = pinInterface.searchPins(
                category = categoryString,
                latitude = latitude,
                longitude = longitude,
                radius = radius,
                search = search,
                page = page,
                limit = limit
            )
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to search pins"
                )
                Log.e(TAG, "Search pins failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout searching pins", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed searching pins", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error searching pins", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error searching pins: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error searching pins", e)
            Result.failure(e)
        }
    }
    
    override suspend fun ratePin(pinId: String, voteType: String): Result<RatePinResponse> {
        return try {
            val request = RatePinRequest(voteType)
            val response = pinInterface.ratePin(pinId, request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to rate pin"
                )
                Log.e(TAG, "Rate pin failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout rating pin", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed rating pin", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error rating pin", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error rating pin: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error rating pin", e)
            Result.failure(e)
        }
    }
    
    override suspend fun getUserVote(pinId: String): Result<String?> {
        return try {
            val response = pinInterface.getUserVote(pinId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.data?.userVote)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    "Failed to get user vote"
                )
                Log.e(TAG, "Get user vote failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout getting user vote", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed getting user vote", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error getting user vote", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error getting user vote: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error getting user vote", e)
            Result.failure(e)
        }
    }
    
    override suspend fun reportPin(pinId: String, reason: String): Result<Unit> {
        return try {
            val request = ReportPinRequest(reason)
            val response = pinInterface.reportPin(pinId, request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to report pin"
                )
                Log.e(TAG, "Report pin failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: kotlinx.coroutines.CancellationException) {
            // Don't log cancellation as an error - it's expected when user navigates away
            Log.d(TAG, "Report pin cancelled (user navigated away)")
            throw e // Re-throw to properly propagate cancellation
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout reporting pin (backend may be slow or unresponsive)", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed reporting pin", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error reporting pin", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error reporting pin: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error reporting pin", e)
            Result.failure(e)
        }
    }
    
    override suspend fun getReportedPins(): Result<PinsListData> {
        return try {
            val response = pinInterface.getReportedPins()
            if (response.isSuccessful && response.body()?.data != null) {
                Result.success(response.body()!!.data!!)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to get reported pins"
                )
                Log.e(TAG, "Get reported pins failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout getting reported pins", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed getting reported pins", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error getting reported pins", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error getting reported pins: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error getting reported pins", e)
            Result.failure(e)
        }
    }
    
    override suspend fun clearPinReports(pinId: String): Result<Unit> {
        return try {
            val response = pinInterface.clearPinReports(pinId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    response.body()?.message ?: "Failed to clear reports"
                )
                Log.e(TAG, "Clear reports failed: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: java.net.SocketTimeoutException) {
            Log.e(TAG, "Network timeout clearing reports", e)
            Result.failure(e)
        } catch (e: java.net.UnknownHostException) {
            Log.e(TAG, "Network connection failed clearing reports", e)
            Result.failure(e)
        } catch (e: java.io.IOException) {
            Log.e(TAG, "IO error clearing reports", e)
            Result.failure(e)
        } catch (e: retrofit2.HttpException) {
            Log.e(TAG, "HTTP error clearing reports: ${e.code()}", e)
            Result.failure(e)
        } catch (e: RuntimeException) {
            Log.e(TAG, "Error clearing reports", e)
            Result.failure(e)
        }
    }
}