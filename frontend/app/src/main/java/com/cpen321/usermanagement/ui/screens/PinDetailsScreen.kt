package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material.icons.outlined.ThumbDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
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
    
    // Local state for instant UI feedback (optimistic UI)
    var optimisticUserVote by remember(pin?.id) { mutableStateOf(pin?.userVote) }
    var optimisticUpvotes by remember(pin?.id) { mutableIntStateOf(pin?.rating?.upvotes ?: 0) }
    var optimisticDownvotes by remember(pin?.id) { mutableIntStateOf(pin?.rating?.downvotes ?: 0) }
    
    // Sync with actual pin data when it changes
    LaunchedEffect(pin?.userVote, pin?.rating?.upvotes, pin?.rating?.downvotes) {
        pin?.let {
            optimisticUserVote = it.userVote
            optimisticUpvotes = it.rating.upvotes
            optimisticDownvotes = it.rating.downvotes
        }
    }
    
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
    
    // Snackbar for success/error messages
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    
    // Handle success messages
    LaunchedEffect(pinUiState.successMessage) {
        pinUiState.successMessage?.let { message ->
            if (message.contains("deleted", ignoreCase = true)) {
                pinViewModel.clearSuccessMessage()
                onNavigateBack()
            } else {
                // Show other success messages (like "Pin reported")
                snackbarHostState.showSnackbar(message)
                pinViewModel.clearSuccessMessage()
            }
        }
    }
    
    // Handle error messages
    LaunchedEffect(pinUiState.error) {
        pinUiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            pinViewModel.clearError()
        }
    }
    
    ModalBottomSheet(
        onDismissRequest = onNavigateBack,
        sheetState = sheetState,
        containerColor = Color(0xFF16213E),
        contentColor = Color.White,
        modifier = Modifier.testTag("pin_details_bottom_sheet"),
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
                            IconButton(
                                onClick = { onEditClick(pin.id) },
                                modifier = Modifier.testTag("pin_edit_button")
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = "Edit Pin",
                                    tint = Color.White
                                )
                            }
                            IconButton(
                                onClick = { showDeleteDialog = true },
                                modifier = Modifier.testTag("pin_delete_button")
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Delete Pin",
                                    tint = Color(0xFFE74C3C)
                                )
                            }
                        }
                        
                        // Report button (show for all users except pin owner, and exclude pre-seeded and friends-only pins)
                        if (pin != null && 
                            currentUserId != null && 
                            pin.createdBy.id != currentUserId &&
                            !pin.isPreSeeded &&
                            pin.visibility != PinVisibility.FRIENDS_ONLY) {
                            IconButton(
                                onClick = { 
                                    android.util.Log.d("PinDetails", "Report button clicked for pin ${pin.id}")
                                    showReportDialog = true 
                                },
                                modifier = Modifier.testTag("pin_report_button")
                            ) {
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
        Box(modifier = Modifier.fillMaxSize()) {
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
                        optimisticUserVote = optimisticUserVote,
                        onOptimisticUserVoteChange = { optimisticUserVote = it },
                        optimisticUpvotes = optimisticUpvotes,
                        onOptimisticUpvotesChange = { optimisticUpvotes = it },
                        optimisticDownvotes = optimisticDownvotes,
                        onOptimisticDownvotesChange = { optimisticDownvotes = it },
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
            
            // Snackbar host at bottom for success/error messages
            SnackbarHost(
                hostState = snackbarHostState,
                modifier = Modifier.align(Alignment.BottomCenter)
            ) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = Color(0xFF4A90E2),
                    contentColor = Color.White
                )
            }
        }
        
        // Error snackbar at bottom (legacy - can be removed if not needed)
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
                    Text("Reason for reporting (optional):")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = reportReason,
                        onValueChange = { reportReason = it },
                        placeholder = { Text("Enter reason (optional)...") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        android.util.Log.d("PinDetails", "Reporting pin $pinId with reason: $reportReason")
                        pinViewModel.reportPin(pinId, reportReason.ifBlank { "" })
                        showReportDialog = false
                        reportReason = ""
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = Color(0xFFE74C3C)
                    )
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
    optimisticUserVote: String?,
    onOptimisticUserVoteChange: (String?) -> Unit,
    optimisticUpvotes: Int,
    onOptimisticUpvotesChange: (Int) -> Unit,
    optimisticDownvotes: Int,
    onOptimisticDownvotesChange: (Int) -> Unit,
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
                val isUpvoted = optimisticUserVote == "upvote"
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Card(
                        modifier = Modifier.size(68.dp).testTag("pin_upvote_button"),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isUpvoted) 
                                Color(0xFF4CAF50).copy(alpha = 0.2f) 
                            else 
                                Color(0xFF2C2C3E)
                        ),
                        shape = RoundedCornerShape(12.dp),
                        elevation = CardDefaults.cardElevation(
                            defaultElevation = if (isUpvoted) 4.dp else 0.dp
                        )
                    ) {
                        IconButton(
                            onClick = { 
                                // INSTANT UI UPDATE - before ViewModel processes
                                val currentVote = optimisticUserVote
                                val newVote = if (currentVote == "upvote") null else "upvote"
                                
                                // Calculate changes
                                var newUpvotes = optimisticUpvotes
                                var newDownvotes = optimisticDownvotes
                                
                                when {
                                    currentVote == null -> {
                                        newUpvotes += 1
                                    }
                                    currentVote == "upvote" -> {
                                        newUpvotes -= 1
                                    }
                                    currentVote == "downvote" -> {
                                        newUpvotes += 1
                                        newDownvotes -= 1
                                    }
                                }
                                
                                onOptimisticUserVoteChange(newVote)
                                onOptimisticUpvotesChange(newUpvotes)
                                onOptimisticDownvotesChange(newDownvotes)
                                
                                // Then trigger backend update
                                pinViewModel.ratePin(pinId, "upvote")
                            },
                            modifier = Modifier.fillMaxSize()
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = if (isUpvoted) 
                                        Icons.Filled.ThumbUp 
                                    else 
                                        Icons.Outlined.ThumbUp,
                                    contentDescription = "Upvote",
                                    tint = if (isUpvoted) 
                                        Color(0xFF4CAF50) 
                                    else 
                                        Color(0xFF7F8C8D),
                                    modifier = Modifier.size(24.dp)
                                )
                                Text(
                                    text = optimisticUpvotes.toString(),
                                    color = if (isUpvoted) 
                                        Color(0xFF4CAF50) 
                                    else 
                                        Color.White,
                                    fontSize = 16.sp,
                                    fontWeight = if (isUpvoted) 
                                        FontWeight.Bold 
                                    else 
                                        FontWeight.Normal,
                                    modifier = Modifier.testTag("pin_upvote_count")
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (isUpvoted) "Upvoted" else "Upvote",
                        color = if (isUpvoted) 
                            Color(0xFF4CAF50) 
                        else 
                            Color(0xFFB0B0B0),
                        fontSize = 12.sp,
                        fontWeight = if (isUpvoted) FontWeight.Bold else FontWeight.Normal
                    )
                }
                
                // Downvote Button
                val isDownvoted = optimisticUserVote == "downvote"
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Card(
                        modifier = Modifier.size(68.dp).testTag("pin_downvote_button"),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isDownvoted) 
                                Color(0xFFE74C3C).copy(alpha = 0.2f) 
                            else 
                                Color(0xFF2C2C3E)
                        ),
                        shape = RoundedCornerShape(12.dp),
                        elevation = CardDefaults.cardElevation(
                            defaultElevation = if (isDownvoted) 4.dp else 0.dp
                        )
                    ) {
                        IconButton(
                            onClick = { 
                                // INSTANT UI UPDATE - before ViewModel processes
                                val currentVote = optimisticUserVote
                                val newVote = if (currentVote == "downvote") null else "downvote"
                                
                                // Calculate changes
                                var newUpvotes = optimisticUpvotes
                                var newDownvotes = optimisticDownvotes
                                
                                when {
                                    currentVote == null -> {
                                        newDownvotes += 1
                                    }
                                    currentVote == "downvote" -> {
                                        newDownvotes -= 1
                                    }
                                    currentVote == "upvote" -> {
                                        newDownvotes += 1
                                        newUpvotes -= 1
                                    }
                                }
                                
                                onOptimisticUserVoteChange(newVote)
                                onOptimisticUpvotesChange(newUpvotes)
                                onOptimisticDownvotesChange(newDownvotes)
                                
                                // Then trigger backend update
                                pinViewModel.ratePin(pinId, "downvote")
                            },
                            modifier = Modifier.fillMaxSize()
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = if (isDownvoted) 
                                        Icons.Filled.ThumbDown 
                                    else 
                                        Icons.Outlined.ThumbDown,
                                    contentDescription = "Downvote",
                                    tint = if (isDownvoted) 
                                        Color(0xFFE74C3C) 
                                    else 
                                        Color(0xFF7F8C8D),
                                    modifier = Modifier.size(24.dp)
                                )
                                Text(
                                    text = optimisticDownvotes.toString(),
                                    color = if (isDownvoted) 
                                        Color(0xFFE74C3C) 
                                    else 
                                        Color.White,
                                    fontSize = 16.sp,
                                    fontWeight = if (isDownvoted) 
                                        FontWeight.Bold 
                                    else 
                                        FontWeight.Normal,
                                    modifier = Modifier.testTag("pin_downvote_count")
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (isDownvoted) "Downvoted" else "Downvote",
                        color = if (isDownvoted) 
                            Color(0xFFE74C3C) 
                        else 
                            Color(0xFFB0B0B0),
                        fontSize = 12.sp,
                        fontWeight = if (isDownvoted) FontWeight.Bold else FontWeight.Normal
                    )
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
            modifier = Modifier.fillMaxWidth().testTag("pin_location_card"),
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
            modifier = Modifier.fillMaxWidth().testTag("pin_creator_card"),
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