package com.cpen321.usermanagement.data.remote.dto

data class NotificationTokenRequest(
    val fcmToken: String,
    val platform: String = "android"
)