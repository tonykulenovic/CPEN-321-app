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
import com.cpen321.usermanagement.ui.screens.AuthScreen
import com.cpen321.usermanagement.ui.screens.BadgesScreen
import com.cpen321.usermanagement.ui.screens.FriendProfileScreen
import com.cpen321.usermanagement.ui.screens.FriendsScreen
import com.cpen321.usermanagement.ui.screens.LoadingScreen
import com.cpen321.usermanagement.ui.screens.MainScreen
import com.cpen321.usermanagement.ui.screens.ManageProfileScreen
import com.cpen321.usermanagement.ui.screens.ProfileCompletionScreen
import com.cpen321.usermanagement.ui.screens.ProfileScreen
import com.cpen321.usermanagement.ui.screens.ProfileScreenActions
import com.cpen321.usermanagement.ui.viewmodels.AuthViewModel
import com.cpen321.usermanagement.ui.viewmodels.FriendsViewModel
import com.cpen321.usermanagement.ui.viewmodels.MainViewModel
import com.cpen321.usermanagement.ui.viewmodels.NavigationViewModel
import com.cpen321.usermanagement.ui.viewmodels.ProfileViewModel
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition

object NavRoutes {
    const val LOADING = "loading"
    const val AUTH = "auth"
    const val MAIN = "main"
    const val PROFILE = "profile"
    const val MANAGE_PROFILE = "manage_profile"
    const val PROFILE_COMPLETION = "profile_completion"
    const val FRIENDS = "friends"
    const val BADGES = "badges"
    const val FRIEND_PROFILE = "friend_profile/{friendId}"

    // Helper function to create route with parameter
    fun friendProfile(friendId: String) = "friend_profile/$friendId"
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
            MainScreen(
                mainViewModel = mainViewModel,
                onProfileClick = { navigationStateManager.navigateToProfile() },
                onMapClick = { navController.navigate(NavRoutes.MAIN) {
                    popUpTo(NavRoutes.MAIN) { inclusive = true }
                } },
                onFriendsClick = { navController.navigate(NavRoutes.FRIENDS) },
                onBadgesClick = { navController.navigate(NavRoutes.BADGES) }
            )
        }

        composable(NavRoutes.FRIENDS) {
            val friendsViewModel: FriendsViewModel = hiltViewModel()
            FriendsScreen(
                friendsViewModel = friendsViewModel,
                onMapClick = { navController.navigate(NavRoutes.MAIN) {
                    popUpTo(NavRoutes.MAIN) { inclusive = true }
                } },
                onProfileClick = { navigationStateManager.navigateToProfile() },
                onBadgesClick = { navController.navigate(NavRoutes.BADGES) },
                onViewFriendProfile = { friendId ->
                    navController.navigate(NavRoutes.friendProfile(friendId))
                }
            )
        }

        composable(NavRoutes.BADGES) {
            BadgesScreen(
                profileViewModel = profileViewModel,
                onMapClick = { navController.navigate(NavRoutes.MAIN) {
                    popUpTo(NavRoutes.MAIN) { inclusive = true }
                } },
                onSearchClick = { /* TODO: Add search screen later */ },
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
                    onFriendsClick = { navController.navigate(NavRoutes.FRIENDS) },
                    onBadgesClick = { navController.navigate(NavRoutes.BADGES) }
                )
            )
        }

        composable(NavRoutes.MANAGE_PROFILE) {
            ManageProfileScreen(
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
    }
}