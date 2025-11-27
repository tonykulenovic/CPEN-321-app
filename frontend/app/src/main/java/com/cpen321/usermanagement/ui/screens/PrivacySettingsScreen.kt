package com.cpen321.usermanagement.ui.screens

import Button
import Icon
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.cpen321.usermanagement.R
import com.cpen321.usermanagement.data.remote.dto.LocationPrivacy
import com.cpen321.usermanagement.data.remote.dto.PrivacySettings
import com.cpen321.usermanagement.data.remote.dto.UpdatePrivacyRequest
import com.cpen321.usermanagement.ui.components.MessageSnackbar
import com.cpen321.usermanagement.ui.components.MessageSnackbarState
import com.cpen321.usermanagement.ui.viewmodels.ProfileViewModel
import com.cpen321.usermanagement.ui.theme.LocalSpacing
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import androidx.compose.runtime.SideEffect

data class PrivacySettingsState(
    val profileVisibleTo: String = "friends",
    val showBadgesTo: String = "friends", 
    val locationSharing: String = "off",
    val locationPrecision: Int = 30,
    val allowFriendRequestsFrom: String = "everyone"
) {
    fun toUpdatePrivacyRequest(): UpdatePrivacyRequest {
        return UpdatePrivacyRequest(
            profileVisibleTo = profileVisibleTo,
            showBadgesTo = showBadgesTo,
            location = LocationPrivacy(locationSharing, locationPrecision),
            allowFriendRequestsFrom = allowFriendRequestsFrom
        )
    }
}

@Composable
fun PrivacySettingsScreen(
    profileViewModel: ProfileViewModel = viewModel(),
    onBackClick: () -> Unit
) {
    val uiState by profileViewModel.uiState.collectAsState()
    val snackBarHostState = remember { SnackbarHostState() }
    
    // Set status bar to match top bar (purple) and navigation bar to match screen background
    val systemUiController = rememberSystemUiController()
    SideEffect {
        // Top bar (status bar) - purple to match TopAppBar
        systemUiController.setStatusBarColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
        // Bottom bar (navigation bar) - match screen background
        systemUiController.setNavigationBarColor(
            color = Color(0xFF0F1419),
            darkIcons = false,
            navigationBarContrastEnforced = false
        )
    }

    // Privacy settings state
    var privacySettings by remember {
        mutableStateOf(PrivacySettingsState())
    }

    // Initialize privacy settings from user data
    LaunchedEffect(uiState.user) {
        uiState.user?.privacy?.let { privacy ->
            privacySettings = PrivacySettingsState(
                profileVisibleTo = privacy.profileVisibleTo,
                showBadgesTo = privacy.showBadgesTo,
                locationSharing = privacy.location.sharing,
                locationPrecision = privacy.location.precisionMeters,
                allowFriendRequestsFrom = privacy.allowFriendRequestsFrom
            )
        }
    }

    // Load profile if not already loaded
    LaunchedEffect(Unit) {
        if (uiState.user == null) {
            profileViewModel.loadProfile()
        }
    }

    PrivacySettingsContent(
        privacySettings = privacySettings,
        onPrivacySettingsChange = { privacySettings = it },
        onSaveClick = {
            profileViewModel.updatePrivacy(privacySettings.toUpdatePrivacyRequest())
        },
        onBackClick = onBackClick,
        snackBarHostState = snackBarHostState,
        uiState = uiState,
        onSuccessMessageShown = profileViewModel::clearSuccessMessage,
        onErrorMessageShown = profileViewModel::clearError
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PrivacySettingsContent(
    privacySettings: PrivacySettingsState,
    onPrivacySettingsChange: (PrivacySettingsState) -> Unit,
    onSaveClick: () -> Unit,
    onBackClick: () -> Unit,
    snackBarHostState: SnackbarHostState,
    uiState: com.cpen321.usermanagement.ui.viewmodels.ProfileUiState,
    onSuccessMessageShown: () -> Unit,
    onErrorMessageShown: () -> Unit
) {
    Scaffold(
        topBar = {
            PrivacyTopBar(onBackClick = onBackClick)
        },
        containerColor = Color(0xFF0F1419),
        snackbarHost = {
            MessageSnackbar(
                hostState = snackBarHostState,
                messageState = MessageSnackbarState(
                    successMessage = uiState.successMessage,
                    errorMessage = uiState.errorMessage,
                    onSuccessMessageShown = onSuccessMessageShown,
                    onErrorMessageShown = onErrorMessageShown
                )
            )
        }
    ) { paddingValues ->
        PrivacySettingsBody(
            paddingValues = paddingValues,
            privacySettings = privacySettings,
            onPrivacySettingsChange = onPrivacySettingsChange,
            onSaveClick = onSaveClick,
            isSaving = uiState.isSavingProfile
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PrivacyTopBar(
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    TopAppBar(
        modifier = modifier,
        title = {
            Text(
                text = "Privacy Settings",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Medium,
                color = Color.White
            )
        },
        navigationIcon = {
            IconButton(onClick = onBackClick) {
                Icon(
                    name = R.drawable.ic_arrow_back,
                    type = "light"
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Color(0xFF1A1A2E),
            titleContentColor = Color.White
        )
    )
}

@Composable
private fun PrivacySettingsBody(
    paddingValues: PaddingValues,
    privacySettings: PrivacySettingsState,
    onPrivacySettingsChange: (PrivacySettingsState) -> Unit,
    onSaveClick: () -> Unit,
    isSaving: Boolean
) {
    val spacing = LocalSpacing.current
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues)
            .padding(spacing.large)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(spacing.large)
    ) {
        // Location Sharing Section
        PrivacySection(
            title = "Location Sharing",
            description = "Control who can see your location"
        ) {
            LocationSharingSettings(
                currentSetting = privacySettings.locationSharing,
                onSettingChange = { newSetting ->
                    onPrivacySettingsChange(
                        privacySettings.copy(locationSharing = newSetting)
                    )
                }
            )
        }

        // Profile Visibility Section
        PrivacySection(
            title = "Profile Visibility",
            description = "Control who can see your profile"
        ) {
            VisibilitySettings(
                currentSetting = privacySettings.profileVisibleTo,
                onSettingChange = { newSetting ->
                    onPrivacySettingsChange(
                        privacySettings.copy(profileVisibleTo = newSetting)
                    )
                }
            )
        }

        // Badge Visibility Section
        PrivacySection(
            title = "Badge Visibility", 
            description = "Control who can see your badges"
        ) {
            VisibilitySettings(
                currentSetting = privacySettings.showBadgesTo,
                onSettingChange = { newSetting ->
                    onPrivacySettingsChange(
                        privacySettings.copy(showBadgesTo = newSetting)
                    )
                }
            )
        }

        // Friend Requests Section
        PrivacySection(
            title = "Friend Requests",
            description = "Control who can send you friend requests"
        ) {
            FriendRequestSettings(
                currentSetting = privacySettings.allowFriendRequestsFrom,
                onSettingChange = { newSetting ->
                    onPrivacySettingsChange(
                        privacySettings.copy(allowFriendRequestsFrom = newSetting)
                    )
                }
            )
        }

        Spacer(modifier = Modifier.height(spacing.medium))

        // Save Button
        Button(
            onClick = onSaveClick,
            enabled = !isSaving,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isSaving) {
                CircularProgressIndicator(
                    modifier = Modifier.size(spacing.medium),
                    color = MaterialTheme.colorScheme.onPrimary,
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(spacing.small))
            }
            Text(
                text = if (isSaving) "Saving..." else "Save Settings",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun PrivacySection(
    title: String,
    description: String,
    content: @Composable () -> Unit
) {
    val spacing = LocalSpacing.current

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A1A2E)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(spacing.large)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                color = Color.White
            )
            
            Text(
                text = description,
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF8B9DAF),
                modifier = Modifier.padding(bottom = spacing.medium)
            )
            
            content()
        }
    }
}

@Composable
private fun LocationSharingSettings(
    currentSetting: String,
    onSettingChange: (String) -> Unit
) {
    val options = listOf(
        "off" to "Off - Don't share location",
        "approximate" to "Approximate - Share general area",
        "live" to "Live - Share exact location"
    )

    Column(
        modifier = Modifier.selectableGroup()
    ) {
        options.forEach { (value, label) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = currentSetting == value,
                        onClick = { onSettingChange(value) },
                        role = Role.RadioButton
                    )
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(
                    selected = currentSetting == value,
                    onClick = null,
                    colors = RadioButtonDefaults.colors(
                        selectedColor = Color(0xFF4A90E2),
                        unselectedColor = Color(0xFF8B9DAF)
                    )
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White
                )
            }
        }
    }
}

@Composable
private fun VisibilitySettings(
    currentSetting: String,
    onSettingChange: (String) -> Unit
) {
    val options = listOf(
        "private" to "Private - Only me",
        "friends" to "Friends - Friends only", 
        "everyone" to "Everyone - Public"
    )

    Column(
        modifier = Modifier.selectableGroup()
    ) {
        options.forEach { (value, label) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = currentSetting == value,
                        onClick = { onSettingChange(value) },
                        role = Role.RadioButton
                    )
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(
                    selected = currentSetting == value,
                    onClick = null,
                    colors = RadioButtonDefaults.colors(
                        selectedColor = Color(0xFF4A90E2),
                        unselectedColor = Color(0xFF8B9DAF)
                    )
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White
                )
            }
        }
    }
}

@Composable
private fun FriendRequestSettings(
    currentSetting: String,
    onSettingChange: (String) -> Unit
) {
    val options = listOf(
        "noOne" to "No one - Block all requests",
        "friendsOfFriends" to "Friends of friends",
        "everyone" to "Everyone"
    )

    Column(
        modifier = Modifier.selectableGroup()
    ) {
        options.forEach { (value, label) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(
                        selected = currentSetting == value,
                        onClick = { onSettingChange(value) },
                        role = Role.RadioButton
                    )
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(
                    selected = currentSetting == value,
                    onClick = null,
                    colors = RadioButtonDefaults.colors(
                        selectedColor = Color(0xFF4A90E2),
                        unselectedColor = Color(0xFF8B9DAF)
                    )
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color.White
                )
            }
        }
    }
}