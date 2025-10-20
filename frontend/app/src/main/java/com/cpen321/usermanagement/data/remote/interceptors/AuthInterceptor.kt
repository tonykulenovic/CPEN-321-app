package com.cpen321.usermanagement.data.remote.interceptors

import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(private val tokenProvider: () -> String?) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val token = tokenProvider()
        if (token == null) {
            return chain.proceed(originalRequest)
        }

        val newRequest = originalRequest.newBuilder()
            .addHeader("Authorization", "Bearer $token")
            .build()

        val response = chain.proceed(newRequest)

        // Only retry on authentication failures (401) or server errors (5xx)
        // Don't retry on client errors like 400, 409, etc. as those are valid responses
        if (response.code == 401 || response.code >= 500) {
            Log.d("AuthInterceptor", "Retrying request due to status: ${response.code}")
            response.close() // Close the previous response
            val retryRequest = originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
            return chain.proceed(retryRequest)
        }

        return response
    }
}