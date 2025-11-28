// File: frontend/app/src/main/java/com/cpen321/usermanagement/ui/screens/FriendProfileScreen.kt
package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.SubcomposeAsyncImage
import com.cpen321.usermanagement.data.remote.api.RetrofitClient
import com.cpen321.usermanagement.ui.viewmodels.FriendProfileViewModel
import com.google.accompanist.systemuicontroller.rememberSystemUiController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendProfileScreen(
    friendId: String,
    onBackClick: () -> Unit,
    friendProfileViewModel: FriendProfileViewModel = hiltViewModel()
) {
    val uiState by friendProfileViewModel.uiState.collectAsState()
    
    // Load friend profile when screen is composed
    LaunchedEffect(friendId) {
        friendProfileViewModel.loadFriendProfile(friendId)
    }
    
    // Set status bar appearance
    val systemUiController = rememberSystemUiController()
    SideEffect {
        // Top bar (status bar) - keep purple/navy
        systemUiController.setStatusBarColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
        
        // Bottom bar (navigation bar) - match background blue
        systemUiController.setNavigationBarColor(
            color = Color(0xFF0F1419),
            darkIcons = false
        )
    }
    
    Scaffold(
        containerColor = Color(0xFF0F1419),
        topBar = {
            TopAppBar(
                modifier = Modifier,
                title = {
                    Text(
                        text = "Friend Profile",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
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
                    containerColor = Color(0xFF1A1A2E),
                    titleContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        when {
            uiState.isLoading -> {
                // Loading state
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF4A90E2))
                }
            }
            uiState.errorMessage != null -> {
                // Error state
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = uiState.errorMessage ?: "Unknown error",
                            color = Color.Red,
                            fontSize = 16.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(horizontal = 32.dp)
                        )
                        Button(
                            onClick = { friendProfileViewModel.loadFriendProfile(friendId) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF4A90E2)
                            )
                        ) {
                            Text("Retry")
                        }
                    }
                }
            }
            uiState.friendProfile != null -> {
                // Success state
                FriendProfileContent(
                    friendProfile = uiState.friendProfile!!,
                    modifier = Modifier.padding(paddingValues)
                )
            }
        }
    }
}

@Composable
private fun FriendProfileContent(
    friendProfile: com.cpen321.usermanagement.data.remote.dto.FriendProfileData,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        
        // Profile Picture
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(Color(0xFF1A2332)),
            contentAlignment = Alignment.Center
        ) {
            if (friendProfile.profilePicture.isNullOrBlank()) {
                // Fallback to initial letter if no profile picture
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF4A90E2)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = friendProfile.name.firstOrNull()?.toString() ?: "?",
                        color = Color.White,
                        fontSize = 48.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            } else {
                // Load actual profile picture from URL
                SubcomposeAsyncImage(
                    model = RetrofitClient.getPictureUri(friendProfile.profilePicture),
                    contentDescription = "Profile Picture",
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop,
                    loading = {
                        CircularProgressIndicator(
                            modifier = Modifier.size(40.dp),
                            color = Color(0xFF00BCD4),
                            strokeWidth = 3.dp
                        )
                    },
                    error = {
                        // Fallback to initial letter on error
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color(0xFF4A90E2)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = friendProfile.name.firstOrNull()?.toString() ?: "?",
                                color = Color.White,
                                fontSize = 48.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                )
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Name
        Text(
            text = friendProfile.name,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        
        Spacer(modifier = Modifier.height(4.dp))
        
        // Username
        Text(
            text = "@${friendProfile.username}",
            fontSize = 16.sp,
            color = Color(0xFF8B9DAF)
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        // Online Status
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(
                        if (friendProfile.isOnline) Color(0xFF4CAF50) else Color(0xFF8B9DAF)
                    )
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (friendProfile.isOnline) "Online" else "Offline",
                fontSize = 16.sp,
                color = if (friendProfile.isOnline) Color(0xFF4CAF50) else Color(0xFF8B9DAF)
            )
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Stats Overview Cards
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StatsCard(
                modifier = Modifier.weight(1f),
                label = "Friends",
                value = friendProfile.friendsCount.toString(),
                icon = Icons.Default.Person
            )
            StatsCard(
                modifier = Modifier.weight(1f),
                label = "Badges",
                value = friendProfile.badgesCount.toString(),
                icon = Icons.Default.EmojiEvents
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Campus (if available)
        friendProfile.campus?.let { campus ->
            InfoCard(
                icon = Icons.Default.School,
                label = "Campus",
                value = campus
            )
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        // Bio Section (if available)
        friendProfile.bio?.let { bio ->
            if (bio.isNotEmpty()) {
                InfoCard(
                    icon = Icons.Default.Person,
                    label = "Bio",
                    value = bio
                )
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
        
        // Activity Stats
        ActivityStatsSection(stats = friendProfile.stats)
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Badges Section - Always show (will display "No badges" if empty)
        BadgesSection(badges = friendProfile.badges)
        
        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun InfoCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A2332)
        ),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = Color(0xFF4A90E2),
                modifier = Modifier.size(24.dp)
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    fontSize = 12.sp,
                    color = Color(0xFF8B9DAF),
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = value,
                    fontSize = 16.sp,
                    color = Color.White
                )
            }
        }
    }
}

@Composable
private fun StatsCard(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A2332)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = Color(0xFF4A90E2),
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(
                text = label,
                fontSize = 12.sp,
                color = Color(0xFF8B9DAF)
            )
        }
    }
}

@Composable
private fun ActivityStatsSection(
    stats: com.cpen321.usermanagement.data.remote.dto.FriendStats
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A2332)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Text(
                text = "Activity Stats",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            StatRow("Pins Created", stats.pinsCreated.toString())
            StatRow("Pins Visited", stats.pinsVisited.toString())
            StatRow("Locations Explored", stats.locationsExplored.toString())
            StatRow("Libraries Visited", stats.librariesVisited.toString())
            StatRow("Cafes Visited", stats.cafesVisited.toString())
            StatRow("Restaurants Visited", stats.restaurantsVisited.toString())
        }
    }
}

@Composable
private fun StatRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            fontSize = 14.sp,
            color = Color(0xFFB0BEC5)
        )
        Text(
            text = value,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White
        )
    }
}

@Composable
private fun BadgesSection(badges: List<com.cpen321.usermanagement.data.remote.dto.UserBadge>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A2332)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Text(
                text = "Badges Earned (${badges.size})",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            if (badges.isEmpty()) {
                Text(
                    text = "No badges earned yet",
                    fontSize = 14.sp,
                    color = Color(0xFF8B9DAF),
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            } else {
                badges.forEach { userBadge ->
                    BadgeItem(userBadge = userBadge)
                }
            }
        }
    }
}

@Composable
private fun BadgeItem(userBadge: com.cpen321.usermanagement.data.remote.dto.UserBadge) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Badge icon indicator based on rarity
        val badgeColor = when (userBadge.badgeId.rarity) {
            com.cpen321.usermanagement.data.remote.dto.BadgeRarity.COMMON -> Color(0xFF9E9E9E)
            com.cpen321.usermanagement.data.remote.dto.BadgeRarity.UNCOMMON -> Color(0xFF4CAF50)
            com.cpen321.usermanagement.data.remote.dto.BadgeRarity.RARE -> Color(0xFF2196F3)
            com.cpen321.usermanagement.data.remote.dto.BadgeRarity.EPIC -> Color(0xFF9C27B0)
            com.cpen321.usermanagement.data.remote.dto.BadgeRarity.LEGENDARY -> Color(0xFFFFB74D)
        }
        
        Box(
            modifier = Modifier
                .size(12.dp)
                .clip(CircleShape)
                .background(badgeColor)
        )
        
        Spacer(modifier = Modifier.width(12.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = userBadge.badgeId.name,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                color = Color.White
            )
            Text(
                text = userBadge.badgeId.description,
                fontSize = 12.sp,
                color = Color(0xFF8B9DAF)
            )
        }
    }
}
