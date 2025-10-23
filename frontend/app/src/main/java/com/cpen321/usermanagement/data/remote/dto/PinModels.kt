package com.cpen321.usermanagement.data.remote.dto

import com.google.gson.annotations.SerializedName

// Enums matching backend
enum class PinCategory {
    @SerializedName("study") STUDY,
    @SerializedName("events") EVENTS,
    @SerializedName("chill") CHILL,
    @SerializedName("shops_services") SHOPS_SERVICES
}

enum class PinStatus {
    @SerializedName("active") ACTIVE,
    @SerializedName("reported") REPORTED,
    @SerializedName("hidden") HIDDEN
}

enum class PinVisibility {
    @SerializedName("public") PUBLIC,
    @SerializedName("friends") FRIENDS_ONLY,
    @SerializedName("private") PRIVATE
}

enum class CrowdLevel {
    @SerializedName("quiet") QUIET,
    @SerializedName("moderate") MODERATE,
    @SerializedName("busy") BUSY
}

// Data classes
data class PinLocation(
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double,
    @SerializedName("address") val address: String? = null
)

data class PinMetadata(
    @SerializedName("capacity") val capacity: Int? = null,
    @SerializedName("openingHours") val openingHours: String? = null,
    @SerializedName("amenities") val amenities: List<String>? = null,
    @SerializedName("crowdLevel") val crowdLevel: CrowdLevel? = null
)

data class PinRating(
    @SerializedName("upvotes") val upvotes: Int = 0,
    @SerializedName("downvotes") val downvotes: Int = 0,
    @SerializedName("voters") val voters: List<String> = emptyList()
)

data class PinReport(
    @SerializedName("reportedBy") val reportedBy: String,
    @SerializedName("reason") val reason: String,
    @SerializedName("timestamp") val timestamp: String
)

data class PinCreator(
    @SerializedName("_id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("profilePicture") val profilePicture: String?
)

data class Pin(
    @SerializedName("_id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("category") val category: PinCategory,
    @SerializedName("description") val description: String,
    @SerializedName("location") val location: PinLocation,
    @SerializedName("createdBy") val createdBy: PinCreator,
    @SerializedName("metadata") val metadata: PinMetadata? = null,
    @SerializedName("rating") val rating: PinRating = PinRating(),
    @SerializedName("reports") val reports: List<PinReport> = emptyList(),
    @SerializedName("status") val status: PinStatus = PinStatus.ACTIVE,
    @SerializedName("visibility") val visibility: PinVisibility = PinVisibility.PUBLIC,
    @SerializedName("isPreSeeded") val isPreSeeded: Boolean = false,
    @SerializedName("expiresAt") val expiresAt: String? = null,
    @SerializedName("imageUrl") val imageUrl: String? = null,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String
)

// Request DTOs
data class CreatePinRequest(
    @SerializedName("name") val name: String,
    @SerializedName("category") val category: PinCategory,
    @SerializedName("description") val description: String,
    @SerializedName("location") val location: PinLocation,
    @SerializedName("visibility") val visibility: PinVisibility = PinVisibility.PUBLIC,
    @SerializedName("metadata") val metadata: PinMetadata? = null,
    @SerializedName("expiresAt") val expiresAt: String? = null,
    @SerializedName("imageUrl") val imageUrl: String? = null
)

data class UpdatePinRequest(
    @SerializedName("name") val name: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("visibility") val visibility: PinVisibility? = null,
    @SerializedName("metadata") val metadata: PinMetadata? = null,
    @SerializedName("imageUrl") val imageUrl: String? = null
)

data class RatePinRequest(
    @SerializedName("voteType") val voteType: String // "upvote" or "downvote"
)

data class ReportPinRequest(
    @SerializedName("reason") val reason: String
)

// Response DTOs
data class PinResponse(
    @SerializedName("message") val message: String,
    @SerializedName("data") val data: PinData?
)

data class PinData(
    @SerializedName("pin") val pin: Pin
)

data class PinsListResponse(
    @SerializedName("message") val message: String,
    @SerializedName("data") val data: PinsListData?
)

data class PinsListData(
    @SerializedName("pins") val pins: List<Pin>,
    @SerializedName("total") val total: Int,
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int
)

data class SimpleResponse(
    @SerializedName("message") val message: String
)