package com.cpen321.usermanagement.data.remote.api

import com.cpen321.usermanagement.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface BadgeInterface {
    
    // Get all badges (for browsing)
    @GET("/api/badges")
    suspend fun getAllBadges(
        @Query("category") category: String? = null,
        @Query("isActive") isActive: Boolean? = null
    ): Response<BadgeResponse<BadgesData>>
    
    // Get user's earned badges
    @GET("/api/badges/user/earned")
    suspend fun getUserEarnedBadges(): Response<BadgeResponse<UserBadgesData>>
    
    // Get available badges (not yet earned)
    @GET("/api/badges/user/available")
    suspend fun getAvailableBadges(): Response<BadgeResponse<BadgesData>>
    
    // Get badge progress (earned + available + progress)
    @GET("/api/badges/user/progress")
    suspend fun getBadgeProgress(): Response<BadgeResponse<BadgeProgressData>>
    
    // Get badge statistics
    @GET("/api/badges/user/stats")
    suspend fun getBadgeStats(): Response<BadgeResponse<BadgeStatsData>>
    
    // Process badge earning event
    @POST("/api/badges/user/event")
    suspend fun processBadgeEvent(
        @Body request: BadgeEventRequest
    ): Response<BadgeResponse<UserBadgesData>>
    
    // Get single badge by ID
    @GET("/api/badges/{id}")
    suspend fun getBadgeById(
        @Path("id") badgeId: String
    ): Response<BadgeResponse<Map<String, Badge>>>
}