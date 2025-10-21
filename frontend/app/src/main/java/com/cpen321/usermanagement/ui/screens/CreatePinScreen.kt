package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cpen321.usermanagement.data.remote.dto.*
import com.cpen321.usermanagement.ui.viewmodels.PinUiState
import com.cpen321.usermanagement.ui.viewmodels.PinViewModel
import com.google.accompanist.systemuicontroller.rememberSystemUiController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreatePinScreen(
    pinViewModel: PinViewModel,
    currentLocation: Pair<Double, Double>?, // lat, lng
    onNavigateBack: () -> Unit,
    onPickLocationClick: () -> Unit
) {
    val uiState by pinViewModel.uiState.collectAsState()
    
    // System UI colors
    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
    }
    
    // Form state - use rememberSaveable to persist across navigation
    var name by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var selectedCategory by rememberSaveable { mutableStateOf(PinCategory.STUDY) }
    var latitude by rememberSaveable { mutableStateOf(currentLocation?.first?.toString() ?: "") }
    var longitude by rememberSaveable { mutableStateOf(currentLocation?.second?.toString() ?: "") }
    var address by rememberSaveable { mutableStateOf("") }
    
    // Optional metadata
    var capacity by rememberSaveable { mutableStateOf("") }
    var openingHours by rememberSaveable { mutableStateOf("") }
    var amenitiesText by rememberSaveable { mutableStateOf("") }
    var crowdLevel by rememberSaveable { mutableStateOf<CrowdLevel?>(null) }
    
    // Show/hide optional fields
    var showOptionalFields by rememberSaveable { mutableStateOf(false) }
    
    // Update location fields when returning from location picker
    LaunchedEffect(currentLocation) {
        currentLocation?.let { (lat, lng) ->
            latitude = lat.toString()
            longitude = lng.toString()
        }
    }
    
    // Handle success
    LaunchedEffect(uiState.successMessage) {
        if (uiState.successMessage != null) {
            pinViewModel.clearSuccessMessage()
            onNavigateBack()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Create Pin",
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
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
        containerColor = Color(0xFF16213E)
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Error message
            uiState.error?.let { error ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFFF5555)
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                ) {
                    Text(
                        text = error,
                        color = Color.White,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
            
            // Name
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Pin Name *", color = Color(0xFFB0B0B0)) },
                placeholder = { Text("e.g., Study Room 201", color = Color(0xFF666666)) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = Color(0xFF4A90E2),
                    unfocusedBorderColor = Color(0xFF666666),
                    cursorColor = Color(0xFF4A90E2)
                ),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Category Selection
            Text(
                "Category *",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CategoryChip(
                    category = PinCategory.STUDY,
                    icon = Icons.Default.MenuBook,
                    label = "Study",
                    isSelected = selectedCategory == PinCategory.STUDY,
                    onClick = { selectedCategory = PinCategory.STUDY },
                    modifier = Modifier.weight(1f)
                )
                CategoryChip(
                    category = PinCategory.EVENTS,
                    icon = Icons.Default.Event,
                    label = "Events",
                    isSelected = selectedCategory == PinCategory.EVENTS,
                    onClick = { selectedCategory = PinCategory.EVENTS },
                    modifier = Modifier.weight(1f)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CategoryChip(
                    category = PinCategory.CHILL,
                    icon = Icons.Default.LocalCafe,
                    label = "Chill",
                    isSelected = selectedCategory == PinCategory.CHILL,
                    onClick = { selectedCategory = PinCategory.CHILL },
                    modifier = Modifier.weight(1f)
                )
                CategoryChip(
                    category = PinCategory.SHOPS_SERVICES,
                    icon = Icons.Default.ShoppingBag,
                    label = "Shops",
                    isSelected = selectedCategory == PinCategory.SHOPS_SERVICES,
                    onClick = { selectedCategory = PinCategory.SHOPS_SERVICES },
                    modifier = Modifier.weight(1f)
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Description
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description *", color = Color(0xFFB0B0B0)) },
                placeholder = { Text("Describe this location (min 10 characters)", color = Color(0xFF666666)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = Color(0xFF4A90E2),
                    unfocusedBorderColor = Color(0xFF666666),
                    cursorColor = Color(0xFF4A90E2)
                ),
                maxLines = 5
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Location
            Text(
                "Location *",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(8.dp))
            
            // Location picker button
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onPickLocationClick() },
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF1A1A2E)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(
                        modifier = Modifier.weight(1f)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = Color(0xFF4A90E2),
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                if (latitude.isNotBlank() && longitude.isNotBlank()) "Location Selected" else "Pick Location on Map",
                                color = Color.White,
                                fontWeight = FontWeight.Medium,
                                fontSize = 16.sp
                            )
                        }
                        if (latitude.isNotBlank() && longitude.isNotBlank()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Lat: ${String.format("%.6f", latitude.toDoubleOrNull() ?: 0.0)}, Lng: ${String.format("%.6f", longitude.toDoubleOrNull() ?: 0.0)}",
                                color = Color(0xFFB0B0B0),
                                fontSize = 12.sp
                            )
                        }
                    }
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = Color(0xFF4A90E2)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            OutlinedTextField(
                value = address,
                onValueChange = { address = it },
                label = { Text("Address (Optional)", color = Color(0xFFB0B0B0)) },
                placeholder = { Text("e.g., Irving K. Barber Learning Centre", color = Color(0xFF666666)) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = Color(0xFF4A90E2),
                    unfocusedBorderColor = Color(0xFF666666),
                    cursorColor = Color(0xFF4A90E2)
                ),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Optional fields toggle
            TextButton(
                onClick = { showOptionalFields = !showOptionalFields },
                colors = ButtonDefaults.textButtonColors(
                    contentColor = Color(0xFF4A90E2)
                )
            ) {
                Icon(
                    imageVector = if (showOptionalFields) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(if (showOptionalFields) "Hide Optional Fields" else "Show Optional Fields")
            }
            
            if (showOptionalFields) {
                Spacer(modifier = Modifier.height(8.dp))
                
                // Capacity
                OutlinedTextField(
                    value = capacity,
                    onValueChange = { capacity = it },
                    label = { Text("Capacity", color = Color(0xFFB0B0B0)) },
                    placeholder = { Text("Max number of people", color = Color(0xFF666666)) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF4A90E2),
                        unfocusedBorderColor = Color(0xFF666666),
                        cursorColor = Color(0xFF4A90E2)
                    ),
                    singleLine = true
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Opening Hours
                OutlinedTextField(
                    value = openingHours,
                    onValueChange = { openingHours = it },
                    label = { Text("Opening Hours", color = Color(0xFFB0B0B0)) },
                    placeholder = { Text("e.g., 8 AM - 10 PM", color = Color(0xFF666666)) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF4A90E2),
                        unfocusedBorderColor = Color(0xFF666666),
                        cursorColor = Color(0xFF4A90E2)
                    ),
                    singleLine = true
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Amenities
                OutlinedTextField(
                    value = amenitiesText,
                    onValueChange = { amenitiesText = it },
                    label = { Text("Amenities", color = Color(0xFFB0B0B0)) },
                    placeholder = { Text("Comma-separated, e.g., WiFi, Outlets, Coffee", color = Color(0xFF666666)) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF4A90E2),
                        unfocusedBorderColor = Color(0xFF666666),
                        cursorColor = Color(0xFF4A90E2)
                    ),
                    maxLines = 2
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Crowd Level
                Text(
                    "Crowd Level",
                    color = Color.White,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    CrowdLevelChip(
                        level = CrowdLevel.QUIET,
                        label = "Quiet",
                        isSelected = crowdLevel == CrowdLevel.QUIET,
                        onClick = { crowdLevel = if (crowdLevel == CrowdLevel.QUIET) null else CrowdLevel.QUIET },
                        modifier = Modifier.weight(1f)
                    )
                    CrowdLevelChip(
                        level = CrowdLevel.MODERATE,
                        label = "Moderate",
                        isSelected = crowdLevel == CrowdLevel.MODERATE,
                        onClick = { crowdLevel = if (crowdLevel == CrowdLevel.MODERATE) null else CrowdLevel.MODERATE },
                        modifier = Modifier.weight(1f)
                    )
                    CrowdLevelChip(
                        level = CrowdLevel.BUSY,
                        label = "Busy",
                        isSelected = crowdLevel == CrowdLevel.BUSY,
                        onClick = { crowdLevel = if (crowdLevel == CrowdLevel.BUSY) null else CrowdLevel.BUSY },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Create Button
            Button(
                onClick = {
                    val latDouble = latitude.toDoubleOrNull()
                    val lngDouble = longitude.toDoubleOrNull()
                    
                    // Validation with error messages
                    when {
                        name.isBlank() -> {
                            pinViewModel.setError("Please enter a pin name")
                            return@Button
                        }
                        description.length < 10 -> {
                            pinViewModel.setError("Description must be at least 10 characters")
                            return@Button
                        }
                        latDouble == null || lngDouble == null -> {
                            pinViewModel.setError("Please select a location on the map")
                            return@Button
                        }
                    }
                    
                    val metadata = if (showOptionalFields && (capacity.isNotBlank() || openingHours.isNotBlank() || amenitiesText.isNotBlank() || crowdLevel != null)) {
                        PinMetadata(
                            capacity = capacity.toIntOrNull(),
                            openingHours = openingHours.ifBlank { null },
                            amenities = if (amenitiesText.isNotBlank()) amenitiesText.split(",").map { it.trim() } else null,
                            crowdLevel = crowdLevel
                        )
                    } else null
                    
                    val request = CreatePinRequest(
                        name = name,
                        category = selectedCategory,
                        description = description,
                        location = PinLocation(
                            latitude = latDouble,
                            longitude = lngDouble,
                            address = address.ifBlank { null }
                        ),
                        metadata = metadata
                    )
                    
                    pinViewModel.createPin(request)
                    // Navigation handled by LaunchedEffect when successMessage is set
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF4A90E2),
                    contentColor = Color.White
                ),
                enabled = !uiState.isCreating
            ) {
                if (uiState.isCreating) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.AddLocation,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Create Pin", fontSize = 16.sp)
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun CategoryChip(
    category: PinCategory,
    icon: ImageVector,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .height(60.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) Color(0xFF4A90E2) else Color(0xFF1A1A2E)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (isSelected) Color.White else Color(0xFF4A90E2),
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = label,
                color = if (isSelected) Color.White else Color(0xFF4A90E2),
                fontSize = 12.sp
            )
        }
    }
}

@Composable
private fun CrowdLevelChip(
    level: CrowdLevel,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .height(40.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) Color(0xFF4A90E2) else Color(0xFF1A1A2E)
        ),
        shape = RoundedCornerShape(8.dp)
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = label,
                color = if (isSelected) Color.White else Color(0xFF4A90E2),
                fontSize = 14.sp
            )
        }
    }
}