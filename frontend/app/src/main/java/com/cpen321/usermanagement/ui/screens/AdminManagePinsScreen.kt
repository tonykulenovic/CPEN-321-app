package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cpen321.usermanagement.data.remote.dto.Pin
import com.cpen321.usermanagement.data.remote.dto.PinCategory
import com.cpen321.usermanagement.ui.viewmodels.PinViewModel
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminManagePinsScreen(
    pinViewModel: PinViewModel,
    onBackClick: () -> Unit
) {
    val pinUiState by pinViewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    
    var showDeleteDialog by remember { mutableStateOf(false) }
    var pinToDelete by remember { mutableStateOf<Pin?>(null) }
    
    // System UI colors
    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
    }
    
    // Load pins on first composition
    LaunchedEffect(Unit) {
        pinViewModel.loadPins()
    }
    
    // Show success/error messages
    LaunchedEffect(pinUiState.successMessage) {
        pinUiState.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            pinViewModel.clearSuccessMessage()
        }
    }
    
    LaunchedEffect(pinUiState.error) {
        pinUiState.error?.let {
            snackbarHostState.showSnackbar(it)
            pinViewModel.clearError()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Manage Pins",
                        color = Color.White,
                        fontWeight = FontWeight.Bold
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
                    containerColor = Color(0xFF1A1A2E)
                )
            )
        },
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = Color(0xFF4A90E2),
                    contentColor = Color.White
                )
            }
        },
        containerColor = Color(0xFF16213E)
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (pinUiState.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = Color(0xFF4A90E2)
                )
            } else {
                // Filter to show only user-created pins (not pre-seeded)
                val userCreatedPins = pinUiState.pins.filter { !it.isPreSeeded }
                
                if (userCreatedPins.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = Color(0xFF666666),
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "No User-Created Pins",
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "User pins will appear here",
                            color = Color(0xFF999999),
                            fontSize = 14.sp
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Header with count
                        item {
                            Text(
                                text = "${userCreatedPins.size} User-Created Pins",
                                color = Color.White,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )
                        }
                        
                        items(userCreatedPins) { pin ->
                            PinManagementCard(
                                pin = pin,
                                onDeleteClick = {
                                    pinToDelete = pin
                                    showDeleteDialog = true
                                }
                            )
                        }
                    }
                }
            }
        }
    }
    
    // Delete confirmation dialog
    if (showDeleteDialog && pinToDelete != null) {
        AlertDialog(
            onDismissRequest = {
                showDeleteDialog = false
                pinToDelete = null
            },
            title = {
                Text(
                    text = "Delete Pin?",
                    color = Color.White
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to delete \"${pinToDelete!!.name}\"? This action cannot be undone.",
                    color = Color(0xFFCCCCCC)
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        pinToDelete?.let { pin ->
                            pinViewModel.deletePin(pin.id)
                        }
                        showDeleteDialog = false
                        pinToDelete = null
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = Color(0xFFE74C3C)
                    )
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        pinToDelete = null
                    }
                ) {
                    Text("Cancel", color = Color.White)
                }
            },
            containerColor = Color(0xFF1A1A2E)
        )
    }
}

@Composable
private fun PinManagementCard(
    pin: Pin,
    onDeleteClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A1A2E)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Pin header with name and category
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = pin.name,
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Category badge
                        Surface(
                            shape = MaterialTheme.shapes.small,
                            color = getCategoryColor(pin.category).copy(alpha = 0.2f)
                        ) {
                            Text(
                                text = pin.category.name.replace("_", " "),
                                color = getCategoryColor(pin.category),
                                fontSize = 12.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                        
                        // Visibility badge
                        Icon(
                            imageVector = when (pin.visibility.name) {
                                "PUBLIC" -> Icons.Default.Public
                                "FRIENDS_ONLY" -> Icons.Default.Group
                                "PRIVATE" -> Icons.Default.Lock
                                else -> Icons.Default.Public
                            },
                            contentDescription = null,
                            tint = Color(0xFF999999),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
                
                // Delete button
                IconButton(
                    onClick = onDeleteClick,
                    colors = IconButtonDefaults.iconButtonColors(
                        contentColor = Color(0xFFE74C3C)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Delete Pin"
                    )
                }
            }
            
            // Description
            if (pin.description.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = pin.description,
                    color = Color(0xFFCCCCCC),
                    fontSize = 14.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            
            // Creator info
            Spacer(modifier = Modifier.height(12.dp))
            Divider(color = Color(0xFF2A2A3E))
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Creator
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = Color(0xFF999999),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = pin.createdBy.name,
                        color = Color(0xFF999999),
                        fontSize = 12.sp
                    )
                }
                
                // Location
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Place,
                        contentDescription = null,
                        tint = Color(0xFF999999),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "${String.format("%.4f", pin.location.latitude)}, ${String.format("%.4f", pin.location.longitude)}",
                        color = Color(0xFF999999),
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

private fun getCategoryColor(category: PinCategory): Color {
    return when (category) {
        PinCategory.STUDY -> Color(0xFF3498DB)
        PinCategory.EVENTS -> Color(0xFFE74C3C)
        PinCategory.CHILL -> Color(0xFF2ECC71)
        PinCategory.SHOPS_SERVICES -> Color(0xFF9B59B6)
    }
}

