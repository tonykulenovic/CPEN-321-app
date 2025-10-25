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
    
    // Show report dialog
    var showReportDialog by remember { mutableStateOf(false) }
    var reportReason by remember { mutableStateOf("") }
    
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
                        
                        // Report button (show for all users except pin owner)
                        if (pin != null && currentUserId != null && pin.createdBy.id != currentUserId) {
                            IconButton(onClick = { showReportDialog = true }) {
                                Icon(
                                    imageVector = Icons.Default.Report,
                                    contentDescription = "Report Pin",
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
                    pinViewModel = pinViewModel,
                    pinId = pinId,
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
    
    // Report pin dialog
    if (showReportDialog) {
        AlertDialog(
            onDismissRequest = { 
                showReportDialog = false
                reportReason = ""
            },
            title = { Text("Report Pin") },
            text = { 
                Column {
                    Text("Please provide a reason for reporting this pin:")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = reportReason,
                        onValueChange = { reportReason = it },
                        placeholder = { Text("Enter reason...") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        if (reportReason.isNotBlank()) {
                            pinViewModel.reportPin(pinId, reportReason)
                            showReportDialog = false
                            reportReason = ""
                        }
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = Color(0xFFE74C3C)
                    ),
                    enabled = reportReason.isNotBlank()
                ) {
                    Text("Report")
                }
            },
            dismissButton = {
                TextButton(onClick = { 
                    showReportDialog = false
                    reportReason = ""
                }) {
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
    pinViewModel: PinViewModel,
    pinId: String,
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
                // Upvote Button
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    IconButton(
                        onClick = { pinViewModel.ratePin(pinId, "upvote") },
                        modifier = Modifier.size(48.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.ThumbUp,
                                contentDescription = "Upvote",
                                tint = Color(0xFF4CAF50),
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = pin.rating.upvotes.toString(),
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Text("Upvote", color = Color(0xFFB0B0B0), fontSize = 12.sp)
                }
                
                // Downvote Button
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    IconButton(
                        onClick = { pinViewModel.ratePin(pinId, "downvote") },
                        modifier = Modifier.size(48.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.ThumbDown,
                                contentDescription = "Downvote",
                                tint = Color(0xFFE74C3C),
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = pin.rating.downvotes.toString(),
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Text("Downvote", color = Color(0xFFB0B0B0), fontSize = 12.sp)
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
                        EnhancedCapacityDisplay(capacity = capacity)
                    }
                    
                    metadata.openingHours?.let { hours ->
                        EnhancedOpeningHoursDisplay(hours = hours)
                    }
                    
                    metadata.crowdLevel?.let { level ->
                        EnhancedCrowdLevelDisplay(crowdLevel = level)
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

@Composable
private fun EnhancedCapacityDisplay(capacity: Int) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = Icons.Default.People,
            contentDescription = null,
            tint = Color(0xFF4A90E2),
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text("Capacity", color = Color(0xFFB0B0B0), fontSize = 14.sp)
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "$capacity people",
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun EnhancedOpeningHoursDisplay(hours: String) {
    val isOpenNow = remember { 
        // Simple check for "Open Now" - you can enhance this with actual time parsing
        hours.contains("Open") || hours.contains("24/7") || hours.contains("Always")
    }
    
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = Icons.Default.Schedule,
            contentDescription = null,
            tint = if (isOpenNow) Color(0xFF2ECC71) else Color(0xFFE74C3C),
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text("Hours", color = Color(0xFFB0B0B0), fontSize = 14.sp)
        Spacer(modifier = Modifier.width(8.dp))
        if (isOpenNow) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF2ECC71)),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "Open Now",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
        Text(
            text = hours,
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun EnhancedCrowdLevelDisplay(crowdLevel: CrowdLevel) {
    val (color, icon, label) = when (crowdLevel) {
        CrowdLevel.QUIET -> Triple(Color(0xFF2ECC71), Icons.Default.People, "Quiet")
        CrowdLevel.MODERATE -> Triple(Color(0xFFF39C12), Icons.Default.Group, "Moderate")
        CrowdLevel.BUSY -> Triple(Color(0xFFE74C3C), Icons.Default.Group, "Busy")
    }
    
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text("Crowd Level", color = Color(0xFFB0B0B0), fontSize = 14.sp)
        Spacer(modifier = Modifier.width(8.dp))
        Card(
            colors = CardDefaults.cardColors(containerColor = color),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text(
                text = label,
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}

private fun getVisibilityLabel(visibility: PinVisibility): String {
    return when (visibility) {
        PinVisibility.PUBLIC -> "Public"
        PinVisibility.FRIENDS_ONLY -> "Friends Only"
        PinVisibility.PRIVATE -> "Private"
    }
}