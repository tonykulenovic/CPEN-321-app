package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import com.cpen321.usermanagement.data.remote.api.RetrofitClient
import com.cpen321.usermanagement.ui.viewmodels.ProfileViewModel
import com.google.accompanist.systemuicontroller.rememberSystemUiController

// Badge data class
data class Badge(
    val id: String,
    val title: String,
    val description: String,
    val icon: ImageVector,
    val color: Color,
    val isUnlocked: Boolean,
    val progress: Int = 0,
    val maxProgress: Int = 0,
    val category: BadgeCategory
)

enum class BadgeCategory {
    STUDY, SOCIAL, EVENT, SPECIAL
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BadgesScreen(
    profileViewModel: ProfileViewModel,  // ADD THIS parameter
    onMapClick: () -> Unit = {},
    onSearchClick: () -> Unit = {},
    onFriendsClick: () -> Unit = {},
    onProfileClick: () -> Unit = {}
) {
    var selectedItem by remember { mutableIntStateOf(2) }
    var showBadgeDetails by remember { mutableStateOf(false) }
    var selectedBadge by remember { mutableStateOf<Badge?>(null) }
    var showInfoModal by remember { mutableStateOf(false) }
    
    // Get user data from ViewModel
    val uiState by profileViewModel.uiState.collectAsState()
    
    // Load profile if not already loaded
    LaunchedEffect(Unit) {
        if (uiState.user == null) {
            profileViewModel.loadProfile()
        }
    }
    
    // Set status bar appearance
    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
    }
    
    // Get real user data or use fallback
    val userName = uiState.user?.name ?: "Loading..."
    val userProfilePicture = uiState.user?.profilePicture
    val totalBadgesEarned = getSampleBadges().count { it.isUnlocked }
    
    Scaffold(
        containerColor = Color(0xFF0A1929),
        topBar = {
            BadgesTopBar()
        },
        bottomBar = {
            BottomNavigationBar(
                selectedItem = selectedItem,
                onItemSelected = { index ->
                    selectedItem = index
                    when (index) {
                        0 -> onMapClick()
                        1 -> onSearchClick()
                        2 -> {} // Already on Badges
                        3 -> onFriendsClick()
                        4 -> onProfileClick()
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showInfoModal = true },
                containerColor = Color(0xFF00BCD4),
                contentColor = Color.White
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = "Badge Info",
                    modifier = Modifier.size(24.dp)
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
            
            // Profile Summary Section with real data
            ProfileSummaryCard(
                userName = userName,
                profilePictureUrl = userProfilePicture,
                totalBadges = totalBadgesEarned,
                isLoading = uiState.isLoadingProfile
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Badges Grid
            val badges = getSampleBadges()
            if (badges.isEmpty() || badges.all { !it.isUnlocked }) {
                EmptyBadgesState()
            } else {
                BadgesGrid(
                    badges = badges,
                    onBadgeClick = { badge ->
                        selectedBadge = badge
                        showBadgeDetails = true
                    }
                )
            }
        }
    }
    
    // Badge Details Bottom Sheet
    if (showBadgeDetails && selectedBadge != null) {
        BadgeDetailsBottomSheet(
            badge = selectedBadge!!,
            onDismiss = { showBadgeDetails = false }
        )
    }
    
    // Info Modal
    if (showInfoModal) {
        BadgeInfoDialog(
            onDismiss = { showInfoModal = false }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BadgesTopBar() {
    TopAppBar(
        modifier = Modifier.height(98.dp),
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Start,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Badges",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
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
private fun ProfileSummaryCard(
    userName: String,
    profilePictureUrl: String?,
    totalBadges: Int,
    isLoading: Boolean
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A2332)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Profile Picture - Real or Placeholder
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF1A2332)),
                contentAlignment = Alignment.Center
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color(0xFF00BCD4),
                        strokeWidth = 2.dp
                    )
                } else if (profilePictureUrl.isNullOrBlank()) {
                    // Default avatar icon
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = "Profile",
                        tint = Color(0xFF8B9DAF),
                        modifier = Modifier.size(28.dp)
                    )
                } else {
                    // Load real profile picture
                    SubcomposeAsyncImage(
                        model = RetrofitClient.getPictureUri(profilePictureUrl),
                        contentDescription = "Profile Picture",
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop,
                        loading = {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = Color(0xFF00BCD4),
                                strokeWidth = 2.dp
                            )
                        },
                        error = {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = "Profile",
                                tint = Color(0xFF8B9DAF),
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    )
                }
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column {
                Text(
                    text = userName,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "$totalBadges Badges Earned",
                    fontSize = 14.sp,
                    color = Color(0xFF00BCD4),
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun BadgesGrid(
    badges: List<Badge>,
    onBadgeClick: (Badge) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(badges) { badge ->
            BadgeCard(
                badge = badge,
                onClick = { onBadgeClick(badge) }
            )
        }
    }
}

@Composable
private fun BadgeCard(
    badge: Badge,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp)  // Increase height slightly to accommodate progress bar
            .alpha(if (badge.isUnlocked) 1f else 0.4f)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A2332)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Badge Icon
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(
                        if (badge.isUnlocked) badge.color else Color(0xFF3D4E5E)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = badge.icon,
                    contentDescription = badge.title,
                    tint = Color.White,
                    modifier = Modifier.size(32.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Badge Title
            Text(
                text = badge.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = if (badge.isUnlocked) Color.White else Color(0xFF8B9DAF),
                textAlign = TextAlign.Center,
                maxLines = 1
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Badge Description
            Text(
                text = badge.description,
                fontSize = 11.sp,
                color = Color(0xFF8B9DAF),
                textAlign = TextAlign.Center,
                maxLines = 2,
                lineHeight = 14.sp
            )
            
            // ADD PROGRESS INDICATOR FOR LOCKED BADGES
            if (!badge.isUnlocked && badge.maxProgress > 0) {
                Spacer(modifier = Modifier.height(8.dp))
                
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Progress text
                    Text(
                        text = "${badge.progress}/${badge.maxProgress}",
                        fontSize = 10.sp,
                        color = Color(0xFF00BCD4),
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    // Progress bar
                    LinearProgressIndicator(
                        progress = { badge.progress.toFloat() / badge.maxProgress.toFloat() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp)),
                        color = Color(0xFF00BCD4),
                        trackColor = Color(0xFF3D4E5E)
                    )
                }
            }
            
            // For unlocked badges, show a checkmark or "Unlocked" text
            if (badge.isUnlocked && badge.maxProgress > 0) {
                Spacer(modifier = Modifier.height(6.dp))
                
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Completed",
                        tint = Color(0xFF66BB6A),
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Unlocked",
                        fontSize = 10.sp,
                        color = Color(0xFF66BB6A),
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BadgeDetailsBottomSheet(
    badge: Badge,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF1A2332),
        contentColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Large Badge Icon
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(CircleShape)
                    .background(badge.color),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = badge.icon,
                    contentDescription = badge.title,
                    tint = Color.White,
                    modifier = Modifier.size(56.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Badge Title
            Text(
                text = badge.title,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Badge Description
            Text(
                text = badge.description,
                fontSize = 14.sp,
                color = Color(0xFF8B9DAF),
                textAlign = TextAlign.Center
            )
            
            // Progress Indicator (if badge has progress)
            if (badge.maxProgress > 0) {
                Spacer(modifier = Modifier.height(24.dp))
                
                Column(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Progress",
                            fontSize = 14.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "${badge.progress}/${badge.maxProgress}",
                            fontSize = 14.sp,
                            color = Color(0xFF00BCD4),
                            fontWeight = FontWeight.Bold
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    LinearProgressIndicator(
                        progress = { badge.progress.toFloat() / badge.maxProgress.toFloat() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = Color(0xFF00BCD4),
                        trackColor = Color(0xFF3D4E5E)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Close Button
            Button(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF00BCD4),
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Close", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun BadgeInfoDialog(
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF1A2332),
        titleContentColor = Color.White,
        textContentColor = Color(0xFF8B9DAF),
        title = {
            Text(
                text = "How Badges Work",
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp
            )
        },
        text = {
            Text(
                text = "Earn badges by studying, attending events, or exploring campus!\n\n" +
                        "• Study-related badges: Visit study spots\n" +
                        "• Social badges: Connect with friends\n" +
                        "• Event badges: Attend campus events\n" +
                        "• Special badges: Unlock unique achievements",
                fontSize = 14.sp,
                lineHeight = 20.sp
            )
        },
        confirmButton = {
            TextButton(
                onClick = onDismiss,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = Color(0xFF00BCD4)
                )
            ) {
                Text("Got it!", fontWeight = FontWeight.Bold)
            }
        }
    )
}

@Composable
private fun EmptyBadgesState() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(Color(0xFF1A2332)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.EmojiEvents,
                contentDescription = "No badges",
                tint = Color(0xFF8B9DAF),
                modifier = Modifier.size(64.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "You haven't earned any badges yet.",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "Start exploring and engaging with UniVerse\nto unlock your first badge!",
            fontSize = 14.sp,
            color = Color(0xFF8B9DAF),
            textAlign = TextAlign.Center,
            lineHeight = 20.sp
        )
    }
}

@Composable
private fun BottomNavigationBar(
    selectedItem: Int,
    onItemSelected: (Int) -> Unit
) {
    NavigationBar(
        modifier = Modifier.height(72.dp),
        containerColor = Color(0xFF1A1A2E),
        contentColor = Color.White
    ) {
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

// Sample data for testing
private fun getSampleBadges(): List<Badge> {
    return listOf(
        Badge(
            id = "1",
            title = "Library Explorer",
            description = "Visited 5 study spots",
            icon = Icons.AutoMirrored.Filled.MenuBook,
            color = Color(0xFF4A90E2), // Blue
            isUnlocked = true,
            progress = 5,
            maxProgress = 5,
            category = BadgeCategory.STUDY
        ),
        Badge(
            id = "2",
            title = "Early Riser",
            description = "Studied before 8 AM",
            icon = Icons.Default.WbSunny,
            color = Color(0xFFFFA726), // Orange
            isUnlocked = true,
            progress = 3,
            maxProgress = 3,
            category = BadgeCategory.STUDY
        ),
        Badge(
            id = "3",
            title = "Social Butterfly",
            description = "Added 10 friends",
            icon = Icons.Default.Group,
            color = Color(0xFF66BB6A), // Green
            isUnlocked = false,
            progress = 5,
            maxProgress = 10,
            category = BadgeCategory.SOCIAL
        ),
        Badge(
            id = "4",
            title = "Event Enthusiast",
            description = "Attended 5 events",
            icon = Icons.Default.Event,
            color = Color(0xFFFF7043), // Orange-Red
            isUnlocked = false,
            progress = 2,
            maxProgress = 5,
            category = BadgeCategory.EVENT
        ),
        Badge(
            id = "5",
            title = "Campus Legend",
            description = "Unlock all badges",
            icon = Icons.Default.EmojiEvents,
            color = Color(0xFFAB47BC), // Purple
            isUnlocked = false,
            progress = 2,
            maxProgress = 10,
            category = BadgeCategory.SPECIAL
        ),
        Badge(
            id = "6",
            title = "Coffee Connoisseur",
            description = "Visited 3 cafes",
            icon = Icons.Default.Coffee,
            color = Color(0xFF8D6E63), // Brown
            isUnlocked = true,
            progress = 3,
            maxProgress = 3,
            category = BadgeCategory.STUDY
        )
    )
}