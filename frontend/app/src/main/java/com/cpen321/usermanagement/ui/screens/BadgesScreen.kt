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
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.SubcomposeAsyncImage
import com.cpen321.usermanagement.data.remote.api.RetrofitClient
import com.cpen321.usermanagement.data.remote.dto.Badge
import com.cpen321.usermanagement.data.remote.dto.BadgeRarity
import com.cpen321.usermanagement.data.remote.dto.UserBadge
import com.cpen321.usermanagement.data.remote.dto.BadgeProgressItem
import com.cpen321.usermanagement.ui.viewmodels.BadgeViewModel
import com.cpen321.usermanagement.ui.viewmodels.ProfileViewModel
import com.google.accompanist.systemuicontroller.rememberSystemUiController

// Helper data class for displaying badges
data class BadgeDisplayItem(
    val id: String,
    val title: String,
    val description: String,
    val icon: ImageVector,
    val color: Color,
    val isUnlocked: Boolean,
    val progress: Int = 0,
    val maxProgress: Int = 0,
    val category: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BadgesScreen(
    badgeViewModel: BadgeViewModel = hiltViewModel(),
    profileViewModel: ProfileViewModel = hiltViewModel(),
    onMapClick: () -> Unit = {},
    onSearchClick: () -> Unit = {},
    onFriendsClick: () -> Unit = {},
    onProfileClick: () -> Unit = {}
) {
    var selectedItem by remember { mutableIntStateOf(2) }
    var showBadgeDetails by remember { mutableStateOf(false) }
    var selectedBadgeItem by remember { mutableStateOf<BadgeDisplayItem?>(null) }
    var showInfoModal by remember { mutableStateOf(false) }
    
    // Get user data from ProfileViewModel
    val profileUiState by profileViewModel.uiState.collectAsState()
    
    // Get badge data from BadgeViewModel
    val badgeUiState by badgeViewModel.uiState.collectAsState()
    
    // Load profile if not already loaded
    LaunchedEffect(Unit) {
        if (profileUiState.user == null) {
            profileViewModel.loadProfile()
        }
    }
    
    // Show snackbar for messages
    val snackbarHostState = remember { SnackbarHostState() }
    
    LaunchedEffect(badgeUiState.error) {
        badgeUiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            badgeViewModel.clearError()
        }
    }
    
    LaunchedEffect(badgeUiState.successMessage) {
        badgeUiState.successMessage?.let { message ->
            snackbarHostState.showSnackbar(message)
            badgeViewModel.clearSuccessMessage()
        }
    }
    
    // Periodic badge refresh to catch pin visits and progress updates
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(10000) // Refresh every 10 seconds
            badgeViewModel.loadBadgeProgress()
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
    val userName = profileUiState.user?.name ?: "Loading..."
    val userProfilePicture = profileUiState.user?.profilePicture
    val totalBadgesEarned = badgeUiState.earnedBadges.size
    
    // Convert backend data to display format - show ALL badges
    val displayBadges = convertToDisplayBadges(
        earnedBadges = badgeUiState.earnedBadges,
        availableBadges = badgeUiState.availableBadges,
        progressItems = badgeUiState.badgeProgressItems
    )
    
    Scaffold(
        containerColor = Color(0xFF0A1929),
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        topBar = {
            BadgesTopBar(
                onInfoClick = { showInfoModal = true }
            )
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
                isLoading = profileUiState.isLoadingProfile || badgeUiState.isLoading
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Badges Grid - Always show all badges
            if (badgeUiState.isLoading && displayBadges.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF00BCD4))
                }
            } else {
                BadgesGrid(
                    badges = displayBadges,
                    onBadgeClick = { badge ->
                        selectedBadgeItem = badge
                        showBadgeDetails = true
                    }
                )
            }
        }
    }
    
    // Badge Details Bottom Sheet
    if (showBadgeDetails && selectedBadgeItem != null) {
        BadgeDetailsBottomSheet(
            badge = selectedBadgeItem!!,
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
private fun BadgesTopBar(
    onInfoClick: () -> Unit
) {
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
        actions = {
            IconButton(onClick = onInfoClick) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = "Badge Info",
                    tint = Color.White
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
    badges: List<BadgeDisplayItem>,
    onBadgeClick: (BadgeDisplayItem) -> Unit
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
    badge: BadgeDisplayItem,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(170.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (badge.isUnlocked) {
                getLightenedColor(badge.color)
            } else {
                Color(0xFF1A2332)
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Badge Icon - greyed for locked, colored for unlocked
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(
                        if (badge.isUnlocked) badge.color else Color(0xFF3D4E5E)
                    )
                    .alpha(if (badge.isUnlocked) 1f else 0.5f),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = badge.icon,
                    contentDescription = badge.title,
                    tint = Color.White,
                    modifier = Modifier.size(30.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Badge Title - greyed for locked, white for unlocked
            Text(
                text = badge.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = if (badge.isUnlocked) Color.White else Color(0xFF6B7B8F),
                textAlign = TextAlign.Center,
                maxLines = 1
            )
            
            // Show progress bar for ALL badges (locked and unlocked)
            if (badge.maxProgress > 0) {
                Spacer(modifier = Modifier.height(2.dp))
                
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Progress text
                    Text(
                        text = "${badge.progress}/${badge.maxProgress}",
                        fontSize = 10.sp,
                        color = if (badge.isUnlocked) Color(0xFF66BB6A) else Color(0xFF00BCD4),
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(2.dp))
                    
                    // Progress bar
                    LinearProgressIndicator(
                        progress = { 
                            if (badge.maxProgress > 0) {
                                badge.progress.toFloat() / badge.maxProgress.toFloat()
                            } else {
                                0f
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(3.dp)
                            .clip(RoundedCornerShape(2.dp)),
                        color = if (badge.isUnlocked) Color(0xFF66BB6A) else Color(0xFF00BCD4),
                        trackColor = Color(0xFF3D4E5E)
                    )
                }
            }
            
            // Show status indicator
            if (badge.isUnlocked) {
                Spacer(modifier = Modifier.height(3.dp))
                
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Unlocked",
                        tint = Color(0xFF66BB6A),
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Unlocked",
                        fontSize = 9.sp,
                        color = Color(0xFF66BB6A),
                        fontWeight = FontWeight.Bold
                    )
                }
            } else {
                Spacer(modifier = Modifier.height(3.dp))
                
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Locked",
                        tint = Color(0xFF6B7B8F),
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Locked",
                        fontSize = 9.sp,
                        color = Color(0xFF6B7B8F),
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
    badge: BadgeDisplayItem,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = if (badge.isUnlocked) {
            getLightenedColor(badge.color)
        } else {
            Color(0xFF1A2332)
        },
        contentColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Large Badge Icon - greyed if locked, colored if unlocked
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(CircleShape)
                    .background(if (badge.isUnlocked) badge.color else Color(0xFF3D4E5E))
                    .alpha(if (badge.isUnlocked) 1f else 0.5f),
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
                color = if (badge.isUnlocked) Color.White else Color(0xFF6B7B8F)
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Badge Status
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = if (badge.isUnlocked) Icons.Default.CheckCircle else Icons.Default.Lock,
                    contentDescription = if (badge.isUnlocked) "Unlocked" else "Locked",
                    tint = if (badge.isUnlocked) Color(0xFF66BB6A) else Color(0xFF6B7B8F),
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (badge.isUnlocked) "Unlocked" else "Locked",
                    fontSize = 14.sp,
                    color = if (badge.isUnlocked) Color(0xFF66BB6A) else Color(0xFF6B7B8F),
                    fontWeight = FontWeight.Bold
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Badge Description
            Text(
                text = badge.description,
                fontSize = 14.sp,
                color = if (badge.isUnlocked) Color(0xFF8B9DAF) else Color(0xFF5B6B7F),
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
                            color = if (badge.isUnlocked) Color(0xFF66BB6A) else Color(0xFF00BCD4),
                            fontWeight = FontWeight.Bold
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    LinearProgressIndicator(
                        progress = { 
                            if (badge.maxProgress > 0) {
                                badge.progress.toFloat() / badge.maxProgress.toFloat()
                            } else {
                                0f
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = if (badge.isUnlocked) Color(0xFF66BB6A) else Color(0xFF00BCD4),
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
                        "• Locked badges: Shown in grey with progress bars\n" +
                        "• Unlocked badges: Shown in color when completed\n" +
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

// Helper function to convert backend badges to display format - shows ALL badges
@Composable
private fun convertToDisplayBadges(
    earnedBadges: List<UserBadge>,
    availableBadges: List<Badge>,
    progressItems: List<BadgeProgressItem>
): List<BadgeDisplayItem> {
    val displayBadges = mutableListOf<BadgeDisplayItem>()
    val earnedBadgeIds = earnedBadges.map { it.badgeId.id }.toSet()
    
    // Create a map of badge ID to progress for quick lookup
    val progressMap = progressItems.associate { it.badge.id to it.progress }
    
    // Add earned badges (unlocked, colored) - always show full progress
    earnedBadges.forEach { userBadge ->
        displayBadges.add(
            BadgeDisplayItem(
                id = userBadge.badgeId.id,
                title = userBadge.badgeId.name,
                description = userBadge.badgeId.description,
                icon = mapIconToImageVector(userBadge.badgeId.icon),
                color = mapRarityToColor(userBadge.badgeId.rarity),
                isUnlocked = true,
                progress = userBadge.badgeId.requirements.target,
                maxProgress = userBadge.badgeId.requirements.target,
                category = userBadge.badgeId.category.value
            )
        )
    }
    
    // Add ALL available badges (locked, greyed) with progress
    availableBadges.forEach { badge ->
        // Skip if already earned
        if (!earnedBadgeIds.contains(badge.id)) {
            val progress = progressMap[badge.id]
            displayBadges.add(
                BadgeDisplayItem(
                    id = badge.id,
                    title = badge.name,
                    description = badge.description,
                    icon = mapIconToImageVector(badge.icon),
                    color = mapRarityToColor(badge.rarity),
                    isUnlocked = false,
                    progress = progress?.current ?: 0,
                    maxProgress = progress?.target ?: badge.requirements.target,
                    category = badge.category.value
                )
            )
        }
    }
    
    return displayBadges
}

// Map backend icon string to ImageVector
@Composable
private fun mapIconToImageVector(icon: String): ImageVector {
    return when (icon.lowercase()) {
        "library", "book", "library_explorer" -> Icons.AutoMirrored.Filled.MenuBook
        "sun", "sunny", "early_riser" -> Icons.Default.WbSunny
        "group", "social", "friends" -> Icons.Default.Group
        "event", "calendar" -> Icons.Default.Event
        "trophy", "achievement", "legend" -> Icons.Default.EmojiEvents
        "coffee", "cafe" -> Icons.Default.Coffee
        "star" -> Icons.Default.Star
        "favorite", "heart" -> Icons.Default.Favorite
        "explore" -> Icons.Default.Explore
        "login", "person" -> Icons.Default.Person
        else -> Icons.Default.EmojiEvents // Default trophy icon
    }
}

// Map badge rarity to color
private fun mapRarityToColor(rarity: BadgeRarity): Color {
    return when (rarity) {
        BadgeRarity.COMMON -> Color(0xFF8B9DAF) // Gray
        BadgeRarity.UNCOMMON -> Color(0xFF66BB6A) // Green
        BadgeRarity.RARE -> Color(0xFF4A90E2) // Blue
        BadgeRarity.EPIC -> Color(0xFFAB47BC) // Purple
        BadgeRarity.LEGENDARY -> Color(0xFFFFA726) // Gold
    }
}

// Create a lighter tint of the badge color for backgrounds
private fun getLightenedColor(color: Color): Color {
    // Mix the color with dark background color to create a tinted shade
    val baseR = 0x1A / 255f
    val baseG = 0x23 / 255f
    val baseB = 0x32 / 255f
    
    val mixRatio = 0.4f // 40% badge color, 60% base color (brighter!)
    
    val r = (color.red * mixRatio + baseR * (1 - mixRatio))
    val g = (color.green * mixRatio + baseG * (1 - mixRatio))
    val b = (color.blue * mixRatio + baseB * (1 - mixRatio))
    
    return Color(r, g, b, 1f)
}