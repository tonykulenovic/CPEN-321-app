package com.cpen321.usermanagement.data.repository

import com.cpen321.usermanagement.data.remote.dto.LocationUpdateRequest
import com.cpen321.usermanagement.data.remote.dto.LocationUpdateResponse

interface LocationRepository {
    suspend fun updateLocation(lat: Double, lng: Double, accuracyM: Double = 0.0): Result<LocationUpdateResponse>
}