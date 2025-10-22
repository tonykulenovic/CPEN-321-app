package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.AddLocation
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.SatelliteAlt
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cpen321.usermanagement.R
import com.cpen321.usermanagement.ui.components.MessageSnackbar
import com.cpen321.usermanagement.ui.components.MessageSnackbarState
import com.cpen321.usermanagement.ui.viewmodels.MainUiState
import com.cpen321.usermanagement.ui.viewmodels.MainViewModel
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapType
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.rememberCameraPositionState
import androidx.compose.foundation.layout.height
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import androidx.compose.runtime.SideEffect
import com.cpen321.usermanagement.ui.screens.BadgesScreen
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.runtime.LaunchedEffect
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.cpen321.usermanagement.data.remote.dto.PinCategory
import com.cpen321.usermanagement.ui.viewmodels.PinViewModel
import com.cpen321.usermanagement.ui.viewmodels.ProfileViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import com.cpen321.usermanagement.data.remote.dto.Pin
import androidx.compose.ui.draw.clip

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun MainScreen(
    mainViewModel: MainViewModel,
    pinViewModel: PinViewModel,
    onProfileClick: () -> Unit,
    onMapClick: () -> Unit = {},
    onFriendsClick: () -> Unit = {},
    onBadgesClick: () -> Unit = {},
    onCreatePinClick: () -> Unit = {},
    onEditPinClick: (String) -> Unit = {}
) {
    val uiState by mainViewModel.uiState.collectAsState()
    val snackBarHostState = remember { SnackbarHostState() }
    
    // State for pin details bottom sheet
    var selectedPinId by remember { mutableStateOf<String?>(null) }
    
    // Request location permission
    val locationPermissionState = rememberPermissionState(
        android.Manifest.permission.ACCESS_FINE_LOCATION
    )
    
    LaunchedEffect(Unit) {
        if (!locationPermissionState.status.isGranted) {
            locationPermissionState.launchPermissionRequest()
        }
    }
    
    // Set status bar appearance
    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF1A1A2E),
            darkIcons = false // false = light/white icons
        )
    }

    MainContent(
        uiState = uiState,
        pinViewModel = pinViewModel,
        snackBarHostState = snackBarHostState,
        onProfileClick = onProfileClick,
        onMapClick = onMapClick,
        onFriendsClick = onFriendsClick,
        onBadgesClick = onBadgesClick,
        onCreatePinClick = onCreatePinClick,
        onSuccessMessageShown = mainViewModel::clearSuccessMessage,
        hasLocationPermission = locationPermissionState.status.isGranted,
        onPinClick = { pinId -> selectedPinId = pinId },
        selectedPinId = selectedPinId,
        onDismissPinDetails = { selectedPinId = null },
        onEditPinClick = onEditPinClick
    )
}

@Composable
private fun MainContent(
    uiState: MainUiState,
    pinViewModel: PinViewModel,
    snackBarHostState: SnackbarHostState,
    onProfileClick: () -> Unit,
    onMapClick: () -> Unit,
    onFriendsClick: () -> Unit,
    onBadgesClick: () -> Unit,
    onCreatePinClick: () -> Unit,
    onSuccessMessageShown: () -> Unit,
    hasLocationPermission: Boolean,
    modifier: Modifier = Modifier,
    onPinClick: (String) -> Unit,
    selectedPinId: String?,
    onDismissPinDetails: () -> Unit,
    onEditPinClick: (String) -> Unit
) {
    var selectedItem by remember { mutableIntStateOf(0) }
    
    Box(modifier = modifier.fillMaxSize()) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            topBar = {
                MainTopBar()
            },
            bottomBar = {
                BottomNavigationBar(
                    selectedItem = selectedItem,
                    onItemSelected = { index ->
                        selectedItem = index
                        when (index) {
                            0 -> onMapClick() // Map button
                            1 -> {} // Search button - not implemented yet
                            2 -> onBadgesClick() // Badge button
                            3 -> onFriendsClick() // Friends button
                            4 -> onProfileClick() // Profile button
                        }
                    }
                )
            },
            snackbarHost = {
                MessageSnackbar(
                    hostState = snackBarHostState,
                    messageState = MessageSnackbarState(
                        successMessage = uiState.successMessage,
                        errorMessage = null,
                        onSuccessMessageShown = onSuccessMessageShown,
                        onErrorMessageShown = { /* No error handling needed */ }
                    )
                )
            }
        ) { paddingValues ->
            MapContent(
                pinViewModel = pinViewModel,
                hasLocationPermission = hasLocationPermission,
                onCreatePinClick = onCreatePinClick,
                onPinClick = onPinClick,
                modifier = Modifier.padding(paddingValues)
            )
        }
        
        // Pin Details Bottom Sheet Overlay
        if (selectedPinId != null) {
            PinDetailsBottomSheet(
                pinId = selectedPinId,
                pinViewModel = pinViewModel,
                onDismiss = onDismissPinDetails,
                onEditClick = onEditPinClick
            )
        }
    }
}

@Composable
private fun BottomNavigationBar(
    selectedItem: Int,
    onItemSelected: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationBar(
        modifier = modifier.height(72.dp),
        containerColor = Color(0xFF1A1A2E),
        contentColor = Color.White
    ) {
        // Map button
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
        
        // Search button
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
        
        // Badge button
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
        
        // Friends button
        NavigationBarItem(
            selected = selectedItem == 3,
            onClick = { onItemSelected(3) },
            icon = {
                Icon(
                    imageVector = Icons.Filled.Group,
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
        
        // Profile button
        NavigationBarItem(
            selected = selectedItem == 4,
            onClick = { onItemSelected(4) },
            icon = {
                Icon(
                    imageVector = Icons.Filled.Person,
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainTopBar(
    modifier: Modifier = Modifier
) {
    TopAppBar(
        modifier = modifier.height(98.dp),
        title = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 0.dp),
                horizontalArrangement = Arrangement.Start,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(id = R.drawable.universe_logo),
                    contentDescription = "Logo",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.size(50.dp)
                )
                Spacer(modifier = Modifier.width(0.5.dp))
                Text(
                    text = "UniVerse",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Color(0xFF1A1A2E),
            titleContentColor = Color.White
        )
    )
}

@Composable
private fun MapContent(
    pinViewModel: PinViewModel,
    hasLocationPermission: Boolean,
    onCreatePinClick: () -> Unit,
    onPinClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val pinUiState by pinViewModel.uiState.collectAsState()
    
    // Load pins when screen opens
    LaunchedEffect(Unit) {
        pinViewModel.loadPins()
    }
    
    var isSatelliteView by remember { mutableStateOf(false) }
    
    // UBC Vancouver coordinates
    val ubcLocation = LatLng(49.2606, -123.2460)
    
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(ubcLocation, 15f)
    }
    
    // Toggle between styled map and satellite
    val mapProperties = if (isSatelliteView) {
        MapProperties(
            mapType = MapType.SATELLITE,
            isBuildingEnabled = true,
            isMyLocationEnabled = hasLocationPermission
        )
    } else {
        MapProperties(
            mapType = MapType.NORMAL,
            isBuildingEnabled = true,
            isMyLocationEnabled = hasLocationPermission,
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
                    "featureType": "administrative.country",
                    "elementType": "geometry.stroke",
                    "stylers": [{"color": "#4b6878"}]
                  },
                  {
                    "featureType": "landscape.man_made",
                    "elementType": "geometry.fill",
                    "stylers": [{"color": "#3d5265"}]
                  },
                  {
                    "featureType": "landscape.man_made",
                    "elementType": "geometry.stroke",
                    "stylers": [{"color": "#4a90e2"}, {"weight": 1}]
                  },
                  {
                    "featureType": "poi",
                    "elementType": "labels",
                    "stylers": [{"visibility": "off"}]
                  },
                  {
                    "featureType": "poi",
                    "elementType": "geometry",
                    "stylers": [{"color": "#3d5265"}]
                  },
                  {
                    "featureType": "poi",
                    "elementType": "geometry.stroke",
                    "stylers": [{"color": "#4a90e2"}, {"weight": 1.5}]
                  },
                  {
                    "featureType": "poi.business",
                    "stylers": [{"visibility": "off"}]
                  },
                  {
                    "featureType": "poi.park",
                    "elementType": "geometry",
                    "stylers": [{"color": "#263c3f"}]
                  },
                  {
                    "featureType": "poi.park",
                    "elementType": "labels",
                    "stylers": [{"visibility": "off"}]
                  },
                  {
                    "featureType": "road",
                    "elementType": "geometry",
                    "stylers": [{"color": "#38414e"}]
                  },
                  {
                    "featureType": "road",
                    "elementType": "geometry.stroke",
                    "stylers": [{"color": "#212a37"}]
                  },
                  {
                    "featureType": "road",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#9ca5b3"}]
                  },
                  {
                    "featureType": "road.highway",
                    "elementType": "geometry",
                    "stylers": [{"color": "#746855"}]
                  },
                  {
                    "featureType": "road.highway",
                    "elementType": "geometry.stroke",
                    "stylers": [{"color": "#1f2835"}]
                  },
                  {
                    "featureType": "road.highway",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#f3d19c"}]
                  },
                  {
                    "featureType": "transit",
                    "elementType": "geometry",
                    "stylers": [{"color": "#2f3948"}]
                  },
                  {
                    "featureType": "transit",
                    "elementType": "labels",
                    "stylers": [{"visibility": "off"}]
                  },
                  {
                    "featureType": "water",
                    "elementType": "geometry",
                    "stylers": [{"color": "#17263c"}]
                  },
                  {
                    "featureType": "water",
                    "elementType": "labels.text.fill",
                    "stylers": [{"color": "#515c6d"}]
                  },
                  {
                    "featureType": "water",
                    "elementType": "labels.text.stroke",
                    "stylers": [{"color": "#17263c"}]
                  }
                ]
                """.trimIndent()
            )
        )
    }
    
    val uiSettings = MapUiSettings(
        zoomControlsEnabled = true,
        myLocationButtonEnabled = hasLocationPermission
    )
    
    Box(modifier = modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = mapProperties,
            uiSettings = uiSettings
        ) {
            // Display pin markers
            pinUiState.pins.forEach { pin ->
                Marker(
                    state = MarkerState(
                        position = LatLng(
                            pin.location.latitude,
                            pin.location.longitude
                        )
                    ),
                    title = pin.name,
                    snippet = pin.description,
                    icon = BitmapDescriptorFactory.defaultMarker(
                        when (pin.category) {
                            PinCategory.STUDY -> BitmapDescriptorFactory.HUE_BLUE
                            PinCategory.EVENTS -> BitmapDescriptorFactory.HUE_RED
                            PinCategory.CHILL -> BitmapDescriptorFactory.HUE_GREEN
                            PinCategory.SHOPS_SERVICES -> BitmapDescriptorFactory.HUE_ORANGE
                        }
                    ),
                    onClick = {
                        onPinClick(pin.id)
                        true // Consume the click event
                    }
                )
            }
        }
        
        // Map type toggle button in top-right corner - smaller and refined
        FloatingActionButton(
            onClick = { isSatelliteView = !isSatelliteView },
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 8.dp, end = 8.dp)
                .size(48.dp),
            containerColor = Color(0xFF1A1A2E),
            contentColor = Color.White
        ) {
    Icon(
                imageVector = if (isSatelliteView) Icons.Default.Map else Icons.Default.SatelliteAlt,
                contentDescription = if (isSatelliteView) "Switch to Map" else "Switch to Satellite",
                tint = Color.White,
                modifier = Modifier.size(24.dp)
            )
        }
        
        // Create Pin button in bottom-right corner
        FloatingActionButton(
            onClick = { onCreatePinClick() },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 16.dp, end = 16.dp),
            containerColor = Color(0xFF4A90E2),
            contentColor = Color.White
        ) {
            Icon(
                imageVector = Icons.Default.AddLocation,
                contentDescription = "Create Pin",
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PinDetailsBottomSheet(
    pinId: String,
    pinViewModel: PinViewModel,
    onDismiss: () -> Unit,
    onEditClick: (String) -> Unit
) {
    val profileViewModel: ProfileViewModel = hiltViewModel()
    
    // Simply render the PinDetailsScreen which is already a bottom sheet
    PinDetailsScreen(
        pinId = pinId,
        pinViewModel = pinViewModel,
        profileViewModel = profileViewModel,
        onNavigateBack = onDismiss,
        onEditClick = onEditClick
    )
}