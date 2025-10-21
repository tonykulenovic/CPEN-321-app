package com.cpen321.usermanagement.ui.screens

import Button
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cpen321.usermanagement.ui.theme.LocalSpacing
import kotlinx.coroutines.launch
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import androidx.compose.runtime.SideEffect
import com.cpen321.usermanagement.ui.screens.BadgesScreen
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.runtime.DisposableEffect
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.compose.material.icons.filled.PersonAddAlt
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.runtime.collectAsState
import com.cpen321.usermanagement.ui.viewmodels.FriendsViewModel
import com.cpen321.usermanagement.data.remote.dto.UserSearchResult
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.LaunchedEffect
import com.cpen321.usermanagement.ui.components.MessageSnackbar
import com.cpen321.usermanagement.ui.components.MessageSnackbarState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.material.icons.filled.Schedule

// Data class for friends
data class Friend(
    val id: String,
    val name: String,
    val email: String,
    val isOnline: Boolean,
    val profilePictureUrl: String? = null
)

// Update the Friend data class to support friend requests
data class FriendRequest(
    val id: String,
    val name: String,
    val email: String,
    val profilePictureUrl: String? = null,
    val requestedAt: String = "2 hours ago"  // Mock timestamp
)

@Composable
fun FriendsScreen(
    friendsViewModel: FriendsViewModel = hiltViewModel(),  // ADD ViewModel
    onMapClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onBadgesClick: () -> Unit = {},
    onViewFriendProfile: (String) -> Unit = {}
) {
    var selectedItem by remember { mutableIntStateOf(3) } // Friends tab selected
    var searchQuery by remember { mutableStateOf("") }
    var showAddFriendSheet by remember { mutableStateOf(false) }
    var showFriendRequestsSheet by remember { mutableStateOf(false) }
    val snackBarHostState = remember { SnackbarHostState() }  // ADD THIS
    
    // Get state from ViewModel (CHANGED: Replace mock data)
    val uiState by friendsViewModel.uiState.collectAsState()
    
    // ADD THIS - Show snackbar for success/error messages
    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let {
            snackBarHostState.showSnackbar(it)
            friendsViewModel.clearSuccessMessage()
        }
    }
    
    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            snackBarHostState.showSnackbar(it)
            friendsViewModel.clearError()
        }
    }
    
    // Convert backend data to UI models
    val friends = remember(uiState.friends) {
        uiState.friends.map { friendSummary ->
            Friend(
                id = friendSummary.userId,
                name = friendSummary.displayName,
                email = friendSummary.bio ?: "", // Using bio as placeholder for email
                isOnline = false, // TODO: Add real-time status from backend
                profilePictureUrl = friendSummary.photoUrl
            )
        }
    }
    
    val friendRequests = remember(uiState.friendRequests) {
        uiState.friendRequests.map { requestSummary ->
            FriendRequest(
                id = requestSummary._id,
                name = requestSummary.from.displayName,
                email = "", // Not provided by backend
                profilePictureUrl = requestSummary.from.photoUrl,
                requestedAt = requestSummary.createdAt
            )
        }
    }
    
    val filteredFriends = remember(searchQuery, friends) {
        if (searchQuery.isBlank()) {
            friends
        } else {
            friends.filter {
                it.name.contains(searchQuery, ignoreCase = true) ||
                it.email.contains(searchQuery, ignoreCase = true)
            }
        }
    }

    // Set status bar appearance
    val systemUiController = rememberSystemUiController()
    SideEffect {
        // Set both status bar and navigation bar
        systemUiController.setStatusBarColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
        systemUiController.setNavigationBarColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
    }

    Scaffold(
        containerColor = Color(0xFF0F1419),
        topBar = {
            FriendsTopBar(
                onFriendRequestsClick = { showFriendRequestsSheet = true },
                pendingRequestsCount = friendRequests.size  // Use real count
            )
        },
        bottomBar = {
            BottomNavigationBar(
                selectedItem = selectedItem,
                onItemSelected = { index ->
                    selectedItem = index
                    when (index) {
                        0 -> onMapClick()
                        1 -> {} // Search
                        2 -> onBadgesClick()
                        3 -> {} // Already on Friends
                        4 -> onProfileClick()
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddFriendSheet = true },
                containerColor = Color(0xFF4A90E2),
                contentColor = Color.White
            ) {
                Icon(
                    imageVector = Icons.Default.PersonAdd,
                    contentDescription = "Add Friend"
                )
            }
        },
        snackbarHost = {  // ADD THIS
            MessageSnackbar(
                hostState = snackBarHostState,
                messageState = MessageSnackbarState(
                    successMessage = null,
                    errorMessage = null,
                    onSuccessMessageShown = {},
                    onErrorMessageShown = {}
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))
            
            // Search Bar
            SearchBar(
                searchQuery = searchQuery,
                onSearchQueryChange = { searchQuery = it }
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Friends List or Empty State
            if (friends.isEmpty()) {
                EmptyFriendsState(onFindFriendsClick = { showAddFriendSheet = true })
            } else {
                FriendsList(
                    friends = filteredFriends,
                    onRemoveFriend = { friendId ->
                        friendsViewModel.removeFriend(friendId)  // CHANGED: Call ViewModel
                    },
                    onViewProfile = onViewFriendProfile
                )
            }
        }
        
        // Add Friend Bottom Sheet
        if (showAddFriendSheet) {
            AddFriendBottomSheet(
                onDismiss = { showAddFriendSheet = false },
                onSendRequest = { userId ->
                    friendsViewModel.sendFriendRequest(userId)  // CHANGED: Call ViewModel
                    showAddFriendSheet = false
                }
            )
        }

        // Friend Requests Bottom Sheet
        if (showFriendRequestsSheet) {
            FriendRequestsBottomSheet(
                friendRequests = friendRequests,  // Use real data
                onDismiss = { showFriendRequestsSheet = false },
                onAcceptRequest = { requestId ->
                    friendsViewModel.acceptFriendRequest(requestId)  // CHANGED: Call ViewModel
                },
                onDeclineRequest = { requestId ->
                    friendsViewModel.declineFriendRequest(requestId)  // CHANGED: Call ViewModel
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FriendsTopBar(
    onFriendRequestsClick: () -> Unit,
    pendingRequestsCount: Int,
    modifier: Modifier = Modifier
) {
    TopAppBar(
        modifier = modifier.height(98.dp),
        title = {
            Text(
                text = "Friends",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                textAlign = TextAlign.Start
            )
        },
        actions = {
            // Friend Requests Button (keep this)
            Box {
                IconButton(onClick = onFriendRequestsClick) {
                    Icon(
                        imageVector = Icons.Default.Notifications,
                        contentDescription = "Friend Requests",
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }
                if (pendingRequestsCount > 0) {
                    Badge(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(top = 8.dp, end = 8.dp)
                    ) {
                        Text(
                            text = pendingRequestsCount.toString(),
                            fontSize = 10.sp,
                            color = Color.White
                        )
                    }
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Color(0xFF1A1A2E),
            titleContentColor = Color.White
        )
    )
}

@Composable
private fun SearchBar(
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = searchQuery,
        onValueChange = onSearchQueryChange,
        modifier = modifier
            .fillMaxWidth()
            .shadow(
                elevation = 4.dp,
                shape = RoundedCornerShape(12.dp)
            ),
        placeholder = {
            Text(
                text = "Search friends by name or email",
                color = Color(0xFF8B9DAF)
            )
        },
        leadingIcon = {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = Color(0xFF8B9DAF)
            )
        },
        trailingIcon = {
            if (searchQuery.isNotEmpty()) {
                IconButton(onClick = { onSearchQueryChange("") }) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Clear",
                        tint = Color(0xFF8B9DAF)
                    )
                }
            }
        },
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = Color(0xFF1A2332),
            unfocusedContainerColor = Color(0xFF1A2332),
            focusedTextColor = Color.White,
            unfocusedTextColor = Color.White,
            cursorColor = Color(0xFF4A90E2),
            focusedBorderColor = Color(0xFF4A90E2),
            unfocusedBorderColor = Color(0xFF4A90E2).copy(alpha = 0.5f)
        ),
        shape = RoundedCornerShape(12.dp),
        singleLine = true
    )
}

@Composable
private fun FriendsList(
    friends: List<Friend>,
    onRemoveFriend: (String) -> Unit,
    onViewProfile: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(friends) { friend ->
            FriendCard(
                friend = friend,
                onRemoveFriend = { onRemoveFriend(friend.id) },
                onViewProfile = { onViewProfile(friend.id) }
            )
        }
        
        // Bottom padding for FAB
        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

@Composable
private fun FriendCard(
    friend: Friend,
    onRemoveFriend: () -> Unit,
    onViewProfile: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showMenu by remember { mutableStateOf(false) }
    
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable { onViewProfile() },
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A2332)
        ),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Profile Picture Placeholder
            Box(
                modifier = Modifier
                    .size(50.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF4A90E2)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = friend.name.firstOrNull()?.toString() ?: "?",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            // Friend Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = friend.name,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = if (friend.isOnline) "Online" else "Offline",
                    color = if (friend.isOnline) Color(0xFF4CAF50) else Color(0xFF8B9DAF),
                    fontSize = 12.sp
                )
            }
            
            // Menu Button
            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(
                        imageVector = Icons.Default.MoreVert,
                        contentDescription = "More Options",
                        tint = Color(0xFF8B9DAF)
                    )
                }
                
                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false },
                    modifier = Modifier.background(Color(0xFF1A2332))
                ) {
                    DropdownMenuItem(
                        text = {
                            Text(
                                "View Profile",
                                color = Color.White
                            )
                        },
                        onClick = {
                            showMenu = false
                            onViewProfile()
                        }
                    )
                    DropdownMenuItem(
                        text = {
                            Text(
                                "Remove Friend",
                                color = Color(0xFFFF5252)
                            )
                        },
                        onClick = {
                            showMenu = false
                            onRemoveFriend()
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyFriendsState(
    onFindFriendsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Group,
            contentDescription = null,
            modifier = Modifier.size(120.dp),
            tint = Color(0xFF4A90E2).copy(alpha = 0.5f)
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "You haven't added any friends yet.",
            color = Color.White,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "Search or invite friends to start connecting.",
            color = Color(0xFF8B9DAF),
            fontSize = 14.sp,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(
            onClick = onFindFriendsClick,
            fullWidth = false
        ) {
            Text("Find Friends", color = Color.White)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddFriendBottomSheet(
    onDismiss: () -> Unit,
    onSendRequest: (String) -> Unit,
    modifier: Modifier = Modifier,
    friendsViewModel: FriendsViewModel = hiltViewModel()  // ADD THIS
) {
    val sheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()
    var searchQuery by remember { mutableStateOf("") }
    
    val uiState by friendsViewModel.uiState.collectAsState()
    
    // Use DisposableEffect instead of SideEffect for better persistence
    val systemUiController = rememberSystemUiController()
    DisposableEffect(Unit) {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
        
        systemUiController.setStatusBarColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
        
        onDispose {
            friendsViewModel.clearSearchResults()
            systemUiController.setSystemBarsColor(
                color = Color(0xFF1A1A2E),
                darkIcons = false
            )
        }
    }

    ModalBottomSheet(
        onDismissRequest = {
            friendsViewModel.clearSearchResults()
            onDismiss()
        },
        sheetState = sheetState,
        containerColor = Color(0xFF1A2332),
        contentColor = Color.White,
        scrimColor = Color.Black.copy(alpha = 0.6f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .imePadding()
        ) {
            Text(
                text = "Add Friend",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Search TextField
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { newQuery ->
                    searchQuery = newQuery
                    friendsViewModel.searchUsers(newQuery)
                },
                modifier = Modifier.fillMaxWidth(),
                placeholder = {
                    Text(
                        "Search by username or name",
                        color = Color(0xFF8B9DAF)
                    )
                },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = Color(0xFF8B9DAF)
                    )
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { 
                            searchQuery = ""
                            friendsViewModel.clearSearchResults()
                        }) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Clear",
                                tint = Color(0xFF8B9DAF)
                            )
                        }
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color(0xFF0F1419),
                    unfocusedContainerColor = Color(0xFF0F1419),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    cursorColor = Color(0xFF4A90E2),
                    focusedBorderColor = Color(0xFF4A90E2),
                    unfocusedBorderColor = Color(0xFF4A90E2).copy(alpha = 0.5f)
                ),
                shape = RoundedCornerShape(8.dp),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Search Results
            if (uiState.isSearching) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    androidx.compose.material3.CircularProgressIndicator(
                        color = Color(0xFF4A90E2)
                    )
                }
            } else if (uiState.searchResults.isNotEmpty()) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(300.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(uiState.searchResults.size) { index ->
                        val user = uiState.searchResults[index]
                        UserSearchResultCard(
                            user = user,
                            isPending = user._id in uiState.pendingRequestUserIds,  // ADD THIS
                            onSendRequest = {
                                scope.launch {
                                    sheetState.hide()
                                    onSendRequest(user._id)
                                    friendsViewModel.clearSearchResults()
                                }
                            }
                        )
                    }
                }
            } else if (searchQuery.isNotEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = null,
                            tint = Color(0xFF8B9DAF),
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No users found",
                            color = Color(0xFF8B9DAF),
                            fontSize = 14.sp
                        )
                    }
                }
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Start typing to search for users",
                        color = Color(0xFF8B9DAF),
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

// ADD THIS NEW COMPOSABLE
@Composable
private fun UserSearchResultCard(
    user: UserSearchResult,
    isPending: Boolean,  // ADD THIS PARAMETER
    onSendRequest: () -> Unit,
    modifier: Modifier = Modifier
) {
    // Animation state
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = tween(durationMillis = 100),
        label = "button_scale"
    )
    
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF0F1419)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // User Info
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                // Profile Picture Placeholder
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF1A2332)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = "Profile",
                        tint = Color(0xFF8B9DAF),
                        modifier = Modifier.size(24.dp)
                    )
                }
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column {
                    Text(
                        text = user.displayName,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Text(
                        text = "@${user.username}",
                        color = Color(0xFF8B9DAF),
                        fontSize = 14.sp
                    )
                }
            }
            
            // UPDATED - Conditional button based on pending status
            if (isPending) {
                // Pending state - disabled button
                androidx.compose.material3.Button(
                    onClick = { }, // No action when pending
                    enabled = false,
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                        disabledContainerColor = Color(0xFF2A3A4A).copy(alpha = 0.5f),
                        disabledContentColor = Color(0xFF8B9DAF)
                    ),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Schedule,  // Clock/pending icon
                        contentDescription = "Pending",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Pending",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            } else {
                // Active state - enabled button with animation
                androidx.compose.material3.Button(
                    onClick = {
                        isPressed = true
                        onSendRequest()
                    },
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF4A90E2),
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    modifier = Modifier.graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                    }
                ) {
                    Icon(
                        imageVector = Icons.Default.PersonAdd,
                        contentDescription = "Add Friend",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Add",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
    
    // Reset animation after delay
    LaunchedEffect(isPressed) {
        if (isPressed) {
            kotlinx.coroutines.delay(100)
            isPressed = false
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FriendRequestsBottomSheet(
    friendRequests: List<FriendRequest>,
    onDismiss: () -> Unit,
    onAcceptRequest: (String) -> Unit,
    onDeclineRequest: (String) -> Unit
) {
    val sheetState = rememberModalBottomSheetState()
    
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color(0xFF1A2332),
        contentColor = Color.White,
        scrimColor = Color.Black.copy(alpha = 0.6f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .imePadding()
        ) {
            Text(
                text = "Friend Requests",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            if (friendRequests.isEmpty()) {
                // Empty state
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Default.PersonAddAlt,
                        contentDescription = null,
                        tint = Color(0xFF8B9DAF),
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No pending friend requests",
                        color = Color(0xFF8B9DAF),
                        fontSize = 16.sp,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                // List of friend requests
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(friendRequests.size) { index ->
                        FriendRequestCard(
                            request = friendRequests[index],
                            onAccept = { onAcceptRequest(friendRequests[index].id) },
                            onDecline = { onDeclineRequest(friendRequests[index].id) }
                        )
                    }
                    
                    item {
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun FriendRequestCard(
    request: FriendRequest,
    onAccept: () -> Unit,
    onDecline: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF0F1419)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Profile Picture Placeholder
                Box(
                    modifier = Modifier
                        .size(50.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF4A90E2)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = request.name.firstOrNull()?.toString() ?: "?",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                Spacer(modifier = Modifier.width(12.dp))
                
                // Friend Info
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = request.name,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = request.requestedAt,
                        color = Color(0xFF8B9DAF),
                        fontSize = 12.sp
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Accept/Decline Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Decline Button
                androidx.compose.material3.Button(
                    onClick = onDecline,
                    modifier = Modifier.weight(1f),
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF2A2A3E),
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Decline", fontSize = 14.sp)
                }
                
                // Accept Button
                androidx.compose.material3.Button(
                    onClick = onAccept,
                    modifier = Modifier.weight(1f),
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF4A90E2),
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Accept", fontSize = 14.sp)
                }
            }
        }
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
                androidx.compose.material3.Icon(
                    imageVector = androidx.compose.material.icons.Icons.Filled.LocationOn,
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
                androidx.compose.material3.Icon(
                    imageVector = androidx.compose.material.icons.Icons.Filled.Search,
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
                androidx.compose.material3.Icon(
                    imageVector = androidx.compose.material.icons.Icons.Filled.Group,
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
                androidx.compose.material3.Icon(
                    imageVector = androidx.compose.material.icons.Icons.Filled.Person,
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