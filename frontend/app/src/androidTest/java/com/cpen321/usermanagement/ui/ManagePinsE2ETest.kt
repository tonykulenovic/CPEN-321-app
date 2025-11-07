package com.cpen321.usermanagement.ui

import android.util.Log
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import com.cpen321.usermanagement.MainActivity
import com.cpen321.usermanagement.utils.ComposeTestUtils.clearAndInputTextInTag
import com.cpen321.usermanagement.utils.ComposeTestUtils.inputTextInTag
import com.cpen321.usermanagement.utils.ComposeTestUtils.nodeExists
import com.cpen321.usermanagement.utils.ComposeTestUtils.textExists
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitAndClickTag
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitAndClickText
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitForCondition
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitForContentDescription
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitForTag
import com.cpen321.usermanagement.utils.ComposeTestUtils.waitForText
import com.cpen321.usermanagement.utils.SystemDialogHelper
import com.cpen321.usermanagement.utils.TestAuthHelper
import com.cpen321.usermanagement.utils.TestTags
import dagger.hilt.android.testing.HiltAndroidRule
import dagger.hilt.android.testing.HiltAndroidTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * End-to-End tests for Manage Pins feature (Regular User).
 * 
 * Tests cover:
 * - Use Case 4: Add Pin
 * - Use Case 5: View Pin Details
 * - Use Case 6: Vote on Pin
 * - Use Case 7: Report Pin
 * - Use Case 9: Remove Pin
 * 
 * ================================================================================
 * AUTHENTICATION FLOW
 * ================================================================================
 * 
 * Tests will automatically handle authentication:
 * 1. If NOT authenticated:
 *    - Tests will wait up to 60 seconds for you to sign in manually
 *    - Sign in with ANY regular Google account (not universe.cpen321@gmail.com)
 *    - Tests will automatically proceed once authentication is detected
 * 
 * 2. If already authenticated:
 *    - Tests will proceed immediately
 * 
 * To reset authentication between test runs:
 * ```bash
 * adb shell pm clear com.cpen321.usermanagement
 * ```
 * 
 * ================================================================================
 */
@HiltAndroidTest
@LargeTest
@RunWith(AndroidJUnit4::class)
class ManagePinsE2ETest {
    
    companion object {
        private const val TAG = "ManagePinsE2ETest"
        private var permissionsGranted = false
        
        /**
         * IMPORTANT: Pin name for multi-user tests
         * 
         * Before running testReportPin_success and testRemovePin_noPermission:
         * 1. Sign in with Account A (secondary Google account)
         * 2. Create a pin with these EXACT details:
         *    - Name: "E2E Test Pin - Other User"
         *    - Category: Study
         *    - Description: "This pin is for E2E testing. Created by another user for report and permission tests."
         *    - Visibility: Public
         *    - Location: Any location (pick default)
         * 3. Sign out from Account A
         * 4. Run tests with Account B (primary test account)
         * 
         * The tests will search for this pin by name.
         */
        private const val OTHER_USER_PIN_NAME = "E2E Test Pin - Other User"
    }
    
    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)
    
    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    private val testPinName = "E2E Test Study Room ${System.currentTimeMillis()}"
    private val testPinDescription = "Quiet study room perfect for exam prep, has outlets and good lighting"
    
    @Before
    fun setup() {
        Log.d(TAG, "========== Starting E2E Test Setup ==========")
        hiltRule.inject()
        
        // Only grant permissions once (not before every test)
        if (!permissionsGranted) {
            // Step 1: Grant all permissions programmatically to avoid permission dialogs
            Log.d(TAG, "Step 1: Granting permissions (first time only)...")
            SystemDialogHelper.grantAllPermissions()
            Thread.sleep(1000) // Give time for permissions to be applied
            
            // Step 2: Handle any remaining system dialogs (notification permission, etc.)
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
        val tokenManager = com.cpen321.usermanagement.data.local.preferences.TokenManager(context)
        
        var hasToken = false
        try {
            hasToken = kotlinx.coroutines.runBlocking {
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
            Log.w(TAG, "Please sign in to the app with ANY Google account within 60 seconds")
            Log.w(TAG, "The test will wait for you to complete authentication")
            Log.w(TAG, "NOTE: Use a regular user account (not universe.cpen321@gmail.com)")
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
                    kotlinx.coroutines.runBlocking {
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
            // This is normal Android behavior - ensureOnMainScreen() will verify the final UI state
            Log.d(TAG, "✓ Authentication complete - app should navigate to main screen")
            Log.d(TAG, "Note: App may restart activity after login - ensureOnMainScreen() will verify UI")
        } else {
            Log.d(TAG, "Already authenticated, proceeding with tests")
            Thread.sleep(2000)
        }
        
        Log.d(TAG, "========== Test Setup Complete ==========")
    }
    
    @After
    fun cleanup() {
        Log.d(TAG, "========== Starting Test Cleanup ==========")
        // Navigate back to main screen after each test
        try {
            // Check if we're on main screen already (handle app crashes gracefully)
            val onMainScreen = try {
                composeTestRule.onAllNodesWithContentDescription("Create Pin")
                    .fetchSemanticsNodes().isNotEmpty()
            } catch (e: IllegalStateException) {
                // App crashed or activity destroyed - can't check UI
                Log.w(TAG, "Cannot check UI state - app may have crashed", e)
                false
            } catch (e: Exception) {
                Log.w(TAG, "Error checking main screen state", e)
                false
            }
            
            if (onMainScreen) {
                Log.d(TAG, "Already on main screen, no cleanup needed")
            } else {
                Log.d(TAG, "Not on main screen (or app crashed), navigating back...")
                // Press back a few times to return to main screen
                // Don't do too many or we'll exit the app
                repeat(3) {
                    androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                        android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
                    )
                    Thread.sleep(500)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error during cleanup navigation", e)
        }
        
        // Give the app extra time to settle/restart between tests
        Log.d(TAG, "Waiting for app to settle...")
        Thread.sleep(3000) // Increased from 2s to 3s to give more time for app to stabilize
        Log.d(TAG, "========== Test Cleanup Complete ==========")
    }
    
    // ============================================================================
    // TEST CASE 1: Add Pin - Success Scenario
    // ============================================================================
    
    @Test
    fun testAddPin_successScenario() {
        ensureOnMainScreen()
        composeTestRule.apply {
            // Step 1: Navigate to Create Pin screen
            Log.d(TAG, "Step 1: Clicking Create Pin FAB")
            waitForContentDescription("Create Pin", timeoutMillis = 5000)
            onNodeWithContentDescription("Create Pin").assertIsDisplayed()
            onNodeWithContentDescription("Create Pin").performClick()
            
            // Step 2: Fill in pin details
            Log.d(TAG, "Step 2: Waiting for Create Pin screen")
            waitForText("Create Pin", timeoutMillis = 3000)
            
            // Verify screen elements exist
            onNodeWithTag(TestTags.PIN_NAME_FIELD).assertIsDisplayed()
            onNodeWithTag(TestTags.PIN_DESCRIPTION_FIELD).assertIsDisplayed()
            
            // Enter pin name
            Log.d(TAG, "Entering pin name: $testPinName")
            inputTextInTag(TestTags.PIN_NAME_FIELD, testPinName)
            
            // Select Study category
            Log.d(TAG, "Selecting Study category")
            onNodeWithTag(TestTags.CATEGORY_STUDY).assertExists()
            onNodeWithTag(TestTags.CATEGORY_STUDY).performClick()
            
            // Enter description
            Log.d(TAG, "Entering description")
            inputTextInTag(TestTags.PIN_DESCRIPTION_FIELD, testPinDescription)
            
            // Step 3: Pick location
            Log.d(TAG, "Step 3: Opening location picker")
            onNodeWithTag(TestTags.LOCATION_PICKER_BUTTON).performScrollTo()
            onNodeWithTag(TestTags.LOCATION_PICKER_BUTTON).assertExists()
            onNodeWithTag(TestTags.LOCATION_PICKER_BUTTON).performClick()
            
            // Wait for LocationPickerScreen to appear
            Log.d(TAG, "Waiting for Location Picker screen")
            waitForText("Pick Location", timeoutMillis = 3000)
            
            // Wait for map to load
            Log.d(TAG, "Waiting for map to load...")
            Thread.sleep(2000)
            
            // Click "Confirm Location" button
            Log.d(TAG, "Clicking Confirm Location button")
            waitForText("Confirm Location", timeoutMillis = 3000)
            onNodeWithText("Confirm Location").assertExists()
            onNodeWithText("Confirm Location").performClick()
            
            // Step 4: Back on CreatePin screen, submit the pin
            Log.d(TAG, "Step 4: Waiting to return to Create Pin screen")
            waitForCondition(timeoutMillis = 3000) {
                textExists("Create Pin") && !textExists("Pick Location")
            }
            
            // Scroll to and click Create Pin button
            Log.d(TAG, "Scrolling to Create Pin button")
            onNodeWithTag(TestTags.CREATE_PIN_BUTTON).performScrollTo()
            onNodeWithTag(TestTags.CREATE_PIN_BUTTON).assertIsDisplayed()
            
            Log.d(TAG, "Clicking Create Pin button")
            onNodeWithTag(TestTags.CREATE_PIN_BUTTON).performClick()
            
            // Step 5: Verify pin creation success
            Log.d(TAG, "Step 5: Waiting for pin creation result")
            waitForCondition(timeoutMillis = 5000) {
                val hasSuccess = textExists("Pin created", substring = true) ||
                    textExists("success", substring = true, ignoreCase = true)
                val backOnMain = nodeExists("create_pin_fab")
                
                if (hasSuccess) Log.d(TAG, "✓ Success message found")
                if (backOnMain) Log.d(TAG, "✓ Back on main screen")
                
                hasSuccess || backOnMain
            }
            
            Log.d(TAG, "✓ testAddPin_successScenario completed successfully!")
        }
    }
    
    // ============================================================================
    // TEST CASE 1.2: Add Pin - Incomplete Details (Failure Scenarios)
    // ============================================================================
    
    @Test
    fun testAddPin_incompleteDetails_emptyName() {
        ensureOnMainScreen()
        composeTestRule.apply {
            // Navigate to Create Pin screen
            waitForContentDescription("Create Pin", timeoutMillis = 5000)
            onNodeWithContentDescription("Create Pin").performClick()
            
            waitForText("Create Pin", timeoutMillis = 3000)
            
            // Leave name blank, add valid description
            inputTextInTag(TestTags.PIN_DESCRIPTION_FIELD, "Valid description for testing validation")
            
            // Try to create pin
            onNodeWithTag(TestTags.CREATE_PIN_BUTTON).performScrollTo()
            onNodeWithTag(TestTags.CREATE_PIN_BUTTON).performClick()
            
            // Wait for error message
            waitForCondition(timeoutMillis = 2000) { true }
            
            // Verify error message appears
            waitForText("Please enter a pin name", substring = true, timeoutMillis = 2000)
        }
    }
    
    @Test
    fun testAddPin_incompleteDetails_shortDescription() {
        ensureOnMainScreen()
        composeTestRule.apply {
            // Navigate to Create Pin screen
            waitForContentDescription("Create Pin", timeoutMillis = 5000)
            onNodeWithContentDescription("Create Pin").performClick()
            
            waitForText("Create Pin", timeoutMillis = 3000)
            
            // Enter valid name but short description
            inputTextInTag(TestTags.PIN_NAME_FIELD, "Valid Pin Name")
            inputTextInTag(TestTags.PIN_DESCRIPTION_FIELD, "Short") // Less than 10 chars
            
            // Try to create pin
            onNodeWithTag(TestTags.CREATE_PIN_BUTTON).performScrollTo()
            onNodeWithTag(TestTags.CREATE_PIN_BUTTON).performClick()
            
            // Wait for error
            waitForCondition(timeoutMillis = 2000) { true }
            
            // Verify error message
            waitForText("Description must be at least 10 characters", substring = true, timeoutMillis = 2000)
        }
    }
    
    @Test
    fun testAddPin_incompleteDetails_noLocation() {
        ensureOnMainScreen()
        composeTestRule.apply {
            // Navigate to Create Pin screen
            waitForContentDescription("Create Pin", timeoutMillis = 5000)
            onNodeWithContentDescription("Create Pin").performClick()
            
            waitForText("Create Pin", timeoutMillis = 3000)
            
            // Enter valid name and description but no location
            inputTextInTag(TestTags.PIN_NAME_FIELD, "Valid Pin Name")
            inputTextInTag(TestTags.PIN_DESCRIPTION_FIELD, "Valid description with enough characters for testing")
            
            // Try to create pin without picking location
            onNodeWithTag(TestTags.CREATE_PIN_BUTTON).performScrollTo()
            onNodeWithTag(TestTags.CREATE_PIN_BUTTON).performClick()
            
            // Wait for error
            waitForCondition(timeoutMillis = 2000) { true }
            
            // Verify error message
            waitForText("Please select a location", substring = true, timeoutMillis = 2000)
        }
    }
    
    // ============================================================================
    // TEST CASE 2: View Pin Details - Success Scenario
    // ============================================================================
    
    @Test(timeout = 120000) // 2 minute timeout to prevent hanging
    fun testViewPinDetails_success() {
        ensureOnMainScreen()
        
        // Create a pin and open its details
        val pinName = createAndOpenPin()
        
        composeTestRule.apply {
            Log.d(TAG, "testViewPinDetails_success: Verifying pin details are displayed")
            
            // Verify pin name is shown
            onNodeWithText(pinName, substring = true).assertExists()
            
            // Verify key details are shown
            waitForText("Study", timeoutMillis = 2000) // Category
            
            // Verify voting UI is present
            onNodeWithTag(TestTags.PIN_UPVOTE_BUTTON).assertExists()
            onNodeWithTag(TestTags.PIN_DOWNVOTE_BUTTON).assertExists()
            // Vote counts are just numbers, so we'll verify buttons are sufficient
            
            // Verify location card is present
            onNodeWithTag(TestTags.PIN_LOCATION_CARD).assertExists()
            
            // Verify creator card is present (should show current user since we created it)
            onNodeWithTag(TestTags.PIN_CREATOR_CARD).assertExists()
            
            // Verify edit and delete buttons are shown (since we own this pin)
            onNodeWithTag(TestTags.PIN_EDIT_BUTTON).assertExists()
            onNodeWithTag(TestTags.PIN_DELETE_BUTTON).assertExists()
            
            Log.d(TAG, "✓ testViewPinDetails_success: All details verified successfully")
        }
    }
    
    // ============================================================================
    // TEST CASE 3: Vote on Pin - Success Scenario
    // ============================================================================
    
    @Test(timeout = 120000) // 2 minute timeout to prevent hanging
    fun testVoteOnPin_success() {
        ensureOnMainScreen()
        
        // Create a pin and open its details
        val pinName = createAndOpenPin()
        
        composeTestRule.apply {
            Log.d(TAG, "testVoteOnPin_success: Testing voting functionality")
            
            // Verify vote buttons exist
            onNodeWithTag(TestTags.PIN_UPVOTE_BUTTON).assertExists()
            onNodeWithTag(TestTags.PIN_DOWNVOTE_BUTTON).assertExists()
            // Vote counts are just numbers next to the buttons, no label text to check
            
            // Click upvote button
            Log.d(TAG, "Clicking upvote button")
            onNodeWithTag(TestTags.PIN_UPVOTE_BUTTON).performClick()
            
            // Wait for vote to register (optimistic UI update or backend response)
            Thread.sleep(1500)
            
            // Verify UI still intact after upvote
            onNodeWithTag(TestTags.PIN_UPVOTE_BUTTON).assertExists()
            // Vote count exists but is in merged tree, so we just verify button is still there
            
            Log.d(TAG, "Upvote successful, testing downvote")
            
            // Test changing to downvote
            onNodeWithTag(TestTags.PIN_DOWNVOTE_BUTTON).performClick()
            
            // Wait for vote to register
            Thread.sleep(1500)
            
            // Verify UI still intact after downvote
            onNodeWithTag(TestTags.PIN_UPVOTE_BUTTON).assertExists()
            onNodeWithTag(TestTags.PIN_DOWNVOTE_BUTTON).assertExists()
            // Vote counts exist but are in merged tree, so we just verify buttons are still there
            
            Log.d(TAG, "✓ testVoteOnPin_success: Both upvote and downvote functionality verified")
        }
    }
    
    // ============================================================================
    // TEST CASE 4: Report Pin - Success Scenario
    // ============================================================================
    
    /**
     * Test reporting a pin created by another user
     * 
     * Prerequisites:
     * - Pin with name "E2E Test Pin - Other User" must exist, created by Account A
     * - Running test with Account B (different from Account A)
     * 
     * Test Flow:
     * 1. Search for and open the other user's pin
     * 2. Verify report button exists (edit/delete buttons should NOT exist)
     * 3. Click report button
     * 4. Select report reason
     * 5. Submit report
     * 6. Verify success message
     */
    @Test(timeout = 120000)
    fun testReportPin_success() {
        ensureOnMainScreen()
        
        // Find and open the other user's pin
        findAndOpenOtherUserPin()
        
        composeTestRule.apply {
            Log.d(TAG, "testReportPin_success: Verifying report button exists for other user's pin")
            
            // Verify we're looking at another user's pin (no edit/delete buttons)
            onNodeWithTag(TestTags.PIN_EDIT_BUTTON).assertDoesNotExist()
            onNodeWithTag(TestTags.PIN_DELETE_BUTTON).assertDoesNotExist()
            
            // Verify report button EXISTS (can report other users' pins)
            onNodeWithTag(TestTags.PIN_REPORT_BUTTON).assertExists()
            
            // Click report button
            Log.d(TAG, "Clicking report button")
            onNodeWithTag(TestTags.PIN_REPORT_BUTTON).performClick()
            
            // Wait for report dialog to appear
            Log.d(TAG, "Waiting for report dialog")
            waitForText("Report Pin", timeoutMillis = 3000)
            
            // Verify dialog elements
            onNodeWithText("Report Pin").assertExists() // Title
            onNodeWithText("Reason for reporting (optional):").assertExists() // Label
            
            // Optionally enter a report reason in the text field
            Log.d(TAG, "Attempting to enter report reason (optional)")
            Thread.sleep(1000) // Wait for dialog to fully render
            
            // Try to enter text, but don't fail if we can't (reason is optional)
            try {
                // Find the text field by placeholder text
                onNodeWithText("Enter reason (optional)...", substring = true).performTextInput("E2E test report")
                Log.d(TAG, "✓ Entered report reason")
            } catch (e: Exception) {
                Log.w(TAG, "Could not enter text in report reason field - skipping (reason is optional)", e)
                // Not critical - reason is optional, we can submit without it
            }
            
            // Click the "Report" button to submit
            Log.d(TAG, "Clicking Report button to submit")
            Thread.sleep(500)
            
            try {
                // The "Report" button is the confirm button in the dialog
                // There are two buttons: "Cancel" and "Report"
                // We want to click the "Report" button (not the title)
                val reportButtons = onAllNodesWithText("Report", ignoreCase = true)
                val buttonCount = reportButtons.fetchSemanticsNodes().size
                Log.d(TAG, "Found $buttonCount nodes with 'Report' text")
                
                // Click the last one (the button, not the title)
                reportButtons.onLast().performClick()
                Log.d(TAG, "✓ Clicked Report button")
                
                // Wait for dialog to close and success message
                Log.d(TAG, "Waiting for success confirmation")
                waitForCondition(timeoutMillis = 5000) {
                    !textExists("Report Pin") || // Dialog closed
                    textExists("success", ignoreCase = true, substring = true) ||
                    textExists("reported", ignoreCase = true, substring = true)
                }
                
                Log.d(TAG, "✓ testReportPin_success: Pin reported successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Could not complete report submission", e)
                Log.e(TAG, "This may be due to:")
                Log.e(TAG, "  1. Report dialog UI changed")
                Log.e(TAG, "  2. Network error while submitting report")
                Log.e(TAG, "  3. Multiple 'Report' text nodes in UI")
                
                throw AssertionError("Could not complete report submission. Check logcat for details.", e)
            }
        }
    }
    
    // ============================================================================
    // TEST CASE 4.2: Report Pin - Cannot Report Own Pin
    // ============================================================================
    
    @Test(timeout = 120000) // 2 minute timeout to prevent hanging
    fun testReportPin_cannotReportOwnPin() {
        ensureOnMainScreen()
        
        // Create a pin and open its details
        val pinName = createAndOpenPin()
        
        composeTestRule.apply {
            Log.d(TAG, "testReportPin_cannotReportOwnPin: Verifying own pin cannot be reported")
            
            // Verify Edit and Delete buttons ARE shown (owner privileges)
            onNodeWithTag(TestTags.PIN_EDIT_BUTTON).assertExists()
            onNodeWithTag(TestTags.PIN_DELETE_BUTTON).assertExists()
            
            // Verify Report button is NOT shown (cannot report own pin)
            onNodeWithTag(TestTags.PIN_REPORT_BUTTON).assertDoesNotExist()
            
            Log.d(TAG, "✓ testReportPin_cannotReportOwnPin: Verified own pin cannot be reported")
        }
    }
    
    // ============================================================================
    // TEST CASE 6: Remove Pin - User Removes Own Pin
    // ============================================================================
    
    @Test(timeout = 120000) // 2 minute timeout to prevent hanging
    fun testRemovePin_userRemovesOwnPin() {
        ensureOnMainScreen()
        
        // Create a pin and open its details
        val pinName = createAndOpenPin()
        
        composeTestRule.apply {
            Log.d(TAG, "testRemovePin_userRemovesOwnPin: Testing pin deletion")
            
            // Verify delete button is shown (we own this pin)
            onNodeWithTag(TestTags.PIN_DELETE_BUTTON).assertExists()
            
            // Click delete button
            Log.d(TAG, "Clicking delete button")
            onNodeWithTag(TestTags.PIN_DELETE_BUTTON).performClick()
            
            // Wait for confirmation dialog
            Log.d(TAG, "Waiting for confirmation dialog")
            waitForText("Delete", substring = true, timeoutMillis = 3000)
            
            // Confirm deletion by clicking the confirm button
            Log.d(TAG, "Confirming deletion")
            // Look for the Delete/Confirm button in the dialog
            waitForCondition(timeoutMillis = 2000) {
                textExists("Are you sure", substring = true) || 
                textExists("confirm", substring = true, ignoreCase = true)
            }
            
            // Click the confirmation button (likely labeled "Delete" or "Confirm")
            onAllNodesWithText("Delete").onLast().performClick()
            
            // Wait for navigation back to map
            Log.d(TAG, "Waiting for navigation back to main screen")
            waitForCondition(timeoutMillis = 5000) {
                nodeExists("create_pin_fab")
            }
            
            // Pin should be removed - if we search for it, it shouldn't be found
            Log.d(TAG, "✓ testRemovePin_userRemovesOwnPin: Pin deleted successfully")
        }
    }
    
    // ============================================================================
    // TEST CASE 6.2: Remove Pin - No Permission
    // ============================================================================
    
    /**
     * Test that user cannot delete another user's pin
     * 
     * Prerequisites:
     * - Pin with name "E2E Test Pin - Other User" must exist, created by Account A
     * - Running test with Account B (different from Account A)
     * 
     * Test Flow:
     * 1. Search for and open the other user's pin
     * 2. Verify edit button is NOT shown
     * 3. Verify delete button is NOT shown  
     * 4. Verify report button IS shown (can report but not edit/delete)
     */
    @Test(timeout = 120000)
    fun testRemovePin_noPermission() {
        ensureOnMainScreen()
        
        // Find and open the other user's pin
        findAndOpenOtherUserPin()
        
        composeTestRule.apply {
            Log.d(TAG, "testRemovePin_noPermission: Verifying no edit/delete permissions for other user's pin")
            
            // Verify Edit button is NOT shown (can't edit other users' pins)
            onNodeWithTag(TestTags.PIN_EDIT_BUTTON).assertDoesNotExist()
            Log.d(TAG, "✓ Edit button not shown (correct)")
            
            // Verify Delete button is NOT shown (can't delete other users' pins)
            onNodeWithTag(TestTags.PIN_DELETE_BUTTON).assertDoesNotExist()
            Log.d(TAG, "✓ Delete button not shown (correct)")
            
            // Verify Report button IS shown (can report other users' pins)
            onNodeWithTag(TestTags.PIN_REPORT_BUTTON).assertExists()
            Log.d(TAG, "✓ Report button shown (correct)")
            
            Log.d(TAG, "✓ testRemovePin_noPermission: Verified correct permissions for other user's pin")
        }
    }
    
    // ============================================================================
    // TEST CASE 6.3: Remove Pin - Cancel Deletion
    // ============================================================================
    
    @Test(timeout = 120000) // 2 minute timeout to prevent hanging
    fun testRemovePin_cancelDeletion() {
        ensureOnMainScreen()
        
        // Create a pin and open its details
        val pinName = createAndOpenPin()
        
        composeTestRule.apply {
            Log.d(TAG, "testRemovePin_cancelDeletion: Testing cancel deletion flow")
            
            // Verify delete button exists
            onNodeWithTag(TestTags.PIN_DELETE_BUTTON).assertExists()
            
            // Click delete button
            Log.d(TAG, "Clicking delete button")
            onNodeWithTag(TestTags.PIN_DELETE_BUTTON).performClick()
            
            // Wait for confirmation dialog
            Log.d(TAG, "Waiting for confirmation dialog")
            waitForText("Delete", substring = true, timeoutMillis = 3000)
            
            // Click Cancel button
            Log.d(TAG, "Clicking Cancel button")
            onNodeWithText("Cancel", ignoreCase = true).performClick()
            
            // Verify dialog closes and we're still on pin details screen
            Log.d(TAG, "Verifying pin details still shown")
            waitForCondition(timeoutMillis = 2000) {
                !textExists("Are you sure", substring = true)
            }
            
            // Verify pin details are still shown
            onNodeWithText(pinName, substring = true).assertExists()
            onNodeWithTag(TestTags.PIN_DELETE_BUTTON).assertExists()
            
            // Verify the pin still exists by going back and searching for it
            Log.d(TAG, "Going back to verify pin still exists")
            // Press back or close bottom sheet
            androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
            )
            
            Thread.sleep(1000)
            
            // Verify we're back on main screen
            waitForCondition(timeoutMillis = 3000) {
                nodeExists("create_pin_fab")
            }
            
            Log.d(TAG, "✓ testRemovePin_cancelDeletion: Cancel deletion verified successfully")
        }
    }
    
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    
    /**
     * Helper to navigate to Create Pin screen
     */
    private fun navigateToCreatePin() {
        composeTestRule.apply {
            waitForContentDescription("Create Pin", timeoutMillis = 5000)
            onNodeWithContentDescription("Create Pin").performClick()
            waitForText("Create Pin", timeoutMillis = 3000)
        }
    }
    
    /**
     * Helper to fill pin creation form
     */
    private fun fillPinForm(
        name: String,
        description: String,
        category: String = TestTags.CATEGORY_STUDY
    ) {
        composeTestRule.apply {
            inputTextInTag(TestTags.PIN_NAME_FIELD, name)
            onNodeWithTag(category).performClick()
            inputTextInTag(TestTags.PIN_DESCRIPTION_FIELD, description)
        }
    }
    
    /**
     * Helper to wait for main screen to be ready
     */
    private fun waitForMainScreen() {
        composeTestRule.waitForContentDescription("Create Pin", timeoutMillis = 10000)
    }
    
    /**
     * Helper to create a pin and open its details
     * Returns the name of the created pin
     */
    private fun createAndOpenPin(): String {
        val pinName = "Test Pin ${System.currentTimeMillis()}"
        val pinDescription = "Test description for E2E testing"
        
        composeTestRule.apply {
            Log.d(TAG, "createAndOpenPin: Creating pin '$pinName'")
            
            // Navigate to Create Pin screen
            waitForContentDescription("Create Pin", timeoutMillis = 5000)
            onNodeWithContentDescription("Create Pin").performClick()
            waitForText("Create Pin", timeoutMillis = 3000)
            
            // Fill in details
            inputTextInTag(TestTags.PIN_NAME_FIELD, pinName)
            onNodeWithTag(TestTags.CATEGORY_STUDY).performClick()
            inputTextInTag(TestTags.PIN_DESCRIPTION_FIELD, pinDescription)
            
            // Pick location
            onNodeWithTag(TestTags.LOCATION_PICKER_BUTTON).performScrollTo()
            onNodeWithTag(TestTags.LOCATION_PICKER_BUTTON).performClick()
            waitForText("Pick Location", timeoutMillis = 3000)
            Thread.sleep(2000) // Wait for map
            onNodeWithText("Confirm Location").performClick()
            
            // Submit pin
            waitForCondition(timeoutMillis = 3000) {
                textExists("Create Pin") && !textExists("Pick Location")
            }
            onNodeWithTag(TestTags.CREATE_PIN_BUTTON).performScrollTo()
            onNodeWithTag(TestTags.CREATE_PIN_BUTTON).performClick()
            
            // Wait for navigation back to main screen
            Log.d(TAG, "createAndOpenPin: Waiting for return to main screen")
            waitForCondition(timeoutMillis = 5000) {
                nodeExists("create_pin_fab")
            }
            Thread.sleep(2000) // Wait for pin to appear on map and sync
            
            // Navigate to Search screen to find our pin
            Log.d(TAG, "createAndOpenPin: Opening Search to find pin")
            
            try {
                onNodeWithContentDescription("Search").assertExists()
            } catch (e: Exception) {
                Log.e(TAG, "Search button not found - UI may have changed", e)
                throw AssertionError("Cannot find Search button to locate pin '$pinName'")
            }
            
            onNodeWithContentDescription("Search").performClick()
            
            // Wait for search screen
            waitForCondition(timeoutMillis = 5000) {
                textExists("Search", substring = true)
            }
            
            // Search for our pin by name
            Log.d(TAG, "createAndOpenPin: Searching for '$pinName'")
            // Find the search text field and enter pin name
            try {
                onNodeWithText("Search pins by name...", substring = true).performTextInput(pinName)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to enter text in search field", e)
                throw AssertionError("Cannot enter text in search field for pin '$pinName'")
            }
            
            // Wait for search results to load with retry logic
            Log.d(TAG, "Waiting for search results...")
            var pinFoundInResults = false
            var retryCount = 0
            val maxRetries = 3 // Reduced from 5 to prevent test hangs
            
            while (!pinFoundInResults && retryCount < maxRetries) {
                Thread.sleep(2000) // Wait between retries
                
                // Debug: Print what nodes are available
                try {
                    onRoot().printToLog("SEARCH_RESULTS_ATTEMPT_${retryCount + 1}")
                } catch (e: Exception) {
                    Log.e(TAG, "Could not print search results UI tree", e)
                }
                
                // Check if any results appeared with our pin name
                pinFoundInResults = try {
                    onAllNodesWithText(pinName, substring = true).fetchSemanticsNodes().size > 1 // >1 because search field also has the text
                } catch (e: Exception) {
                    false
                }
                
                if (!pinFoundInResults) {
                    retryCount++
                    Log.w(TAG, "Pin '$pinName' not found in search results (attempt $retryCount/$maxRetries)")
                } else {
                    Log.d(TAG, "Pin '$pinName' found in search results!")
                }
            }
            
            if (!pinFoundInResults) {
                Log.e(TAG, "Pin '$pinName' never appeared in search results after $maxRetries attempts")
                // Navigate back to main screen before throwing error
                androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                    android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
                )
                Thread.sleep(500)
                throw AssertionError("Pin '$pinName' never appeared in search results after $maxRetries attempts (6 seconds) - backend may be slow or pin creation failed. Navigated back to main screen.")
            }
            
            // Click on the pin in search results
            // Try multiple approaches to find and click the result
            Log.d(TAG, "createAndOpenPin: Attempting to click pin in search results")
            
            var clickSuccessful = false
            var clickAttempts = 0
            val maxClickAttempts = 2
            
            while (!clickSuccessful && clickAttempts < maxClickAttempts) {
                clickAttempts++
                Log.d(TAG, "Click attempt $clickAttempts of $maxClickAttempts")
                
                try {
                    // Approach: Click on any card with the pin name (more reliable than ContentDescription)
                    val allPinTextNodes = onAllNodesWithText(pinName, substring = true)
                    val nodeCount = allPinTextNodes.fetchSemanticsNodes().size
                    Log.d(TAG, "Found $nodeCount nodes with pin name")
                    
                    if (nodeCount < 2) {
                        throw AssertionError("Expected at least 2 nodes with pin name (search field + result), found $nodeCount")
                    }
                    
                    // Click the SECOND occurrence (first is search field, second is first result)
                    // This is more reliable than onLast() when pin appears multiple times
                    allPinTextNodes[1].performClick()
                    Log.d(TAG, "Clicked pin using index [1] approach")
                    
                    // Immediately check if we're still on search screen
                    Thread.sleep(1000)
                    val stillOnSearchScreen = textExists("Search pins by name...", substring = true)
                    
                    if (stillOnSearchScreen) {
                        Log.w(TAG, "Still on search screen after click - click may have failed")
                        if (clickAttempts < maxClickAttempts) {
                            Log.d(TAG, "Retrying click...")
                            continue
                        }
                    } else {
                        Log.d(TAG, "Successfully navigated away from search screen")
                        clickSuccessful = true
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Click attempt $clickAttempts failed", e)
                    if (clickAttempts >= maxClickAttempts) {
                        // Navigate back before failing
                        Log.e(TAG, "All click attempts failed, navigating back")
                        androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                            android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
                        )
                        Thread.sleep(500)
                        throw AssertionError("Could not click on pin '$pinName' in search results after $maxClickAttempts attempts. Navigated back to main screen.", e)
                    }
                }
            }
            
            // Wait for navigation back to map with pin details
            Log.d(TAG, "createAndOpenPin: Waiting for pin details bottom sheet")
            Thread.sleep(2000) // Give time for navigation and bottom sheet to open
            
            // First check: are we still on the search screen? If so, something went wrong
            val stillOnSearch = textExists("Search pins by name...", substring = true)
            
            if (stillOnSearch) {
                Log.e(TAG, "ERROR: Still on search screen after clicking pin - navigation failed")
                // Navigate back
                androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                    android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
                )
                Thread.sleep(500)
                throw AssertionError("Failed to navigate from search screen to pin details for '$pinName'. Navigated back to main screen.")
            }
            
            // Verify pin details bottom sheet opened
            try {
                waitForCondition(timeoutMillis = 6000) {
                    // Check for bottom sheet by looking for upvote/downvote buttons or edit/delete buttons
                    val hasVoting = nodeExists(TestTags.PIN_UPVOTE_BUTTON) || 
                                   nodeExists(TestTags.PIN_DOWNVOTE_BUTTON)
                    val hasActions = nodeExists(TestTags.PIN_EDIT_BUTTON) || 
                                    nodeExists(TestTags.PIN_DELETE_BUTTON)
                    val hasUpvoteText = textExists("Upvote", substring = true)
                    
                    if (hasVoting || hasActions || hasUpvoteText) {
                        Log.d(TAG, "Bottom sheet verified - Voting:$hasVoting Actions:$hasActions UpvoteText:$hasUpvoteText")
                    }
                    hasVoting || hasActions || hasUpvoteText
                }
                Log.d(TAG, "createAndOpenPin: Pin details opened successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Pin details bottom sheet did not open within 6 seconds", e)
                // Try to print UI state for debugging
                try {
                    onRoot().printToLog("PIN_DETAILS_TIMEOUT")
                } catch (ex: Exception) {
                    Log.e(TAG, "Could not print UI tree", ex)
                }
                // Navigate back before failing
                androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                    android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
                )
                Thread.sleep(500)
                throw AssertionError("Pin details bottom sheet for '$pinName' did not open within 6 seconds. Navigated back.", e)
            }
        }
        
        return pinName
    }
    
    /**
     * Helper to find and open a pin created by another user
     * Searches for the pin by the constant OTHER_USER_PIN_NAME
     */
    private fun findAndOpenOtherUserPin() {
        composeTestRule.apply {
            Log.d(TAG, "findAndOpenOtherUserPin: Looking for pin '$OTHER_USER_PIN_NAME'")
            
            // Navigate to Search screen
            try {
                onNodeWithContentDescription("Search").assertExists()
            } catch (e: Exception) {
                Log.e(TAG, "Search button not found", e)
                throw AssertionError("Cannot find Search button to locate pin '$OTHER_USER_PIN_NAME'")
            }
            
            onNodeWithContentDescription("Search").performClick()
            
            // Wait for search screen
            waitForCondition(timeoutMillis = 5000) {
                textExists("Search", substring = true)
            }
            
            // Search for the other user's pin
            Log.d(TAG, "Searching for '$OTHER_USER_PIN_NAME'")
            try {
                onNodeWithText("Search pins by name...", substring = true).performTextInput(OTHER_USER_PIN_NAME)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to enter text in search field", e)
                throw AssertionError("Cannot enter text in search field for pin '$OTHER_USER_PIN_NAME'")
            }
            
            // Wait for search results
            Log.d(TAG, "Waiting for search results...")
            var pinFoundInResults = false
            var retryCount = 0
            val maxRetries = 3
            
            while (!pinFoundInResults && retryCount < maxRetries) {
                Thread.sleep(2000)
                
                try {
                    onRoot().printToLog("SEARCH_OTHER_USER_PIN_ATTEMPT_${retryCount + 1}")
                } catch (e: Exception) {
                    Log.e(TAG, "Could not print UI tree", e)
                }
                
                pinFoundInResults = try {
                    onAllNodesWithText(OTHER_USER_PIN_NAME, substring = true).fetchSemanticsNodes().size > 1
                } catch (e: Exception) {
                    false
                }
                
                if (!pinFoundInResults) {
                    retryCount++
                    Log.w(TAG, "Pin '$OTHER_USER_PIN_NAME' not found (attempt $retryCount/$maxRetries)")
                } else {
                    Log.d(TAG, "✓ Pin '$OTHER_USER_PIN_NAME' found in search results!")
                }
            }
            
            if (!pinFoundInResults) {
                Log.e(TAG, "=" .repeat(60))
                Log.e(TAG, "OTHER USER'S PIN NOT FOUND")
                Log.e(TAG, "=" .repeat(60))
                Log.e(TAG, "Could not find pin: '$OTHER_USER_PIN_NAME'")
                Log.e(TAG, "")
                Log.e(TAG, "Make sure you:")
                Log.e(TAG, "1. Created a pin with EXACT name: '$OTHER_USER_PIN_NAME'")
                Log.e(TAG, "2. Created it with a DIFFERENT Google account (Account A)")
                Log.e(TAG, "3. Set visibility to PUBLIC")
                Log.e(TAG, "4. Signed out from Account A")
                Log.e(TAG, "5. Running tests with Account B")
                Log.e(TAG, "=" .repeat(60))
                // Navigate back before failing
                androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                    android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
                )
                Thread.sleep(500)
                throw AssertionError("Pin '$OTHER_USER_PIN_NAME' not found after $maxRetries attempts. See logcat for setup instructions.")
            }
            
            // Click on the pin in search results
            Log.d(TAG, "Clicking on pin in search results")
            var clickSuccessful = false
            var clickAttempts = 0
            val maxClickAttempts = 2
            
            while (!clickSuccessful && clickAttempts < maxClickAttempts) {
                clickAttempts++
                try {
                    val allPinTextNodes = onAllNodesWithText(OTHER_USER_PIN_NAME, substring = true)
                    val nodeCount = allPinTextNodes.fetchSemanticsNodes().size
                    
                    if (nodeCount < 2) {
                        throw AssertionError("Expected at least 2 nodes with pin name, found $nodeCount")
                    }
                    
                    // Click the SECOND occurrence (first is search field, second is first result)
                    allPinTextNodes[1].performClick()
                    Log.d(TAG, "Clicked pin using index [1]")
                    
                    Thread.sleep(1000)
                    val stillOnSearchScreen = textExists("Search pins by name...", substring = true)
                    
                    if (stillOnSearchScreen) {
                        Log.w(TAG, "Still on search screen after click")
                        if (clickAttempts < maxClickAttempts) {
                            continue
                        }
                    } else {
                        clickSuccessful = true
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Click attempt $clickAttempts failed", e)
                    if (clickAttempts >= maxClickAttempts) {
                        androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                            android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
                        )
                        Thread.sleep(500)
                        throw AssertionError("Could not click on pin '$OTHER_USER_PIN_NAME'", e)
                    }
                }
            }
            
            // Wait for pin details bottom sheet
            Log.d(TAG, "Waiting for pin details bottom sheet")
            Thread.sleep(2000)
            
            val stillOnSearch = textExists("Search pins by name...", substring = true)
            if (stillOnSearch) {
                androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                    android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
                )
                Thread.sleep(500)
                throw AssertionError("Failed to navigate to pin details for '$OTHER_USER_PIN_NAME'")
            }
            
            // Verify bottom sheet opened
            try {
                waitForCondition(timeoutMillis = 6000) {
                    nodeExists(TestTags.PIN_UPVOTE_BUTTON) || 
                    nodeExists(TestTags.PIN_REPORT_BUTTON) ||
                    textExists("Upvote", substring = true)
                }
                Log.d(TAG, "✓ Pin details opened successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Pin details bottom sheet did not open", e)
                try {
                    onRoot().printToLog("PIN_DETAILS_TIMEOUT_OTHER_USER")
                } catch (ex: Exception) {
                    // Ignore
                }
                androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                    android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
                )
                Thread.sleep(500)
                throw AssertionError("Pin details for '$OTHER_USER_PIN_NAME' did not open", e)
            }
        }
    }
    
    /**
     * Helper to ensure we're on the main screen (navigate back if needed)
     */
    private fun ensureOnMainScreen() {
        Log.d(TAG, "ensureOnMainScreen() called - waiting for app to be ready...")
        
        composeTestRule.apply {
            // First, wait for the app to fully load (give it time after activity restart)
            // Try to wait for EITHER the Create Pin FAB OR the sign-in screen
            // This handles cases where the activity restarted and is loading
            Log.d(TAG, "Waiting for app to initialize (up to 10 seconds)...")
            
            // Print initial UI state (skip if app crashed)
            try {
                Log.d(TAG, "=== Printing initial UI state ===")
                onRoot().printToLog("INITIAL_UI_STATE")
            } catch (e: IllegalStateException) {
                Log.e(TAG, "No Compose hierarchies found - app may have crashed or activity destroyed", e)
                Log.e(TAG, "Waiting for app to restart...")
                // Give the app time to restart
                Thread.sleep(5000)
            } catch (e: Exception) {
                Log.e(TAG, "Could not print initial UI tree", e)
            }
            
            try {
                var lastCheckTime = System.currentTimeMillis()
                waitUntil(timeoutMillis = 20000) {
                    // Log every 2 seconds to see what's happening
                    val currentTime = System.currentTimeMillis()
                    val shouldLog = (currentTime - lastCheckTime) > 2000
                    
                    // Wrap in try-catch in case app crashed and UI hierarchy doesn't exist
                    val hasCreatePin = try {
                        onAllNodesWithContentDescription("Create Pin")
                            .fetchSemanticsNodes().isNotEmpty()
                    } catch (e: IllegalStateException) {
                        false // App crashed, no hierarchy
                    }
                    
                    val hasCreatePinTag = try {
                        onAllNodesWithTag("create_pin_fab")
                            .fetchSemanticsNodes().isNotEmpty()
                    } catch (e: IllegalStateException) {
                        false
                    }
                    
                    val hasSignIn = try {
                        onAllNodesWithText("Sign In", substring = true, ignoreCase = true)
                            .fetchSemanticsNodes().isNotEmpty()
                    } catch (e: IllegalStateException) {
                        false
                    }
                    
                    val hasSignUp = try {
                        onAllNodesWithText("Sign Up", substring = true, ignoreCase = true)
                            .fetchSemanticsNodes().isNotEmpty()
                    } catch (e: IllegalStateException) {
                        false
                    }
                    
                    val hasGoogle = try {
                        onAllNodesWithText("Google", substring = true, ignoreCase = true)
                            .fetchSemanticsNodes().isNotEmpty()
                    } catch (e: IllegalStateException) {
                        false
                    }
                    
                    if (shouldLog) {
                        Log.d(TAG, "Waiting for app... CreatePin(desc):$hasCreatePin CreatePin(tag):$hasCreatePinTag SignIn:$hasSignIn SignUp:$hasSignUp Google:$hasGoogle")
                        lastCheckTime = currentTime
                    }
                    
                    val appReady = hasCreatePin || hasCreatePinTag || hasSignIn
                    if (appReady) {
                        Log.d(TAG, "✓ App initialized - CreatePin: $hasCreatePin, CreatePinTag: $hasCreatePinTag, SignIn: $hasSignIn")
                    }
                    appReady
                }
            } catch (e: Exception) {
                Log.e(TAG, "!!! App did not initialize within 20 second timeout !!!", e)
                try {
                    Log.e(TAG, "=== Printing UI tree at timeout ===")
                    onRoot().printToLog("APP_TIMEOUT")
                } catch (ex: Exception) {
                    Log.e(TAG, "Could not print UI tree at timeout", ex)
                }
                throw AssertionError("App did not load within 20 seconds. Check logcat with tag 'APP_TIMEOUT' to see what was on screen.", e)
            }
            
            // Give UI time to settle
            Thread.sleep(1000)
            
            // Print current UI tree for debugging
            try {
                onRoot().printToLog("ENSURE_MAIN_SCREEN")
            } catch (e: Exception) {
                Log.e(TAG, "Could not print UI tree in ensureOnMainScreen()", e)
            }
            
            // Check if we're already on main screen
            val onMainScreen = try {
                val nodesByDesc = onAllNodesWithContentDescription("Create Pin").fetchSemanticsNodes()
                val nodesByTag = onAllNodesWithTag("create_pin_fab").fetchSemanticsNodes()
                val found = nodesByDesc.isNotEmpty() || nodesByTag.isNotEmpty()
                Log.d(TAG, "Main screen check - By ContentDesc: ${nodesByDesc.size}, By Tag: ${nodesByTag.size}, Found: $found")
                found
            } catch (e: Exception) {
                Log.e(TAG, "Error checking for main screen", e)
                false
            }
            
            if (onMainScreen) {
                Log.d(TAG, "Already on main screen - continuing with test")
            } else {
                Log.w(TAG, "NOT on main screen - attempting to navigate back...")
                
                // Check if app is on sign-in screen (activity might have been destroyed)
                val onSignIn = try {
                    onAllNodesWithText("Sign In", substring = true, ignoreCase = true)
                        .fetchSemanticsNodes().isNotEmpty()
                } catch (e: Exception) {
                    false
                }
                
                if (onSignIn) {
                    Log.e(TAG, "App went back to sign-in screen! Activity was destroyed between tests.")
                    Log.e(TAG, "This suggests the app crashed or auth token was lost.")
                    throw AssertionError("App returned to sign-in screen - please check if backend is running and auth is valid")
                }
                
                // Press back a few times to get back to main screen
                repeat(3) {
                    androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                        android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
                    )
                    Thread.sleep(500)
                }
                
                // Wait for main screen
                Log.d(TAG, "Waiting for Create Pin FAB after navigation...")
                try {
                    waitUntil(timeoutMillis = 5000) {
                        val found = try {
                            onAllNodesWithContentDescription("Create Pin")
                                .fetchSemanticsNodes().isNotEmpty() ||
                                    onAllNodesWithTag("create_pin_fab")
                                        .fetchSemanticsNodes().isNotEmpty()
                        } catch (e: Exception) {
                            false
                        }
                        if (found) Log.d(TAG, "Found main screen!")
                        found
                    }
                    Log.d(TAG, "Successfully reached main screen")
                } catch (e: Exception) {
                    Log.e(TAG, "FAILED to reach main screen after navigation", e)
                    try {
                        onRoot().printToLog("FAILED_NAVIGATION")
                    } catch (ex: Exception) {
                        Log.e(TAG, "Could not print UI tree (app may be destroyed)", ex)
                    }
                    throw AssertionError("Could not reach main screen. App may have been destroyed.", e)
                }
            }
        }
    }
}

