package com.cpen321.usermanagement.ui.navigation

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

sealed class NavigationEvent {
    object NavigateToAuth : NavigationEvent()
    object NavigateToMain : NavigationEvent()
    object NavigateToAdminDashboard : NavigationEvent()
    object NavigateToProfileCompletion : NavigationEvent()
    object NavigateToProfile : NavigationEvent()
    object NavigateToManageProfile : NavigationEvent()
    object NavigateToPrivacySettings : NavigationEvent()
    data class NavigateToAuthWithMessage(val message: String) : NavigationEvent()
    data class NavigateToMainWithMessage(val message: String) : NavigationEvent()
    object NavigateBack : NavigationEvent()
    object ClearBackStack : NavigationEvent()
    object NoNavigation : NavigationEvent()
}

data class NavigationState(
    val currentRoute: String = NavRoutes.LOADING,
    val isAuthenticated: Boolean = false,
    val isAdmin: Boolean = false,
    val needsProfileCompletion: Boolean = false,
    val isLoading: Boolean = true,
    val isNavigating: Boolean = false
)

@Singleton
class NavigationStateManager @Inject constructor() {

    private val _navigationEvent = MutableStateFlow<NavigationEvent>(NavigationEvent.NoNavigation)
    val navigationEvent: StateFlow<NavigationEvent> = _navigationEvent.asStateFlow()

    private val _navigationState = MutableStateFlow(NavigationState())

    /**
     * Updates the authentication state and triggers appropriate navigation
     */
    fun updateAuthenticationState(
        isAuthenticated: Boolean,
        needsProfileCompletion: Boolean,
        isAdmin: Boolean = false,
        isLoading: Boolean = false,
        currentRoute: String = _navigationState.value.currentRoute
    ) {
        val newState = _navigationState.value.copy(
            isAuthenticated = isAuthenticated,
            isAdmin = isAdmin,
            needsProfileCompletion = needsProfileCompletion,
            isLoading = isLoading,
            currentRoute = currentRoute
        )
        _navigationState.value = newState

        // Trigger navigation based on state
        if (!isLoading) {
            handleAuthenticationNavigation(currentRoute, isAuthenticated, isAdmin, needsProfileCompletion)
        }
    }

    /**
     * Handle navigation decisions based on authentication state
     */
    private fun handleAuthenticationNavigation(
        currentRoute: String,
        isAuthenticated: Boolean,
        isAdmin: Boolean,
        needsProfileCompletion: Boolean
    ) {
        when {
            // From loading screen after auth check
            currentRoute == NavRoutes.LOADING -> {
                if (isAuthenticated) {
                    if (isAdmin) {
                        // Admins skip onboarding and go directly to admin dashboard
                        navigateToAdminDashboard()
                    } else if (needsProfileCompletion) {
                        navigateToProfileCompletion()
                    } else {
                        navigateToMain()
                    }
                } else {
                    navigateToAuth()
                }
            }
            // From auth screen after successful login
            currentRoute.startsWith(NavRoutes.AUTH) && isAuthenticated -> {
                if (isAdmin) {
                    // Admins skip onboarding and go directly to admin dashboard
                    navigateToAdminDashboard()
                } else if (needsProfileCompletion) {
                    navigateToProfileCompletion()
                } else {
                    navigateToMain()
                }
            }
        }
    }

    /**
     * Navigate to auth screen
     */
    fun navigateToAuth() {
        _navigationEvent.value = NavigationEvent.NavigateToAuth
        _navigationState.value = _navigationState.value.copy(currentRoute = NavRoutes.AUTH)
    }

    /**
     * Navigate to auth screen with success message
     */
    fun navigateToAuthWithMessage(message: String) {
        _navigationEvent.value = NavigationEvent.NavigateToAuthWithMessage(message)
        _navigationState.value = _navigationState.value.copy(currentRoute = NavRoutes.AUTH)
    }

    /**
     * Navigate to main screen
     */
    fun navigateToMain() {
        _navigationEvent.value = NavigationEvent.NavigateToMain
        _navigationState.value = _navigationState.value.copy(currentRoute = NavRoutes.MAIN)
    }

    /**
     * Navigate to admin dashboard
     */
    fun navigateToAdminDashboard() {
        _navigationEvent.value = NavigationEvent.NavigateToAdminDashboard
        _navigationState.value = _navigationState.value.copy(currentRoute = NavRoutes.ADMIN_DASHBOARD)
    }

    /**
     * Navigate to main screen with success message
     */
    fun navigateToMainWithMessage(message: String) {
        _navigationEvent.value = NavigationEvent.NavigateToMainWithMessage(message)
        _navigationState.value = _navigationState.value.copy(currentRoute = NavRoutes.MAIN)
    }

    /**
     * Navigate to profile completion screen
     */
    fun navigateToProfileCompletion() {
        _navigationEvent.value = NavigationEvent.NavigateToProfileCompletion
        _navigationState.value =
            _navigationState.value.copy(currentRoute = NavRoutes.PROFILE_COMPLETION)
    }

    /**
     * Navigate to profile screen
     */
    fun navigateToProfile() {
        _navigationEvent.value = NavigationEvent.NavigateToProfile
        _navigationState.value = _navigationState.value.copy(currentRoute = NavRoutes.PROFILE)
    }

    /**
     * Navigate to manage profile screen
     */
    fun navigateToManageProfile() {
        _navigationEvent.value = NavigationEvent.NavigateToManageProfile
        _navigationState.value =
            _navigationState.value.copy(currentRoute = NavRoutes.MANAGE_PROFILE)
    }

    /**
     * Navigate to privacy settings screen
     */
    fun navigateToPrivacySettings() {
        _navigationEvent.value = NavigationEvent.NavigateToPrivacySettings
        _navigationState.value =
            _navigationState.value.copy(currentRoute = NavRoutes.PRIVACY_SETTINGS)
    }

    /**
     * Navigate back
     */
    fun navigateBack() {
        _navigationEvent.value = NavigationEvent.NavigateBack
    }

    /**
     * Handle account deletion
     */
    fun handleAccountDeletion() {
        _navigationState.value = _navigationState.value.copy(isNavigating = true)

        updateAuthenticationState(
            isAuthenticated = false,
            needsProfileCompletion = false,
            isLoading = false
        )
        navigateToAuthWithMessage("Account deleted successfully!")
    }

    /**
     * Handle profile completion
     */
    fun handleProfileCompletion() {
        _navigationState.value = _navigationState.value.copy(needsProfileCompletion = false)
        navigateToMain()
    }

    /**
     * Handle profile completion with success message
     */
    fun handleProfileCompletionWithMessage(message: String) {
        _navigationState.value = _navigationState.value.copy(needsProfileCompletion = false)
        navigateToMainWithMessage(message)
    }

    /**
     * Handle user logout
     */
    fun handleLogout() {
        _navigationState.value = _navigationState.value.copy(isNavigating = true)

        updateAuthenticationState(
            isAuthenticated = false,
            needsProfileCompletion = false,
            isLoading = false
        )
        navigateToAuthWithMessage("Account logged out successfully!")
    }

    /**
     * Reset navigation events after handling
     */
    fun clearNavigationEvent() {
        _navigationEvent.value = NavigationEvent.NoNavigation
        // Clear navigating flag when navigation is complete
        _navigationState.value = _navigationState.value.copy(isNavigating = false)
    }
}
