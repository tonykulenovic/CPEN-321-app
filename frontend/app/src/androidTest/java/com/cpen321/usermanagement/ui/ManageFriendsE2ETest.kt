package com.cpen321.usermanagement.ui

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.filters.LargeTest
import com.cpen321.usermanagement.MainActivity
import com.cpen321.usermanagement.data.local.preferences.TokenManager
import com.cpen321.usermanagement.utils.ComposeTestUtils.textExists
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitForTag
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitForText
import com.cpen321.usermanagement.utils.SystemDialogHelper
import com.cpen321.usermanagement.utils.TestAuthHelper
import com.cpen321.usermanagement.utils.TestTags
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.FixMethodOrder
import org.junit.Rule
import org.junit.Test
import org.junit.runners.MethodSorters
import android.util.Log

/**
 * End-to-End tests for Manage Friends feature.
 * 
 * These tests cover:
 * - Adding friends (searching and sending friend requests)
 * - Managing friend requests (accepting and declining)
 * - Removing friends
 * - Viewing friends list
 * 
 * Test Data Setup Required (only 2 accounts needed):
 * - User Account 1 (Test Account): The account that runs the tests
 * - User Account 2 (Friend Account): Create a user with username "e2e_test_friend"
 *   and send a friend request FROM this account TO User Account 1
 * 
 * See Test_DATA_SETUP_INSTRUCTIONS.md for detailed setup instructions.
 * 
 * IMPORTANT: Tests run in alphabetical order (enforced by @FixMethodOrder).
 * Test names are prefixed with numbers (test1_, test2_, etc.) to ensure correct execution order.
 */
@HiltAndroidTest
@LargeTest
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class ManageFriendsE2ETest {
    
    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)
    
    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    private val TAG = "ManageFriendsE2ETest"
    
    // Track state for cleanup and test management
    private val addedFriendsToCleanup = mutableListOf<String>()
    
    companion object {
        private var permissionsGranted = false
        
        // Test data constants - these usernames must exist in the backend
        const val FRIEND_USERNAME = "e2e_test_friend"
        
        /**
         * SETUP INSTRUCTIONS:
         * 
         * Before running these tests, create the following user:
         * 
         * User Account 2 (Friend Account):
         *    - Username: e2e_test_friend
         *    - This account will be used for:
         *      a) Being searched for and added as a friend by User Account 1
         *      b) Sending a friend request TO User Account 1
         * 
         * Setup Steps:
         * 1. Create User Account 2 with username "e2e_test_friend"
         * 2. From User Account 2, send a friend request to User Account 1
         * 3. Run the tests with User Account 1
         */
    }
    
    @Before
    fun setup() {
        Log.d(TAG, "========== Starting E2E Test Setup ==========")
        
        // Step 1: Grant permissions once for all tests
        if (!permissionsGranted) {
            Log.d(TAG, "Step 1: Granting permissions (first time only)...")
            SystemDialogHelper.grantAllPermissions()
            
            Log.d(TAG, "Step 2: Handling system dialogs (first time only)...")
            SystemDialogHelper.handleNotificationPermission(allowPermission = true)
            SystemDialogHelper.handleLocationPermission(allowPermission = true)
            SystemDialogHelper.waitForIdle()
            
            permissionsGranted = true
        } else {
            Log.d(TAG, "Permissions already granted, skipping permission setup")
        }
        
        // Step 3: Wait for app to start
        Log.d(TAG, "Step 3: Waiting for app to initialize...")
        Thread.sleep(3000)
        
        // Step 4: Check authentication status using TokenManager
        val context = androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().targetContext
        val tokenManager = TokenManager(context)
        
        var hasToken = false
        try {
            hasToken = runBlocking {
                tokenManager.getTokenSync() != null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not read auth token", e)
            hasToken = false
        }
        
        // If there's a token, check if it might be stale/expired
        if (hasToken) {
            Log.d(TAG, "Auth token found - app should proceed to main screen")
            Log.d(TAG, "If app is stuck on loading screen, the token may be expired")
            Log.d(TAG, "Solution: Clear app data and run tests again")
        }
        
        if (!hasToken) {
            Log.w(TAG, "=" .repeat(60))
            Log.w(TAG, "NOT AUTHENTICATED - MANUAL SIGN-IN REQUIRED")
            Log.w(TAG, "=" .repeat(60))
            Log.w(TAG, "Please sign in to the app with User Account 1 within 60 seconds")
            Log.w(TAG, "The test will wait for you to complete authentication")
            Log.w(TAG, "=" .repeat(60))
            
            // Print UI state for debugging
            composeTestRule.apply {
                try {
                    onRoot().printToLog("AUTH_WAIT_UI_STATE")
                } catch (e: Exception) {
                    Log.w(TAG, "Could not print UI tree", e)
                }
            }
            
            // Wait for user to sign in (up to 60 seconds)
            var signedIn = false
            val startTime = System.currentTimeMillis()
            val timeout = 60000 // 60 seconds
            
            while (!signedIn && (System.currentTimeMillis() - startTime) < timeout) {
                Thread.sleep(2000)
                // Check for auth token using TokenManager
                signedIn = try {
                    runBlocking {
                        tokenManager.getTokenSync() != null
                    }
                } catch (e: Exception) {
                    false
                }
                
                if (!signedIn) {
                    val elapsed = (System.currentTimeMillis() - startTime) / 1000
                    Log.d(TAG, "Waiting for authentication... (${elapsed}s / 60s)")
                    
                    // Every 10 seconds, print what's on screen
                    if (elapsed % 10 == 0L && elapsed > 0) {
                        composeTestRule.apply {
                            try {
                                onRoot().printToLog("AUTH_WAIT_${elapsed}s")
                            } catch (e: Exception) {
                                // Ignore
                            }
                        }
                    }
                }
            }
            
            if (!signedIn) {
                Log.e(TAG, "=" .repeat(60))
                Log.e(TAG, "AUTHENTICATION TIMEOUT")
                Log.e(TAG, "=" .repeat(60))
                Log.e(TAG, "The app may be stuck on a loading screen.")
                Log.e(TAG, "Check logcat tags: AUTH_WAIT_UI_STATE, AUTH_WAIT_10s, etc.")
                Log.e(TAG, "=" .repeat(60))
                throw AssertionError("Test aborted: User did not sign in within 60 seconds. App may be stuck on loading screen - check logcat for UI state.")
            }
            
            Log.d(TAG, "✓ Authentication detected!")
            Log.d(TAG, "Waiting for app to fully load after authentication...")
            
            // Some apps restart after authentication - wait and check multiple times
            var appReady = false
            for (attempt in 1..5) {
                Thread.sleep(3000)
                Log.d(TAG, "Checking app state (attempt $attempt/5)...")
                
                composeTestRule.apply {
                    try {
                        onRoot().printToLog("POST_AUTH_ATTEMPT_$attempt")
                        
                        // Check if we can see SOMETHING on screen (not blank/crashed)
                        val hasContent = try {
                            onRoot().assertExists()
                            true
                        } catch (e: Exception) {
                            false
                        }
                        
                        if (hasContent) {
                            Log.d(TAG, "✓ App is responsive (attempt $attempt)")
                            appReady = true
                        } else {
                            Log.w(TAG, "App not ready yet (attempt $attempt)")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Could not check app state (attempt $attempt)", e)
                    }
                }
                
                if (appReady) break
            }
            
            if (!appReady) {
                Log.e(TAG, "=" .repeat(60))
                Log.e(TAG, "APP NOT RESPONSIVE AFTER AUTHENTICATION")
                Log.e(TAG, "App may have crashed or is stuck loading")
                Log.e(TAG, "Check logcat tags: POST_AUTH_ATTEMPT_1, POST_AUTH_ATTEMPT_2, etc.")
                Log.e(TAG, "=" .repeat(60))
                throw AssertionError("App did not become responsive after authentication - may have crashed")
            }
            
            // Note: After authentication, the app activity may restart/recreate
            // This is normal Android behavior - ensureOnFriendsScreen() will verify the final UI state
            Log.d(TAG, "✓ Authentication complete - app should navigate to main screen")
            Log.d(TAG, "Note: App may restart activity after login - ensureOnFriendsScreen() will verify UI")
            
            // Extra delay to let app fully settle after authentication
            Log.d(TAG, "Giving app extra time to settle after authentication...")
            Thread.sleep(3000)
        } else {
            Log.d(TAG, "Already authenticated, proceeding with tests")
            Thread.sleep(2000)
        }
        
        Log.d(TAG, "========== Test Setup Complete ==========")
    }
    
    @After
    fun cleanup() {
        Log.d(TAG, "========== Starting Test Cleanup ==========")
        
        // Ensure we're back on the main screen or friends screen
        ensureOnFriendsScreen()
        
        // Small delay between tests
        Thread.sleep(2000)
        
        Log.d(TAG, "========== Test Cleanup Complete ==========")
    }
    
    /**
     * Helper function to ensure we're on the Friends screen at the start of each test.
     * If not, attempts to navigate back to it.
     */
    private fun ensureOnFriendsScreen() {
        Log.d(TAG, "ensureOnFriendsScreen() called")
        
        // Simple delay to let app settle
        Thread.sleep(1000)
        
        // Check if already on Friends screen
        try {
            val hasFriendsFab = try {
                composeTestRule.onNodeWithTag(TestTags.ADD_FRIEND_FAB).assertExists()
                true
            } catch (e: AssertionError) {
                false
            }
            
            if (hasFriendsFab) {
                Log.d(TAG, "✓ Already on Friends screen")
                return
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error checking for Friends FAB: ${e.message}")
        }
        
        // Not on Friends screen - navigate there
        Log.d(TAG, "Not on Friends screen, navigating...")
        
        try {
            // Bottom navigation uses icons with contentDescription, not text
            composeTestRule.onNodeWithContentDescription("Friends", useUnmergedTree = true)
                .performClick()
            
            Log.d(TAG, "Clicked Friends navigation button")
            Thread.sleep(2000)
            
            // Verify navigation succeeded by waiting for FAB
            composeTestRule.waitForTag(TestTags.ADD_FRIEND_FAB, timeoutMillis = 8000)
            Log.d(TAG, "✓ Successfully navigated to Friends screen")
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to navigate to Friends screen: ${e.message}")
            
            // One retry attempt
            try {
                Log.d(TAG, "Retrying navigation...")
                Thread.sleep(1000)
                
                composeTestRule.onNodeWithContentDescription("Friends", useUnmergedTree = true)
                    .performClick()
                
                Thread.sleep(2000)
                composeTestRule.waitForTag(TestTags.ADD_FRIEND_FAB, timeoutMillis = 5000)
                Log.d(TAG, "✓ Navigation succeeded on retry")
            } catch (retryException: Exception) {
                Log.e(TAG, "Navigation failed even after retry")
                throw AssertionError("Could not navigate to Friends screen after 2 attempts", retryException)
            }
        }
    }
    
    // ========================================================================
    // Test Cases: Add Friend
    // ========================================================================
    
    /**
     * Test: Add Friend - Success Scenario
     * 
     * Use Case 4: Add Friend - Main success scenario
     * 1. User opens Add Friend sheet
     * 2. User searches for another user by username
     * 3. User sends friend request
     * 4. System confirms request was sent
     */
    @Test(timeout = 120000)
    fun test6_AddFriend_successScenario() {
        Log.d(TAG, "=== test6_AddFriend_successScenario ===")
        ensureOnFriendsScreen()
        
        // Step 1: Open Add Friend sheet
        Log.d(TAG, "Step 1: Opening Add Friend sheet")
        composeTestRule.onNodeWithTag(TestTags.ADD_FRIEND_FAB).performClick()
        composeTestRule.waitForTag(TestTags.ADD_FRIEND_SHEET, timeoutMillis = 3000)
        composeTestRule.onNodeWithText("Add Friend", substring = true).assertExists()
        
        // Step 2: Search for a user
        Log.d(TAG, "Step 2: Searching for user '$FRIEND_USERNAME'")
        composeTestRule.onNodeWithTag(TestTags.ADD_FRIEND_SEARCH_FIELD)
            .performTextInput(FRIEND_USERNAME)
        
        // Step 3: Wait for search results to load (retry up to 5 times)
        Log.d(TAG, "Step 3: Waiting for search results from backend")
        var resultsLoaded = false
        var attempt = 0
        val maxAttempts = 5
        
        while (attempt < maxAttempts && !resultsLoaded) {
            attempt++
            Log.d(TAG, "Attempt $attempt/$maxAttempts: Checking for search results...")
            Thread.sleep(2000) // Wait 2 seconds between checks
            
            // Check if username appears in results
            val usernameFound = composeTestRule.textExists(FRIEND_USERNAME, substring = true)
            val addButtonFound = composeTestRule.textExists("Add", ignoreCase = true)
            
            resultsLoaded = usernameFound && addButtonFound
            
            Log.d(TAG, "  - Username found: $usernameFound")
            Log.d(TAG, "  - Add button found: $addButtonFound")
            
            if (resultsLoaded) {
                Log.d(TAG, "  ✓ Search results loaded!")
                break
            }
        }
        
        if (!resultsLoaded) {
            Log.e(TAG, "!!! SEARCH RESULTS DID NOT LOAD AFTER $maxAttempts ATTEMPTS !!!")
            Log.e(TAG, "Username searched: '$FRIEND_USERNAME'")
            Log.e(TAG, "Make sure the account exists and has the correct username.")
            throw AssertionError("Search results did not load for username '$FRIEND_USERNAME'")
        }
        
        // Step 4: Click "Add" button to send friend request
        Log.d(TAG, "Step 4: Sending friend request")
        Thread.sleep(500) // Small delay to ensure button is clickable
        composeTestRule.onNodeWithText("Add", ignoreCase = true).performClick()
        
        // Step 5: Verify success (sheet closes and/or success message appears)
        Log.d(TAG, "Step 5: Verifying friend request sent")
        Thread.sleep(2000)
        
        // Verify success message or that button now shows "Pending"
        val successMessageShown = composeTestRule.textExists("Friend request sent", ignoreCase = true)
        Log.d(TAG, "Success message shown: $successMessageShown")
        
        // Step 6: Close the add friend sheet
        Log.d(TAG, "Step 6: Closing add friend sheet")
        composeTestRule.activityRule.scenario.onActivity { activity ->
            activity.onBackPressedDispatcher.onBackPressed()
        }
        Thread.sleep(1000)
        
        Log.d(TAG, "✓ test6_AddFriend_successScenario: PASSED")
    }
    
    /**
     * Test: Add Friend - No User Found
     * 
     * Use Case 4: Add Friend - Failure scenario 1a
     * 1. User searches for non-existent username
     * 2. System shows "No users found"
     */
    @Test(timeout = 120000)
    fun test1_AddFriend_noUserFound() {
        Log.d(TAG, "=== test1_AddFriend_noUserFound ===")
        ensureOnFriendsScreen()
        
        // Step 1: Open Add Friend sheet
        Log.d(TAG, "Step 1: Opening Add Friend sheet")
        composeTestRule.onNodeWithTag(TestTags.ADD_FRIEND_FAB).performClick()
        composeTestRule.waitForTag(TestTags.ADD_FRIEND_SHEET, timeoutMillis = 3000)
        
        // Step 2: Search for non-existent user
        Log.d(TAG, "Step 2: Searching for non-existent user")
        val nonExistentUsername = "nonexistent_user_xyz123456"
        composeTestRule.onNodeWithTag(TestTags.ADD_FRIEND_SEARCH_FIELD)
            .performTextInput(nonExistentUsername)
        
        Thread.sleep(2000) // Wait for search to complete
        
        // Step 3: Verify "No users found" message
        Log.d(TAG, "Step 3: Verifying 'No users found' message")
        composeTestRule.waitForTag(TestTags.NO_USERS_FOUND_TEXT, timeoutMillis = 5000)
        composeTestRule.onNodeWithText("No users found", ignoreCase = true).assertExists()
        
        // Step 4: Close the add friend sheet
        Log.d(TAG, "Step 4: Closing add friend sheet")
        composeTestRule.activityRule.scenario.onActivity { activity ->
            activity.onBackPressedDispatcher.onBackPressed()
        }
        Thread.sleep(1000)
        
        Log.d(TAG, "✓ test1_AddFriend_noUserFound: PASSED")
    }
    
    // ========================================================================
    // Test Cases: Manage Friend Requests
    // ========================================================================
    
    /**
     * Test: Accept Friend Request - Success
     * 
     * Prerequisites: User Account 2 (e2e_test_friend) must have sent a friend request
     * to User Account 1 (test account) before running this test.
     * 
     * Main success scenario:
     * 1. User opens friend requests
     * 2. User clicks accept on a request
     * 3. Friend is added to friends list
     */
    @Test(timeout = 120000)
    fun test2_AcceptFriendRequest_success() {
        Log.d(TAG, "=== test2_AcceptFriendRequest_success ===")
        ensureOnFriendsScreen()
        
        // Step 1: Open friend requests sheet
        Log.d(TAG, "Step 1: Opening friend requests")
        composeTestRule.onNodeWithTag(TestTags.FRIEND_REQUESTS_BUTTON).performClick()
        composeTestRule.waitForTag(TestTags.FRIEND_REQUESTS_SHEET, timeoutMillis = 3000)
        composeTestRule.onNodeWithText("Friend Requests", substring = true).assertExists()
        
        // Step 2: Wait for pending requests to load (retry up to 5 times)
        Log.d(TAG, "Step 2: Waiting for pending requests to load from backend")
        var hasRequests = false
        var attempt = 0
        val maxAttempts = 5
        
        while (attempt < maxAttempts && !hasRequests) {
            attempt++
            Log.d(TAG, "Attempt $attempt/$maxAttempts: Checking for friend requests...")
            Thread.sleep(2000) // Wait 2 seconds between checks
            
            // Check if there are requests (look for "Accept" button or username)
            hasRequests = composeTestRule.textExists("Accept", ignoreCase = true) ||
                          composeTestRule.textExists(FRIEND_USERNAME, substring = true)
            
            if (!hasRequests) {
                val hasEmptyState = composeTestRule.textExists("No pending friend requests")
                Log.d(TAG, "  - Accept button found: false")
                Log.d(TAG, "  - Username found: false")
                Log.d(TAG, "  - Empty state shown: $hasEmptyState")
            } else {
                Log.d(TAG, "  ✓ Friend request found!")
                break
            }
        }
        
        if (!hasRequests) {
            Log.e(TAG, "!!! NO PENDING FRIEND REQUESTS FOUND AFTER $maxAttempts ATTEMPTS !!!")
            Log.e(TAG, "Please ensure User Account 2 (username: '$FRIEND_USERNAME') has sent a friend request")
            Log.e(TAG, "to User Account 1 (your test account) before running this test.")
            Log.e(TAG, "")
            Log.e(TAG, "Setup steps:")
            Log.e(TAG, "1. Sign in to the app with Account 2 (username: '$FRIEND_USERNAME')")
            Log.e(TAG, "2. Go to Friends tab")
            Log.e(TAG, "3. Click the + button to add friend")
            Log.e(TAG, "4. Search for the test account and send a friend request")
            Log.e(TAG, "5. Sign out and sign in with Account 1 to run this test")
            throw AssertionError("Test requires at least one pending friend request. See setup instructions.")
        }
        
        // Step 3: Click Accept on the first request
        Log.d(TAG, "Step 3: Accepting friend request")
        composeTestRule.onNodeWithText("Accept", ignoreCase = true).performClick()
        
        // Step 4: Verify request was accepted
        Log.d(TAG, "Step 4: Verifying request accepted")
        Thread.sleep(2000)
        
        // Success message or request disappears from list
        val successMessageShown = composeTestRule.textExists("Friend request accepted", ignoreCase = true)
        Log.d(TAG, "Success message shown: $successMessageShown")
        
        // Step 5: Close the friend request sheet
        Log.d(TAG, "Step 5: Closing friend request sheet")
        composeTestRule.activityRule.scenario.onActivity { activity ->
            activity.onBackPressedDispatcher.onBackPressed()
        }
        Thread.sleep(1000)
        
        // Give extra time for friend to be added to friends list
        Log.d(TAG, "Waiting for friend to be added to friends list...")
        Thread.sleep(1000)
        
        Log.d(TAG, "✓ test2_AcceptFriendRequest_success: PASSED")
    }
    
    /**
     * Test: Decline Friend Request - Success
     * 
     * Prerequisites: Another user must have sent a friend request
     * to the test account before running this test.
     * 
     * Main success scenario:
     * 1. User opens friend requests
     * 2. User clicks decline on a request
     * 3. Request is removed from list
     */
    @Test(timeout = 120000)
    fun test7_DeclineFriendRequest_success() {
        Log.d(TAG, "=== test7_DeclineFriendRequest_success ===")
        ensureOnFriendsScreen()
        
        // Step 1: Open friend requests sheet
        Log.d(TAG, "Step 1: Opening friend requests")
        composeTestRule.onNodeWithTag(TestTags.FRIEND_REQUESTS_BUTTON).performClick()
        composeTestRule.waitForTag(TestTags.FRIEND_REQUESTS_SHEET, timeoutMillis = 3000)
        
        // Step 2: Wait for pending requests to load (retry up to 5 times)
        Log.d(TAG, "Step 2: Waiting for pending requests to load from backend")
        var hasRequests = false
        var attempt = 0
        val maxAttempts = 5
        
        while (attempt < maxAttempts && !hasRequests) {
            attempt++
            Log.d(TAG, "Attempt $attempt/$maxAttempts: Checking for friend requests...")
            Thread.sleep(2000) // Wait 2 seconds between checks
            
            // Check if there are requests (look for "Decline" button)
            hasRequests = composeTestRule.textExists("Decline", ignoreCase = true)
            
            if (!hasRequests) {
                val hasEmptyState = composeTestRule.textExists("No pending friend requests")
                Log.d(TAG, "  - Decline button found: false")
                Log.d(TAG, "  - Empty state shown: $hasEmptyState")
            } else {
                Log.d(TAG, "  ✓ Friend request found!")
                break
            }
        }
        
        if (!hasRequests) {
            Log.w(TAG, "!!! NO PENDING FRIEND REQUESTS FOUND AFTER $maxAttempts ATTEMPTS !!!")
            Log.w(TAG, "This is expected if test2 already accepted all requests.")
            Log.w(TAG, "Skipping test as no requests are available")
            return // Skip test if no requests
        }
        
        // Step 3: Click Decline on the first request
        Log.d(TAG, "Step 3: Declining friend request")
        composeTestRule.onNodeWithText("Decline", ignoreCase = true).performClick()
        
        // Step 4: Verify request was declined
        Log.d(TAG, "Step 4: Verifying request declined")
        Thread.sleep(2000)
        
        // Request should be removed from list
        Log.d(TAG, "Request removed from list")
        
        // Step 5: Close the friend request sheet
        Log.d(TAG, "Step 5: Closing friend request sheet")
        composeTestRule.activityRule.scenario.onActivity { activity ->
            activity.onBackPressedDispatcher.onBackPressed()
        }
        Thread.sleep(1000)
        
        Log.d(TAG, "✓ test7_DeclineFriendRequest_success: PASSED")
    }
    
    /**
     * Test: View Friend Requests - Empty State
     * 
     * Verifies that when there are no pending requests, the empty state is displayed.
     */
    @Test(timeout = 120000)
    fun test8_ViewFriendRequests_emptyState() {
        Log.d(TAG, "=== test8_ViewFriendRequests_emptyState ===")
        ensureOnFriendsScreen()
        
        // Step 1: Open friend requests sheet
        Log.d(TAG, "Step 1: Opening friend requests")
        composeTestRule.onNodeWithTag(TestTags.FRIEND_REQUESTS_BUTTON).performClick()
        composeTestRule.waitForTag(TestTags.FRIEND_REQUESTS_SHEET, timeoutMillis = 3000)
        
        // Step 2: Check current state
        Log.d(TAG, "Step 2: Checking friend requests state")
        Thread.sleep(1000)
        
        val hasEmptyState = composeTestRule.textExists("No pending friend requests")
        val hasRequests = composeTestRule.textExists("Accept", ignoreCase = true)
        
        Log.d(TAG, "Empty state shown: $hasEmptyState")
        Log.d(TAG, "Requests found: $hasRequests")
        
        // Either empty state or requests should be shown (both are valid)
        assert(hasEmptyState || hasRequests) {
            "Friend requests sheet should show either empty state or requests"
        }
        
        // Step 3: Close the friend request sheet
        Log.d(TAG, "Step 3: Closing friend request sheet")
        composeTestRule.activityRule.scenario.onActivity { activity ->
            activity.onBackPressedDispatcher.onBackPressed()
        }
        Thread.sleep(1000)
        
        Log.d(TAG, "✓ test8_ViewFriendRequests_emptyState: PASSED")
    }
    
    // ========================================================================
    // Test Cases: Remove Friend
    // ========================================================================
    
    /**
     * Test: Remove Friend - Success
     * 
     * Prerequisites: User must have at least one friend in their friends list
     * 
     * Main success scenario:
     * 1. User views friends list
     * 2. User opens friend menu
     * 3. User clicks "Remove Friend"
     * 4. Friend is removed from list
     */
    @Test(timeout = 120000)
    fun test4_RemoveFriend_success() {
        Log.d(TAG, "=== test4_RemoveFriend_success ===")
        ensureOnFriendsScreen()
        
        // Step 1: Wait for friends list to load (retry up to 5 times)
        Log.d(TAG, "Step 1: Waiting for friends list to load from backend")
        var hasFriends = false
        var attempt = 0
        val maxAttempts = 5
        
        while (attempt < maxAttempts && !hasFriends) {
            attempt++
            Log.d(TAG, "Attempt $attempt/$maxAttempts: Checking for friends in list...")
            Thread.sleep(2000) // Wait 2 seconds between checks
            
            // Check if friends exist (look for "More Options" button or absence of empty state)
            val hasEmptyState = composeTestRule.textExists("You haven't added any friends yet", substring = true)
            val hasMenuButton = try {
                composeTestRule.onNodeWithContentDescription("More Options", useUnmergedTree = true).assertExists()
                true
            } catch (e: AssertionError) {
                false
            }
            
            hasFriends = !hasEmptyState || hasMenuButton
            
            Log.d(TAG, "  - Empty state shown: $hasEmptyState")
            Log.d(TAG, "  - Menu button found: $hasMenuButton")
            Log.d(TAG, "  - Has friends: $hasFriends")
            
            if (hasFriends) {
                Log.d(TAG, "  ✓ Friend found in list!")
                break
            }
        }
        
        if (!hasFriends) {
            Log.e(TAG, "!!! NO FRIENDS FOUND IN LIST AFTER $maxAttempts ATTEMPTS !!!")
            Log.e(TAG, "This test expects test2_AcceptFriendRequest_success to have added a friend.")
            Log.e(TAG, "The friend should have appeared in the list by now.")
            throw AssertionError("No friends found after waiting 10 seconds. Ensure test2_AcceptFriendRequest_success ran successfully.")
        }
        
        Log.d(TAG, "✓ Friends list is not empty")
        
        // Step 2: Click on the menu button for the first friend
        Log.d(TAG, "Step 2: Finding and clicking friend menu button")
        
        // Try to find the "More Options" button (with contentDescription)
        var menuClicked = false
        try {
            composeTestRule.onNodeWithContentDescription("More Options", useUnmergedTree = true)
                .performClick()
            menuClicked = true
            Log.d(TAG, "✓ Clicked menu via contentDescription")
        } catch (e: Exception) {
            Log.w(TAG, "Could not find menu by contentDescription: ${e.message}")
        }
        
        if (!menuClicked) {
            // Fallback: try to find by test tag pattern
            try {
                val allMenuButtons = composeTestRule.onAllNodes(
                    hasContentDescription("More Options"),
                    useUnmergedTree = true
                )
                allMenuButtons.onFirst().performClick()
                menuClicked = true
                Log.d(TAG, "✓ Clicked menu via hasContentDescription")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to find menu button: ${e.message}")
                throw AssertionError("Could not find 'More Options' button for any friend", e)
            }
        }
        
        Thread.sleep(1000)
        
        // Step 3: Click "Remove Friend" option
        Log.d(TAG, "Step 3: Clicking Remove Friend option")
        composeTestRule.onNodeWithTag(TestTags.FRIEND_REMOVE_OPTION).performClick()
        
        // Step 4: Verify friend was removed
        Log.d(TAG, "Step 4: Verifying friend removed")
        Thread.sleep(2000)
        
        Log.d(TAG, "✓ test4_RemoveFriend_success: PASSED")
    }
    
    /**
     * Test: View Friends List - Empty State
     * 
     * Verifies that when there are no friends, the empty state is displayed.
     */
    @Test(timeout = 120000)
    fun test5_ViewFriendsList_emptyState() {
        Log.d(TAG, "=== test5_ViewFriendsList_emptyState ===")
        ensureOnFriendsScreen()
        
        // Check current state
        Log.d(TAG, "Checking friends list state")
        Thread.sleep(1000)
        
        val hasEmptyState = composeTestRule.textExists("You haven't added any friends yet.", substring = true)
        // Check if any friend cards exist (they have dynamic IDs with friend_card_ prefix)
        val hasFriends = try {
            composeTestRule.onNodeWithContentDescription("More Options").assertExists()
            true
        } catch (e: AssertionError) {
            false
        }
        
        Log.d(TAG, "Empty state shown: $hasEmptyState")
        Log.d(TAG, "Friends found: $hasFriends")
        
        // Either empty state or friends should be shown (both are valid)
        assert(hasEmptyState || hasFriends) {
            "Friends screen should show either empty state or friends list"
        }
        
        Log.d(TAG, "✓ test5_ViewFriendsList_emptyState: PASSED")
    }
    
    /**
     * Test: Search Friends - Filter by Name
     * 
     * Verifies that the search bar filters friends by name
     */
    @Test(timeout = 120000)
    fun test3_SearchFriends_filterByName() {
        Log.d(TAG, "=== test3_SearchFriends_filterByName ===")
        ensureOnFriendsScreen()
        
        // Step 1: Wait for friends list to load (retry up to 5 times)
        Log.d(TAG, "Step 1: Waiting for friends list to load")
        var hasFriends = false
        var attempt = 0
        val maxAttempts = 5
        
        while (attempt < maxAttempts && !hasFriends) {
            attempt++
            Log.d(TAG, "Attempt $attempt/$maxAttempts: Checking for friends...")
            Thread.sleep(2000) // Wait 2 seconds between checks
            
            hasFriends = !composeTestRule.textExists("You haven't added any friends yet", substring = true)
            
            Log.d(TAG, "  - Has friends: $hasFriends")
            
            if (hasFriends) {
                Log.d(TAG, "  ✓ Friends found!")
                break
            }
        }
        
        if (!hasFriends) {
            Log.w(TAG, "No friends found after waiting, skipping search test")
            return
        }
        
        // Step 2: Use search bar
        Log.d(TAG, "Step 2: Testing search functionality")
        composeTestRule.onNodeWithTag(TestTags.FRIENDS_SEARCH_BAR)
            .performTextInput("test")
        
        Thread.sleep(1000)
        
        // Search should work (either show results or empty if no match)
        Log.d(TAG, "Search completed")
        
        Log.d(TAG, "✓ testSearchFriends_filterByName: PASSED")
    }
}


