package com.cpen321.usermanagement.data.remote.api

import com.cpen321.usermanagement.data.remote.dto.LocationUpdateRequest
import com.cpen321.usermanagement.data.remote.dto.LocationUpdateResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.PUT

interface LocationInterface {
    
    @PUT("me/location")
    suspend fun updateLocation(@Body request: LocationUpdateRequest): Response<LocationUpdateResponse>
}