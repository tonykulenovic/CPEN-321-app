package com.cpen321.usermanagement.data.repository

import android.util.Log
import com.cpen321.usermanagement.data.remote.dto.*
import com.cpen321.usermanagement.data.remote.api.BadgeInterface
import javax.inject.Inject

class BadgeRepositoryImpl @Inject constructor(
    private val badgeInterface: BadgeInterface
) : BadgeRepository {
    
    companion object {
        private const val TAG = "BadgeRepositoryImpl"
    }
    
    override suspend fun getAllBadges(category: String?): Result<List<Badge>> {
        return try {
            val response = badgeInterface.getAllBadges(category = category)
            if (response.isSuccessful) {
                val badges = response.body()?.data?.badges ?: emptyList()
                Log.d(TAG, "Successfully fetched ${badges.size} badges")
                Result.success(badges)
            } else {
                val errorMsg = "Failed to fetch badges: ${response.code()}"
                Log.e(TAG, errorMsg)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching badges", e)
            Result.failure(e)
        }
    }
    
    override suspend fun getUserEarnedBadges(): Result<List<UserBadge>> {
        return try {
            val response = badgeInterface.getUserEarnedBadges()
            if (response.isSuccessful) {
                val userBadges = response.body()?.data?.userBadges ?: emptyList()
                Log.d(TAG, "Successfully fetched ${userBadges.size} earned badges")
                Result.success(userBadges)
            } else {
                val errorMsg = "Failed to fetch earned badges: ${response.code()}"
                Log.e(TAG, errorMsg)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching earned badges", e)
            Result.failure(e)
        }
    }
    
    override suspend fun getAvailableBadges(): Result<List<Badge>> {
        return try {
            val response = badgeInterface.getAvailableBadges()
            if (response.isSuccessful) {
                val badges = response.body()?.data?.badges ?: emptyList()
                Log.d(TAG, "Successfully fetched ${badges.size} available badges")
                Result.success(badges)
            } else {
                val errorMsg = "Failed to fetch available badges: ${response.code()}"
                Log.e(TAG, errorMsg)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching available badges", e)
            Result.failure(e)
        }
    }
    
    override suspend fun getBadgeProgress(): Result<BadgeProgressResponse> {
        return try {
            val response = badgeInterface.getBadgeProgress()
            if (response.isSuccessful) {
                val progress = response.body()?.data?.progress
                if (progress != null) {
                    Log.d(TAG, "Successfully fetched badge progress")
                    Result.success(progress)
                } else {
                    Result.failure(Exception("Badge progress data is null"))
                }
            } else {
                val errorMsg = "Failed to fetch badge progress: ${response.code()}"
                Log.e(TAG, errorMsg)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching badge progress", e)
            Result.failure(e)
        }
    }
    
    override suspend fun getBadgeStats(): Result<BadgeStatsData> {
        return try {
            val response = badgeInterface.getBadgeStats()
            if (response.isSuccessful) {
                val stats = response.body()?.data
                if (stats != null) {
                    Log.d(TAG, "Successfully fetched badge stats")
                    Result.success(stats)
                } else {
                    Result.failure(Exception("Badge stats data is null"))
                }
            } else {
                val errorMsg = "Failed to fetch badge stats: ${response.code()}"
                Log.e(TAG, errorMsg)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching badge stats", e)
            Result.failure(e)
        }
    }
    
    override suspend fun processBadgeEvent(
        eventType: String,
        value: Int,
        metadata: Map<String, Any>?
    ): Result<List<UserBadge>> {
        return try {
            val request = BadgeEventRequest(eventType, value, metadata)
            val response = badgeInterface.processBadgeEvent(request)
            if (response.isSuccessful) {
                val userBadges = response.body()?.data?.userBadges ?: emptyList()
                Log.d(TAG, "Successfully processed badge event")
                Result.success(userBadges)
            } else {
                val errorMsg = "Failed to process badge event: ${response.code()}"
                Log.e(TAG, errorMsg)
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing badge event", e)
            Result.failure(e)
        }
    }
}