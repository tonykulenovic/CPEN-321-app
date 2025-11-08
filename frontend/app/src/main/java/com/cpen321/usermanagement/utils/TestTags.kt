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
    
    // FriendsScreen tags
    const val FRIENDS_SCREEN = "friends_screen"
    const val FRIENDS_SEARCH_BAR = "friends_search_bar"
    const val ADD_FRIEND_FAB = "add_friend_fab"
    const val FRIEND_REQUESTS_BUTTON = "friend_requests_button"
    const val FRIEND_REQUESTS_BADGE = "friend_requests_badge"
    const val FRIENDS_LIST = "friends_list"
    const val FRIEND_CARD = "friend_card"
    const val FRIEND_MENU_BUTTON = "friend_menu_button"
    const val FRIEND_VIEW_PROFILE_OPTION = "friend_view_profile_option"
    const val FRIEND_REMOVE_OPTION = "friend_remove_option"
    const val EMPTY_FRIENDS_STATE = "empty_friends_state"
    
    // Add Friend Bottom Sheet tags
    const val ADD_FRIEND_SHEET = "add_friend_sheet"
    const val ADD_FRIEND_SEARCH_FIELD = "add_friend_search_field"
    const val USER_SEARCH_RESULT_CARD = "user_search_result_card"
    const val SEND_REQUEST_BUTTON = "send_request_button"
    const val REQUEST_PENDING_BUTTON = "request_pending_button"
    const val NO_USERS_FOUND_TEXT = "no_users_found_text"
    
    // Friend Requests Bottom Sheet tags
    const val FRIEND_REQUESTS_SHEET = "friend_requests_sheet"
    const val FRIEND_REQUEST_CARD = "friend_request_card"
    const val ACCEPT_REQUEST_BUTTON = "accept_request_button"
    const val DECLINE_REQUEST_BUTTON = "decline_request_button"
    const val NO_REQUESTS_TEXT = "no_requests_text"
    
    // ProfileScreen tags
    const val PROFILE_SCREEN = "profile_screen"
    const val PROFILE_HEADER = "profile_header"
    const val PROFILE_NAME = "profile_name"
    const val PROFILE_USERNAME = "profile_username"
    const val PROFILE_PICTURE = "profile_picture"
    const val MANAGE_PROFILE_BUTTON = "manage_profile_button"
    const val DELETE_ACCOUNT_BUTTON = "delete_account_button"
    const val LOGOUT_BUTTON = "logout_button"
    const val DELETE_ACCOUNT_DIALOG = "delete_account_dialog"
    const val DELETE_ACCOUNT_CONFIRM = "delete_account_confirm"
    const val DELETE_ACCOUNT_CANCEL = "delete_account_cancel"
    
    // ManageProfileScreen tags
    const val MANAGE_PROFILE_SCREEN = "manage_profile_screen"
    const val PROFILE_NAME_FIELD = "profile_name_field"
    const val PROFILE_USERNAME_FIELD = "profile_username_field"
    const val PROFILE_BIO_FIELD = "profile_bio_field"
    const val EDIT_PROFILE_PICTURE_BUTTON = "edit_profile_picture_button"
    const val SAVE_PROFILE_BUTTON = "save_profile_button"
    const val PRIVACY_SETTINGS_BUTTON = "privacy_settings_button"
    
    // PrivacySettingsScreen tags
    const val PRIVACY_SETTINGS_SCREEN = "privacy_settings_screen"
    const val LOCATION_SHARING_OFF = "location_sharing_off"
    const val LOCATION_SHARING_FRIENDS = "location_sharing_friends"
    const val LOCATION_SHARING_EVERYONE = "location_sharing_everyone"
    const val PROFILE_VISIBILITY_PRIVATE = "profile_visibility_private"
    const val PROFILE_VISIBILITY_FRIENDS = "profile_visibility_friends"
    const val PROFILE_VISIBILITY_PUBLIC = "profile_visibility_public"
    const val BADGE_VISIBILITY_PRIVATE = "badge_visibility_private"
    const val BADGE_VISIBILITY_FRIENDS = "badge_visibility_friends"
    const val BADGE_VISIBILITY_PUBLIC = "badge_visibility_public"
    const val FRIEND_REQUESTS_EVERYONE = "friend_requests_everyone"
    const val FRIEND_REQUESTS_FRIENDS_OF_FRIENDS = "friend_requests_friends_of_friends"
    const val FRIEND_REQUESTS_NO_ONE = "friend_requests_no_one"
    const val SAVE_PRIVACY_BUTTON = "save_privacy_button"
    
    // Common tags
    const val LOADING_INDICATOR = "loading_indicator"
    const val ERROR_MESSAGE = "error_message"
    const val SUCCESS_MESSAGE = "success_message"
    const val CONFIRM_DIALOG = "confirm_dialog"
    const val SNACKBAR_HOST = "snackbar_host"
    
    // Helper functions to create dynamic tags
    fun mapMarkerTag(pinName: String) = "map_marker_${pinName.replace(" ", "_")}"
    fun friendCardTag(friendId: String) = "friend_card_$friendId"
    fun userSearchResultTag(userId: String) = "user_search_result_$userId"
    fun friendRequestCardTag(requestId: String) = "friend_request_card_$requestId"
}

