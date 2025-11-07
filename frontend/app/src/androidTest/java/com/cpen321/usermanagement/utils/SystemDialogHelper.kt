package com.cpen321.usermanagement.utils

import android.os.Build
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import android.util.Log

/**
 * Helper object for handling system dialogs and permissions using UI Automator.
 * 
 * These dialogs are outside the app's UI hierarchy and require UI Automator to interact with them.
 */
object SystemDialogHelper {
    private const val TAG = "SystemDialogHelper"
    private const val TIMEOUT = 3000L
    
    private val device: UiDevice by lazy {
        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    }
    
    /**
     * Handle notification permission dialog for Android 13+
     * Attempts to click "Allow" button if the dialog appears
     */
    fun handleNotificationPermission(allowPermission: Boolean = true) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            Log.d(TAG, "Notification permission not required for API < 33")
            return
        }
        
        try {
            Log.d(TAG, "Checking for notification permission dialog...")
            
            // Wait for permission dialog to appear
            val permissionDialog = device.wait(
                Until.findObject(By.pkg("com.google.android.permissioncontroller")),
                TIMEOUT
            )
            
            if (permissionDialog != null) {
                Log.d(TAG, "Permission dialog found, looking for button...")
                
                // Try multiple button text variations
                val buttonTexts = if (allowPermission) {
                    listOf("Allow", "ALLOW", "allow")
                } else {
                    listOf("Don't allow", "DON'T ALLOW", "Deny", "DENY")
                }
                
                for (buttonText in buttonTexts) {
                    val button = device.findObject(By.text(buttonText))
                    if (button != null) {
                        Log.d(TAG, "Found button with text: $buttonText")
                        button.click()
                        device.waitForIdle()
                        Log.d(TAG, "Clicked $buttonText on notification permission")
                        return
                    }
                }
                
                // Try by resource ID as fallback
                val allowButton = device.findObject(
                    By.res("com.android.permissioncontroller:id/permission_allow_button")
                )
                if (allowButton != null) {
                    Log.d(TAG, "Found button by resource ID")
                    allowButton.click()
                    device.waitForIdle()
                    Log.d(TAG, "Clicked allow button by resource ID")
                    return
                }
                
                Log.w(TAG, "Permission dialog found but button not found")
            } else {
                Log.d(TAG, "No permission dialog found (may have been already granted)")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling notification permission", e)
        }
    }
    
    /**
     * Handle location permission dialog
     * Attempts to click "While using the app" or "Allow" button
     */
    fun handleLocationPermission(allowPermission: Boolean = true) {
        try {
            Log.d(TAG, "Checking for location permission dialog...")
            
            // Wait for permission dialog
            val permissionDialog = device.wait(
                Until.findObject(By.pkg("com.google.android.permissioncontroller")),
                TIMEOUT
            )
            
            if (permissionDialog != null) {
                Log.d(TAG, "Location permission dialog found")
                
                val buttonTexts = if (allowPermission) {
                    listOf("While using the app", "WHILE USING THE APP", "Allow", "ALLOW")
                } else {
                    listOf("Don't allow", "DON'T ALLOW", "Deny", "DENY")
                }
                
                for (buttonText in buttonTexts) {
                    val button = device.findObject(By.text(buttonText))
                    if (button != null) {
                        Log.d(TAG, "Found button with text: $buttonText")
                        button.click()
                        device.waitForIdle()
                        Log.d(TAG, "Clicked $buttonText on location permission")
                        return
                    }
                }
                
                Log.w(TAG, "Location permission dialog found but button not found")
            } else {
                Log.d(TAG, "No location permission dialog found")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling location permission", e)
        }
    }
    
    /**
     * Handle Google Sign-In dialog/screen
     * This is a more complex dialog that may require account selection
     */
    fun handleGoogleSignIn(accountEmail: String? = null) {
        try {
            Log.d(TAG, "Checking for Google Sign-In screen...")
            
            // Wait for Google sign-in screen
            val signInScreen = device.wait(
                Until.findObject(By.pkg("com.google.android.gms")),
                TIMEOUT * 2
            )
            
            if (signInScreen != null) {
                Log.d(TAG, "Google Sign-In screen found")
                
                // If specific account email provided, try to select it
                if (accountEmail != null) {
                    val accountButton = device.findObject(By.text(accountEmail))
                    if (accountButton != null) {
                        Log.d(TAG, "Found account: $accountEmail")
                        accountButton.click()
                        device.waitForIdle()
                        return
                    }
                }
                
                // Otherwise, try to select first account or continue button
                val continueButton = device.findObject(By.text("Continue"))
                    ?: device.findObject(By.text("CONTINUE"))
                
                if (continueButton != null) {
                    Log.d(TAG, "Clicking Continue button")
                    continueButton.click()
                    device.waitForIdle()
                    return
                }
                
                Log.w(TAG, "Google Sign-In screen found but no action taken")
            } else {
                Log.d(TAG, "No Google Sign-In screen found")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling Google Sign-In", e)
        }
    }
    
    /**
     * Dismiss any system dialogs or notifications
     */
    fun dismissSystemDialogs() {
        try {
            Log.d(TAG, "Attempting to dismiss system dialogs...")
            device.pressBack()
            device.waitForIdle()
            Log.d(TAG, "Pressed back to dismiss dialogs")
        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing system dialogs", e)
        }
    }
    
    /**
     * Wait for device to be idle
     */
    fun waitForIdle(timeout: Long = 2000L) {
        device.waitForIdle(timeout)
    }
    
    /**
     * Grant all app permissions programmatically (best for testing)
     * This requires the app to be debuggable
     */
    fun grantAllPermissions() {
        try {
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            val packageName = context.packageName
            
            val permissions = listOf(
                "android.permission.ACCESS_FINE_LOCATION",
                "android.permission.ACCESS_COARSE_LOCATION",
                "android.permission.POST_NOTIFICATIONS"
            )
            
            for (permission in permissions) {
                try {
                    val command = "pm grant $packageName $permission"
                    Log.d(TAG, "Executing: $command")
                    InstrumentationRegistry.getInstrumentation()
                        .uiAutomation
                        .executeShellCommand(command)
                        .close()
                    Log.d(TAG, "Granted permission: $permission")
                } catch (e: Exception) {
                    Log.w(TAG, "Could not grant permission: $permission", e)
                }
            }
            
            device.waitForIdle()
            Log.d(TAG, "Finished granting permissions")
        } catch (e: Exception) {
            Log.e(TAG, "Error granting permissions", e)
        }
    }
}

