package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import com.cpen321.usermanagement.data.remote.dto.User
import com.cpen321.usermanagement.ui.viewmodels.AdminViewModel
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminManageUsersScreen(
    adminViewModel: AdminViewModel,
    onBackClick: () -> Unit
) {
    val adminUiState by adminViewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    
    var showActionDialog by remember { mutableStateOf(false) }
    var selectedUser by remember { mutableStateOf<User?>(null) }
    var actionType by remember { mutableStateOf<UserAction>(UserAction.SUSPEND) }
    
    // System UI colors
    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
    }
    
    // Load users on first composition
    LaunchedEffect(Unit) {
        adminViewModel.loadAllUsers()
    }
    
    // Show success/error messages
    LaunchedEffect(adminUiState.successMessage) {
        adminUiState.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            adminViewModel.clearSuccessMessage()
        }
    }
    
    LaunchedEffect(adminUiState.error) {
        adminUiState.error?.let {
            snackbarHostState.showSnackbar(it)
            adminViewModel.clearError()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "User Management",
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1A1A2E)
                )
            )
        },
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = Color(0xFF4A90E2),
                    contentColor = Color.White
                )
            }
        },
        containerColor = Color(0xFF16213E)
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (adminUiState.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = Color(0xFF4A90E2)
                )
            } else {
                // Filter out admins from the list
                val nonAdminUsers = adminUiState.users.filter { !it.isAdmin }
                
                if (nonAdminUsers.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.People,
                            contentDescription = null,
                            tint = Color(0xFF666666),
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "No Users Found",
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Users will appear here",
                            color = Color(0xFF999999),
                            fontSize = 14.sp
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Header with count
                        item {
                            Text(
                                text = "${nonAdminUsers.size} Users",
                                color = Color.White,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                        }
                        
                        items(nonAdminUsers) { user ->
                            UserManagementCard(
                                user = user,
                                onSuspendClick = {
                                    selectedUser = user
                                    actionType = UserAction.SUSPEND
                                    showActionDialog = true
                                },
                                onUnsuspendClick = {
                                    selectedUser = user
                                    actionType = UserAction.UNSUSPEND
                                    showActionDialog = true
                                },
                                onDeleteClick = {
                                    selectedUser = user
                                    actionType = UserAction.DELETE
                                    showActionDialog = true
                                }
                            )
                        }
                    }
                }
            }
        }
    }
    
    // Action confirmation dialog
    if (showActionDialog && selectedUser != null) {
        UserActionDialog(
            user = selectedUser!!,
            actionType = actionType,
            onConfirm = {
                when (actionType) {
                    UserAction.SUSPEND -> adminViewModel.suspendUser(selectedUser!!._id)
                    UserAction.UNSUSPEND -> adminViewModel.unsuspendUser(selectedUser!!._id)
                    UserAction.DELETE -> adminViewModel.deleteUser(selectedUser!!._id)
                }
                showActionDialog = false
                selectedUser = null
            },
            onDismiss = {
                showActionDialog = false
                selectedUser = null
            }
        )
    }
}

@Composable
private fun UserManagementCard(
    user: User,
    onSuspendClick: () -> Unit,
    onUnsuspendClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (user.isSuspended) Color(0xFF2E1A1A) else Color(0xFF1A1A2E)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Profile Picture
            SubcomposeAsyncImage(
                model = user.profilePicture,
                contentDescription = "Profile picture",
                modifier = Modifier.size(56.dp),
                loading = {
                    CircularProgressIndicator(
                        color = Color(0xFF4A90E2),
                        modifier = Modifier.size(24.dp)
                    )
                },
                error = {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(56.dp)
                    )
                }
            )
            
            // User Info
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = user.name,
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (user.isSuspended) {
                        Surface(
                            shape = MaterialTheme.shapes.small,
                            color = Color(0xFFE74C3C).copy(alpha = 0.2f)
                        ) {
                            Text(
                                text = "SUSPENDED",
                                color = Color(0xFFE74C3C),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = "@${user.username}",
                    color = Color(0xFF4A90E2),
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                
                Spacer(modifier = Modifier.height(2.dp))
                
                Text(
                    text = user.email,
                    color = Color(0xFF999999),
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            
            // Action Buttons
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Suspend/Unsuspend Button
                IconButton(
                    onClick = if (user.isSuspended) onUnsuspendClick else onSuspendClick,
                    colors = IconButtonDefaults.iconButtonColors(
                        contentColor = if (user.isSuspended) Color(0xFF2ECC71) else Color(0xFFF39C12)
                    )
                ) {
                    Icon(
                        imageVector = if (user.isSuspended) Icons.Default.Check else Icons.Default.Block,
                        contentDescription = if (user.isSuspended) "Unsuspend User" else "Suspend User"
                    )
                }
                
                // Delete Button
                IconButton(
                    onClick = onDeleteClick,
                    colors = IconButtonDefaults.iconButtonColors(
                        contentColor = Color(0xFFE74C3C)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Delete User"
                    )
                }
            }
        }
    }
}

@Composable
private fun UserActionDialog(
    user: User,
    actionType: UserAction,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    val (title, message, confirmText, confirmColor) = when (actionType) {
        UserAction.SUSPEND -> Tuple4(
            "Suspend User?",
            "Are you sure you want to suspend \"${user.name}\"? They will not be able to access the app.",
            "Suspend",
            Color(0xFFF39C12)
        )
        UserAction.UNSUSPEND -> Tuple4(
            "Unsuspend User?",
            "Are you sure you want to unsuspend \"${user.name}\"? They will regain access to the app.",
            "Unsuspend",
            Color(0xFF2ECC71)
        )
        UserAction.DELETE -> Tuple4(
            "Delete User?",
            "Are you sure you want to permanently delete \"${user.name}\"? This action cannot be undone.",
            "Delete",
            Color(0xFFE74C3C)
        )
    }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(text = title, color = Color.White)
        },
        text = {
            Text(text = message, color = Color(0xFFCCCCCC))
        },
        confirmButton = {
            TextButton(
                onClick = onConfirm,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = confirmColor
                )
            ) {
                Text(confirmText)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = Color.White)
            }
        },
        containerColor = Color(0xFF1A1A2E)
    )
}

private enum class UserAction {
    SUSPEND, UNSUSPEND, DELETE
}

private data class Tuple4<T1, T2, T3, T4>(
    val first: T1,
    val second: T2,
    val third: T3,
    val fourth: T4
)

