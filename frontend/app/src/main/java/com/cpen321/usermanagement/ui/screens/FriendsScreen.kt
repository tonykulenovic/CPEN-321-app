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
    onMapClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onBadgesClick: () -> Unit = {},
    onViewFriendProfile: (String) -> Unit = {}
) {
    var selectedItem by remember { mutableIntStateOf(3) } // Friends tab selected
    var searchQuery by remember { mutableStateOf("") }
    var showAddFriendSheet by remember { mutableStateOf(false) }
    var showFriendRequestsSheet by remember { mutableStateOf(false) }  // ADD THIS
    
    // Sample friends list (replace with real data later)
    val friends = remember {
        mutableStateOf(
            listOf(
                Friend("1", "Alice Johnson", "alice@example.com", true),
                Friend("2", "Bob Smith", "bob@example.com", false),
                Friend("3", "Carol White", "carol@example.com", true),
                Friend("4", "David Brown", "david@example.com", false)
            )
        )
    }
    
    // Sample friend requests (replace with real data later)
    val friendRequests = remember {
        mutableStateOf(
            listOf(
                FriendRequest("req1", "Emma Wilson", "emma@example.com", requestedAt = "2 hours ago"),
                FriendRequest("req2", "James Lee", "james@example.com", requestedAt = "1 day ago"),
                FriendRequest("req3", "Sarah Miller", "sarah@example.com", requestedAt = "3 days ago")
            )
        )
    }
    
    val filteredFriends = remember(searchQuery, friends.value) {
        if (searchQuery.isBlank()) {
            friends.value
        } else {
            friends.value.filter {
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
            color = Color(0xFF1A1A2E),  // ADD THIS - set navigation bar to purple/navy
            darkIcons = false
        )
    }

    Scaffold(
        containerColor = Color(0xFF0F1419),
        topBar = {
            FriendsTopBar(
                onFriendRequestsClick = { showFriendRequestsSheet = true },  // ADD THIS
                pendingRequestsCount = friendRequests.value.size  // ADD THIS
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
            if (friends.value.isEmpty()) {
                EmptyFriendsState(onFindFriendsClick = { showAddFriendSheet = true })
            } else {
                FriendsList(
                    friends = filteredFriends,
                    onRemoveFriend = { friendId ->
                        friends.value = friends.value.filter { it.id != friendId }
                    },
                    onViewProfile = onViewFriendProfile
                )
            }
        }
        
        // Add Friend Bottom Sheet
        if (showAddFriendSheet) {
            AddFriendBottomSheet(
                onDismiss = { showAddFriendSheet = false },
                onSendRequest = { email ->
                    // TODO: Implement send friend request
                    showAddFriendSheet = false
                }
            )
        }

        // Friend Requests Bottom Sheet - ADD THIS
        if (showFriendRequestsSheet) {
            FriendRequestsBottomSheet(
                friendRequests = friendRequests.value,
                onDismiss = { showFriendRequestsSheet = false },
                onAcceptRequest = { requestId ->
                    // TODO: Implement accept request
                    friendRequests.value = friendRequests.value.filter { it.id != requestId }
                },
                onDeclineRequest = { requestId ->
                    // TODO: Implement decline request
                    friendRequests.value = friendRequests.value.filter { it.id != requestId }
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FriendsTopBar(
    onFriendRequestsClick: () -> Unit,  // ADD THIS
    pendingRequestsCount: Int,  // ADD THIS
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
                        imageVector = Icons.Default.PersonAddAlt,
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
    modifier: Modifier = Modifier
) {
    val sheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()
    var emailOrUsername by remember { mutableStateOf("") }
    
    // Use DisposableEffect instead of SideEffect for better persistence
    val systemUiController = rememberSystemUiController()
    DisposableEffect(Unit) {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false  // Force white icons
        )
        
        // Also explicitly set status bar
        systemUiController.setStatusBarColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
        
        onDispose {
            // Restore when bottom sheet closes
            systemUiController.setSystemBarsColor(
                color = Color(0xFF1A1A2E),
                darkIcons = false
            )
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Color(0xFF1A2332),
        contentColor = Color.White,
        scrimColor = Color.Black.copy(alpha = 0.6f)  // ADD THIS - darker scrim prevents icon color change
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
            
            OutlinedTextField(
                value = emailOrUsername,
                onValueChange = { emailOrUsername = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = {
                    Text(
                        "Enter email or username",
                        color = Color(0xFF8B9DAF)
                    )
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
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Button(
                onClick = {
                    scope.launch {
                        sheetState.hide()
                        onSendRequest(emailOrUsername)
                    }
                },
                enabled = emailOrUsername.isNotBlank()
            ) {
                Text("Send Request", color = Color.White)
            }
            
            Spacer(modifier = Modifier.height(32.dp))
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
                androidx.compose.material3.Button(  // USE FULLY QUALIFIED NAME
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
                androidx.compose.material3.Button(  // USE FULLY QUALIFIED NAME
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
        
        // Badge button - REPLACE Icons.Filled.Shield with Icons.Filled.EmojiEvents
        NavigationBarItem(
            selected = selectedItem == 2,
            onClick = { onItemSelected(2) },
            icon = {
                Icon(
                    imageVector = Icons.Filled.EmojiEvents,  // CHANGE THIS
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