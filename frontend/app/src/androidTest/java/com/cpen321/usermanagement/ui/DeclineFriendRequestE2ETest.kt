package com.cpen321.usermanagement.ui

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.filters.LargeTest
import com.cpen321.usermanagement.MainActivity
import com.cpen321.usermanagement.data.local.preferences.TokenManager
import com.cpen321.usermanagement.utils.ComposeTestUtils.textExists
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitForTag
import com.cpen321.usermanagement.utils.SystemDialogHelper
import com.cpen321.usermanagement.utils.TestTags
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import android.util.Log

/**
 * End-to-End test for declining a friend request
 * 
 * ================================================================================
 * IMPORTANT: TEST PREREQUISITES
 * ================================================================================
 * 
 * Before running this test:
 * 
 * 1. **Create TWO test accounts**:
 *    - User A (Sender): Will send the friend request
 *    - User B (Recipient): Will receive and decline the friend request
 * 
 * 2. **Send a friend request FROM User A TO User B**:
 *    - Sign in with User A
 *    - Go to Friends tab
 *    - Click the + button to add friend
 *    - Search for User B
 *    - Send a friend request
 *    - Sign out
 * 
 * 3. **Run the test WITH User B**:
 *    - ⚠️  IMPORTANT: Sign in as User B (the RECIPIENT), NOT User A
 *    - The test will automatically decline the pending friend request
 *    - Only the recipient can decline a friend request!
 * 
 * ================================================================================
 * TEST FLOW
 * ================================================================================
 * 
 * 1. User signs in (manual)
 * 2. Test navigates to Friends screen
 * 3. Test opens friend requests
 * 4. Test verifies there's a pending request
 * 5. Test clicks "Decline" button
 * 6. Test verifies request was declined (removed from list)
 * 
 * See Test_DATA_SETUP_INSTRUCTIONS.md for detailed setup instructions.
 */
@HiltAndroidTest
@LargeTest
class DeclineFriendRequestE2ETest {
    
    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)
    
    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    private val TAG = "DeclineFriendRequestE2ETest"
    
    companion object {
        private var permissionsGranted = false
    }
    
    @Before
    fun setup() {
        Log.d(TAG, "========== Starting Decline Friend Request E2E Test Setup ==========")
        
        val context = androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().targetContext
        val tokenManager = TokenManager(context)
        
        // Step 1: Grant permissions once
        if (!permissionsGranted) {
            Log.d(TAG, "Step 1: Granting permissions (first time only)...")
            SystemDialogHelper.grantAllPermissions()
            SystemDialogHelper.handleNotificationPermission(allowPermission = true)
            SystemDialogHelper.handleLocationPermission(allowPermission = true)
            SystemDialogHelper.waitForIdle()
            permissionsGranted = true
        } else {
            Log.d(TAG, "Permissions already granted, skipping permission setup")
        }
        
        // Step 2: Check authentication
        Log.d(TAG, "Step 2: Waiting for app to initialize...")
        composeTestRule.waitForIdle()
        Thread.sleep(3000)
        
        val hasToken = try {
            runBlocking { tokenManager.getTokenSync() != null }
        } catch (e: Exception) {
            false
        }
        
        if (!hasToken) {
            Log.w(TAG, "=" .repeat(60))
            Log.w(TAG, "⚠️  MANUAL SIGN-IN REQUIRED ⚠️")
            Log.w(TAG, "=" .repeat(60))
            Log.w(TAG, "Please sign in to the app within 60 seconds")
            Log.w(TAG, "")
            Log.w(TAG, "IMPORTANT: Use User B (the RECIPIENT of the friend request)")
            Log.w(TAG, "DO NOT use User A (the sender)")
            Log.w(TAG, "=" .repeat(60))
            
            // Wait for authentication
            var elapsedTime = 0
            val maxWaitTime = 60
            while (elapsedTime < maxWaitTime) {
                Thread.sleep(2000)
                elapsedTime += 2
                
                val tokenExists = try {
                    runBlocking { tokenManager.getTokenSync() != null }
                } catch (e: Exception) {
                    false
                }
                
                if (tokenExists) {
                    Log.d(TAG, "✓ Authentication detected!")
                    break
                }
                
                if (elapsedTime % 10 == 0) {
                    Log.d(TAG, "Waiting for sign-in... (${elapsedTime}s / ${maxWaitTime}s)")
                }
            }
            
            if (elapsedTime >= maxWaitTime) {
                throw AssertionError("User did not sign in within $maxWaitTime seconds")
            }
            
            // Wait for app to fully load
            Log.d(TAG, "Waiting for app to fully load after authentication...")
            Thread.sleep(5000)
        } else {
            Log.d(TAG, "Already authenticated, proceeding with test")
            Thread.sleep(2000)
        }
        
        Log.d(TAG, "========== Test Setup Complete ==========")
    }
    
    /**
     * Helper function to navigate to Friends screen
     */
    private fun navigateToFriendsScreen() {
        Log.d(TAG, "Navigating to Friends screen...")
        
        // Check if already on Friends screen
        val alreadyThere = try {
            composeTestRule.onNodeWithTag(TestTags.ADD_FRIEND_FAB).assertExists()
            true
        } catch (e: AssertionError) {
            false
        }
        
        if (alreadyThere) {
            Log.d(TAG, "Already on Friends screen")
            return
        }
        
        // Navigate to Friends tab
        try {
            composeTestRule.onNodeWithContentDescription("Friends", useUnmergedTree = true)
                .performClick()
            Thread.sleep(2000)
            
            composeTestRule.waitForTag(TestTags.ADD_FRIEND_FAB, timeoutMillis = 5000)
            Log.d(TAG, "✓ Successfully navigated to Friends screen")
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to navigate to Friends screen", e)
            throw AssertionError("Could not navigate to Friends screen", e)
        }
    }
    
    /**
     * Test: Decline Friend Request
     * 
     * Prerequisites:
     * - Another user must have sent a friend request to the test account
     * 
     * Steps:
     * 1. Navigate to Friends screen
     * 2. Open friend requests bottom sheet
     * 3. Verify there's at least one pending request
     * 4. Click "Decline" button on the first request
     * 5. Verify the request was removed from the list (checks 5 times over 10 seconds)
     * 6. Close the friend requests sheet
     */
    @Test(timeout = 120_000)
    fun testDeclineFriendRequest_success() {
        Log.d(TAG, "=== testDeclineFriendRequest_success ===")
        
        // Log who is currently logged in
        Log.w(TAG, "=" .repeat(60))
        Log.w(TAG, "IMPORTANT: Check who you are logged in as!")
        Log.w(TAG, "You should be logged in as the RECIPIENT (who received the request)")
        Log.w(TAG, "NOT as the SENDER (who sent the request)")
        Log.w(TAG, "=" .repeat(60))
        
        // Step 1: Navigate to Friends screen
        navigateToFriendsScreen()
        
        // Step 2: Open friend requests
        Log.d(TAG, "Step 1: Opening friend requests")
        composeTestRule.onNodeWithTag(TestTags.FRIEND_REQUESTS_BUTTON).performClick()
        composeTestRule.waitForTag(TestTags.FRIEND_REQUESTS_SHEET, timeoutMillis = 3000)
        composeTestRule.onNodeWithText("Friend Requests", substring = true).assertExists()
        Log.d(TAG, "  ✓ Friend requests sheet opened")
        
        // Wait longer for backend to load friend requests data
        Log.d(TAG, "  - Waiting for friend requests to load from backend...")
        Thread.sleep(3000) // Increased from 1s to 3s for backend data to load
        
        // Step 3: Wait for pending requests to load (retry up to 8 times)
        Log.d(TAG, "Step 2: Waiting for pending requests to load from backend")
        var hasRequests = false
        var attempt = 0
        val maxAttempts = 8 // Increased from 5 to 8 attempts
        
        while (attempt < maxAttempts && !hasRequests) {
            attempt++
            Log.d(TAG, "Attempt $attempt/$maxAttempts: Checking for friend requests...")
            Thread.sleep(3000) // Increased from 2s to 3s - give backend more time
            
            // Check if there are requests (look for decline button by testTag prefix)
            val declineButtonCountByTag = try {
                composeTestRule.onAllNodes(
                    androidx.compose.ui.test.SemanticsMatcher("TestTag starts with '${TestTags.DECLINE_REQUEST_BUTTON}'") { node ->
                        val testTag = node.config[androidx.compose.ui.semantics.SemanticsProperties.TestTag]
                        testTag.startsWith(TestTags.DECLINE_REQUEST_BUTTON)
                    }
                ).fetchSemanticsNodes().size
            } catch (e: Exception) {
                Log.w(TAG, "  ! Exception checking testTags: ${e.message}")
                0
            }
            
            // Also check for "Decline" text as a fallback
            val declineTextCount = try {
                composeTestRule.onAllNodesWithText("Decline", ignoreCase = true, useUnmergedTree = true)
                    .fetchSemanticsNodes().size
            } catch (e: Exception) {
                0
            }
            
            hasRequests = declineButtonCountByTag > 0 || declineTextCount > 0
            
            if (!hasRequests) {
                val hasEmptyState = composeTestRule.textExists("No pending friend requests")
                Log.d(TAG, "  - Decline button (by testTag): $declineButtonCountByTag")
                Log.d(TAG, "  - Decline text (by text): $declineTextCount")
                Log.d(TAG, "  - Empty state shown: $hasEmptyState")
                
                if (hasEmptyState) {
                    Log.w(TAG, "  ! Empty state is visible - no friend requests in the list!")
                    break
                }
            } else {
                Log.d(TAG, "  ✓ Found buttons - testTag: $declineButtonCountByTag, text: $declineTextCount")
                break
            }
        }
        
        if (!hasRequests) {
            Log.e(TAG, "")
            Log.e(TAG, "=" .repeat(70))
            Log.e(TAG, "!!! NO PENDING FRIEND REQUESTS FOUND !!!")
            Log.e(TAG, "=" .repeat(70))
            Log.e(TAG, "")
            Log.e(TAG, "Waited ${maxAttempts * 3} seconds (${maxAttempts} attempts) but no friend requests appeared.")
            Log.e(TAG, "")
            
            // Check what we can see
            val hasEmptyState = composeTestRule.textExists("No pending friend requests")
            val hasDeclineText = composeTestRule.textExists("Decline", ignoreCase = true)
            val hasAcceptText = composeTestRule.textExists("Accept", ignoreCase = true)
            
            Log.e(TAG, "Current UI state:")
            Log.e(TAG, "  - Empty state message: $hasEmptyState")
            Log.e(TAG, "  - 'Decline' text visible: $hasDeclineText")
            Log.e(TAG, "  - 'Accept' text visible: $hasAcceptText")
            Log.e(TAG, "")
            
            if (hasEmptyState) {
                Log.e(TAG, "The UI shows 'No pending friend requests'.")
                Log.e(TAG, "This means no one has sent a friend request to this account!")
            } else if (hasDeclineText && hasAcceptText) {
                Log.e(TAG, "Strange: 'Decline' and 'Accept' buttons are visible but couldn't be found by testTag!")
                Log.e(TAG, "This might be a timing issue - the buttons loaded but testTags didn't register.")
            }
            Log.e(TAG, "")
            Log.e(TAG, "Setup instructions:")
            Log.e(TAG, "1. Sign in with a DIFFERENT account (User A)")
            Log.e(TAG, "2. Go to Friends tab")
            Log.e(TAG, "3. Click the + button to add friend")
            Log.e(TAG, "4. Search for THIS test account (User B) and send a friend request")
            Log.e(TAG, "5. Sign out of User A")
            Log.e(TAG, "6. Run this test again (sign in as User B when prompted)")
            Log.e(TAG, "")
            Log.e(TAG, "=" .repeat(70))
            
            throw AssertionError(
                "No pending friend requests found after ${maxAttempts * 3}s. " +
                "Empty state: $hasEmptyState. See setup instructions in logs."
            )
        }
        
        // Get the initial count of decline buttons BEFORE clicking
        // Try testTag first, fallback to text if needed
        val declineButtonsByTag = composeTestRule.onAllNodes(
            androidx.compose.ui.test.SemanticsMatcher("TestTag starts with '${TestTags.DECLINE_REQUEST_BUTTON}'") { node ->
                val testTag = node.config[androidx.compose.ui.semantics.SemanticsProperties.TestTag]
                testTag.startsWith(TestTags.DECLINE_REQUEST_BUTTON)
            }
        )
        
        val buttonCountByTag = try {
            declineButtonsByTag.fetchSemanticsNodes().size
        } catch (e: Exception) {
            0
        }
        
        // Fallback: count by text
        val buttonCountByText = try {
            composeTestRule.onAllNodesWithText("Decline", ignoreCase = true, useUnmergedTree = false)
                .fetchSemanticsNodes().size
        } catch (e: Exception) {
            0
        }
        
        val initialDeclineButtonCount = if (buttonCountByTag > 0) buttonCountByTag else buttonCountByText
        val useTestTag = buttonCountByTag > 0
        
        Log.d(TAG, "  - Decline buttons found: $initialDeclineButtonCount (using ${if (useTestTag) "testTag" else "text"})")
        
        // Log what request IDs we're seeing
        try {
            val nodes = if (useTestTag) {
                declineButtonsByTag.fetchSemanticsNodes()
            } else {
                composeTestRule.onAllNodesWithText("Decline", ignoreCase = true, useUnmergedTree = false)
                    .fetchSemanticsNodes()
            }
            
            Log.d(TAG, "  - Found ${nodes.size} friend request(s):")
            nodes.forEachIndexed { index, node ->
                val testTag = try {
                    node.config[androidx.compose.ui.semantics.SemanticsProperties.TestTag]
                } catch (e: Exception) {
                    "no testTag"
                }
                Log.d(TAG, "    Request $index: testTag = $testTag")
                
                // Extract request ID from testTag if possible
                if (testTag.toString().startsWith(TestTags.DECLINE_REQUEST_BUTTON)) {
                    val requestId = testTag.toString().removePrefix(TestTags.DECLINE_REQUEST_BUTTON + "_")
                    Log.d(TAG, "      → Request ID: $requestId")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "  ! Could not log request details: ${e.message}")
        }
        
        // Step 4: Click Decline on the first request
        Log.d(TAG, "Step 3: Clicking Decline button on first request...")
        
        // Add delay before clicking to ensure button is ready
        Thread.sleep(1000)
        
        try {
            if (useTestTag) {
                Log.d(TAG, "  - Clicking by testTag...")
                declineButtonsByTag[0].assertExists().performClick()
            } else {
                Log.d(TAG, "  - Clicking by text (testTag not found)...")
                composeTestRule.onAllNodesWithText("Decline", ignoreCase = true, useUnmergedTree = false)[0]
                    .assertExists()
                    .performClick()
            }
            
            Log.d(TAG, "  ✓ Decline button clicked successfully")
        } catch (e: Exception) {
            Log.e(TAG, "  ✗ Failed to click Decline button: ${e.message}")
            throw AssertionError("Could not click Decline button: ${e.message}", e)
        }
        
        Log.d(TAG, "  - Waiting for backend to process...")
        Thread.sleep(2000) // Wait for backend response
        
        // Step 5: Wait and verify request was declined (check multiple times)
        Log.d(TAG, "Step 4: Waiting for request to be declined...")
        
        var requestWasDeclined = false
        var checkAttempt = 0
        val maxCheckAttempts = 5
        
        while (checkAttempt < maxCheckAttempts && !requestWasDeclined) {
            checkAttempt++
            Thread.sleep(2000) // Wait 2 seconds between checks
            
            Log.d(TAG, "  Check attempt $checkAttempt/$maxCheckAttempts:")
            
            // Check if the request disappeared OR empty state is shown
            val hasEmptyState = composeTestRule.textExists("No pending friend requests", substring = true)
            
            // Count remaining decline buttons (use same method as initial count)
            val remainingByTag = try {
                composeTestRule.onAllNodes(
                    androidx.compose.ui.test.SemanticsMatcher("TestTag starts with '${TestTags.DECLINE_REQUEST_BUTTON}'") { node ->
                        val testTag = node.config[androidx.compose.ui.semantics.SemanticsProperties.TestTag]
                        testTag.startsWith(TestTags.DECLINE_REQUEST_BUTTON)
                    }
                ).fetchSemanticsNodes().size
            } catch (e: Exception) {
                0
            }
            
            val remainingByText = try {
                composeTestRule.onAllNodesWithText("Decline", ignoreCase = true, useUnmergedTree = false)
                    .fetchSemanticsNodes().size
            } catch (e: Exception) {
                0
            }
            
            val remainingDeclineButtons = if (useTestTag) remainingByTag else remainingByText
            
            Log.d(TAG, "    - Empty state shown: $hasEmptyState")
            Log.d(TAG, "    - Remaining decline buttons: $remainingDeclineButtons")
            Log.d(TAG, "    - Initial count: $initialDeclineButtonCount")
            
            // Success if either:
            // 1. Empty state is shown (no more requests)
            // 2. There's one fewer decline button than before
            requestWasDeclined = hasEmptyState || (remainingDeclineButtons < initialDeclineButtonCount)
            
            if (requestWasDeclined) {
                Log.d(TAG, "  ✓ Request successfully declined (removed from list)")
                break
            } else {
                Log.d(TAG, "    - Request still in list, waiting...")
            }
        }
        
        if (!requestWasDeclined) {
            Log.e(TAG, "")
            Log.e(TAG, "=" .repeat(70))
            Log.e(TAG, "!!! FRIEND REQUEST WAS NOT DECLINED !!!")
            Log.e(TAG, "=" .repeat(70))
            Log.e(TAG, "")
            Log.e(TAG, "The Decline button was clicked but the request is still in the list.")
            Log.e(TAG, "")
            Log.e(TAG, "DEBUG INFO:")
            Log.e(TAG, "  - Initial button count: $initialDeclineButtonCount")
            
            val finalCountByTag = try {
                composeTestRule.onAllNodes(
                    androidx.compose.ui.test.SemanticsMatcher("TestTag starts with '${TestTags.DECLINE_REQUEST_BUTTON}'") { node ->
                        val testTag = node.config[androidx.compose.ui.semantics.SemanticsProperties.TestTag]
                        testTag.startsWith(TestTags.DECLINE_REQUEST_BUTTON)
                    }
                ).fetchSemanticsNodes().size
            } catch (e: Exception) {
                0
            }
            
            val finalCountByText = try {
                composeTestRule.onAllNodesWithText("Decline", ignoreCase = true, useUnmergedTree = false)
                    .fetchSemanticsNodes().size
            } catch (e: Exception) {
                0
            }
            
            val finalCount = if (useTestTag) finalCountByTag else finalCountByText
            Log.e(TAG, "  - Final button count: $finalCount")
            Log.e(TAG, "  - Time waited: ${maxCheckAttempts * 2} seconds")
            Log.e(TAG, "")
            Log.e(TAG, "MOST LIKELY CAUSE:")
            Log.e(TAG, "  ⚠️  You are logged in as the WRONG user!")
            Log.e(TAG, "")
            Log.e(TAG, "  In your screenshot, you see a request from \"Tomas Fernandes\"")
            Log.e(TAG, "  ")
            Log.e(TAG, "  Question: Are you currently logged in as:")
            Log.e(TAG, "    ❌ Tomas Fernandes (the SENDER)?")
            Log.e(TAG, "    ✅ The OTHER account (the RECIPIENT)?")
            Log.e(TAG, "")
            Log.e(TAG, "  If you're Tomas Fernandes, SIGN OUT and sign in as the OTHER account!")
            Log.e(TAG, "")
            Log.e(TAG, "TO CHECK:")
            Log.e(TAG, "  1. Look at Logcat for \"403 Forbidden\" or \"not authorized\"")
            Log.e(TAG, "  2. If you see that error → You're the wrong user")
            Log.e(TAG, "  3. Sign out, then sign in as the account that RECEIVED the request")
            Log.e(TAG, "")
            Log.e(TAG, "=" .repeat(70))
            
            throw AssertionError(
                "Friend request was not declined after ${maxCheckAttempts * 2}s. " +
                "Button count: before=$initialDeclineButtonCount, after=$finalCount. " +
                "Check Logcat for '403 Forbidden' - if you see it, you're logged in as the SENDER instead of the RECIPIENT!"
            )
        }
        
        Log.d(TAG, "✓ Friend request successfully declined!")
        
        // Step 6: Close the friend requests sheet
        Log.d(TAG, "Step 5: Closing friend requests sheet...")
        composeTestRule.activityRule.scenario.onActivity { activity ->
            activity.onBackPressedDispatcher.onBackPressed()
        }
        Thread.sleep(1000)
        
        Log.d(TAG, "✓ testDeclineFriendRequest_success: PASSED")
    }
}

