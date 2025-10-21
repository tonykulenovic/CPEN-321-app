package com.cpen321.usermanagement.data.remote.dto

import com.google.gson.annotations.SerializedName

// Badge Categories
enum class BadgeCategory(val value: String) {
    @SerializedName("activity") ACTIVITY("activity"),
    @SerializedName("social") SOCIAL("social"),
    @SerializedName("exploration") EXPLORATION("exploration"),
    @SerializedName("achievement") ACHIEVEMENT("achievement"),
    @SerializedName("special") SPECIAL("special")
}

// Badge Rarities
enum class BadgeRarity(val value: String) {
    @SerializedName("common") COMMON("common"),
    @SerializedName("uncommon") UNCOMMON("uncommon"),
    @SerializedName("rare") RARE("rare"),
    @SerializedName("epic") EPIC("epic"),
    @SerializedName("legendary") LEGENDARY("legendary")
}

// Badge Requirement Types
enum class BadgeRequirementType(val value: String) {
    @SerializedName("login_streak") LOGIN_STREAK("login_streak"),
    @SerializedName("pins_created") PINS_CREATED("pins_created"),
    @SerializedName("pins_visited") PINS_VISITED("pins_visited"),
    @SerializedName("friends_added") FRIENDS_ADDED("friends_added"),
    @SerializedName("time_spent") TIME_SPENT("time_spent"),
    @SerializedName("reports_made") REPORTS_MADE("reports_made"),
    @SerializedName("locations_explored") LOCATIONS_EXPLORED("locations_explored"),
    @SerializedName("daily_active") DAILY_ACTIVE("daily_active"),
    @SerializedName("weekly_active") WEEKLY_ACTIVE("weekly_active"),
    @SerializedName("monthly_active") MONTHLY_ACTIVE("monthly_active")
}

// Badge Requirements
data class BadgeRequirements(
    val type: BadgeRequirementType,
    val target: Int,
    val timeframe: String? = null,
    val conditions: Map<String, Any>? = null
)

// Badge Progress
data class BadgeProgress(
    val current: Int,
    val target: Int,
    val percentage: Double,
    val lastUpdated: String
)

// Badge (template)
data class Badge(
    @SerializedName("_id") val id: String,
    val name: String,
    val description: String,
    val icon: String,
    val category: BadgeCategory,
    val rarity: BadgeRarity,
    val requirements: BadgeRequirements,
    val isActive: Boolean,
    val createdAt: String,
    val updatedAt: String
)

// User Badge (earned badge with progress)
data class UserBadge(
    @SerializedName("_id") val id: String,
    val userId: String,
    val badgeId: Badge,
    val earnedAt: String,
    val progress: BadgeProgress?,
    val isDisplayed: Boolean,
    val createdAt: String,
    val updatedAt: String
)

// API Response wrappers
data class BadgeResponse<T>(
    val message: String,
    val data: T
)

data class BadgesData(
    val badges: List<Badge>
)

data class UserBadgesData(
    val userBadges: List<UserBadge>
)

data class BadgeProgressData(
    val progress: BadgeProgressResponse
)

data class BadgeProgressResponse(
    val earned: List<UserBadge>,
    val available: List<Badge>,
    val progress: List<BadgeProgressItem>
)

data class BadgeProgressItem(
    val badge: Badge,
    val progress: BadgeProgress?
)

data class BadgeStatsData(
    val totalBadges: Int,
    val earnedBadges: Int,
    val recentBadges: List<UserBadge>,
    val categoryBreakdown: Map<String, Int>
)

// Request types
data class BadgeEventRequest(
    val eventType: String,
    val value: Int,
    val metadata: Map<String, Any>? = null
)