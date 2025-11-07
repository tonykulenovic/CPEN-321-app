package com.cpen321.usermanagement.utils

import android.content.Context
import android.util.Log
import androidx.test.platform.app.InstrumentationRegistry

/**
 * Helper for handling authentication in E2E tests.
 * 
 * For E2E tests, we need actual authentication. This helper can:
 * 1. Use pre-configured test credentials
 * 2. Skip authentication screens if user is already signed in
 * 3. Clean up auth state after tests
 */
object TestAuthHelper {
    private const val TAG = "TestAuthHelper"
    
    /**
     * Test user credentials (these should be real test accounts in your backend)
     */
    object TestUsers {
        const val REGULAR_USER_EMAIL = "e2etest@example.com"
        const val ADMIN_USER_EMAIL = "e2eadmin@example.com"
    }
    
    /**
     * Check if user is already authenticated
     */
    fun isAuthenticated(): Boolean {
        return try {
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            val dataStore = context.applicationContext
                .getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
            
            val token = dataStore.getString("auth_token", null)
            val isAuthenticated = token?.isNotEmpty() == true
            
            Log.d(TAG, "Checking auth status: $isAuthenticated")
            isAuthenticated
        } catch (e: Exception) {
            Log.e(TAG, "Error checking auth status", e)
            false
        }
    }
    
    /**
     * Clear authentication data for clean test state
     */
    fun clearAuthData() {
        try {
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            
            // Clear SharedPreferences
            val prefs = context.getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
            prefs.edit().clear().commit()
            
            Log.d(TAG, "Cleared authentication data")
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing auth data", e)
        }
    }
    
    /**
     * Store mock auth data for testing (simulates successful login)
     * Note: This is a workaround for E2E tests. In a real scenario,
     * you would either:
     * 1. Have the user manually sign in once before running tests
     * 2. Use a test account with automated Google Sign-In
     * 3. Use a backend test endpoint to generate test sessions
     */
    fun setMockAuthData(
        token: String = "test_token_${System.currentTimeMillis()}",
        userId: String = "test_user_${System.currentTimeMillis()}",
        email: String = TestUsers.REGULAR_USER_EMAIL,
        username: String = "testuser"
    ) {
        try {
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            
            val prefs = context.getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString("auth_token", token)
                putString("user_id", userId)
                putString("user_email", email)
                putString("user_username", username)
                commit()
            }
            
            Log.d(TAG, "Set mock auth data for user: $email")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting mock auth data", e)
        }
    }
    
    /**
     * Wait for user to complete sign-in manually
     * This is useful for E2E tests where you want to test with real authentication
     */
    fun waitForManualSignIn(timeoutMillis: Long = 60000L): Boolean {
        val startTime = System.currentTimeMillis()
        
        while (System.currentTimeMillis() - startTime < timeoutMillis) {
            if (isAuthenticated()) {
                Log.d(TAG, "User signed in successfully")
                return true
            }
            Thread.sleep(1000)
        }
        
        Log.w(TAG, "Timeout waiting for manual sign-in")
        return false
    }
    
    /**
     * Instructions for manual test setup
     */
    fun printSetupInstructions() {
        Log.i(TAG, """
            ========================================
            E2E TEST SETUP INSTRUCTIONS
            ========================================
            
            For E2E tests to work properly, you need to:
            
            Option 1: Manual Sign-In (Recommended for E2E)
            1. Run the tests
            2. When the app starts, sign in with your Google account
            3. Tests will wait for you to complete sign-in
            4. Tests will then proceed automatically
            
            Option 2: Pre-authenticated Session
            1. Run the app normally outside of tests
            2. Sign in with your Google account
            3. Run the tests (they will use the existing session)
            
            Option 3: Mock Authentication (Limited Testing)
            - Tests can use mock auth data
            - This skips Google Sign-In but may not work for all features
            - Enable with: TestAuthHelper.setMockAuthData()
            
            ========================================
        """.trimIndent())
    }
}

