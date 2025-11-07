package com.cpen321.usermanagement.ui

import android.util.Log
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.printToLog
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.cpen321.usermanagement.MainActivity
import com.cpen321.usermanagement.utils.SystemDialogHelper
import com.cpen321.usermanagement.utils.TestAuthHelper
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Simple diagnostic test to check authentication and app startup.
 * Run this test first to diagnose issues before running full E2E tests.
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class SimpleAuthTest {
    
    companion object {
        private const val TAG = "SimpleAuthTest"
    }
    
    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)
    
    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    @Before
    fun setup() {
        Log.d(TAG, "========== Starting Simple Auth Test ==========")
        hiltRule.inject()
        
        // Grant permissions
        Log.d(TAG, "Granting permissions...")
        SystemDialogHelper.grantAllPermissions()
        Thread.sleep(1000)
        
        // Check auth status
        val isAuthenticated = TestAuthHelper.isAuthenticated()
        Log.d(TAG, "Auth status: $isAuthenticated")
    }
    
    @Test
    fun testAppStartsAndShowsUI() {
        Log.d(TAG, "========== Diagnostic Test: App Startup ==========")
        
        // Wait for app to fully start
        Log.d(TAG, "Waiting 5 seconds for app to start...")
        Thread.sleep(5000)
        
        // Print entire UI tree
        Log.d(TAG, "Printing UI tree...")
        try {
            composeTestRule.onRoot().printToLog("FULL_UI_TREE")
            Log.d(TAG, "✅ UI tree printed successfully - check logcat for 'FULL_UI_TREE'")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to print UI tree", e)
        }
        
        // Check auth status
        val isAuth = TestAuthHelper.isAuthenticated()
        Log.d(TAG, "Current auth status: $isAuth")
        
        // Wait a bit more
        Thread.sleep(3000)
        
        // Print UI tree again
        try {
            composeTestRule.onRoot().printToLog("UI_TREE_AFTER_WAIT")
            Log.d(TAG, "✅ Second UI tree printed - check logcat for 'UI_TREE_AFTER_WAIT'")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to print second UI tree", e)
        }
        
        Log.d(TAG, "========== Test Complete - Check Logs Above ==========")
        Log.d(TAG, "If you see auth screens, sign in to the app first using:")
        Log.d(TAG, "1. ./gradlew installDebug")
        Log.d(TAG, "2. Launch app and sign in")
        Log.d(TAG, "3. Run tests again")
    }
}

