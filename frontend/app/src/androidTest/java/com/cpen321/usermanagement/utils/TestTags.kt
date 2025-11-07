package com.cpen321.usermanagement.utils

/**
 * Test tags for E2E testing.
 * These tags should be added to composables using Modifier.testTag()
 */
object TestTags {
    // CreatePinScreen tags
    const val PIN_NAME_FIELD = "pin_name_field"
    const val PIN_DESCRIPTION_FIELD = "pin_description_field"
    const val CATEGORY_STUDY = "category_study"
    const val CATEGORY_EVENTS = "category_events"
    const val CATEGORY_CHILL = "category_chill"
    const val CATEGORY_SHOPS = "category_shops_services"
    const val VISIBILITY_PUBLIC = "visibility_public"
    const val VISIBILITY_FRIENDS = "visibility_friends_only"
    const val VISIBILITY_PRIVATE = "visibility_private"
    const val LOCATION_PICKER_BUTTON = "location_picker_button"
    const val CREATE_PIN_BUTTON = "create_pin_button"
    
    // PinDetailsScreen tags
    const val PIN_DETAILS_BOTTOM_SHEET = "pin_details_bottom_sheet"
    const val PIN_CATEGORY_BADGE = "pin_category_badge"
    const val PIN_VISIBILITY_BADGE = "pin_visibility_badge"
    const val PIN_UPVOTE_BUTTON = "pin_upvote_button"
    const val PIN_DOWNVOTE_BUTTON = "pin_downvote_button"
    const val PIN_UPVOTE_COUNT = "pin_upvote_count"
    const val PIN_DOWNVOTE_COUNT = "pin_downvote_count"
    const val PIN_LOCATION_CARD = "pin_location_card"
    const val PIN_CREATOR_CARD = "pin_creator_card"
    const val PIN_DELETE_BUTTON = "pin_delete_button"
    const val PIN_EDIT_BUTTON = "pin_edit_button"
    const val PIN_REPORT_BUTTON = "pin_report_button"
    
    // MainScreen tags
    const val MAP_VIEW = "map_view"
    const val CREATE_PIN_FAB = "create_pin_fab"
    const val CATEGORY_FILTER_BUTTON = "category_filter_button"
    
    // AdminDashboard tags
    const val ADMIN_DASHBOARD_SCREEN = "admin_dashboard_screen"
    const val ADMIN_MANAGE_PINS_BUTTON = "admin_manage_pins_button"
    const val ADMIN_REPORTED_PINS_BUTTON = "admin_reported_pins_button"
    const val ADMIN_MANAGE_USERS_BUTTON = "admin_manage_users_button"
    
    // AdminReportedPins tags
    const val ADMIN_REPORTED_PINS_SCREEN = "admin_reported_pins_screen"
    const val REPORTED_PINS_LIST = "reported_pins_list"
    const val REPORTED_PIN_CARD = "reported_pin_card"
    const val ADMIN_VIEW_REPORTS_BUTTON = "admin_view_reports_button"
    const val ADMIN_CLEAR_REPORTS_BUTTON = "admin_clear_reports_button"
    const val ADMIN_DELETE_PIN_BUTTON = "admin_delete_pin_button"
    const val ADMIN_DELETE_DIALOG = "admin_delete_dialog"
    const val ADMIN_DELETE_CONFIRM = "admin_delete_confirm"
    const val ADMIN_DELETE_CANCEL = "admin_delete_cancel"
    const val ADMIN_EMPTY_STATE = "admin_empty_state"
    
    // Common tags
    const val LOADING_INDICATOR = "loading_indicator"
    const val ERROR_MESSAGE = "error_message"
    const val SUCCESS_MESSAGE = "success_message"
    const val CONFIRM_DIALOG = "confirm_dialog"
    const val SNACKBAR_HOST = "snackbar_host"
    
    // Helper function to create dynamic marker tags
    fun mapMarkerTag(pinName: String) = "map_marker_${pinName.replace(" ", "_")}"
}

