package com.cpen321.usermanagement.data.repository

import android.util.Log
import com.cpen321.usermanagement.data.remote.api.LocationInterface
import com.cpen321.usermanagement.data.remote.dto.LocationUpdateRequest
import com.cpen321.usermanagement.data.remote.dto.LocationUpdateResponse
import com.cpen321.usermanagement.utils.JsonUtils
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationRepositoryImpl @Inject constructor(
    private val locationApi: LocationInterface
) : LocationRepository {

    companion object {
        private const val TAG = "LocationRepository"
    }

    override suspend fun updateLocation(lat: Double, lng: Double, accuracyM: Double): Result<LocationUpdateResponse> {
        return try {
            Log.d(TAG, "Updating location: lat=$lat, lng=$lng, accuracy=$accuracyM")
            
            val request = LocationUpdateRequest(lat = lat, lng = lng, accuracyM = accuracyM)
            val response = locationApi.updateLocation(request)

            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    Log.d(TAG, "Location updated successfully: ${body.message}")
                    Result.success(body)
                } else {
                    Log.w(TAG, "Location update succeeded but response body is null")
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                val errorMessage = JsonUtils.parseErrorMessage(
                    response.errorBody()?.string(),
                    "Failed to update location"
                )
                Log.w(TAG, "Location update failed: $errorMessage")
                Result.failure(Exception("Location update failed: $errorMessage"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error updating location", e)
            Result.failure(e)
        }
    }
}