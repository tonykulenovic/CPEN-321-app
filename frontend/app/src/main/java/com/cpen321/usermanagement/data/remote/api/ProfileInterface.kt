package com.cpen321.usermanagement.data.remote.api

import com.cpen321.usermanagement.data.remote.dto.ApiResponse
import com.cpen321.usermanagement.data.remote.dto.ProfileData
import com.cpen321.usermanagement.data.remote.dto.UpdateProfileRequest
import com.cpen321.usermanagement.data.remote.dto.UploadImageData
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part

interface UserInterface {
    @GET("user/profile")
    suspend fun getProfile(@Header("Authorization") authHeader: String): Response<ApiResponse<ProfileData>>

    @POST("user/profile")
    suspend fun updateProfile(
        @Header("Authorization") authHeader: String,
        @Body request: UpdateProfileRequest
    ): Response<ApiResponse<ProfileData>>
    
    @DELETE("user/profile")
    suspend fun deleteProfile(@Header("Authorization") authHeader: String): Response<ApiResponse<Unit>>
    
    // FCM Token management for push notifications  
    @PUT("users/me/fcm-token")
    suspend fun updateFcmToken(
        @Header("Authorization") authHeader: String,
        @Body request: com.cpen321.usermanagement.data.remote.dto.NotificationTokenRequest
    ): Response<ApiResponse<Unit>>
    
    @DELETE("users/me/fcm-token") 
    suspend fun removeFcmToken(@Header("Authorization") authHeader: String): Response<ApiResponse<Unit>>
    
    // Privacy settings management
    @PATCH("users/me/privacy")
    suspend fun updatePrivacy(
        @Header("Authorization") authHeader: String,
        @Body request: com.cpen321.usermanagement.data.remote.dto.UpdatePrivacyRequest
    ): Response<ApiResponse<com.cpen321.usermanagement.data.remote.dto.ProfileData>>
}

interface ImageInterface {
    @Multipart
    @POST("media/upload")
    suspend fun uploadPicture(
        @Header("Authorization") authHeader: String,
        @Part media: MultipartBody.Part
    ): Response<ApiResponse<UploadImageData>>
}