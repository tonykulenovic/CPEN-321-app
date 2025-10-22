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
import com.cpen321.usermanagement.ui.viewmodels.PinViewModel
import com.google.accompanist.systemuicontroller.rememberSystemUiController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditPinScreen(
    pinId: String,
    pinViewModel: PinViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by pinViewModel.uiState.collectAsState()
    val pin = uiState.currentPin
    
    // System UI colors
    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
    }
    
    // Load pin details
    LaunchedEffect(pinId) {
        pinViewModel.getPin(pinId)
    }
    
    // Form state - initialize with pin data when loaded
    var name by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var capacity by rememberSaveable { mutableStateOf("") }
    var openingHours by rememberSaveable { mutableStateOf("") }
    var amenitiesText by rememberSaveable { mutableStateOf("") }
    var crowdLevel by rememberSaveable { mutableStateOf<CrowdLevel?>(null) }
    var showOptionalFields by rememberSaveable { mutableStateOf(false) }
    
    // Initialize form fields when pin is loaded
    LaunchedEffect(pin) {
        pin?.let {
            name = it.name
            description = it.description
            capacity = it.metadata?.capacity?.toString() ?: ""
            openingHours = it.metadata?.openingHours ?: ""
            amenitiesText = it.metadata?.amenities?.joinToString(", ") ?: ""
            crowdLevel = it.metadata?.crowdLevel
            showOptionalFields = it.metadata != null
        }
    }
    
    // Handle success
    LaunchedEffect(uiState.successMessage) {
        if (uiState.successMessage?.contains("updated") == true) {
            pinViewModel.clearSuccessMessage()
            onNavigateBack()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Edit Pin",
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
        snackbarHost = {
            uiState.error?.let { error ->
                Snackbar(
                    modifier = Modifier.padding(16.dp),
                    action = {
                        TextButton(onClick = { pinViewModel.clearError() }) {
                            Text("Dismiss", color = Color.White)
                        }
                    }
                ) {
                    Text(error)
                }
            }
        }
    ) { paddingValues ->
        if (uiState.isLoading && pin == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color(0xFF4A90E2))
            }
        } else if (pin != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF16213E))
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Note: Category cannot be changed
                Text(
                    "Note: You cannot change the pin's category. Only name, description, and metadata can be edited.",
                    fontSize = 12.sp,
                    color = Color(0xFFF39C12),
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF39C12).copy(alpha = 0.1f), RoundedCornerShape(8.dp))
                        .padding(12.dp)
                )
                
                // Name Field
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Pin Name") },
                    placeholder = { Text("Enter pin name") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color(0xFF1A1A2E),
                        unfocusedContainerColor = Color(0xFF1A1A2E),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedLabelColor = Color(0xFF4A90E2),
                        unfocusedLabelColor = Color(0xFFB0B0B0),
                        cursorColor = Color(0xFF4A90E2)
                    )
                )
                
                // Description Field
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    placeholder = { Text("Enter description") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    maxLines = 5,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color(0xFF1A1A2E),
                        unfocusedContainerColor = Color(0xFF1A1A2E),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedLabelColor = Color(0xFF4A90E2),
                        unfocusedLabelColor = Color(0xFFB0B0B0),
                        cursorColor = Color(0xFF4A90E2)
                    )
                )
                
                // Optional Metadata Toggle
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showOptionalFields = !showOptionalFields }
                        .background(Color(0xFF1A1A2E), RoundedCornerShape(8.dp))
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "Optional Information",
                        color = Color.White,
                        fontWeight = FontWeight.Medium
                    )
                    Icon(
                        imageVector = if (showOptionalFields) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        tint = Color(0xFF4A90E2)
                    )
                }
                
                if (showOptionalFields) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        // Capacity
                        OutlinedTextField(
                            value = capacity,
                            onValueChange = { capacity = it.filter { char -> char.isDigit() } },
                            label = { Text("Capacity (optional)") },
                            placeholder = { Text("e.g., 50") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color(0xFF1A1A2E),
                                unfocusedContainerColor = Color(0xFF1A1A2E),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedLabelColor = Color(0xFF4A90E2),
                                unfocusedLabelColor = Color(0xFFB0B0B0),
                                cursorColor = Color(0xFF4A90E2)
                            )
                        )
                        
                        // Opening Hours
                        OutlinedTextField(
                            value = openingHours,
                            onValueChange = { openingHours = it },
                            label = { Text("Opening Hours (optional)") },
                            placeholder = { Text("e.g., 9:00 AM - 5:00 PM") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color(0xFF1A1A2E),
                                unfocusedContainerColor = Color(0xFF1A1A2E),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedLabelColor = Color(0xFF4A90E2),
                                unfocusedLabelColor = Color(0xFFB0B0B0),
                                cursorColor = Color(0xFF4A90E2)
                            )
                        )
                        
                        // Amenities
                        OutlinedTextField(
                            value = amenitiesText,
                            onValueChange = { amenitiesText = it },
                            label = { Text("Amenities (optional)") },
                            placeholder = { Text("Separate with commas: WiFi, Outlets, Whiteboard") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color(0xFF1A1A2E),
                                unfocusedContainerColor = Color(0xFF1A1A2E),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedLabelColor = Color(0xFF4A90E2),
                                unfocusedLabelColor = Color(0xFFB0B0B0),
                                cursorColor = Color(0xFF4A90E2)
                            )
                        )
                        
                        // Crowd Level
                        Text(
                            "Crowd Level (optional)",
                            fontSize = 14.sp,
                            color = Color(0xFFB0B0B0)
                        )
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            CrowdLevel.entries.forEach { level ->
                                CrowdLevelChip(
                                    level = level,
                                    isSelected = crowdLevel == level,
                                    onSelect = { crowdLevel = if (crowdLevel == level) null else level },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
                
                // Update Button
                Button(
                    onClick = {
                        // Validation
                        when {
                            name.isBlank() -> {
                                pinViewModel.setError("Please enter a pin name")
                                return@Button
                            }
                            description.length < 10 -> {
                                pinViewModel.setError("Description must be at least 10 characters")
                                return@Button
                            }
                        }
                        
                        // Build metadata
                        val metadata = if (showOptionalFields) {
                            PinMetadata(
                                capacity = capacity.toIntOrNull(),
                                openingHours = openingHours.ifBlank { null },
                                amenities = amenitiesText.split(",")
                                    .map { it.trim() }
                                    .filter { it.isNotBlank() }
                                    .ifEmpty { null },
                                crowdLevel = crowdLevel
                            )
                        } else null
                        
                        val request = UpdatePinRequest(
                            name = name,
                            description = description,
                            metadata = metadata
                        )
                        
                        pinViewModel.updatePin(pinId, request)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF4A90E2),
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp),
                    enabled = !uiState.isUpdating
                ) {
                    if (uiState.isUpdating) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Save,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Update Pin", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun CrowdLevelChip(
    level: CrowdLevel,
    isSelected: Boolean,
    onSelect: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onSelect,
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) Color(0xFF4A90E2) else Color(0xFF1A1A2E),
        border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF4A90E2))
    ) {
        Box(
            modifier = Modifier.padding(vertical = 12.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = level.name.lowercase().replaceFirstChar { it.uppercase() },
                color = if (isSelected) Color.White else Color(0xFF4A90E2),
                fontSize = 14.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
            )
        }
    }
}