package com.cpen321.usermanagement.utils

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.ComposeTestRule

/**
 * Utility functions for Compose UI testing
 */
object ComposeTestUtils {
    
    /**
     * Wait for a composable with the given test tag to appear
     */
    fun ComposeTestRule.waitForTag(
        tag: String,
        timeoutMillis: Long = 5000L
    ): SemanticsNodeInteraction {
        waitUntil(timeoutMillis) {
            onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty()
        }
        return onNodeWithTag(tag)
    }
    
    /**
     * Wait for a composable with the given text to appear
     */
    fun ComposeTestRule.waitForText(
        text: String,
        substring: Boolean = false,
        ignoreCase: Boolean = false,
        timeoutMillis: Long = 5000L
    ): SemanticsNodeInteraction {
        waitUntil(timeoutMillis) {
            onAllNodesWithText(text, substring = substring, ignoreCase = ignoreCase)
                .fetchSemanticsNodes().isNotEmpty()
        }
        return onNodeWithText(text, substring = substring, ignoreCase = ignoreCase)
    }
    
    /**
     * Wait for a composable with the given content description to appear
     */
    fun ComposeTestRule.waitForContentDescription(
        description: String,
        substring: Boolean = false,
        ignoreCase: Boolean = false,
        timeoutMillis: Long = 5000L
    ): SemanticsNodeInteraction {
        waitUntil(timeoutMillis) {
            onAllNodesWithContentDescription(description, substring = substring, ignoreCase = ignoreCase)
                .fetchSemanticsNodes().isNotEmpty()
        }
        return onNodeWithContentDescription(description, substring = substring, ignoreCase = ignoreCase)
    }
    
    /**
     * Wait for loading to complete (no loading indicators)
     */
    fun ComposeTestRule.waitForLoadingToComplete(timeoutMillis: Long = 10000L) {
        waitUntil(timeoutMillis) {
            onAllNodesWithTag(TestTags.LOADING_INDICATOR)
                .fetchSemanticsNodes().isEmpty()
        }
    }
    
    /**
     * Check if a node with the given tag exists
     */
    fun ComposeTestRule.nodeExists(tag: String): Boolean {
        return onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty()
    }
    
    /**
     * Check if a node with the given text exists
     */
    fun ComposeTestRule.textExists(text: String, substring: Boolean = false, ignoreCase: Boolean = false): Boolean {
        return onAllNodesWithText(text, substring = substring, ignoreCase = ignoreCase).fetchSemanticsNodes().isNotEmpty()
    }
    
    /**
     * Wait for a condition to be true
     */
    fun ComposeTestRule.waitForCondition(
        timeoutMillis: Long = 5000L,
        condition: () -> Boolean
    ) {
        waitUntil(timeoutMillis) {
            condition()
        }
    }
    
    /**
     * Scroll to the bottom of a scrollable composable
     */
    fun SemanticsNodeInteraction.scrollToBottom() {
        performTouchInput {
            swipeUp(startY = bottom, endY = top)
        }
    }
    
    /**
     * Wait and click on a node with the given tag
     */
    fun ComposeTestRule.waitAndClickTag(tag: String, timeoutMillis: Long = 5000L) {
        waitForTag(tag, timeoutMillis).performClick()
    }
    
    /**
     * Wait and click on a node with the given text
     */
    fun ComposeTestRule.waitAndClickText(text: String, timeoutMillis: Long = 5000L) {
        waitForText(text, timeoutMillis = timeoutMillis).performClick()
    }
    
    /**
     * Input text into a field with the given tag
     */
    fun ComposeTestRule.inputTextInTag(tag: String, text: String) {
        onNodeWithTag(tag).performTextInput(text)
    }
    
    /**
     * Clear and input text into a field with the given tag
     */
    fun ComposeTestRule.clearAndInputTextInTag(tag: String, text: String) {
        onNodeWithTag(tag).performTextClearance()
        onNodeWithTag(tag).performTextInput(text)
    }
}

