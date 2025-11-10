package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cpen321.usermanagement.data.remote.dto.Pin
import com.cpen321.usermanagement.data.remote.dto.PinStatus
import com.cpen321.usermanagement.ui.viewmodels.PinViewModel
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminReportedPinsScreen(
    pinViewModel: PinViewModel,
    onBackClick: () -> Unit
) {
    val pinUiState by pinViewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    
    var showDeleteDialog by remember { mutableStateOf(false) }
    var pinToDelete by remember { mutableStateOf<Pin?>(null) }
    var expandedReportId by remember { mutableStateOf<String?>(null) }
    
    // System UI colors
    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
    }
    
    // Load reported pins on first composition
    LaunchedEffect(Unit) {
        pinViewModel.loadReportedPins()
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
                        "Reported Pins",
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
                // Filter to show only reported pins
                val reportedPins = pinUiState.pins.filter { 
                    it.reports.isNotEmpty() || it.status == PinStatus.REPORTED
                }
                
                if (reportedPins.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Flag,
                            contentDescription = null,
                            tint = Color(0xFF666666),
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "No Reported Pins",
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Reported pins will appear here",
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
                        items(reportedPins) { pin ->
                            ReportedPinCard(
                                pin = pin,
                                isExpanded = expandedReportId == pin.id,
                                onExpandClick = {
                                    expandedReportId = if (expandedReportId == pin.id) null else pin.id
                                },
                                onDeleteClick = {
                                    pinToDelete = pin
                                    showDeleteDialog = true
                                },
                                onClearReportsClick = {
                                    scope.launch {
                                        pinViewModel.clearPinReports(pin.id)
                                        // Reload reported pins after clearing reports
                                        pinViewModel.loadReportedPins()
                                    }
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
            onDismissRequest = { showDeleteDialog = false },
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
                        // Capture the pin ID before resetting state to avoid race condition
                        val pinIdToDelete = pinToDelete?.id
                        showDeleteDialog = false
                        pinToDelete = null
                        
                        if (pinIdToDelete != null) {
                            scope.launch {
                                pinViewModel.deletePin(pinIdToDelete)
                                // Reload reported pins after deletion
                                pinViewModel.loadReportedPins()
                            }
                        }
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = Color(0xFFE53935)
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
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = Color(0xFF4A90E2)
                    )
                ) {
                    Text("Cancel")
                }
            },
            containerColor = Color(0xFF1A1A2E)
        )
    }
}

@Composable
private fun ReportedPinCard(
    pin: Pin,
    isExpanded: Boolean,
    onExpandClick: () -> Unit,
    onDeleteClick: () -> Unit,
    onClearReportsClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF1A1A2E)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Pin header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
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
                    Text(
                        text = "Created by: ${pin.createdBy.name}",
                        color = Color(0xFFB0B0B0),
                        fontSize = 13.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Flag,
                            contentDescription = null,
                            tint = Color(0xFFE53935),
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "${pin.reports.size} report${if (pin.reports.size != 1) "s" else ""}",
                            color = Color(0xFFE53935),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                
                // Status badge
                Surface(
                    color = when (pin.status) {
                        PinStatus.REPORTED -> Color(0xFFE53935)
                        PinStatus.HIDDEN -> Color(0xFFFF9800)
                        else -> Color(0xFF4CAF50)
                    },
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = pin.status.name,
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // View reports button
                OutlinedButton(
                    onClick = onExpandClick,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color(0xFF4A90E2)
                    ),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        width = 1.dp
                    )
                ) {
                    Icon(
                        imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(if (isExpanded) "Hide Reports" else "View Reports")
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Clear Reports and Delete buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Clear Reports button
                Button(
                    onClick = onClearReportsClick,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF4CAF50)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Clear Reports",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Clear Reports")
                }
                
                // Delete button
                Button(
                    onClick = onDeleteClick,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFE53935)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Delete",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Delete")
                }
            }
            
            // Expanded reports section
            if (isExpanded && pin.reports.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Divider(color = Color(0xFF2C3E50))
                Spacer(modifier = Modifier.height(12.dp))
                
                Text(
                    text = "Reports:",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                
                pin.reports.forEachIndexed { index, report ->
                    if (index > 0) {
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    
                    Surface(
                        color = Color(0xFF0F1419),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp)
                        ) {
                            // Handle cases where reportedBy might not be populated
                            val reporterName = report.reportedBy?.name ?: "Unknown User"
                            val reporterEmail = report.reportedBy?.email
                            
                            Text(
                                text = "Reported by: $reporterName",
                                color = Color(0xFF4A90E2),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                            if (reporterEmail != null) {
                                Text(
                                    text = reporterEmail,
                                    color = Color(0xFF888888),
                                    fontSize = 11.sp
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Reason: ${report.reason}",
                                color = Color.White,
                                fontSize = 13.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = formatTimestamp(report.timestamp),
                                color = Color(0xFF888888),
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun formatTimestamp(timestamp: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        inputFormat.timeZone = TimeZone.getTimeZone("UTC")
        val date = inputFormat.parse(timestamp)
        
        val outputFormat = SimpleDateFormat("MMM dd, yyyy 'at' hh:mm a", Locale.getDefault())
        if (date != null) {
            outputFormat.format(date)
        } else {
            timestamp
        }
    } catch (e: java.text.ParseException) {
        timestamp
    } catch (e: IllegalArgumentException) {
        timestamp
    } catch (e: RuntimeException) {
        timestamp
    }
}

