package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.maps.android.compose.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationPickerScreen(
    initialLocation: LatLng? = null,
    onLocationSelected: (LatLng) -> Unit,
    onNavigateBack: () -> Unit
) {
    // System UI colors
    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false
        )
    }
    
    // Default to UBC Vancouver
    val ubcLocation = LatLng(49.2606, -123.2460)
    val startLocation = initialLocation ?: ubcLocation
    
    // Selected pin location
    var selectedLocation by remember { mutableStateOf(startLocation) }
    
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(startLocation, 16f)
    }
    
    // Update selected location when camera moves
    LaunchedEffect(cameraPositionState.isMoving) {
        if (!cameraPositionState.isMoving) {
            selectedLocation = cameraPositionState.position.target
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "Pick Location",
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "Drag map to position pin",
                            color = Color(0xFFB0B0B0),
                            fontSize = 12.sp
                        )
                    }
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
                actions = {
                    IconButton(
                        onClick = {
                            onLocationSelected(selectedLocation)
                            onNavigateBack()
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Confirm Location",
                            tint = Color(0xFF4CAF50)
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
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Google Map
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                properties = MapProperties(
                    mapType = MapType.NORMAL,
                    isBuildingEnabled = true,
                    mapStyleOptions = MapStyleOptions(
                        """
                        [
                          {
                            "elementType": "geometry",
                            "stylers": [{"color": "#1d2c4d"}]
                          },
                          {
                            "elementType": "labels.text.fill",
                            "stylers": [{"color": "#8ec3b9"}]
                          },
                          {
                            "elementType": "labels.text.stroke",
                            "stylers": [{"color": "#1a3646"}]
                          },
                          {
                            "featureType": "poi",
                            "elementType": "geometry",
                            "stylers": [{"color": "#3d5265"}]
                          },
                          {
                            "featureType": "road",
                            "elementType": "geometry",
                            "stylers": [{"color": "#38414e"}]
                          },
                          {
                            "featureType": "water",
                            "elementType": "geometry",
                            "stylers": [{"color": "#17263c"}]
                          }
                        ]
                        """.trimIndent()
                    )
                ),
                uiSettings = MapUiSettings(
                    zoomControlsEnabled = false,
                    myLocationButtonEnabled = false,
                    mapToolbarEnabled = false
                )
            )
            
            // Fixed pin in center (appears to be on map but doesn't move with it)
            Icon(
                imageVector = Icons.Default.MyLocation,
                contentDescription = "Pin Location",
                tint = Color(0xFFFF4444),
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(48.dp)
                    .offset(y = (-24).dp) // Offset to point at actual location
            )
            
            // Location info card at bottom
            Card(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFF1A1A2E)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        "Selected Location",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Lat: ${String.format("%.6f", selectedLocation.latitude)}",
                        color = Color(0xFFB0B0B0),
                        fontSize = 14.sp
                    )
                    Text(
                        "Lng: ${String.format("%.6f", selectedLocation.longitude)}",
                        color = Color(0xFFB0B0B0),
                        fontSize = 14.sp
                    )
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    Button(
                        onClick = {
                            onLocationSelected(selectedLocation)
                            onNavigateBack()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF4A90E2)
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Confirm Location")
                    }
                }
            }
            
            // Recenter button
            FloatingActionButton(
                onClick = {
                    // Note: We can't use coroutineScope.launch here directly
                    // The CameraPositionState.move is a suspend function
                    // We'll use the non-suspend animate instead
                    cameraPositionState.position = CameraPosition.fromLatLngZoom(ubcLocation, 16f)
                },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(16.dp),
                containerColor = Color(0xFF1A1A2E),
                contentColor = Color.White
            ) {
                Icon(
                    imageVector = Icons.Default.MyLocation,
                    contentDescription = "Recenter",
                    tint = Color(0xFF4A90E2)
                )
            }
        }
    }
}

