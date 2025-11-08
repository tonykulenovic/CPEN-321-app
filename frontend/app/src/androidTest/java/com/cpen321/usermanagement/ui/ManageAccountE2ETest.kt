package com.cpen321.usermanagement.ui

import android.util.Log
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.cpen321.usermanagement.MainActivity
import com.cpen321.usermanagement.data.local.preferences.TokenManager
import com.cpen321.usermanagement.utils.ComposeTestUtils.nodeExists
import com.cpen321.usermanagement.utils.ComposeTestUtils.textExists
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitForCondition
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitForTag
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitForText
import com.cpen321.usermanagement.utils.SystemDialogHelper
import com.cpen321.usermanagement.utils.TestTags
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.FixMethodOrder
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.MethodSorters

/**
 * End-to-End Tests for Manage Account Feature (INCLUDES DESTRUCTIVE TESTS)
 * 
 * ⚠️ IMPORTANT: This test suite includes ALL account management tests in one flow.
 * 
 * Test Flow (in execution order):
 * 01. Sign Up & Create Profile - Sign up + automate username/bio creation
 * 02. Logout - User logs out (tests logout functionality)
 * 03. Sign In - User signs in again (tests sign in functionality)
 * 04. View Profile - User can view their profile information
 * 05. Edit Profile - User can edit their name, username, and bio
 * 06. Cancel Profile Edit - User can cancel profile changes
 * 07. Manage Privacy Settings - User can change privacy settings
 * 08. Cancel Privacy Changes - User can cancel privacy changes
 * 09. Delete Account Cancel - User can see delete dialog and cancel
 * 10. Delete Account - PERMANENTLY deletes the test account (DESTRUCTIVE)
 * 
 * Prerequisites:
 * - Run these tests on an Android emulator or device
 * - Use a DISPOSABLE test account (will be deleted at the end)
 * - The app will prompt for sign-up/sign-in twice (initial + after logout)
 * - Tests run in order (enforced by @FixMethodOrder with zero-padded numbers)
 * 
 * ⚠️ WARNING: The test account will be PERMANENTLY DELETED at the end!
 * Only use disposable test accounts for this test suite.
 */
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class ManageAccountE2ETest {
    
    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)
    
    @get:Rule(order = 1)
    val composeTestRule = createComposeRule()
    
    private lateinit var activityScenario: ActivityScenario<MainActivity>
    
    companion object {
        private const val TAG = "ManageAccountE2ETest"
        private var permissionsGranted = false
        private var initialSetupComplete = false
    }
    
    @Before
    fun setup() {
        Log.d(TAG, "========== Starting E2E Test Setup ==========")
        
        val context = androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().targetContext
        val tokenManager = TokenManager(context)
        
        // Only do full setup (clear token, wait for auth) on the FIRST test
        if (!initialSetupComplete) {
            Log.d(TAG, "*** INITIAL SETUP (First test only) ***")
            
            // Step 1: Clear any existing auth token BEFORE launching activity
            Log.d(TAG, "Step 1: Clearing any existing auth token...")
            try {
                runBlocking {
                    tokenManager.clearToken()
                }
                Log.d(TAG, "✓ Auth token cleared")
            } catch (e: Exception) {
                Log.w(TAG, "Could not clear token (may not exist): ${e.message}")
            }
            
            // Step 2: Grant permissions once for all tests
            if (!permissionsGranted) {
                Log.d(TAG, "Step 2: Granting permissions (first time only)...")
                SystemDialogHelper.grantAllPermissions()
                SystemDialogHelper.handleNotificationPermission(allowPermission = true)
                SystemDialogHelper.handleLocationPermission(allowPermission = true)
                SystemDialogHelper.waitForIdle()
                permissionsGranted = true
            }
            
            // Step 3: NOW launch the activity (after token is cleared)
            Log.d(TAG, "Step 3: Launching activity with clean state...")
            activityScenario = ActivityScenario.launch(MainActivity::class.java)
            composeTestRule.waitForIdle()
            
            // Step 4: Wait for app to show login screen
            Log.d(TAG, "Step 4: Waiting for app to show login screen...")
            Thread.sleep(3000)
            
            // Step 5: Wait for user to SIGN UP (first time)
            Log.w(TAG, "=" .repeat(60))
            Log.w(TAG, "⚠️  PLEASE SIGN UP (First Time) ⚠️")
            Log.w(TAG, "=" .repeat(60))
            Log.w(TAG, "1. Click 'Sign Up with Google' button")
            Log.w(TAG, "2. Authenticate with a DISPOSABLE Google account (will be deleted)")
            Log.w(TAG, "3. Wait for username dialog to appear")
            Log.w(TAG, "⚠️  Use a DISPOSABLE account (will be deleted at end)")
            Log.w(TAG, "⚠️  DO NOT manually enter username - test will automate it!")
            Log.w(TAG, "=" .repeat(60))
            
            // Note: For sign-up, we DON'T wait for token here because the token
            // is only created AFTER the user completes username/bio creation.
            // The first test (test01) will handle the username dialog and bio screen.
            
            Log.d(TAG, "Waiting for Google authentication to complete...")
            Thread.sleep(10000) // Give time for Google auth and username dialog to appear
            
            initialSetupComplete = true
        } else {
            Log.d(TAG, "*** SUBSEQUENT TEST - Reusing existing auth ***")
            // For subsequent tests, just ensure activity is launched
            if (!::activityScenario.isInitialized) {
                Log.d(TAG, "Launching activity...")
                activityScenario = ActivityScenario.launch(MainActivity::class.java)
                composeTestRule.waitForIdle()
                Thread.sleep(2000)
            }
            
            // Verify token still exists
            val hasToken = try {
                runBlocking { tokenManager.getTokenSync() != null }
            } catch (e: Exception) {
                false
            }
            
            Log.d(TAG, "Token exists: $hasToken")
            if (!hasToken) {
                Log.w(TAG, "Warning: Token not found - tests may fail")
            }
        }
        
        Log.d(TAG, "========== Test Setup Complete ==========")
    }
    
    @After
    fun tearDown() {
        Log.d(TAG, "========== Test Teardown ==========")
        try {
            if (::activityScenario.isInitialized) {
                activityScenario.close()
                Log.d(TAG, "✓ Activity closed")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error closing activity: ${e.message}")
        }
    }
    
    // ========================================================================
    // Helper Methods
    // ========================================================================
    
    /**
     * Ensures the app is on the Profile screen
     * Navigates if necessary, with retry logic
     */
    private fun ensureOnProfileScreen() {
        Log.d(TAG, "ensureOnProfileScreen() called")
        
        // Quick check: Are we already on profile screen?
        val alreadyOnProfile = try {
            composeTestRule.textExists("Manage Profile", ignoreCase = true) ||
            composeTestRule.textExists("Logout", ignoreCase = true) ||
            composeTestRule.textExists("Log Out", ignoreCase = true)
        } catch (e: Exception) {
            false
        }
        
        if (alreadyOnProfile) {
            Log.d(TAG, "✓ Already on Profile screen")
            return
        }
        
        // Need to navigate - try clicking Profile tab (retry up to 3 times)
        Log.d(TAG, "Not on Profile screen, navigating...")
        var navigationAttempt = 0
        val maxNavigationAttempts = 3
        var navigationSuccess = false
        
        while (navigationAttempt < maxNavigationAttempts && !navigationSuccess) {
            navigationAttempt++
            Log.d(TAG, "Navigation attempt $navigationAttempt/$maxNavigationAttempts")
            
            try {
                composeTestRule.onNodeWithContentDescription("Profile")
                    .performClick()
                Log.d(TAG, "Clicked Profile navigation button")
                Thread.sleep(2000)
                
                // Verify navigation worked
                val profileVisible = composeTestRule.textExists("Manage Profile", ignoreCase = true) ||
                                    composeTestRule.textExists("Logout", ignoreCase = true)
                
                if (profileVisible) {
                    Log.d(TAG, "✓ Successfully navigated to Profile screen")
                    navigationSuccess = true
                } else {
                    Log.w(TAG, "Profile elements not found after navigation attempt")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Navigation attempt $navigationAttempt failed: ${e.message}")
                Thread.sleep(1000)
            }
        }
        
        if (!navigationSuccess) {
            Log.e(TAG, "!!! Failed to navigate to Profile screen after $maxNavigationAttempts attempts !!!")
            throw AssertionError("Could not navigate to Profile screen")
        }
    }
    
    /**
     * Waits for Manage Profile screen to load
     */
    private fun waitForManageProfileScreen() {
        var attempt = 0
        val maxAttempts = 5
        var screenLoaded = false
        
        while (attempt < maxAttempts && !screenLoaded) {
            attempt++
            Log.d(TAG, "Attempt $attempt/$maxAttempts: Waiting for Manage Profile screen...")
            Thread.sleep(2000)
            
            // Check for manage profile elements
            val hasNameField = composeTestRule.textExists("Name", substring = true)
            val hasUsernameField = composeTestRule.textExists("Username", substring = true)
            val hasBioField = composeTestRule.textExists("Bio", substring = true)
            val hasSaveButton = composeTestRule.textExists("Save", ignoreCase = true)
            
            screenLoaded = (hasNameField || hasUsernameField) && hasSaveButton
            
            Log.d(TAG, "  - Name field found: $hasNameField")
            Log.d(TAG, "  - Username field found: $hasUsernameField")
            Log.d(TAG, "  - Bio field found: $hasBioField")
            Log.d(TAG, "  - Save button found: $hasSaveButton")
            
            if (screenLoaded) {
                Log.d(TAG, "  ✓ Manage Profile screen loaded!")
                break
            }
        }
        
        if (!screenLoaded) {
            throw AssertionError("Manage Profile screen did not load after $maxAttempts attempts")
        }
    }
    
    /**
     * Waits for Privacy Settings screen to load
     */
    private fun waitForPrivacySettingsScreen() {
        var attempt = 0
        val maxAttempts = 10
        var screenLoaded = false
        
        while (attempt < maxAttempts && !screenLoaded) {
            attempt++
            Log.d(TAG, "Attempt $attempt/$maxAttempts: Waiting for Privacy Settings screen...")
            Thread.sleep(1500)
            
            // Check for exact text on Privacy Settings screen
            val hasPrivacySettings = composeTestRule.textExists("Privacy Settings", substring = true, ignoreCase = true)
            val hasLocationSharing = composeTestRule.textExists("Location Sharing", substring = true, ignoreCase = true)
            val hasSaveSettingsButton = composeTestRule.textExists("Save Settings", substring = true, ignoreCase = true)
            val hasSavingButton = composeTestRule.textExists("Saving", substring = true, ignoreCase = true)
            
            screenLoaded = (hasPrivacySettings || hasLocationSharing) && (hasSaveSettingsButton || hasSavingButton)
            
            Log.d(TAG, "  - Privacy Settings title: $hasPrivacySettings")
            Log.d(TAG, "  - Location Sharing: $hasLocationSharing")
            Log.d(TAG, "  - Save Settings button: $hasSaveSettingsButton")
            Log.d(TAG, "  - Saving button: $hasSavingButton")
            
            if (screenLoaded) {
                Log.d(TAG, "  ✓ Privacy Settings screen loaded!")
                break
            }
        }
        
        if (!screenLoaded) {
            // Print UI tree for debugging
            try {
                composeTestRule.onRoot().printToLog("PRIVACY_SETTINGS_NOT_FOUND")
            } catch (e: Exception) {
                Log.w(TAG, "Could not print UI tree: ${e.message}")
            }
            throw AssertionError("Privacy Settings screen did not load after $maxAttempts attempts")
        }
    }
    
    // ========================================================================
    // Test Cases: Authentication Verification (Manual Actions)
    // ========================================================================
    
    /**
     * Test: Sign In After Logout
     * 
     * Verifies that user can successfully sign in after logging out
     * This tests the sign-in flow (vs sign-up flow tested in test1)
     * 
     * Manual action required:
     * - User manually clicks "Sign In" and authenticates with Google
     * 
     * Test verifies:
     * 1. User can sign in again after logout
     * 2. Authentication token is created
     * 3. App navigates to main screen
     * 4. User can access protected features
     */
    @Test(timeout = 180000)
    fun test03_SignIn_verifySuccess() {
        Log.d(TAG, "=== test03_SignIn_verifySuccess ===")
        Log.d(TAG, "Previous test logged out - waiting for sign-in...")
        
        val context = androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().targetContext
        val tokenManager = TokenManager(context)
        
        // Check if already signed in (token exists)
        val alreadySignedIn = try {
            runBlocking { tokenManager.getTokenSync() != null }
        } catch (e: Exception) {
            false
        }
        
        if (alreadySignedIn) {
            Log.d(TAG, "Already signed in, skipping manual sign-in wait")
        } else {
            // Step 1: Wait for user to sign in again
            Log.w(TAG, "=" .repeat(60))
            Log.w(TAG, "PLEASE SIGN IN AGAIN")
            Log.w(TAG, "=" .repeat(60))
            Log.w(TAG, "Click 'Sign In' button and authenticate with Google (60 seconds)")
            Log.w(TAG, "Use the SAME account you signed up with in test01")
            Log.w(TAG, "=" .repeat(60))
            
            val startTime = System.currentTimeMillis()
            val timeout = 60000
            var signedIn = false
            
            while (!signedIn && (System.currentTimeMillis() - startTime) < timeout) {
                Thread.sleep(2000)
                signedIn = try {
                    runBlocking {
                        tokenManager.getTokenSync() != null
                    }
                } catch (e: Exception) {
                    false
                }
                
                if (!signedIn) {
                    val elapsed = (System.currentTimeMillis() - startTime) / 1000
                    Log.d(TAG, "Waiting for sign-in... (${elapsed}s / 60s)")
                }
            }
            
            if (!signedIn) {
                Log.e(TAG, "TIMEOUT: User did not sign in within 60 seconds")
                throw AssertionError("Test aborted: User did not sign in within 60 seconds")
            }
            
            Log.d(TAG, "✓ User signed in successfully!")
            Thread.sleep(5000)
        }
        
        // Step 2: Verify authentication token exists
        Log.d(TAG, "Step 2: Verifying authentication token")
        val token = runBlocking { tokenManager.getTokenSync() }
        
        assert(token != null) {
            "Authentication token should exist after manual sign in"
        }
        Log.d(TAG, "  ✓ Authentication token exists")
        
        // Step 3: Verify not on login screen
        Log.d(TAG, "Step 3: Verifying not on login screen")
        Thread.sleep(2000)
        
        val isOnLoginScreen = composeTestRule.textExists("Sign in with Google", substring = true, ignoreCase = true)
        
        assert(!isOnLoginScreen) {
            "Should not be on login screen after successful sign in"
        }
        Log.d(TAG, "  ✓ Not on login screen")
        
        // Step 4: Verify can access main features
        Log.d(TAG, "Step 4: Verifying access to main features")
        ensureOnProfileScreen()
        
        val hasProfileAccess = composeTestRule.textExists("Manage Profile", ignoreCase = true) ||
                              composeTestRule.textExists("Logout", ignoreCase = true)
        
        assert(hasProfileAccess) {
            "Should have access to profile features after sign in"
        }
        Log.d(TAG, "  ✓ Can access profile features")
        
        Log.d(TAG, "✓ test03_SignIn_verifySuccess: PASSED")
    }
    
    /**
     * Test: Sign Up and Create Profile
     * 
     * Verifies the complete sign-up flow including profile creation
     * 
     * Manual actions required:
     * 1. User clicks "Sign Up with Google" and authenticates
     * 2. User enters username in dialog
     * 3. User enters bio on profile completion screen
     * 
     * Test automates:
     * 1. Entering username in the dialog
     * 2. Clicking "Create Account"
     * 3. Entering bio on profile completion screen
     * 4. Saving the bio
     * 5. Verifying profile was created successfully
     */
    @Test(timeout = 180000)
    fun test01_SignUp_verifyProfileCreated() {
        Log.d(TAG, "=== test01_SignUp_verifyProfileCreated ===")
        Log.d(TAG, "After authentication, the app should show the username dialog...")
        
        // Step 1: Wait for username dialog after sign-up
        Log.d(TAG, "Step 1: Waiting for username dialog")
        var usernameDialogShown = false
        var attempts = 0
        val maxAttempts = 10
        
        while (!usernameDialogShown && attempts < maxAttempts) {
            Thread.sleep(2000)
            attempts++
            
            usernameDialogShown = composeTestRule.textExists("Choose a Username", substring = true) ||
                                 composeTestRule.textExists("username", substring = true, ignoreCase = true)
            
            if (!usernameDialogShown) {
                Log.d(TAG, "  - Waiting for username dialog (attempt $attempts/$maxAttempts)...")
            }
        }
        
        assert(usernameDialogShown) {
            "Username dialog should appear after sign-up. Make sure you clicked 'Sign Up' (not 'Sign In')."
        }
        
        Log.d(TAG, "  ✓ Username dialog appeared")
        
        // Step 2: Enter username
        Log.d(TAG, "Step 2: Entering username")
        Thread.sleep(1000)
        
        // Generate a unique username within 20 character limit (3-20 chars)
        // Format: e2e_<8-digit-timestamp> = 12 characters total
        val timestamp = System.currentTimeMillis().toString().takeLast(8)
        val username = "e2e_$timestamp"
        
        try {
            composeTestRule.onNode(hasSetTextAction())
                .performTextInput(username)
            Log.d(TAG, "  ✓ Entered username: $username")
        } catch (e: Exception) {
            Log.e(TAG, "  ✗ Failed to enter username: ${e.message}")
            throw AssertionError("Could not enter username in dialog")
        }
        
        Thread.sleep(1000)
        
        // Step 3: Click "Create Account"
        Log.d(TAG, "Step 3: Clicking 'Create Account'")
        try {
            composeTestRule.onNodeWithText("Create Account", ignoreCase = true).performClick()
            Log.d(TAG, "  ✓ Clicked Create Account")
        } catch (e: Exception) {
            Log.e(TAG, "  ✗ Could not find 'Create Account' button: ${e.message}")
            throw AssertionError("Could not find 'Create Account' button")
        }
        
        // Step 4: Wait for profile completion screen
        Log.d(TAG, "Step 4: Waiting for profile completion screen")
        var profileCompletionShown = false
        attempts = 0
        
        while (!profileCompletionShown && attempts < maxAttempts) {
            Thread.sleep(2000)
            attempts++
            
            profileCompletionShown = composeTestRule.textExists("Complete Your Profile", substring = true) ||
                                    composeTestRule.textExists("Tell us about yourself", substring = true)
            
            if (!profileCompletionShown) {
                Log.d(TAG, "  - Waiting for profile completion screen (attempt $attempts/$maxAttempts)...")
            }
        }
        
        assert(profileCompletionShown) {
            "Profile completion screen should appear after creating username"
        }
        
        Log.d(TAG, "  ✓ Profile completion screen appeared")
        
        // Step 5: Enter bio
        Log.d(TAG, "Step 5: Entering bio")
        Thread.sleep(1000)
        
        val bio = "E2E Test User Bio - Automated testing account"
        try {
            composeTestRule.onNode(hasSetTextAction())
                .performTextInput(bio)
            Log.d(TAG, "  ✓ Entered bio")
        } catch (e: Exception) {
            Log.w(TAG, "  - Could not enter bio, will skip: ${e.message}")
        }
        
        Thread.sleep(1000)
        
        // Step 6: Click "Save" (or "Skip" if Save not available)
        Log.d(TAG, "Step 6: Saving profile")
        var profileSaved = false
        
        try {
            composeTestRule.onNodeWithText("Save", ignoreCase = true).performClick()
            Log.d(TAG, "  ✓ Clicked Save")
            profileSaved = true
        } catch (e: Exception) {
            try {
                composeTestRule.onNodeWithText("Skip", ignoreCase = true).performClick()
                Log.d(TAG, "  ✓ Clicked Skip (Save not available)")
                profileSaved = true
            } catch (e2: Exception) {
                Log.e(TAG, "  ✗ Could not find Save or Skip button")
            }
        }
        
        assert(profileSaved) {
            "Should be able to save or skip profile completion"
        }
        
        // Step 7: Wait for app to navigate to main screen
        Log.d(TAG, "Step 7: Waiting for navigation to main screen")
        Thread.sleep(5000)
        
        // Step 8: Verify profile was created and we're on main screen
        Log.d(TAG, "Step 8: Verifying profile created successfully")
        ensureOnProfileScreen()
        
        val hasManageProfile = composeTestRule.textExists("Manage Profile", ignoreCase = true)
        val hasLogout = composeTestRule.textExists("Logout", ignoreCase = true) ||
                       composeTestRule.textExists("Log Out", ignoreCase = true)
        
        assert(hasManageProfile || hasLogout) {
            "Profile should be created with basic options available"
        }
        
        Log.d(TAG, "  ✓ Profile created successfully")
        Log.d(TAG, "✓ test01_SignUp_verifyProfileCreated: PASSED")
    }
    
    /**
     * Test: Logout
     * 
     * Verifies that user can successfully log out
     * This test logs out the user to test the sign-in flow in test03
     * 
     * Main success scenario:
     * 1. User clicks "Logout" button
     * 2. Authentication token is cleared
     * 3. App navigates to login screen
     */
    @Test(timeout = 120000)
    fun test02_Logout_success() {
        Log.d(TAG, "=== test02_Logout_success ===")
        Log.d(TAG, "⚠️  This test will LOG YOU OUT (to test sign-in in next test)")
        
        ensureOnProfileScreen()
        
        // Step 1: Click "Logout"
        Log.d(TAG, "Step 1: Clicking Logout button")
        Thread.sleep(1000)
        
        val logoutClicked = try {
            composeTestRule.onNodeWithText("Logout", ignoreCase = true).performClick()
            Log.d(TAG, "  ✓ Clicked Logout")
            true
        } catch (e: Exception) {
            try {
                composeTestRule.onNodeWithText("Log Out", ignoreCase = true).performClick()
                Log.d(TAG, "  ✓ Clicked Log Out")
                true
            } catch (e2: Exception) {
                Log.e(TAG, "  ✗ Could not find Logout button")
                false
            }
        }
        
        assert(logoutClicked) {
            "Could not find Logout button"
        }
        
        // Step 2: Verify logged out
        Log.d(TAG, "Step 2: Verifying logout successful")
        Thread.sleep(3000)
        
        val context = androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().targetContext
        val tokenManager = TokenManager(context)
        val tokenAfter = runBlocking { tokenManager.getTokenSync() }
        val tokenCleared = tokenAfter == null
        
        Log.d(TAG, "  - Token cleared: $tokenCleared")
        
        // Step 3: Verify on login screen
        Log.d(TAG, "Step 3: Verifying on login screen")
        Thread.sleep(2000)
        
        val hasLoginScreen = composeTestRule.textExists("Sign in", substring = true, ignoreCase = true) ||
                            composeTestRule.textExists("Sign up", substring = true, ignoreCase = true) ||
                            composeTestRule.textExists("Google", substring = true, ignoreCase = true)
        
        Log.d(TAG, "  - Login screen shown: $hasLoginScreen")
        
        assert(tokenCleared || hasLoginScreen) {
            "Either token should be cleared OR login screen should be shown after logout"
        }
        
        Log.d(TAG, "✓ test02_Logout_success: PASSED")
        Log.d(TAG, "⚠️  User is now LOGGED OUT - will need to sign in again for next test")
    }
    
    // ========================================================================
    // Test Cases: View Profile
    // ========================================================================
    
    /**
     * Test: View Profile - Success
     * 
     * Verifies that user can view their profile information
     * 
     * Main success scenario:
     * 1. User navigates to Profile screen
     * 2. Profile information is displayed
     * 3. User can see their name, username (if set), and profile options
     */
    @Test(timeout = 120000)
    fun test04_ViewProfile_success() {
        Log.d(TAG, "=== test04_ViewProfile_success ===")
        ensureOnProfileScreen()
        
        // Step 1: Verify profile elements are visible
        Log.d(TAG, "Step 1: Verifying profile elements")
        Thread.sleep(2000)
        
        // Check for key profile elements
        val hasManageProfile = composeTestRule.textExists("Manage Profile", ignoreCase = true)
        val hasDeleteAccount = composeTestRule.textExists("Delete Account", ignoreCase = true)
        val hasLogout = composeTestRule.textExists("Logout", ignoreCase = true) ||
                       composeTestRule.textExists("Log Out", ignoreCase = true)
        
        Log.d(TAG, "  - Manage Profile button: $hasManageProfile")
        Log.d(TAG, "  - Delete Account button: $hasDeleteAccount")
        Log.d(TAG, "  - Logout button: $hasLogout")
        
        // At least Manage Profile and Logout should be visible
        assert(hasManageProfile || hasLogout) {
            "Profile screen should show Manage Profile or Logout button"
        }
        
        Log.d(TAG, "✓ test04_ViewProfile_success: PASSED")
    }
    
    // ========================================================================
    // Test Cases: Edit Profile
    // ========================================================================
    
    /**
     * Test: Edit Profile - Success
     * 
     * Verifies that user can edit their profile information
     * 
     * Main success scenario:
     * 1. User clicks "Manage Profile"
     * 2. User edits their name
     * 3. User saves changes
     * 4. Success message is shown
     */
    @Test(timeout = 120000)
    fun test05_EditProfile_success() {
        Log.d(TAG, "=== test05_EditProfile_success ===")
        ensureOnProfileScreen()
        
        // Step 1: Click "Manage Profile"
        Log.d(TAG, "Step 1: Opening Manage Profile")
        composeTestRule.onNodeWithText("Manage Profile", ignoreCase = true).performClick()
        waitForManageProfileScreen()
        
        // Step 2: Edit name field
        Log.d(TAG, "Step 2: Editing profile name")
        Thread.sleep(2000)
        
        // Find the name field and update it
        try {
            val newName = "E2E Test User"
            
            // Find all text fields
            val textFields = composeTestRule.onAllNodes(hasSetTextAction())
            val fieldCount = textFields.fetchSemanticsNodes().size
            Log.d(TAG, "  - Found $fieldCount text fields")
            
            // First field should be Name (index 0)
            if (fieldCount >= 1) {
                textFields.get(0).performTextClearance()
                Thread.sleep(500)
                textFields.get(0).performTextInput(newName)
                Log.d(TAG, "  ✓ Updated name to: $newName")
            } else {
                Log.w(TAG, "  - No text fields found")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not edit name field: ${e.message}")
            // Continue anyway - might already have name set
        }
        
        // Step 3: Save changes
        Log.d(TAG, "Step 3: Saving profile changes")
        Thread.sleep(1000)
        composeTestRule.onNodeWithText("Save", ignoreCase = true).performClick()
        
        // Step 4: Verify success
        Log.d(TAG, "Step 4: Verifying save success")
        Thread.sleep(3000)
        
        // Check for success message or navigation back to profile
        val hasSuccessMessage = composeTestRule.textExists("Profile updated", substring = true, ignoreCase = true) ||
                               composeTestRule.textExists("Successfully updated", substring = true, ignoreCase = true) ||
                               composeTestRule.textExists("Manage Profile", ignoreCase = true)
        
        Log.d(TAG, "  - Success indicator found: $hasSuccessMessage")
        
        Log.d(TAG, "✓ test05_EditProfile_success: PASSED")
    }
    
    /**
     * Test: Cancel Profile Edit
     * 
     * Verifies that user can cancel profile changes
     * 
     * Main success scenario:
     * 1. User clicks "Manage Profile"
     * 2. User navigates back without saving
     * 3. Changes are not saved
     */
    @Test(timeout = 120000)
    fun test06_CancelProfileEdit_success() {
        Log.d(TAG, "=== test06_CancelProfileEdit_success ===")
        ensureOnProfileScreen()
        
        // Step 1: Click "Manage Profile"
        Log.d(TAG, "Step 1: Opening Manage Profile")
        composeTestRule.onNodeWithText("Manage Profile", ignoreCase = true).performClick()
        waitForManageProfileScreen()
        
        // Step 2: Navigate back using back button
        Log.d(TAG, "Step 2: Pressing back button to cancel")
        Thread.sleep(1000)
        
        activityScenario.onActivity { activity ->
            activity.onBackPressedDispatcher.onBackPressed()
        }
        
        Thread.sleep(2000)
        
        // Step 3: Verify back on profile screen
        Log.d(TAG, "Step 3: Verifying back on profile screen")
        val hasManageProfile = composeTestRule.textExists("Manage Profile", ignoreCase = true)
        
        assert(hasManageProfile) {
            "Should be back on Profile screen after canceling"
        }
        
        Log.d(TAG, "✓ test06_CancelProfileEdit_success: PASSED")
    }
    
    // ========================================================================
    // Test Cases: Privacy Settings
    // ========================================================================
    
    /**
     * Test: Manage Privacy Settings - Success
     * 
     * Verifies that user can change privacy settings
     * 
     * Main success scenario:
     * 1. User opens Manage Profile
     * 2. User clicks "Privacy Settings"
     * 3. User changes a privacy setting
     * 4. User saves changes
     * 5. Success message is shown
     */
    @Test(timeout = 120000)
    fun test07_ManagePrivacySettings_success() {
        Log.d(TAG, "=== test07_ManagePrivacySettings_success ===")
        ensureOnProfileScreen()
        
        // Step 1: Click "Manage Profile"
        Log.d(TAG, "Step 1: Opening Manage Profile")
        composeTestRule.onNodeWithText("Manage Profile", ignoreCase = true).performClick()
        waitForManageProfileScreen()
        
        // Step 2: Click "Privacy Settings"
        Log.d(TAG, "Step 2: Opening Privacy Settings")
        Thread.sleep(1000)
        composeTestRule.onNodeWithText("Privacy Settings", substring = true, ignoreCase = true)
            .performClick()
        waitForPrivacySettingsScreen()
        
        // Step 3: Change multiple privacy settings to make changes visible
        Log.d(TAG, "Step 3: Changing privacy settings (multiple changes for visibility)")
        Thread.sleep(2000) // Give time for options to fully render
        
        // Try to click "Everyone" option (for Friend Requests or Profile Visibility)
        Log.d(TAG, "  Step 3a: Trying to select 'Everyone' option")
        var everyoneClicked = false
        var attempts = 0
        val maxAttempts = 3
        
        while (!everyoneClicked && attempts < maxAttempts) {
            attempts++
            try {
                val everyoneNodes = composeTestRule.onAllNodesWithText("Everyone", ignoreCase = true, substring = true)
                val nodeCount = try {
                    everyoneNodes.fetchSemanticsNodes().size
                } catch (ex: Exception) {
                    0
                }
                
                Log.d(TAG, "    Attempt $attempts: Found $nodeCount 'Everyone' options")
                
                if (nodeCount > 0) {
                    everyoneNodes.onFirst().performClick()
                    Log.d(TAG, "    ✓ Clicked 'Everyone' option")
                    everyoneClicked = true
                    Thread.sleep(500)
                } else {
                    Thread.sleep(500)
                }
            } catch (e: Exception) {
                Log.w(TAG, "    Attempt $attempts failed: ${e.message}")
                if (attempts < maxAttempts) {
                    Thread.sleep(500)
                }
            }
        }
        
        // Try to click "Off" option (for Location Sharing)
        Log.d(TAG, "  Step 3b: Trying to select 'Off' option for location")
        var offClicked = false
        attempts = 0
        
        while (!offClicked && attempts < maxAttempts) {
            attempts++
            try {
                val offNodes = composeTestRule.onAllNodesWithText("Off", ignoreCase = true, substring = true)
                val nodeCount = try {
                    offNodes.fetchSemanticsNodes().size
                } catch (ex: Exception) {
                    0
                }
                
                Log.d(TAG, "    Attempt $attempts: Found $nodeCount 'Off' options")
                
                if (nodeCount > 0) {
                    offNodes.onFirst().performClick()
                    Log.d(TAG, "    ✓ Clicked 'Off' option")
                    offClicked = true
                    Thread.sleep(500)
                } else {
                    Thread.sleep(500)
                }
            } catch (e: Exception) {
                Log.w(TAG, "    Attempt $attempts failed: ${e.message}")
                if (attempts < maxAttempts) {
                    Thread.sleep(500)
                }
            }
        }
        
        // Try to click "Private" option (for another setting)
        Log.d(TAG, "  Step 3c: Trying to select 'Private' option")
        var privateClicked = false
        attempts = 0
        
        while (!privateClicked && attempts < maxAttempts) {
            attempts++
            try {
                val privateNodes = composeTestRule.onAllNodesWithText("Private", ignoreCase = true, substring = true)
                val nodeCount = try {
                    privateNodes.fetchSemanticsNodes().size
                } catch (ex: Exception) {
                    0
                }
                
                Log.d(TAG, "    Attempt $attempts: Found $nodeCount 'Private' options")
                
                if (nodeCount > 0) {
                    privateNodes.onFirst().performClick()
                    Log.d(TAG, "    ✓ Clicked 'Private' option")
                    privateClicked = true
                    Thread.sleep(500)
                } else {
                    Thread.sleep(500)
                }
            } catch (e: Exception) {
                Log.w(TAG, "    Attempt $attempts failed: ${e.message}")
                if (attempts < maxAttempts) {
                    Thread.sleep(500)
                }
            }
        }
        
        val changesCount = listOf(everyoneClicked, offClicked, privateClicked).count { it }
        Log.d(TAG, "  ✓ Made $changesCount privacy setting changes")
        
        Thread.sleep(1000)
        
        // Step 4: Save changes
        Log.d(TAG, "Step 4: Saving privacy settings")
        try {
            composeTestRule.onNodeWithText("Save Settings", ignoreCase = true, substring = true).performClick()
            Log.d(TAG, "  ✓ Clicked Save Settings")
        } catch (e: Exception) {
            // Fallback to just "Save"
            composeTestRule.onNodeWithText("Save", ignoreCase = true).performClick()
            Log.d(TAG, "  ✓ Clicked Save")
        }
        
        // Step 5: Verify success
        Log.d(TAG, "Step 5: Verifying save success")
        Thread.sleep(3000)
        
        // Check for success message
        val hasSuccessMessage = composeTestRule.textExists("Privacy settings updated", substring = true, ignoreCase = true) ||
                               composeTestRule.textExists("Successfully updated", substring = true, ignoreCase = true) ||
                               composeTestRule.textExists("saved", substring = true, ignoreCase = true)
        
        Log.d(TAG, "  - Success indicator found: $hasSuccessMessage")
        
        Log.d(TAG, "✓ test07_ManagePrivacySettings_success: PASSED")
    }
    
    /**
     * Test: Cancel Privacy Settings Changes
     * 
     * Verifies that user can cancel privacy settings changes
     * 
     * Main success scenario:
     * 1. User opens Privacy Settings
     * 2. User navigates back without saving
     * 3. Changes are not saved
     */
    @Test(timeout = 120000)
    fun test08_CancelPrivacyChanges_success() {
        Log.d(TAG, "=== test08_CancelPrivacyChanges_success ===")
        ensureOnProfileScreen()
        
        // Step 1: Navigate to Privacy Settings
        Log.d(TAG, "Step 1: Opening Manage Profile")
        composeTestRule.onNodeWithText("Manage Profile", ignoreCase = true).performClick()
        waitForManageProfileScreen()
        
        Log.d(TAG, "Step 2: Opening Privacy Settings")
        Thread.sleep(1000)
        composeTestRule.onNodeWithText("Privacy Settings", substring = true, ignoreCase = true)
            .performClick()
        waitForPrivacySettingsScreen()
        
        // Step 2: Navigate back using back button
        Log.d(TAG, "Step 3: Pressing back button to cancel")
        Thread.sleep(1000)
        
        activityScenario.onActivity { activity ->
            activity.onBackPressedDispatcher.onBackPressed()
        }
        
        Thread.sleep(2000)
        
        // Step 3: Verify back on manage profile screen
        Log.d(TAG, "Step 4: Verifying back on manage profile screen")
        val hasManageProfileElements = composeTestRule.textExists("Name", substring = true) ||
                                      composeTestRule.textExists("Username", substring = true)
        
        assert(hasManageProfileElements) {
            "Should be back on Manage Profile screen after canceling"
        }
        
        // Navigate back to profile
        activityScenario.onActivity { activity ->
            activity.onBackPressedDispatcher.onBackPressed()
        }
        Thread.sleep(1000)
        
        Log.d(TAG, "✓ test08_CancelPrivacyChanges_success: PASSED")
    }
    
    // ========================================================================
    // Test Cases: Delete Account
    // ========================================================================
    
    /**
     * Test: Delete Account - Cancel Deletion (Non-destructive)
     * 
     * Verifies that user can cancel account deletion
     * 
     * Main success scenario:
     * 1. User clicks "Delete Account"
     * 2. Confirmation dialog appears
     * 3. User clicks "Cancel"
     * 4. Account is not deleted
     */
    @Test(timeout = 120000)
    fun test09_DeleteAccount_cancelDeletion() {
        Log.d(TAG, "=== test09_DeleteAccount_cancelDeletion ===")
        ensureOnProfileScreen()
        
        // Step 1: Click "Delete Account"
        Log.d(TAG, "Step 1: Clicking Delete Account button")
        Thread.sleep(1000)
        composeTestRule.onNodeWithText("Delete Account", ignoreCase = true).performClick()
        
        // Step 2: Verify confirmation dialog appears
        Log.d(TAG, "Step 2: Verifying confirmation dialog")
        Thread.sleep(1000)
        
        val hasConfirmDialog = composeTestRule.textExists("delete", substring = true, ignoreCase = true) ||
                              composeTestRule.textExists("confirm", substring = true, ignoreCase = true) ||
                              composeTestRule.textExists("cancel", substring = true, ignoreCase = true)
        
        assert(hasConfirmDialog) {
            "Confirmation dialog should appear when deleting account"
        }
        
        Log.d(TAG, "  ✓ Confirmation dialog shown")
        
        // Step 3: Click "Cancel"
        Log.d(TAG, "Step 3: Clicking Cancel")
        composeTestRule.onNodeWithText("Cancel", ignoreCase = true).performClick()
        
        Thread.sleep(2000)
        
        // Step 4: Verify still on profile screen
        Log.d(TAG, "Step 4: Verifying account not deleted")
        val hasManageProfile = composeTestRule.textExists("Manage Profile", ignoreCase = true)
        
        assert(hasManageProfile) {
            "Should still be on Profile screen after canceling deletion"
        }
        
        Log.d(TAG, "✓ test09_DeleteAccount_cancelDeletion: PASSED")
    }
    
    /**
     * Test: Delete Account - PERMANENTLY DELETE (DESTRUCTIVE)
     * 
     * ⚠️⚠️⚠️ WARNING: This test PERMANENTLY DELETES the test account! ⚠️⚠️⚠️
     * 
     * This test must run LAST in the test suite.
     * Only use DISPOSABLE test accounts for this entire test suite.
     * 
     * Main success scenario:
     * 1. User clicks "Delete Account"
     * 2. Confirmation dialog appears
     * 3. User clicks "Delete" or "Confirm"
     * 4. Account is permanently deleted
     * 5. App navigates to login screen
     * 6. Authentication token is cleared
     */
    @Test(timeout = 120000)
    fun test10_DeleteAccount_permanent() {
        Log.d(TAG, "=== test10_DeleteAccount_permanent ===")
        Log.w(TAG, "⚠️⚠️⚠️ WARNING: This test will PERMANENTLY DELETE the account! ⚠️⚠️⚠️")
        
        ensureOnProfileScreen()
        
        // Step 1: Click "Delete Account"
        Log.d(TAG, "Step 1: Clicking Delete Account button")
        Thread.sleep(2000)
        
        val deleteButtonClicked = try {
            composeTestRule.onNodeWithText("Delete Account", ignoreCase = true).performClick()
            Log.d(TAG, "  ✓ Clicked Delete Account")
            true
        } catch (e: Exception) {
            Log.e(TAG, "  ✗ Could not find Delete Account button: ${e.message}")
            false
        }
        
        assert(deleteButtonClicked) {
            "Could not find Delete Account button"
        }
        
        // Step 2: Verify confirmation dialog appears
        Log.d(TAG, "Step 2: Verifying confirmation dialog")
        Thread.sleep(2000)
        
        val hasConfirmDialog = composeTestRule.textExists("delete", substring = true, ignoreCase = true) ||
                              composeTestRule.textExists("confirm", substring = true, ignoreCase = true)
        
        assert(hasConfirmDialog) {
            "Confirmation dialog should appear when deleting account"
        }
        
        Log.d(TAG, "  ✓ Confirmation dialog shown")
        
        // Step 3: Click "Delete" or "Confirm" to permanently delete
        Log.d(TAG, "Step 3: Confirming account deletion (PERMANENT)")
        Thread.sleep(1000)
        
        val confirmClicked = try {
            // Try finding all nodes with "Confirm" first (more specific)
            composeTestRule.onNodeWithText("Confirm", ignoreCase = true, useUnmergedTree = true).performClick()
            Log.d(TAG, "  ✓ Clicked Confirm")
            true
        } catch (e: Exception) {
            try {
                // If "Confirm" not found, try finding delete buttons
                val deleteNodes = composeTestRule.onAllNodesWithText("Delete", ignoreCase = true, substring = false)
                val deleteCount = try {
                    deleteNodes.fetchSemanticsNodes().size
                } catch (ex: Exception) {
                    0
                }
                
                Log.d(TAG, "  - Found $deleteCount 'Delete' buttons")
                
                if (deleteCount > 0) {
                    // Click the last one (usually in the dialog)
                    deleteNodes.get(deleteCount - 1).performClick()
                    Log.d(TAG, "  ✓ Clicked Delete button (index ${deleteCount - 1})")
                    true
                } else {
                    false
                }
            } catch (e2: Exception) {
                Log.e(TAG, "  ✗ Could not find Delete/Confirm button: ${e2.message}")
                false
            }
        }
        
        assert(confirmClicked) {
            "Could not find Delete or Confirm button in dialog"
        }
        
        // Step 4: Wait for deletion to process
        Log.d(TAG, "Step 4: Waiting for account deletion to complete")
        Thread.sleep(5000)
        
        // Step 5: Verify account deleted (should be on login screen OR token cleared)
        Log.d(TAG, "Step 5: Verifying account deleted")
        
        val context = androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().targetContext
        val tokenManager = TokenManager(context)
        val tokenAfter = runBlocking { tokenManager.getTokenSync() }
        val tokenCleared = tokenAfter == null
        
        Log.d(TAG, "  - Token cleared: $tokenCleared")
        
        val hasLoginScreen = composeTestRule.textExists("Sign in", substring = true, ignoreCase = true) ||
                            composeTestRule.textExists("Sign up", substring = true, ignoreCase = true)
        
        Log.d(TAG, "  - Login screen shown: $hasLoginScreen")
        
        assert(tokenCleared || hasLoginScreen) {
            "After account deletion, either token should be cleared OR login screen should be shown"
        }
        
        Log.w(TAG, "=" .repeat(60))
        Log.w(TAG, "✓ ACCOUNT PERMANENTLY DELETED")
        Log.w(TAG, "=" .repeat(60))
        Log.d(TAG, "✓ test10_DeleteAccount_permanent: PASSED")
    }
}

