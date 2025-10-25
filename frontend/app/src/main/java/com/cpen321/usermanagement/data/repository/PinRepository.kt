package com.cpen321.usermanagement.data.repository

import com.cpen321.usermanagement.data.remote.dto.*

interface PinRepository {
    suspend fun createPin(request: CreatePinRequest): Result<Pin>
    suspend fun getPin(pinId: String): Result<Pin>
    suspend fun updatePin(pinId: String, request: UpdatePinRequest): Result<Pin>
    suspend fun deletePin(pinId: String): Result<Unit>
    suspend fun searchPins(
        category: PinCategory? = null,
        latitude: Double? = null,
        longitude: Double? = null,
        radius: Double? = null,
        search: String? = null,
        page: Int = 1,
        limit: Int = 20
    ): Result<PinsListData>
    suspend fun ratePin(pinId: String, voteType: String): Result<RatePinResponse>
    suspend fun getUserVote(pinId: String): Result<String?>
    suspend fun reportPin(pinId: String, reason: String): Result<Unit>
    
    // Admin methods
    suspend fun getReportedPins(): Result<PinsListData>
    suspend fun clearPinReports(pinId: String): Result<Unit>
}