package com.cpen321.usermanagement.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.AddLocation
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.SatelliteAlt
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material.icons.filled.DirectionsRun

import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.cpen321.usermanagement.data.realtime.LocationTrackingService
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cpen321.usermanagement.R
import com.cpen321.usermanagement.ui.components.MessageSnackbar
import com.cpen321.usermanagement.ui.components.MessageSnackbarState
import com.cpen321.usermanagement.ui.viewmodels.LocationTrackingViewModel
import com.cpen321.usermanagement.ui.viewmodels.MainUiState
import com.cpen321.usermanagement.ui.viewmodels.MainViewModel
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapType
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
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
import kotlinx.coroutines.launch
import com.cpen321.usermanagement.data.remote.dto.PinCategory
import com.cpen321.usermanagement.ui.viewmodels.PinViewModel
import com.cpen321.usermanagement.ui.viewmodels.ProfileViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import com.cpen321.usermanagement.data.remote.dto.Pin
import androidx.compose.ui.draw.clip
import androidx.compose.runtime.remember
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import androidx.core.content.ContextCompat
import androidx.compose.ui.platform.LocalContext

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun MainScreen(
    mainViewModel: MainViewModel,
    pinViewModel: PinViewModel,
    onProfileClick: () -> Unit,
    onMapClick: () -> Unit = {},
    onSearchClick: () -> Unit = {},
    onFriendsClick: () -> Unit = {},
    onBadgesClick: () -> Unit = {},
    onCreatePinClick: () -> Unit = {},
    onEditPinClick: (String) -> Unit = {}
) {
    val uiState by mainViewModel.uiState.collectAsState()
    val initialSelectedPinId = uiState.selectedPinIdFromSearch
    val snackBarHostState = remember { SnackbarHostState() }
    
    // Get ProfileViewModel to pre-load user data
    val profileViewModel: ProfileViewModel = hiltViewModel()
    
    // Get FriendsViewModel to access friends data
    val friendsViewModel: com.cpen321.usermanagement.ui.viewmodels.FriendsViewModel = hiltViewModel()

    // Inject LocationTrackingService via ViewModel and TokenManager
    val locationTrackingViewModel: LocationTrackingViewModel = hiltViewModel()
    val locationTrackingService = locationTrackingViewModel.service
    val context = LocalContext.current
    val tokenManager: com.cpen321.usermanagement.data.local.preferences.TokenManager =
        remember { com.cpen321.usermanagement.data.local.preferences.TokenManager(context) }
    val friendsUiState by friendsViewModel.uiState.collectAsState()

    // Get ProfileViewModel's UI state for user data
    val profileUiState by profileViewModel.uiState.collectAsState()

    // State for pin details bottom sheet
    var selectedPinId by remember { mutableStateOf<String?>(initialSelectedPinId) }
    
    // State for friend details bottom sheet
    var selectedFriend by remember { mutableStateOf<Pair<com.cpen321.usermanagement.data.remote.dto.FriendSummary, Map<String, String>>?>(null) }

    // Pre-load profile data once when screen opens (for fast pin ownership checks)
    LaunchedEffect(Unit) {
        profileViewModel.loadProfile()
    }
    
    // Load friends when profile is loaded
    LaunchedEffect(profileUiState.user) {
        profileUiState.user?.let { user ->
            friendsViewModel.loadFriends()
            friendsViewModel.loadFriendsLocations()

            // Initialize real-time location tracking
            try {
                val authToken = tokenManager.getTokenSync()
                android.util.Log.d("MainScreen", "🚀 INITIALIZING location tracking for user: ${user._id}")
                android.util.Log.d("MainScreen", "🚀 Auth token available: ${authToken != null}")

                if (authToken != null) {
                    android.util.Log.d("MainScreen", "🔗 Initializing LocationTrackingService...")
                    locationTrackingService.initialize(authToken, user._id)

                    // Start tracking all friends
                    val friendsWithLocation = friendsViewModel.uiState.value.friends.filter { it.shareLocation }
                    android.util.Log.d("MainScreen", "👥 Found ${friendsWithLocation.size} friends with location sharing enabled")

                    friendsWithLocation.forEach { friend ->
                        android.util.Log.d("MainScreen", "👥 Starting to track friend: ${friend.userId} (${friend.displayName})")
                        locationTrackingService.trackFriend(friend.userId)
                    }

                    // Start sharing own location with real GPS tracking
                    android.util.Log.d("MainScreen", "📍 ENABLING location sharing for current user...")
                    locationTrackingService.startLocationSharing()

                    // Start real GPS-based location tracking
                    android.util.Log.d("MainScreen", "🌍 STARTING real GPS location tracking...")
                    locationTrackingService.startRealGPSTracking()

                    // Log the current state for debugging
                    locationTrackingService.logCurrentState()

                    android.util.Log.d("MainScreen", "✅ Location sharing setup COMPLETE for user: ${user._id}")
                } else {
                    android.util.Log.e("MainScreen", "❌ No auth token available, cannot initialize location tracking")
                }
            } catch (e: Exception) {
                // Log error but don't fail the screen
                android.util.Log.e("MainScreen", "❌ Failed to initialize location tracking", e)
            }
        }
    }

    // Request location permission
    val locationPermissionState = rememberPermissionState(
        android.Manifest.permission.ACCESS_FINE_LOCATION
    )
    
    LaunchedEffect(Unit) {
        if (!locationPermissionState.status.isGranted) {
            locationPermissionState.launchPermissionRequest()
        }
    }
    
    // Periodic refresh of location data from HTTP endpoint
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(30000) // Refresh every 30 seconds
            if (profileUiState.user != null) {
                friendsViewModel.loadFriendsLocations()
            }
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
        profileViewModel = profileViewModel,
        friendsUiState = friendsUiState,
        snackBarHostState = snackBarHostState,
        onProfileClick = onProfileClick,
        onMapClick = onMapClick,
        onSearchClick = onSearchClick,
        onFriendsClick = onFriendsClick,
        onBadgesClick = onBadgesClick,
        onCreatePinClick = onCreatePinClick,
        onSuccessMessageShown = mainViewModel::clearSuccessMessage,
        hasLocationPermission = locationPermissionState.status.isGranted,
        initialSelectedPinId = initialSelectedPinId,
        onClearSelectedPin = mainViewModel::clearSelectedPinFromSearch,
        onPinClick = { pinId -> selectedPinId = pinId },
        selectedPinId = selectedPinId,
        onDismissPinDetails = { selectedPinId = null },
        onEditPinClick = onEditPinClick,
        onFriendClick = { friend, metadata -> selectedFriend = Pair(friend, metadata) },
        selectedFriend = selectedFriend,
        onDismissFriendDetails = { selectedFriend = null }
    )
}

@Composable
private fun MainContent(
    uiState: MainUiState,
    pinViewModel: PinViewModel,
    profileViewModel: ProfileViewModel,
    friendsUiState: com.cpen321.usermanagement.ui.viewmodels.FriendsUiState,
    snackBarHostState: SnackbarHostState,
    onProfileClick: () -> Unit,
    onMapClick: () -> Unit,
    onSearchClick: () -> Unit,
    onFriendsClick: () -> Unit,
    onBadgesClick: () -> Unit,
    onCreatePinClick: () -> Unit,
    onSuccessMessageShown: () -> Unit,
    hasLocationPermission: Boolean,
    initialSelectedPinId: String? = null,
    onClearSelectedPin: () -> Unit,
    modifier: Modifier = Modifier,
    onPinClick: (String) -> Unit,
    selectedPinId: String?,
    onDismissPinDetails: () -> Unit,
    onEditPinClick: (String) -> Unit,
    onFriendClick: (com.cpen321.usermanagement.data.remote.dto.FriendSummary, Map<String, String>) -> Unit,
    selectedFriend: Pair<com.cpen321.usermanagement.data.remote.dto.FriendSummary, Map<String, String>>?,
    onDismissFriendDetails: () -> Unit
) {
    var selectedItem by remember { mutableIntStateOf(0) }
    val pinUiState by pinViewModel.uiState.collectAsState()
    
    // Satellite view toggle state (moved outside map)
    var isSatelliteView by remember { mutableStateOf(false) }
    
    // Show pin success messages in snackbar
    LaunchedEffect(pinUiState.successMessage) {
        pinUiState.successMessage?.let { message ->
            // Show messages except "deleted" (which closes the bottom sheet)
            if (!message.contains("deleted", ignoreCase = true)) {
                snackBarHostState.showSnackbar(message)
                pinViewModel.clearSuccessMessage()
            }
        }
    }
    
    Box(modifier = modifier.fillMaxSize()) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            topBar = {
                MainTopBar(
                    isSatelliteView = isSatelliteView,
                    onToggleSatelliteView = { isSatelliteView = !isSatelliteView }
                )
            },
            bottomBar = {
                BottomNavigationBar(
                    selectedItem = selectedItem,
                    onItemSelected = { index ->
                        selectedItem = index
                        when (index) {
                            0 -> onMapClick() // Map button
                            1 -> onSearchClick() // Search button
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
                friendsUiState = friendsUiState,
                hasLocationPermission = hasLocationPermission,
                isSatelliteView = isSatelliteView,
                initialSelectedPinId = initialSelectedPinId,
                onClearSelectedPin = onClearSelectedPin,
                onCreatePinClick = onCreatePinClick,
                onPinClick = onPinClick,
                onFriendClick = onFriendClick,
                modifier = Modifier.padding(paddingValues)
            )
        }
        
        // Pin Details Bottom Sheet Overlay
        if (selectedPinId != null) {
            PinDetailsBottomSheet(
                pinId = selectedPinId,
                pinViewModel = pinViewModel,
                profileViewModel = profileViewModel,
                onDismiss = onDismissPinDetails,
                onEditClick = onEditPinClick
            )
        }

        // Friend Details Bottom Sheet Overlay
        if (selectedFriend != null) {
            FriendDetailsBottomSheet(
                friend = selectedFriend.first,
                metadata = selectedFriend.second,
                onDismiss = onDismissFriendDetails
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
    isSatelliteView: Boolean = false,
    onToggleSatelliteView: () -> Unit = {},
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
        actions = {
            androidx.compose.material3.IconButton(onClick = onToggleSatelliteView) {
                Icon(
                    imageVector = if (isSatelliteView) Icons.Default.Map else Icons.Default.SatelliteAlt,
                    contentDescription = if (isSatelliteView) "Switch to Map" else "Switch to Satellite",
                    tint = Color.White,
                    modifier = Modifier.size(28.dp)
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
    friendsUiState: com.cpen321.usermanagement.ui.viewmodels.FriendsUiState,
    hasLocationPermission: Boolean,
    isSatelliteView: Boolean,
    onCreatePinClick: () -> Unit,
    onPinClick: (String) -> Unit,
    onFriendClick: (com.cpen321.usermanagement.data.remote.dto.FriendSummary, Map<String, String>) -> Unit,
    initialSelectedPinId: String? = null,
    onClearSelectedPin: () -> Unit,
    modifier: Modifier = Modifier
) {
    val pinUiState by pinViewModel.uiState.collectAsState()
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    // Local category filter state for instant filtering (no network calls)
    var selectedCategories by remember { mutableStateOf(setOf<PinCategory>()) }
    
    // Filter pins locally in memory - INSTANT performance
    val filteredPins = remember(pinUiState.pins, selectedCategories) {
        if (selectedCategories.isEmpty()) {
            pinUiState.pins
        } else {
            pinUiState.pins.filter { pin -> pin.category in selectedCategories }
        }
    }
    
    // Create scaled custom icons (48dp size for map markers) - nullable until map loads
    var libraryIcon by remember { mutableStateOf<BitmapDescriptor?>(null) }
    var cafeIcon by remember { mutableStateOf<BitmapDescriptor?>(null) }

    // Load pins when screen opens
    LaunchedEffect(Unit) {
        pinViewModel.loadPins()
    }
    
    // Create custom icons after a short delay to ensure GoogleMap is initialized
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(500) // Wait for map to initialize
        libraryIcon = context.createScaledBitmapFromPng(R.drawable.ic_library, 48)
        cafeIcon = context.createScaledBitmapFromPng(R.drawable.ic_coffee, 48)
    }
    
    // UBC Vancouver coordinates
    val ubcLocation = LatLng(49.2606, -123.2460)
    
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(ubcLocation, 15f)
    }
    
    // Center camera on selected pin from search
    LaunchedEffect(initialSelectedPinId) {
        if (initialSelectedPinId != null) {
            // Wait for pins to load
            var attempts = 0
            while (pinUiState.pins.isEmpty() && attempts < 50) {
                kotlinx.coroutines.delay(100)
                attempts++
            }
            
            // Use original pins list for search selection (not filtered)
            val selectedPin = pinUiState.pins.find { it.id == initialSelectedPinId }
            selectedPin?.let { pin ->
                // Trigger bottom sheet to open
                onPinClick(pin.id)
                
                // Small delay to ensure map is fully initialized
                kotlinx.coroutines.delay(300)
                val pinLocation = LatLng(pin.location.latitude, pin.location.longitude)
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngZoom(pinLocation, 17f),
                    durationMs = 1000
                )
                
                // Clear the selected pin after handling
                onClearSelectedPin()
            }
        }
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
                    "stylers": [{"color": "#2a3d5c"}]
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
                    "featureType": "landscape.man_made.building",
                    "elementType": "geometry.fill",
                    "stylers": [{"color": "#556b7e"}]
                  },
                  {
                    "featureType": "landscape.man_made.building",
                    "elementType": "geometry.stroke",
                    "stylers": [{"color": "#3a4d5f"}]
                  },
                  {
                    "featureType": "poi",
                    "elementType": "labels",
                    "stylers": [{"visibility": "off"}]
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
                    "stylers": [{"color": "#3d4857"}]
                  },
                  {
                    "featureType": "road",
                    "elementType": "geometry.stroke",
                    "stylers": [{"color": "#1a2332"}]
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
            // Display filtered pin markers (instant local filtering)
            filteredPins.forEach { pin ->
                Marker(
                    state = MarkerState(
                        position = LatLng(
                            pin.location.latitude,
                            pin.location.longitude
                        )
                    ),
                    title = pin.name,
                    snippet = pin.description,
                    icon = if (pin.isPreSeeded) {
                        // Use custom icons for pre-seeded pins based on category
                        when (pin.category) {
                            PinCategory.STUDY -> {
                                // Libraries use library icon (fallback to blue while loading)
                                libraryIcon ?: BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_BLUE)
                            }
                            PinCategory.SHOPS_SERVICES -> {
                                // Cafes use coffee icon (fallback to orange while loading)
                                cafeIcon ?: BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ORANGE)
                            }
                            else -> {
                                // Fallback for any other pre-seeded category
                                BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_VIOLET)
                            }
                        }
                    } else {
                        // Regular colored markers for user-created pins
                        BitmapDescriptorFactory.defaultMarker(
                            when (pin.category) {
                                PinCategory.STUDY -> BitmapDescriptorFactory.HUE_BLUE
                                PinCategory.EVENTS -> BitmapDescriptorFactory.HUE_RED
                                PinCategory.CHILL -> BitmapDescriptorFactory.HUE_GREEN
                                PinCategory.SHOPS_SERVICES -> BitmapDescriptorFactory.HUE_ORANGE
                            }
                        )
                    },
                    onClick = {
                        // Animate camera to pin location
                        val pinLocation = LatLng(pin.location.latitude, pin.location.longitude)
                        coroutineScope.launch {
                            cameraPositionState.animate(
                                CameraUpdateFactory.newLatLngZoom(pinLocation, 17f),
                                durationMs = 1000
                            )
                        }
                        // Open pin details
                        onPinClick(pin.id)
                        true // Consume the click event
                    }
                )
            }

            // Display friend markers if locations are available
            if (friendsUiState.friendLocations.isNotEmpty()) {
                // Create custom friend icon with user avatar style
            val friendIcon = remember {
                try {
                    val size = 120
                    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
                    val canvas = android.graphics.Canvas(bitmap)
                    val center = size / 2f

                    // Draw outer glow/shadow
                    val shadowPaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        color = android.graphics.Color.parseColor("#33000000")
                    }
                    canvas.drawCircle(center, center + 2f, center - 2f, shadowPaint)

                    // Draw main circular background (gradient-like effect)
                    val bgPaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        color = android.graphics.Color.parseColor("#4CAF50")
                    }
                    canvas.drawCircle(center, center, center - 4f, bgPaint)

                    // Draw inner highlight
                    val highlightPaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        color = android.graphics.Color.parseColor("#66FFFFFF")
                    }
                    canvas.drawCircle(center, center - 8f, center - 20f, highlightPaint)

                    // Draw white border
                    val borderPaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        style = android.graphics.Paint.Style.STROKE
                        strokeWidth = 6f
                        color = android.graphics.Color.WHITE
                    }
                    canvas.drawCircle(center, center, center - 7f, borderPaint)

                    // Draw user icon (more detailed person silhouette)
                    val iconPaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        style = android.graphics.Paint.Style.FILL
                        color = android.graphics.Color.WHITE
                    }

                    // Head (circle)
                    canvas.drawCircle(center, center - 15f, 18f, iconPaint)

                    // Body (rounded rectangle path)
                    val bodyPath = android.graphics.Path().apply {
                        addRoundRect(
                            center - 22f, center + 3f, center + 22f, center + 35f,
                            12f, 12f,
                            android.graphics.Path.Direction.CW
                        )
                    }
                    canvas.drawPath(bodyPath, iconPaint)

                    // Add small location pin indicator
                    val pinPaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        color = android.graphics.Color.parseColor("#FF5722")
                    }
                    canvas.drawCircle(center + 25f, center - 25f, 8f, pinPaint)

                    val pinIconPaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        color = android.graphics.Color.WHITE
                        textSize = 10f
                        textAlign = android.graphics.Paint.Align.CENTER
                    }
                    canvas.drawText("📍", center + 25f, center - 20f, pinIconPaint)

                    BitmapDescriptorFactory.fromBitmap(bitmap)
                } catch (e: Exception) {
                    // Fallback to default marker if bitmap creation fails
                    BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN)
                }
            }

            // Display friend markers using HTTP endpoint location data
            friendsUiState.friendLocations.forEach { friendLocation ->
                val friend = friendsUiState.friends.find { it.userId == friendLocation.userId }

                if (friend != null) {
                    val position = LatLng(friendLocation.lat, friendLocation.lng)

                    // Calculate time since last update
                    val lastUpdateTime = try {
                        java.time.Instant.parse(friendLocation.ts)
                    } catch (e: Exception) {
                        java.time.Instant.now()
                    }
                    val now = java.time.Instant.now()
                    val minutesAgo = java.time.Duration.between(lastUpdateTime, now).toMinutes()

                    val lastSeen = when {
                        minutesAgo < 1 -> "Online now"
                        minutesAgo < 5 -> "Active ${minutesAgo}m ago"
                        minutesAgo < 60 -> "Seen ${minutesAgo}m ago"
                        else -> "Seen ${minutesAgo / 60}h ago"
                    }

                    // Create different marker title styles for online status
                    val statusIndicator = when {
                        minutesAgo < 1 -> "🟢"
                        minutesAgo < 5 -> "🟡"
                        else -> "⚪"
                    }

                    Marker(
                        state = MarkerState(position = position),
                        title = "${friend.displayName} $statusIndicator",
                        snippet = "Tap for location details",
                        icon = friendIcon,
                        onClick = {
                            // Create metadata map for the bottom sheet
                            val metadata = mapOf(
                                "location" to "Lat: ${String.format("%.4f", friendLocation.lat)}, Lng: ${String.format("%.4f", friendLocation.lng)}",
                                "activity" to if (friend.shareLocation) "Location sharing" else "Location visible",
                                "duration" to "Updated ${if (minutesAgo < 1) "now" else "${minutesAgo}m ago"}",
                                "lastSeen" to lastSeen,
                                "isLiveSharing" to friend.shareLocation.toString(),
                                "accuracy" to "±${friendLocation.accuracyM.toInt()}m"
                            )
                            onFriendClick(friend, metadata)
                            true
                        }
                    )
                }
            }
            }
        }
        
        // Category Filter Buttons (top left)
        CategoryFilterButtons(
            selectedCategories = selectedCategories,
            onCategoryFilterChange = { selectedCategories = it },
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(top = 8.dp, start = 8.dp)
        )
        
        // Top-right controls
        Column(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 8.dp, end = 8.dp),
            horizontalAlignment = Alignment.End
        ) {
            // Enhanced friends status indicator
            if (friendsUiState.friendLocations.isNotEmpty()) {
                Column(
                    horizontalAlignment = Alignment.End
                ) {
                    // Main status row
                    Row(
                        modifier = Modifier
                            .background(
                                Color(0xFF1A1A2E).copy(alpha = 0.9f),
                                RoundedCornerShape(20.dp)
                            )
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = "Friends nearby",
                            tint = Color(0xFF4CAF50),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${friendsUiState.friendLocations.size} friends nearby",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    // Live status indicator
                    Row(
                        modifier = Modifier
                            .background(
                                Color(0xFF4CAF50).copy(alpha = 0.9f),
                                RoundedCornerShape(15.dp)
                            )
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Pulsing dot animation for "live" effect
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(Color.White, androidx.compose.foundation.shape.CircleShape)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Live locations",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
        
        // Create Pin button in bottom-left corner
        FloatingActionButton(
            onClick = { onCreatePinClick() },
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(bottom = 16.dp, start = 16.dp),
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
    profileViewModel: ProfileViewModel,
    onDismiss: () -> Unit,
    onEditClick: (String) -> Unit
) {
    // Simply render the PinDetailsScreen which is already a bottom sheet
    PinDetailsScreen(
        pinId = pinId,
        pinViewModel = pinViewModel,
        profileViewModel = profileViewModel,
        onNavigateBack = onDismiss,
        onEditClick = onEditClick
    )
}

// Helper function to create a scaled bitmap descriptor from PNG for map markers
private fun Context.createScaledBitmapFromPng(resourceId: Int, sizeDp: Int): BitmapDescriptor {
    val sizePixels = (sizeDp * resources.displayMetrics.density).toInt()
    val bitmap = BitmapFactory.decodeResource(resources, resourceId)
    val scaledBitmap = Bitmap.createScaledBitmap(bitmap, sizePixels, sizePixels, false)
    return BitmapDescriptorFactory.fromBitmap(scaledBitmap)
}

@Composable
private fun FriendDetailsBottomSheet(
    friend: com.cpen321.usermanagement.data.remote.dto.FriendSummary,
    metadata: Map<String, String>,
    onDismiss: () -> Unit
) {
    // Bottom sheet with friend details
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f))
            .clickable(onClick = onDismiss)
    ) {
        Card(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(16.dp)
                .clickable(enabled = false) { }, // Prevent card clicks from dismissing
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp)
            ) {
                // Header with friend name and status
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = friend.displayName,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = metadata["lastSeen"] ?: "Unknown status",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF4CAF50)
                        )
                    }

                    // Profile picture placeholder
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .background(Color(0xFF4CAF50), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = friend.displayName.take(2).uppercase(),
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Location details
                LocationDetailRow(
                    icon = Icons.Default.LocationOn,
                    title = "Location",
                    value = metadata["location"] ?: "Unknown"
                )

                LocationDetailRow(
                    icon = Icons.Default.DirectionsRun,
                    title = "Activity",
                    value = metadata["activity"] ?: "Unknown"
                )

                LocationDetailRow(
                    icon = Icons.Default.AccessTime,
                    title = "Duration",
                    value = "Here for ${metadata["duration"] ?: "unknown time"}"
                )

                if (metadata["isLiveSharing"] == "true") {
                    LocationDetailRow(
                        icon = Icons.Default.TrackChanges,
                        title = "Live Sharing",
                        value = "Location updates in real-time"
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Dismiss button
                FloatingActionButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    containerColor = Color(0xFFE0E0E0),
                    contentColor = Color.Black
                ) {
                    Text("Close", fontSize = 16.sp)
                }
            }
        }
    }
}

@Composable
private fun LocationDetailRow(
    icon: ImageVector,
    title: String,
    value: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = title,
            modifier = Modifier.size(24.dp),
            tint = Color(0xFF666666)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column(
            modifier = Modifier.weight(1f)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun CategoryFilterButtons(
    selectedCategories: Set<PinCategory>,
    onCategoryFilterChange: (Set<PinCategory>) -> Unit,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) } // Start collapsed
    
    val categories = listOf(
        PinCategory.STUDY to "Study",
        PinCategory.EVENTS to "Events", 
        PinCategory.CHILL to "Chill",
        PinCategory.SHOPS_SERVICES to "Shops"
    )
    
    // Auto-collapse when a category is selected (only if currently expanded)
    LaunchedEffect(selectedCategories) {
        if (selectedCategories.isNotEmpty() && isExpanded) {
            isExpanded = false
        }
    }
    
    Card(
        modifier = modifier.clickable {
            // Toggle expansion when clicking the card
            isExpanded = !isExpanded
        },
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A2E)),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFF2A2A2A))
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = 4.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            if (selectedCategories.isEmpty() && !isExpanded) {
                // Show compact "Filters" button when collapsed with no selections
                FilterChip(
                    onClick = { isExpanded = true },
                    modifier = Modifier
                        .height(28.dp)
                        .wrapContentWidth(),
                    label = { 
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center,
                            modifier = Modifier.padding(horizontal = 0.dp, vertical = 0.dp)
                        ) {
                            Text("Filters", color = Color.White, fontSize = 13.sp)
                            Spacer(modifier = Modifier.width(2.dp))
                            Text("▼", color = Color.White, fontSize = 10.sp)
                        }
                    },
                    selected = false,
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Color(0xFF4A90E2),
                        containerColor = Color(0xFF2A2A2A)
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = false,
                        borderColor = Color.Transparent,
                        selectedBorderColor = Color.Transparent,
                        disabledBorderColor = Color.Transparent,
                        disabledSelectedBorderColor = Color.Transparent,
                        borderWidth = 0.dp
                    )
                )
            } else if (selectedCategories.isEmpty() || isExpanded) {
                // Show all filters when expanded or "All" is selected
                
                // Clear filters button
                FilterChip(
                    onClick = {
                        onCategoryFilterChange(emptySet())
                        isExpanded = false // Collapse after clearing
                    },
                    modifier = Modifier.height(28.dp),
                    label = { Text("All", color = Color.White, fontSize = 13.sp) },
                    selected = selectedCategories.isEmpty(),
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Color(0xFF4A90E2),
                        containerColor = Color(0xFF2A2A2A)
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = selectedCategories.isEmpty(),
                        borderColor = Color.Transparent,
                        selectedBorderColor = Color.Transparent,
                        disabledBorderColor = Color.Transparent,
                        disabledSelectedBorderColor = Color.Transparent,
                        borderWidth = 0.dp
                    )
                )
                
                // Category filter chips
                categories.forEach { (category, label) ->
                    FilterChip(
                        onClick = {
                            val newSelection = if (selectedCategories.contains(category)) {
                                selectedCategories - category
                            } else {
                                selectedCategories + category
                            }
                            onCategoryFilterChange(newSelection)
                        },
                        modifier = Modifier.height(28.dp),
                        label = { Text(label, color = Color.White, fontSize = 13.sp) },
                        selected = selectedCategories.contains(category),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = when (category) {
                                PinCategory.STUDY -> Color(0xFF4A90E2)
                                PinCategory.EVENTS -> Color(0xFFE74C3C)
                                PinCategory.CHILL -> Color(0xFF2ECC71)
                                PinCategory.SHOPS_SERVICES -> Color(0xFFF39C12)
                            },
                            containerColor = Color(0xFF2A2A2A)
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = selectedCategories.contains(category),
                            borderColor = Color.Transparent,
                            selectedBorderColor = Color.Transparent,
                            disabledBorderColor = Color.Transparent,
                            disabledSelectedBorderColor = Color.Transparent,
                            borderWidth = 0.dp
                        )
                    )
                }
            } else {
                // Show only selected categories when collapsed
                selectedCategories.forEach { category ->
                    val label = categories.find { it.first == category }?.second ?: "Unknown"
                    FilterChip(
                        onClick = {
                            // Clicking removes the filter
                            onCategoryFilterChange(selectedCategories - category)
                            // Don't auto-expand when removing last filter (stay collapsed)
                        },
                        modifier = Modifier.height(28.dp),
                        label = { 
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(label, color = Color.White, fontSize = 13.sp)
                                Spacer(modifier = Modifier.width(3.dp))
                                Text("×", color = Color.White, fontSize = 16.sp)
                            }
                        },
                        selected = true,
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = when (category) {
                                PinCategory.STUDY -> Color(0xFF4A90E2)
                                PinCategory.EVENTS -> Color(0xFFE74C3C)
                                PinCategory.CHILL -> Color(0xFF2ECC71)
                                PinCategory.SHOPS_SERVICES -> Color(0xFFF39C12)
                            },
                            containerColor = Color(0xFF2A2A2A)
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = true,
                            borderColor = Color.Transparent,
                            selectedBorderColor = Color.Transparent,
                            disabledBorderColor = Color.Transparent,
                            disabledSelectedBorderColor = Color.Transparent,
                            borderWidth = 0.dp
                        )
                    )
                }
                
                // Expand button
                FilterChip(
                    onClick = { isExpanded = true },
                    modifier = Modifier.height(28.dp),
                    label = { Text("+", color = Color.White, fontSize = 16.sp) },
                    selected = false,
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Color(0xFF4A90E2),
                        containerColor = Color(0xFF2A2A2A)
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = false,
                        borderColor = Color.Transparent,
                        selectedBorderColor = Color.Transparent,
                        disabledBorderColor = Color.Transparent,
                        disabledSelectedBorderColor = Color.Transparent,
                        borderWidth = 0.dp
                    )
                )
            }
        }
    }
}

@EntryPoint
@InstallIn(SingletonComponent::class)
interface LocationTrackingServiceEntryPoint {
    fun locationTrackingService(): LocationTrackingService
}

// Helper function to create a scaled bitmap descriptor from vector drawable for map markers
private fun Context.createScaledBitmapFromVector(resourceId: Int, sizeDp: Int): BitmapDescriptor {
    val sizePixels = (sizeDp * resources.displayMetrics.density).toInt()
    val drawable = ContextCompat.getDrawable(this, resourceId)!!
    val bitmap = Bitmap.createBitmap(sizePixels, sizePixels, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, canvas.width, canvas.height)
    drawable.draw(canvas)
    return BitmapDescriptorFactory.fromBitmap(bitmap)
}