package com.cpen321.usermanagement.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.cpen321.usermanagement.ui.viewmodels.PinViewModel
import com.cpen321.usermanagement.data.remote.dto.Pin
import com.cpen321.usermanagement.data.remote.dto.PinCategory
import com.cpen321.usermanagement.data.remote.dto.PinVisibility
import com.google.accompanist.systemuicontroller.rememberSystemUiController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchPinsScreen(
    pinViewModel: PinViewModel = hiltViewModel(),
    onMapClick: () -> Unit = {},
    onBadgesClick: () -> Unit = {},
    onFriendsClick: () -> Unit = {},
    onProfileClick: () -> Unit = {},
    onPinClick: (String) -> Unit = {}
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedItem by remember { mutableIntStateOf(1) } // Search is selected (index 1)
    val uiState by pinViewModel.uiState.collectAsState()

    // Load all pins when screen opens
    LaunchedEffect(Unit) {
        pinViewModel.loadPins()
    }

    // Apply search filtering
    val filteredPins = remember(searchQuery, uiState.pins) {
        if (searchQuery.isBlank()) {
            uiState.pins
        } else {
            uiState.pins.filter { pin ->
                pin.name.contains(searchQuery, ignoreCase = true) ||
                pin.description.contains(searchQuery, ignoreCase = true) ||
                pin.location.address?.contains(searchQuery, ignoreCase = true) == true
            }
        }
    }

    // Group pins by category and visibility
    val pinsByCategory = remember(filteredPins) {
        val categories = mutableMapOf<String, List<Pin>>()
        
        // Group by actual categories
        PinCategory.values().forEach { category ->
            val pinsInCategory = filteredPins.filter { it.category == category }
            if (pinsInCategory.isNotEmpty()) {
                categories[getCategoryDisplayName(category)] = pinsInCategory
            }
        }
        
        // Group by visibility for mixed categories (exclude pre-seeded pins from Public)
        val publicPins = filteredPins.filter { it.visibility == PinVisibility.PUBLIC && !it.isPreSeeded }
        val friendsPins = filteredPins.filter { it.visibility == PinVisibility.FRIENDS_ONLY }
        val privatePins = filteredPins.filter { it.visibility == PinVisibility.PRIVATE }
        
        if (publicPins.isNotEmpty()) categories["Public from Community"] = publicPins
        if (friendsPins.isNotEmpty()) categories["Friends"] = friendsPins
        if (privatePins.isNotEmpty()) categories["Private"] = privatePins
        
        categories
    }

    // Set status bar appearance
    val systemUiController = rememberSystemUiController()
    SideEffect {
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
            SearchTopBar(
                searchQuery = searchQuery,
                onSearchQueryChange = { searchQuery = it },
                resultsCount = filteredPins.size
            )
        },
        bottomBar = {
            BottomNavigationBar(
                selectedItem = selectedItem,
                onItemSelected = { index ->
                    selectedItem = index
                    when (index) {
                        0 -> onMapClick()
                        1 -> {} // Already on Search
                        2 -> onBadgesClick()
                        3 -> onFriendsClick()
                        4 -> onProfileClick()
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = Color(0xFF4A90E2)
                )
            } else if (filteredPins.isEmpty() && searchQuery.isNotEmpty()) {
                EmptySearchResults(searchQuery = searchQuery)
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    pinsByCategory.forEach { (categoryName, pins) ->
                        item {
                            CategorySection(
                                categoryName = categoryName,
                                pins = pins,
                                onPinClick = onPinClick
                            )
                        }
                    }
                    
                    if (filteredPins.isEmpty() && searchQuery.isEmpty()) {
                        item {
                            EmptyPinsList()
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SearchTopBar(
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    resultsCount: Int
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF1A1A2E))
            .padding(16.dp)
    ) {
        Text(
            text = "Search Pins",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            modifier = Modifier.padding(bottom = 12.dp)
        )
        
        TextField(
            value = searchQuery,
            onValueChange = onSearchQueryChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            placeholder = {
                Text(
                    text = "Search pins by name...",
                    color = Color(0xFF7F8C8D)
                )
            },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Filled.Search,
                    contentDescription = "Search",
                    tint = Color(0xFF4A90E2)
                )
            },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { onSearchQueryChange("") }) {
                        Icon(
                            imageVector = Icons.Filled.Clear,
                            contentDescription = "Clear search",
                            tint = Color(0xFF7F8C8D)
                        )
                    }
                }
            },
            colors = TextFieldDefaults.colors(
                focusedContainerColor = Color(0xFF2C3E50),
                unfocusedContainerColor = Color(0xFF2C3E50),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                cursorColor = Color(0xFF4A90E2),
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent
            ),
            shape = RoundedCornerShape(12.dp),
            singleLine = true
        )
        
        AnimatedVisibility(visible = searchQuery.isNotEmpty()) {
            Text(
                text = "$resultsCount result${if (resultsCount != 1) "s" else ""} found",
                fontSize = 14.sp,
                color = Color(0xFF7F8C8D),
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

@Composable
private fun CategorySection(
    categoryName: String,
    pins: List<Pin>,
    onPinClick: (String) -> Unit
) {
    var isExpanded by remember { mutableStateOf(true) }
    val rotationAngle by animateFloatAsState(
        targetValue = if (isExpanded) 180f else 0f,
        animationSpec = tween(durationMillis = 300),
        label = "chevron_rotation"
    )
    
    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { isExpanded = !isExpanded }
                .padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = getCategoryIcon(categoryName),
                contentDescription = categoryName,
                tint = getCategoryColor(categoryName),
                modifier = Modifier
                    .size(24.dp)
                    .padding(end = 8.dp)
            )
            Text(
                text = categoryName,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "(${pins.size})",
                fontSize = 16.sp,
                color = Color(0xFF7F8C8D)
            )
            Spacer(modifier = Modifier.weight(1f))
            Icon(
                imageVector = Icons.Filled.KeyboardArrowDown,
                contentDescription = if (isExpanded) "Collapse" else "Expand",
                tint = Color(0xFF7F8C8D),
                modifier = Modifier
                    .size(24.dp)
                    .rotate(rotationAngle)
            )
        }

        AnimatedVisibility(visible = isExpanded) {
            Column(
                modifier = Modifier.padding(top = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                pins.forEach { pin ->
                    PinCard(
                        pin = pin,
                        onClick = { onPinClick(pin.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun PinCard(
    pin: Pin,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A2332)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        color = getCategoryColor(getCategoryDisplayName(pin.category)).copy(alpha = 0.2f),
                        shape = RoundedCornerShape(8.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = getCategoryIcon(getCategoryDisplayName(pin.category)),
                    contentDescription = null,
                    tint = getCategoryColor(getCategoryDisplayName(pin.category)),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Pin info
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = pin.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                
                Text(
                    text = getCategoryDisplayName(pin.category),
                    fontSize = 14.sp,
                    color = Color(0xFF7F8C8D),
                    modifier = Modifier.padding(top = 4.dp)
                )

                // Show crowd level if available
                pin.metadata?.crowdLevel?.let { crowdLevel ->
                    Row(
                        modifier = Modifier.padding(top = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(
                                    color = when (crowdLevel.name.lowercase()) {
                                        "quiet" -> Color(0xFF27AE60)
                                        "moderate" -> Color(0xFFF39C12)
                                        "busy" -> Color(0xFFE74C3C)
                                        else -> Color.Gray
                                    },
                                    shape = RoundedCornerShape(4.dp)
                                )
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = crowdLevel.name.lowercase().replaceFirstChar { it.uppercase() },
                            fontSize = 12.sp,
                            color = Color(0xFF7F8C8D)
                        )
                    }
                }
            }

            // Arrow icon
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = "View pin",
                tint = Color(0xFF4A90E2),
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@Composable
private fun EmptySearchResults(searchQuery: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Filled.SearchOff,
            contentDescription = "No results",
            tint = Color(0xFF7F8C8D),
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "No pins found for \"$searchQuery\"",
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White
        )
        Text(
            text = "Try searching with different keywords",
            fontSize = 14.sp,
            color = Color(0xFF7F8C8D),
            modifier = Modifier.padding(top = 8.dp)
        )
    }
}

@Composable
private fun EmptyPinsList() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = Icons.Filled.LocationOn,
            contentDescription = "No pins",
            tint = Color(0xFF7F8C8D),
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "No pins available",
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White
        )
        Text(
            text = "Create your first pin to get started",
            fontSize = 14.sp,
            color = Color(0xFF7F8C8D),
            modifier = Modifier.padding(top = 8.dp)
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
                    imageVector = Icons.Filled.People,
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
                    imageVector = Icons.Filled.AccountCircle,
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

// Helper functions
private fun getCategoryDisplayName(category: PinCategory): String {
    return when (category) {
        PinCategory.STUDY -> "Study"
        PinCategory.EVENTS -> "Events"
        PinCategory.CHILL -> "Chill"
        PinCategory.SHOPS_SERVICES -> "Shops & Services"
    }
}

private fun getCategoryIcon(categoryName: String): ImageVector {
    return when (categoryName.lowercase()) {
        "study" -> Icons.Filled.MenuBook
        "events" -> Icons.Filled.Event
        "chill" -> Icons.Filled.Coffee
        "shops & services", "shops_services" -> Icons.Filled.Store
        "public from community" -> Icons.Filled.Public
        "friends" -> Icons.Filled.People
        "private" -> Icons.Filled.Lock
        else -> Icons.Filled.LocationOn
    }
}

private fun getCategoryColor(categoryName: String): Color {
    return when (categoryName.lowercase()) {
        "study" -> Color(0xFF3498DB) // Blue
        "events" -> Color(0xFFE74C3C) // Red
        "chill" -> Color(0xFF27AE60) // Green
        "shops & services", "shops_services" -> Color(0xFFF39C12) // Orange
        "public from community" -> Color(0xFF9B59B6) // Purple
        "friends" -> Color(0xFF1ABC9C) // Teal
        "private" -> Color(0xFF95A5A6) // Gray
        else -> Color(0xFF4A90E2) // Default blue
    }
}

