// File: frontend/app/src/main/java/com/cpen321/usermanagement/ui/screens/FriendProfileScreen.kt
package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.accompanist.systemuicontroller.rememberSystemUiController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendProfileScreen(
    friendId: String,
    onBackClick: () -> Unit
) {
    // Mock data - replace with API call later
    val friend = remember(friendId) {
        getMockFriendProfile(friendId)
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
                modifier = Modifier.height(98.dp),
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
        if (friend == null) {
            // Friend not found
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Friend not found",
                    color = Color.White,
                    fontSize = 18.sp
                )
            }
        } else {
            FriendProfileContent(
                friend = friend,
                modifier = Modifier.padding(paddingValues)
            )
        }
    }
}

@Composable
private fun FriendProfileContent(
    friend: FriendProfile,
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
                .background(Color(0xFF4A90E2)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = friend.name.firstOrNull()?.toString() ?: "?",
                color = Color.White,
                fontSize = 48.sp,
                fontWeight = FontWeight.Bold
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Name
        Text(
            text = friend.name,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
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
                        if (friend.isOnline) Color(0xFF4CAF50) else Color(0xFF8B9DAF)
                    )
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (friend.isOnline) "Online" else "Offline",
                fontSize = 16.sp,
                color = if (friend.isOnline) Color(0xFF4CAF50) else Color(0xFF8B9DAF)
            )
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Email Section
        InfoCard(
            icon = Icons.Default.Email,
            label = "Email",
            value = friend.email
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Bio Section (if available)
        if (friend.bio.isNotEmpty()) {
            InfoCard(
                icon = Icons.Default.Person,
                label = "Bio",
                value = friend.bio
            )
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        // Badges Section
        BadgesSection(badges = friend.badges)
        
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
private fun BadgesSection(badges: List<String>) {
    if (badges.isEmpty()) return
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A2332)
        ),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Text(
                text = "Badges",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            badges.forEach { badge ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF00BCD4))
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = badge,
                        fontSize = 14.sp,
                        color = Color(0xFFE0E0E0)
                    )
                }
            }
        }
    }
}

// Data class for friend profile (backend-ready)
data class FriendProfile(
    val id: String,
    val name: String,
    val email: String,
    val isOnline: Boolean,
    val bio: String = "",
    val badges: List<String> = emptyList(),
    val profilePictureUrl: String? = null
)

// Mock data function - replace with API call
private fun getMockFriendProfile(friendId: String): FriendProfile? {
    val mockProfiles = mapOf(
        "1" to FriendProfile(
            id = "1",
            name = "Alice Johnson",
            email = "alice@example.com",
            isOnline = true,
            bio = "Computer Science student at UBC. Love exploring campus and finding new study spots!",
            badges = listOf("Library Explorer", "Early Riser", "Coffee Connoisseur")
        ),
        "2" to FriendProfile(
            id = "2",
            name = "Bob Smith",
            email = "bob@example.com",
            isOnline = false,
            bio = "Engineering student. Always up for a campus event or food adventure.",
            badges = listOf("Event Enthusiast", "Social Butterfly")
        ),
        "3" to FriendProfile(
            id = "3",
            name = "Carol White",
            email = "carol@example.com",
            isOnline = true,
            bio = "Studying biology. Enjoy outdoor study sessions and connecting with friends.",
            badges = listOf("Campus Legend", "Library Explorer")
        ),
        "4" to FriendProfile(
            id = "4",
            name = "David Brown",
            email = "david@example.com",
            isOnline = false,
            bio = "Business student. Passionate about entrepreneurship and campus activities.",
            badges = listOf("Event Enthusiast")
        )
    )
    
    return mockProfiles[friendId]
}