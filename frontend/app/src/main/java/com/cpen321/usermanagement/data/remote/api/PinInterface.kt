package com.cpen321.usermanagement.data.remote.api

import com.cpen321.usermanagement.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface PinInterface {
    
    @POST("pins")
    suspend fun createPin(
        @Body request: CreatePinRequest
    ): Response<PinResponse>
    
    @GET("pins/{id}")
    suspend fun getPin(
        @Path("id") pinId: String
    ): Response<PinResponse>
    
    @PUT("pins/{id}")
    suspend fun updatePin(
        @Path("id") pinId: String,
        @Body request: UpdatePinRequest
    ): Response<PinResponse>
    
    @DELETE("pins/{id}")
    suspend fun deletePin(
        @Path("id") pinId: String
    ): Response<SimpleResponse>
    
    @GET("pins/search")
    suspend fun searchPins(
        @Query("category") category: String? = null,
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null,
        @Query("radius") radius: Double? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): Response<PinsListResponse>
    
    @POST("pins/{id}/rate")
    suspend fun ratePin(
        @Path("id") pinId: String,
        @Body request: RatePinRequest
    ): Response<SimpleResponse>
    
    @POST("pins/{id}/report")
    suspend fun reportPin(
        @Path("id") pinId: String,
        @Body request: ReportPinRequest
    ): Response<SimpleResponse>
}