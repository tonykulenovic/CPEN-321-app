package com.cpen321.usermanagement.data.repository

import com.cpen321.usermanagement.data.remote.dto.*

interface BadgeRepository {
    suspend fun getAllBadges(category: String? = null): Result<List<Badge>>
    suspend fun getUserEarnedBadges(): Result<List<UserBadge>>
    suspend fun getAvailableBadges(): Result<List<Badge>>
    suspend fun getBadgeProgress(): Result<BadgeProgressResponse>
    suspend fun getBadgeStats(): Result<BadgeStatsData>
    suspend fun processBadgeEvent(eventType: String, value: Int, metadata: Map<String, Any>? = null): Result<List<UserBadge>>
}