package com.cpen321.usermanagement.ui.navigation

import android.util.Log
import androidx.compose.runtime.*
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.cpen321.usermanagement.R
import com.cpen321.usermanagement.ui.screens.AdminDashboardScreen
import com.cpen321.usermanagement.ui.screens.AdminManagePinsScreen
import com.cpen321.usermanagement.ui.screens.AdminManageUsersScreen
import com.cpen321.usermanagement.ui.screens.AdminReportedPinsScreen
import com.cpen321.usermanagement.ui.screens.AuthScreen
import com.cpen321.usermanagement.ui.screens.BadgesScreen
import com.cpen321.usermanagement.ui.screens.CreatePinScreen
import com.cpen321.usermanagement.ui.screens.EditPinScreen
import com.cpen321.usermanagement.ui.screens.FriendProfileScreen
import com.cpen321.usermanagement.ui.screens.FriendsScreen
import com.cpen321.usermanagement.ui.screens.LoadingScreen
import com.cpen321.usermanagement.ui.screens.LocationPickerScreen
import com.cpen321.usermanagement.data.realtime.LocationTrackingService
import com.cpen321.usermanagement.ui.screens.MainScreen
import com.cpen321.usermanagement.ui.screens.ManageProfileScreen
import com.cpen321.usermanagement.ui.screens.PrivacySettingsScreen
import com.cpen321.usermanagement.ui.screens.ProfileCompletionScreen
import com.cpen321.usermanagement.ui.screens.ProfileScreen
import com.cpen321.usermanagement.ui.screens.ProfileScreenActions
import com.cpen321.usermanagement.ui.screens.SearchPinsScreen
import com.cpen321.usermanagement.ui.viewmodels.AdminViewModel
import com.cpen321.usermanagement.ui.viewmodels.AuthViewModel
import com.cpen321.usermanagement.ui.viewmodels.BadgeViewModel
import com.cpen321.usermanagement.ui.viewmodels.FriendsViewModel
import com.cpen321.usermanagement.ui.viewmodels.MainViewModel
import com.cpen321.usermanagement.ui.viewmodels.NavigationViewModel
import com.cpen321.usermanagement.ui.viewmodels.PinViewModel
import com.cpen321.usermanagement.ui.viewmodels.ProfileViewModel
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import com.google.android.gms.maps.model.LatLng

object NavRoutes {
    const val LOADING = "loading"
    const val AUTH = "auth"
    const val ADMIN_DASHBOARD = "admin_dashboard"
    const val ADMIN_MANAGE_PINS = "admin_manage_pins"
    const val ADMIN_MANAGE_USERS = "admin_manage_users"
    const val ADMIN_REPORTED_PINS = "admin_reported_pins"
    const val MAIN = "main"
    const val SEARCH_PINS = "search_pins"
    const val PROFILE = "profile"
    const val MANAGE_PROFILE = "manage_profile"
    const val PRIVACY_SETTINGS = "privacy_settings"
    const val PROFILE_COMPLETION = "profile_completion"
    const val FRIENDS = "friends"
    const val BADGES = "badges"
    const val FRIEND_PROFILE = "friend_profile/{friendId}"
    const val CREATE_PIN = "create_pin"
    const val PICK_LOCATION = "pick_location"
    const val EDIT_PIN = "edit_pin/{pinId}"

    // Helper function to create route with parameter
    fun friendProfile(friendId: String) = "friend_profile/$friendId"
    fun editPin(pinId: String) = "edit_pin/$pinId"
}

@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController()
) {
    val navigationViewModel: NavigationViewModel = hiltViewModel()
    val navigationStateManager = navigationViewModel.navigationStateManager
    val navigationEvent by navigationStateManager.navigationEvent.collectAsState()

    // Initialize view models required for navigation-level scope
    val authViewModel: AuthViewModel = hiltViewModel()
    val profileViewModel: ProfileViewModel = hiltViewModel()
    val mainViewModel: MainViewModel = hiltViewModel()

    // Handle navigation events from NavigationStateManager
    LaunchedEffect(navigationEvent) {
        handleNavigationEvent(
            navigationEvent,
            navController,
            navigationStateManager,
            authViewModel,
            mainViewModel
        )
    }

    AppNavHost(
        navController = navController,
        authViewModel = authViewModel,
        profileViewModel = profileViewModel,
        mainViewModel = mainViewModel,
        navigationStateManager = navigationStateManager
    )
}

private fun handleNavigationEvent(
    navigationEvent: NavigationEvent,
    navController: NavHostController,
    navigationStateManager: NavigationStateManager,
    authViewModel: AuthViewModel,
    mainViewModel: MainViewModel
) {
    when (navigationEvent) {
        is NavigationEvent.NavigateToAuth -> {
            navController.navigate(NavRoutes.AUTH) {
                popUpTo(0) { inclusive = true }
            }
            navigationStateManager.clearNavigationEvent()
        }

        is NavigationEvent.NavigateToAuthWithMessage -> {
            authViewModel.setSuccessMessage(navigationEvent.message)
            navController.navigate(NavRoutes.AUTH) {
                popUpTo(0) { inclusive = true }
            }
            navigationStateManager.clearNavigationEvent()
        }

        is NavigationEvent.NavigateToMain -> {
            navController.navigate(NavRoutes.MAIN) {
                popUpTo(0) { inclusive = true }
            }
            navigationStateManager.clearNavigationEvent()
        }

        is NavigationEvent.NavigateToAdminDashboard -> {
            navController.navigate(NavRoutes.ADMIN_DASHBOARD) {
                popUpTo(0) { inclusive = true }
            }
            navigationStateManager.clearNavigationEvent()
        }

        is NavigationEvent.NavigateToMainWithMessage -> {
            mainViewModel.setSuccessMessage(navigationEvent.message)
            navController.navigate(NavRoutes.MAIN) {
                popUpTo(0) { inclusive = true }
            }
            navigationStateManager.clearNavigationEvent()
        }

        is NavigationEvent.NavigateToProfileCompletion -> {
            navController.navigate(NavRoutes.PROFILE_COMPLETION) {
                popUpTo(0) { inclusive = true }
            }
            navigationStateManager.clearNavigationEvent()
        }

        is NavigationEvent.NavigateToProfile -> {
            navController.navigate(NavRoutes.PROFILE)
            navigationStateManager.clearNavigationEvent()
        }

        is NavigationEvent.NavigateToManageProfile -> {
            navController.navigate(NavRoutes.MANAGE_PROFILE)
            navigationStateManager.clearNavigationEvent()
        }

        is NavigationEvent.NavigateToPrivacySettings -> {
            navController.navigate(NavRoutes.PRIVACY_SETTINGS)
            navigationStateManager.clearNavigationEvent()
        }

        is NavigationEvent.NavigateBack -> {
            navController.popBackStack()
            navigationStateManager.clearNavigationEvent()
        }

        is NavigationEvent.ClearBackStack -> {
            navController.popBackStack(navController.graph.startDestinationId, false)
            navigationStateManager.clearNavigationEvent()
        }

        is NavigationEvent.NoNavigation -> {
            // Do nothing
        }
    }
}

@Composable
private fun AppNavHost(
    navController: NavHostController,
    authViewModel: AuthViewModel,
    profileViewModel: ProfileViewModel,
    mainViewModel: MainViewModel,
    navigationStateManager: NavigationStateManager
) {
    NavHost(
        navController = navController,
        startDestination = NavRoutes.LOADING,
        // ADD THESE to disable animations
        enterTransition = { EnterTransition.None },
        exitTransition = { ExitTransition.None },
        popEnterTransition = { EnterTransition.None },
        popExitTransition = { ExitTransition.None }
    ) {
        composable(NavRoutes.LOADING) {
            LoadingScreen(message = stringResource(R.string.checking_authentication))
        }

        composable(NavRoutes.AUTH) {
            AuthScreen(authViewModel = authViewModel, profileViewModel = profileViewModel)
        }

        composable(NavRoutes.ADMIN_DASHBOARD) {
            AdminDashboardScreen(
                onLogout = {
                    authViewModel.handleLogout()
                    navController.navigate(NavRoutes.AUTH) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onManagePinsClick = {
                    navController.navigate(NavRoutes.ADMIN_MANAGE_PINS)
                },
                onManageUsersClick = {
                    navController.navigate(NavRoutes.ADMIN_MANAGE_USERS)
                },
                onReportedPinsClick = {
                    navController.navigate(NavRoutes.ADMIN_REPORTED_PINS)
                }
            )
        }

        composable(NavRoutes.ADMIN_MANAGE_PINS) {
            val pinViewModel: PinViewModel = hiltViewModel()
            AdminManagePinsScreen(
                pinViewModel = pinViewModel,
                onBackClick = {
                    navController.popBackStack()
                }
            )
        }

        composable(NavRoutes.ADMIN_MANAGE_USERS) {
            val adminViewModel: AdminViewModel = hiltViewModel()
            AdminManageUsersScreen(
                adminViewModel = adminViewModel,
                onBackClick = {
                    navController.popBackStack()
                }
            )
        }

        composable(NavRoutes.ADMIN_REPORTED_PINS) {
            val pinViewModel: PinViewModel = hiltViewModel()
            AdminReportedPinsScreen(
                pinViewModel = pinViewModel,
                onBackClick = {
                    navController.popBackStack()
                }
            )
        }

        composable(NavRoutes.PROFILE_COMPLETION) {
            ProfileCompletionScreen(
                profileViewModel = profileViewModel,
                onProfileCompleted = { navigationStateManager.handleProfileCompletion() },
                onProfileCompletedWithMessage = { message ->
                    Log.d("AppNavigation", "Profile completed with message: $message")
                    navigationStateManager.handleProfileCompletionWithMessage(message)
                }
            )
        }

        composable(NavRoutes.MAIN) {
            val pinViewModel: PinViewModel = hiltViewModel()
            
            MainScreen(
                mainViewModel = mainViewModel,  // Use shared instance from AppNavHost
                pinViewModel = pinViewModel,
                onProfileClick = { navController.navigate(NavRoutes.PROFILE) },
                onFriendsClick = { navController.navigate(NavRoutes.FRIENDS) },
                onBadgesClick = { navController.navigate(NavRoutes.BADGES) },
                onSearchClick = { navController.navigate(NavRoutes.SEARCH_PINS) },
                onCreatePinClick = { navController.navigate(NavRoutes.CREATE_PIN) },
                onEditPinClick = { pinId -> navController.navigate(NavRoutes.editPin(pinId)) }
            )
        }

        composable(NavRoutes.SEARCH_PINS) {
            val pinViewModel: PinViewModel = hiltViewModel()
            SearchPinsScreen(
                pinViewModel = pinViewModel,
                onMapClick = { navController.navigate(NavRoutes.MAIN) {
                    popUpTo(NavRoutes.MAIN) { inclusive = true }
                } },
                onBadgesClick = { navController.navigate(NavRoutes.BADGES) },
                onFriendsClick = { navController.navigate(NavRoutes.FRIENDS) },
                onProfileClick = { navigationStateManager.navigateToProfile() },
                onPinClick = { pinId ->
                    // Save pin ID to MainViewModel so it persists across navigation
                    mainViewModel.setSelectedPinFromSearch(pinId)  // Use shared instance from AppNavHost
                    
                    // Navigate to map and show the pin details
                    navController.navigate(NavRoutes.MAIN) {
                        popUpTo(NavRoutes.MAIN) { inclusive = true }
                    }
                }
            )
        }

        composable(NavRoutes.FRIENDS) {
            val friendsViewModel: FriendsViewModel = hiltViewModel()
            FriendsScreen(
                friendsViewModel = friendsViewModel,
                onMapClick = { navController.navigate(NavRoutes.MAIN) {
                    popUpTo(NavRoutes.MAIN) { inclusive = true }
                } },
                onSearchClick = { navController.navigate(NavRoutes.SEARCH_PINS) },
                onProfileClick = { navigationStateManager.navigateToProfile() },
                onBadgesClick = { navController.navigate(NavRoutes.BADGES) },
                onViewFriendProfile = { friendId ->
                    navController.navigate(NavRoutes.friendProfile(friendId))
                }
            )
        }

        composable(NavRoutes.BADGES) {
            val badgeViewModel: BadgeViewModel = hiltViewModel()
            BadgesScreen(
                badgeViewModel = badgeViewModel,
                profileViewModel = profileViewModel,
                onMapClick = { navController.navigate(NavRoutes.MAIN) {
                    popUpTo(NavRoutes.MAIN) { inclusive = true }
                } },
                onSearchClick = { navController.navigate(NavRoutes.SEARCH_PINS) },
                onFriendsClick = { navController.navigate(NavRoutes.FRIENDS) },
                onProfileClick = { navigationStateManager.navigateToProfile() }
            )
        }

        composable(NavRoutes.PROFILE) {
            ProfileScreen(
                authViewModel = authViewModel,
                profileViewModel = profileViewModel,
                actions = ProfileScreenActions(
                    onBackClick = { navigationStateManager.navigateBack() },
                    onManageProfileClick = { navigationStateManager.navigateToManageProfile() },
                    onAccountDeleted = { navigationStateManager.handleAccountDeletion() },
                    onLogout = { navigationStateManager.handleLogout() },
                    onMapClick = { navController.navigate(NavRoutes.MAIN) {
                        popUpTo(NavRoutes.MAIN) { inclusive = true }
                    } },
                    onSearchClick = { navController.navigate(NavRoutes.SEARCH_PINS) },
                    onFriendsClick = { navController.navigate(NavRoutes.FRIENDS) },
                    onBadgesClick = { navController.navigate(NavRoutes.BADGES) }
                )
            )
        }

        composable(NavRoutes.MANAGE_PROFILE) {
            ManageProfileScreen(
                profileViewModel = profileViewModel,
                onBackClick = { navigationStateManager.navigateBack() },
                onPrivacySettingsClick = { navigationStateManager.navigateToPrivacySettings() }
            )
        }

        composable(NavRoutes.PRIVACY_SETTINGS) {
            PrivacySettingsScreen(
                profileViewModel = profileViewModel,
                onBackClick = { navigationStateManager.navigateBack() }
            )
        }

        composable(
            route = NavRoutes.FRIEND_PROFILE,
            arguments = listOf(
                navArgument("friendId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val friendId = backStackEntry.arguments?.getString("friendId") ?: ""
            FriendProfileScreen(
                friendId = friendId,
                onBackClick = { navController.popBackStack() }
            )
        }

        composable(NavRoutes.CREATE_PIN) {
            val pinViewModel: PinViewModel = hiltViewModel()
            val navBackStackEntry = remember(it) { navController.getBackStackEntry(NavRoutes.CREATE_PIN) }
            val savedStateHandle = navBackStackEntry.savedStateHandle
            
            // Get location from saved state
            val selectedLat = savedStateHandle.get<Double>("selected_lat")
            val selectedLng = savedStateHandle.get<Double>("selected_lng")
            val currentLocation = if (selectedLat != null && selectedLng != null) {
                Pair(selectedLat, selectedLng)
            } else null
            
            CreatePinScreen(
                pinViewModel = pinViewModel,
                currentLocation = currentLocation,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onPickLocationClick = {
                    navController.navigate(NavRoutes.PICK_LOCATION)
                }
            )
        }

        composable(NavRoutes.PICK_LOCATION) {
            val createPinBackStackEntry = remember(it) { navController.getBackStackEntry(NavRoutes.CREATE_PIN) }
            val savedStateHandle = createPinBackStackEntry.savedStateHandle
            
            // Get initial location if already selected
            val initialLat = savedStateHandle.get<Double>("selected_lat")
            val initialLng = savedStateHandle.get<Double>("selected_lng")
            val initialLocation = if (initialLat != null && initialLng != null) {
                LatLng(initialLat, initialLng)
            } else null
            
            LocationPickerScreen(
                initialLocation = initialLocation,
                onLocationSelected = { latLng ->
                    // Save to CreatePin screen's saved state
                    savedStateHandle["selected_lat"] = latLng.latitude
                    savedStateHandle["selected_lng"] = latLng.longitude
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        // Edit Pin Screen
        composable(
            route = NavRoutes.EDIT_PIN,
            arguments = listOf(navArgument("pinId") { type = NavType.StringType })
        ) { backStackEntry ->
            val pinId = backStackEntry.arguments?.getString("pinId") ?: return@composable
            val pinViewModel: PinViewModel = hiltViewModel()
            
            EditPinScreen(
                pinId = pinId,
                pinViewModel = pinViewModel,
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}