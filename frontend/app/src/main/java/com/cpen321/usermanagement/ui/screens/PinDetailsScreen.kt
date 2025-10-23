package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import com.cpen321.usermanagement.data.remote.dto.*
import com.cpen321.usermanagement.ui.viewmodels.PinViewModel
import com.cpen321.usermanagement.ui.viewmodels.ProfileViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PinDetailsScreen(
    pinId: String,
    pinViewModel: PinViewModel,
    profileViewModel: ProfileViewModel,
    onNavigateBack: () -> Unit,
    onEditClick: (String) -> Unit
) {
    val pinUiState by pinViewModel.uiState.collectAsState()
    val profileUiState by profileViewModel.uiState.collectAsState()
    
    val pin = pinUiState.currentPin
    val currentUserId = profileUiState.user?._id
    
    val sheetState = rememberModalBottomSheetState(
        skipPartiallyExpanded = false
    )
    
    // Load pin details (cache-first for instant loading)
    // Note: Profile is pre-loaded in MainScreen for instant ownership checks
    LaunchedEffect(pinId) {
        pinViewModel.getPinFromCacheOrFetch(pinId)
    }
    
    // Show delete confirmation dialog
    var showDeleteDialog by remember { mutableStateOf(false) }
    
    // Handle success messages
    LaunchedEffect(pinUiState.successMessage) {
        if (pinUiState.successMessage?.contains("deleted") == true) {
            pinViewModel.clearSuccessMessage()
            onNavigateBack()
        }
    }
    
    ModalBottomSheet(
        onDismissRequest = onNavigateBack,
        sheetState = sheetState,
        containerColor = Color(0xFF16213E),
        contentColor = Color.White,
        dragHandle = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF1A1A2E))
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                // Drag handle
                Box(
                    modifier = Modifier
                        .align(Alignment.CenterHorizontally)
                        .width(40.dp)
                        .height(4.dp)
                        .background(Color(0xFF4A90E2), RoundedCornerShape(2.dp))
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Header with title and action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Pin Details",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                    
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        // Show edit/delete buttons if user owns the pin
                        if (pin != null && currentUserId != null && pin.createdBy.id == currentUserId) {
                            IconButton(onClick = { onEditClick(pin.id) }) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = "Edit Pin",
                                    tint = Color.White
                                )
                            }
                            IconButton(onClick = { showDeleteDialog = true }) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Delete Pin",
                                    tint = Color(0xFFE74C3C)
                                )
                            }
                        }
                        
                        IconButton(onClick = onNavigateBack) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = Color.White
                            )
                        }
                    }
                }
            }
        },
        scrimColor = Color.Black.copy(alpha = 0.6f)
    ) {
        when {
            pinUiState.isLoading && pin == null -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(300.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF4A90E2))
                }
            }
            pin != null -> {
                PinDetailsContent(
                    pin = pin,
                    isOwner = pin.createdBy.id == currentUserId,
                    modifier = Modifier
                )
            }
            else -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "Pin not found",
                        color = Color.White,
                        fontSize = 16.sp
                    )
                }
            }
        }
        
        // Error snackbar at bottom
        pinUiState.error?.let { error ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                color = Color(0xFFE74C3C),
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(error, color = Color.White, modifier = Modifier.weight(1f))
                    TextButton(onClick = { pinViewModel.clearError() }) {
                        Text("Dismiss", color = Color.White)
                    }
                }
            }
        }
    }
    
    // Delete confirmation dialog
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Pin?") },
            text = { Text("Are you sure you want to delete this pin? This action cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        pinViewModel.deletePin(pinId)
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = Color(0xFFE74C3C)
                    )
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun PinDetailsContent(
    pin: Pin,
    isOwner: Boolean,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Pin Image (if exists)
        pin.imageUrl?.let { imageUrl ->
            SubcomposeAsyncImage(
                model = imageUrl,
                contentDescription = "Pin Image",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(12.dp)),
                contentScale = ContentScale.Crop,
                loading = {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color(0xFF4A90E2))
                    }
                }
            )
        }
        
        // Pin Name
        Text(
            text = pin.name,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        
        // Category and Visibility Badges
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Category Badge
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = getCategoryColor(pin.category).copy(alpha = 0.2f),
                modifier = Modifier.wrapContentSize()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = getCategoryIcon(pin.category),
                        contentDescription = null,
                        tint = getCategoryColor(pin.category),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = pin.category.name.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() },
                        color = getCategoryColor(pin.category),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            
            // Visibility Badge
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = getVisibilityColor(pin.visibility).copy(alpha = 0.2f),
                modifier = Modifier.wrapContentSize()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = getVisibilityIcon(pin.visibility),
                        contentDescription = null,
                        tint = getVisibilityColor(pin.visibility),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = getVisibilityLabel(pin.visibility),
                        color = getVisibilityColor(pin.visibility),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
        
        // Rating Section
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A2E)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.ThumbUp,
                            contentDescription = "Upvotes",
                            tint = Color(0xFF4CAF50),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = pin.rating.upvotes.toString(),
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text("Upvotes", color = Color(0xFFB0B0B0), fontSize = 12.sp)
                }
                
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.ThumbDown,
                            contentDescription = "Downvotes",
                            tint = Color(0xFFE74C3C),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = pin.rating.downvotes.toString(),
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text("Downvotes", color = Color(0xFFB0B0B0), fontSize = 12.sp)
                }
            }
        }
        
        // Description
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A2E)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Description",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = pin.description,
                    fontSize = 14.sp,
                    color = Color(0xFFB0B0B0),
                    lineHeight = 20.sp
                )
            }
        }
        
        // Location
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A2E)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = "Location",
                        tint = Color(0xFF4A90E2),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Location",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                pin.location.address?.let { address ->
                    Text(
                        text = address,
                        fontSize = 14.sp,
                        color = Color(0xFFB0B0B0)
                    )
                }
                Text(
                    text = "Lat: ${pin.location.latitude}, Lng: ${pin.location.longitude}",
                    fontSize = 12.sp,
                    color = Color(0xFF808080)
                )
            }
        }
        
        // Metadata (if exists)
        pin.metadata?.let { metadata ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A2E)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Additional Information",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    
                    metadata.capacity?.let { capacity ->
                        InfoRow(icon = Icons.Default.People, label = "Capacity", value = capacity.toString())
                    }
                    
                    metadata.openingHours?.let { hours ->
                        InfoRow(icon = Icons.Default.Schedule, label = "Opening Hours", value = hours)
                    }
                    
                    metadata.crowdLevel?.let { level ->
                        InfoRow(
                            icon = Icons.Default.Group,
                            label = "Crowd Level",
                            value = level.name.lowercase().replaceFirstChar { it.uppercase() }
                        )
                    }
                    
                    metadata.amenities?.let { amenities ->
                        if (amenities.isNotEmpty()) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = Color(0xFF4A90E2),
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Amenities", color = Color(0xFFB0B0B0), fontSize = 14.sp)
                                }
                                amenities.forEach { amenity ->
                                    Text(
                                        text = "• $amenity",
                                        color = Color.White,
                                        fontSize = 14.sp,
                                        modifier = Modifier.padding(start = 26.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Creator Info
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A2E)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Profile picture
                SubcomposeAsyncImage(
                    model = pin.createdBy.profilePicture,
                    contentDescription = "Creator Profile",
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(24.dp)),
                    contentScale = ContentScale.Crop,
                    loading = {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color(0xFF4A90E2)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    },
                    error = {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color(0xFF4A90E2)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                )
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column {
                    Text(
                        text = if (isOwner) "You created this pin" else "Created by",
                        fontSize = 12.sp,
                        color = Color(0xFF808080)
                    )
                    Text(
                        text = pin.createdBy.name,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White
                    )
                }
            }
        }
    }
}

@Composable
private fun InfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color(0xFF4A90E2),
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(label, color = Color(0xFFB0B0B0), fontSize = 14.sp)
        Spacer(modifier = Modifier.width(4.dp))
        Text(value, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}

private fun getCategoryIcon(category: PinCategory): androidx.compose.ui.graphics.vector.ImageVector {
    return when (category) {
        PinCategory.STUDY -> Icons.Default.Book
        PinCategory.EVENTS -> Icons.Default.Event
        PinCategory.CHILL -> Icons.Default.Weekend
        PinCategory.SHOPS_SERVICES -> Icons.Default.Store
    }
}

private fun getCategoryColor(category: PinCategory): Color {
    return when (category) {
        PinCategory.STUDY -> Color(0xFF4A90E2)
        PinCategory.EVENTS -> Color(0xFFE74C3C)
        PinCategory.CHILL -> Color(0xFF2ECC71)
        PinCategory.SHOPS_SERVICES -> Color(0xFFF39C12)
    }
}

private fun getVisibilityIcon(visibility: PinVisibility): androidx.compose.ui.graphics.vector.ImageVector {
    return when (visibility) {
        PinVisibility.PUBLIC -> Icons.Default.Public
        PinVisibility.FRIENDS_ONLY -> Icons.Default.Group
        PinVisibility.PRIVATE -> Icons.Default.Lock
    }
}

private fun getVisibilityColor(visibility: PinVisibility): Color {
    return when (visibility) {
        PinVisibility.PUBLIC -> Color(0xFF2ECC71) // Green
        PinVisibility.FRIENDS_ONLY -> Color(0xFF4A90E2) // Blue
        PinVisibility.PRIVATE -> Color(0xFFF39C12) // Orange
    }
}

private fun getVisibilityLabel(visibility: PinVisibility): String {
    return when (visibility) {
        PinVisibility.PUBLIC -> "Public"
        PinVisibility.FRIENDS_ONLY -> "Friends Only"
        PinVisibility.PRIVATE -> "Private"
    }
}