package com.cpen321.usermanagement.ui.screens

import Button
import Icon
import MenuButtonItem
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.cpen321.usermanagement.R
import com.cpen321.usermanagement.ui.components.MessageSnackbar
import com.cpen321.usermanagement.ui.components.MessageSnackbarState
import com.cpen321.usermanagement.ui.viewmodels.AuthViewModel
import com.cpen321.usermanagement.ui.viewmodels.ProfileUiState
import com.cpen321.usermanagement.ui.viewmodels.ProfileViewModel
import com.cpen321.usermanagement.ui.theme.LocalSpacing
import androidx.compose.foundation.layout.height
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import androidx.compose.runtime.SideEffect
import androidx.compose.material.icons.filled.EmojiEvents

private data class ProfileDialogState(
    val showDeleteDialog: Boolean = false
)

data class ProfileScreenActions(
    val onBackClick: () -> Unit = {},
    val onManageProfileClick: () -> Unit = {},
    val onAccountDeleted: () -> Unit = {},
    val onLogout: () -> Unit = {},
    val onMapClick: () -> Unit = {},
    val onFriendsClick: () -> Unit = {},
    val onBadgesClick: () -> Unit = {}
)

private data class ProfileScreenCallbacks(
    val onBackClick: () -> Unit,
    val onManageProfileClick: () -> Unit,
    val onDeleteAccountClick: () -> Unit,
    val onDeleteDialogDismiss: () -> Unit,
    val onDeleteDialogConfirm: () -> Unit,
    val onLogoutClick: () -> Unit,
    val onSuccessMessageShown: () -> Unit,
    val onErrorMessageShown: () -> Unit,
    val onMapClick: () -> Unit,
    val onFriendsClick: () -> Unit,
    val onBadgesClick: () -> Unit
)

@Composable
fun ProfileScreen(
    authViewModel: AuthViewModel,
    profileViewModel: ProfileViewModel,
    actions: ProfileScreenActions
) {
    val uiState by profileViewModel.uiState.collectAsState()
    val snackBarHostState = remember { SnackbarHostState() }

    // Set status bar appearance
    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
    }

    // Dialog state
    var dialogState by remember {
        mutableStateOf(ProfileDialogState())
    }

    // Side effects
    LaunchedEffect(Unit) {
        profileViewModel.clearSuccessMessage()
        profileViewModel.clearError()
    }

    ProfileContent(
        uiState = uiState,
        dialogState = dialogState,
        snackBarHostState = snackBarHostState,
        callbacks = ProfileScreenCallbacks(
            onBackClick = actions.onBackClick,
            onManageProfileClick = actions.onManageProfileClick,
            onDeleteAccountClick = {
                dialogState = dialogState.copy(showDeleteDialog = true)
            },
            onDeleteDialogDismiss = {
                dialogState = dialogState.copy(showDeleteDialog = false)
            },
            onDeleteDialogConfirm = {
                dialogState = dialogState.copy(showDeleteDialog = false)
                authViewModel.handleAccountDeletion()
                actions.onAccountDeleted()
            },
            onLogoutClick = {
                authViewModel.handleLogout()
                actions.onLogout()
            },
            onSuccessMessageShown = profileViewModel::clearSuccessMessage,
            onErrorMessageShown = profileViewModel::clearError,
            onMapClick = actions.onMapClick,
            onFriendsClick = actions.onFriendsClick,
            onBadgesClick = actions.onBadgesClick
        )
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileContent(
    uiState: ProfileUiState,
    dialogState: ProfileDialogState,
    snackBarHostState: SnackbarHostState,
    callbacks: ProfileScreenCallbacks,
    modifier: Modifier = Modifier
) {
    var selectedItem by remember { mutableIntStateOf(4) } // Profile is selected (index 4)
    
    Scaffold(
        modifier = modifier,
        topBar = {
            ProfileTopBar()
        },
        bottomBar = {
            BottomNavigationBar(
                selectedItem = selectedItem,
                onItemSelected = { index ->
                    selectedItem = index
                    when (index) {
                        0 -> callbacks.onMapClick() // Map button
                        1 -> {} // Search - not implemented yet
                        2 -> callbacks.onBadgesClick() // Badges button - ADD THIS
                        3 -> callbacks.onFriendsClick() // Friends button
                        4 -> { /* Already on profile */ }
                    }
                }
            )
        },
        containerColor = Color(0xFF0F1419),
        snackbarHost = {
            MessageSnackbar(
                hostState = snackBarHostState,
                messageState = MessageSnackbarState(
                    successMessage = uiState.successMessage,
                    errorMessage = uiState.errorMessage,
                    onSuccessMessageShown = callbacks.onSuccessMessageShown,
                    onErrorMessageShown = callbacks.onErrorMessageShown
                )
            )
        }
    ) { paddingValues ->
        ProfileBody(
            paddingValues = paddingValues,
            isLoading = uiState.isLoadingProfile,
            onManageProfileClick = callbacks.onManageProfileClick,
            onDeleteAccountClick = callbacks.onDeleteAccountClick,
            onLogoutClick = callbacks.onLogoutClick
        )
    }

    if (dialogState.showDeleteDialog) {
        DeleteAccountDialog(
            onDismiss = callbacks.onDeleteDialogDismiss,
            onConfirm = callbacks.onDeleteDialogConfirm
        )
    }
}

@Composable
private fun BottomNavigationBar(
    selectedItem: Int,
    onItemSelected: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationBar(
        modifier = modifier.height(72.dp),
        containerColor = Color(0xFF1A1A2E),
        contentColor = Color.White
    ) {
        // Map button
        NavigationBarItem(
            selected = selectedItem == 0,
            onClick = { onItemSelected(0) },
            icon = {
                Icon(
                    imageVector = Icons.Filled.LocationOn,
                    contentDescription = "Map",
                    modifier = Modifier.size(30.dp)
                )
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = Color(0xFF4A90E2),
                unselectedIconColor = Color(0xFFB0B0B0),
                indicatorColor = Color.Transparent
            )
        )
        
        // Search button
        NavigationBarItem(
            selected = selectedItem == 1,
            onClick = { onItemSelected(1) },
            icon = {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = "Search",
                    modifier = Modifier.size(30.dp)
                )
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = Color(0xFF4A90E2),
                unselectedIconColor = Color(0xFFB0B0B0),
                indicatorColor = Color.Transparent
            )
        )
        
        // Badge button
        NavigationBarItem(
            selected = selectedItem == 2,
            onClick = { onItemSelected(2) },
            icon = {
                Icon(
                    imageVector = Icons.Filled.EmojiEvents,
                    contentDescription = "Badges",
                    modifier = Modifier.size(30.dp)
                )
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = Color(0xFF4A90E2),
                unselectedIconColor = Color(0xFFB0B0B0),
                indicatorColor = Color.Transparent
            )
        )
        
        // Friends button
        NavigationBarItem(
            selected = selectedItem == 3,
            onClick = { onItemSelected(3) },
            icon = {
                Icon(
                    imageVector = Icons.Filled.Group,
                    contentDescription = "Friends",
                    modifier = Modifier.size(30.dp)
                )
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = Color(0xFF4A90E2),
                unselectedIconColor = Color(0xFFB0B0B0),
                indicatorColor = Color.Transparent
            )
        )
        
        // Profile button
        NavigationBarItem(
            selected = selectedItem == 4,
            onClick = { onItemSelected(4) },
            icon = {
                Icon(
                    imageVector = Icons.Filled.Person,
                    contentDescription = "Profile",
                    modifier = Modifier.size(30.dp)
                )
            },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = Color(0xFF4A90E2),
                unselectedIconColor = Color(0xFFB0B0B0),
                indicatorColor = Color.Transparent
            )
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileTopBar(
    modifier: Modifier = Modifier
) {
    TopAppBar(
        modifier = modifier.height(98.dp),
        title = {
            Text(
                text = stringResource(R.string.profile),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Start,
                color = Color.White
            )
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Color(0xFF1A1A2E),
            titleContentColor = Color.White
        )
    )
}

@Composable
private fun ProfileBody(
    paddingValues: PaddingValues,
    isLoading: Boolean,
    onManageProfileClick: () -> Unit,
    onDeleteAccountClick: () -> Unit,
    onLogoutClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(paddingValues)
    ) {
        when {
            isLoading -> {
                LoadingIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            }

            else -> {
                ProfileMenuItems(
                    onManageProfileClick = onManageProfileClick,
                    onDeleteAccountClick = onDeleteAccountClick,
                    onLogoutClick = onLogoutClick
                )
            }
        }
    }
}

@Composable
private fun ProfileMenuItems(
    onManageProfileClick: () -> Unit,
    onDeleteAccountClick: () -> Unit,
    onLogoutClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val spacing = LocalSpacing.current
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(spacing.large)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(spacing.medium)
    ) {
        ProfileSection(
            onManageProfileClick = onManageProfileClick
        )

        AccountSection(
            onDeleteAccountClick = onDeleteAccountClick,
            onLogoutClick = onLogoutClick
        )
    }
}

@Composable
private fun ProfileSection(
    onManageProfileClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(LocalSpacing.current.medium)
    ) {
        ManageProfileButton(onClick = onManageProfileClick)
    }
}

@Composable
private fun AccountSection(
    onDeleteAccountClick: () -> Unit,
    onLogoutClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(LocalSpacing.current.medium)
    ) {
        LogoutButton(onClick = onLogoutClick)
        DeleteAccountButton(onClick = onDeleteAccountClick)
    }
}

@Composable
private fun ManageProfileButton(
    onClick: () -> Unit,
) {
    MenuButtonItem(
        text = stringResource(R.string.manage_profile),
        iconRes = R.drawable.ic_manage_profile,
        onClick = onClick,
    )
}

@Composable
private fun DeleteAccountButton(
    onClick: () -> Unit,
) {
    MenuButtonItem(
        text = stringResource(R.string.delete_account),
        iconRes = R.drawable.ic_delete_forever,
        onClick = onClick,
    )
}

@Composable
private fun LogoutButton(
    onClick: () -> Unit,
) {
    MenuButtonItem(
        text = stringResource(R.string.logout),
        iconRes = R.drawable.ic_sign_out,
        onClick = onClick,
    )
}

@Composable
private fun DeleteAccountDialog(
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    modifier: Modifier = Modifier
) {
    AlertDialog(
        modifier = modifier,
        onDismissRequest = onDismiss,
        title = {
            DeleteDialogTitle()
        },
        text = {
            DeleteDialogText()
        },
        confirmButton = {
            DeleteDialogConfirmButton(onClick = onConfirm)
        },
        dismissButton = {
            DeleteDialogDismissButton(onClick = onDismiss)
        }
    )
}

@Composable
private fun DeleteDialogTitle(
    modifier: Modifier = Modifier
) {
    Text(
        text = stringResource(R.string.delete_account),
        style = MaterialTheme.typography.headlineSmall,
        fontWeight = FontWeight.Bold,
        modifier = modifier
    )
}

@Composable
private fun DeleteDialogText(
    modifier: Modifier = Modifier
) {
    Text(
        text = stringResource(R.string.delete_account_confirmation),
        modifier = modifier
    )
}

@Composable
private fun DeleteDialogConfirmButton(
    onClick: () -> Unit,
) {
    Button(
        fullWidth = false,
        onClick = onClick,
    ) {
        Text(stringResource(R.string.confirm))
    }
}

@Composable
private fun DeleteDialogDismissButton(
    onClick: () -> Unit,
) {
    Button(
        fullWidth = false,
        type = "secondary",
        onClick = onClick,
    ) {
        Text(stringResource(R.string.cancel))
    }
}

@Composable
private fun LoadingIndicator(
    modifier: Modifier = Modifier
) {
    CircularProgressIndicator(modifier = modifier)
}