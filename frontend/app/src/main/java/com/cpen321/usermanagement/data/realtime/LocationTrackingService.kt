package com.cpen321.usermanagement.data.realtime

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.os.Looper
import android.util.Log
import com.cpen321.usermanagement.data.repository.LocationRepository
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import dagger.hilt.android.qualifiers.ApplicationContext
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URISyntaxException
import javax.inject.Inject
import javax.inject.Singleton

data class UserLocation(
    val userId: String,
    val username: String,
    val name: String,
    val lat: Double,
    val lng: Double,
    val timestamp: Long = System.currentTimeMillis(),
    val accuracyM: Double = 0.0
)

@Singleton
class LocationTrackingService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val locationRepository: LocationRepository
) {
    
    companion object {
        private const val TAG = "LocationTrackingService"
        private const val SOCKET_SERVER_URL = "http://10.0.2.2:3000" // Android emulator localhost
    }
    
    private var socket: Socket? = null
    private var authToken: String? = null
    private var currentUserId: String? = null
    private var locationSharingEnabled = false
    private var locationUpdateJob: Job? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO)
    
    // GPS location tracking
    private val fusedLocationClient: FusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(context)
    private var locationCallback: LocationCallback? = null
    
    private val _friendLocations = MutableStateFlow<Map<String, UserLocation>>(emptyMap())
    val friendLocations: StateFlow<Map<String, UserLocation>> = _friendLocations.asStateFlow()
    
    private val _connectionStatus = MutableStateFlow(false)
    val connectionStatus: StateFlow<Boolean> = _connectionStatus.asStateFlow()
    
    private val _isSharing = MutableStateFlow(false)
    val isSharing: StateFlow<Boolean> = _isSharing.asStateFlow()
    
    /**
     * Initialize Socket.io connection with authentication
     */
    fun initialize(token: String, userId: String) {
        // Cleanup previous connection if exists
        cleanup()
        
        this.authToken = token
        this.currentUserId = userId
        
        try {
            val options = IO.Options().apply {
                auth = mapOf("token" to token)
                timeout = 10000
                reconnection = true
                reconnectionAttempts = 5
                reconnectionDelay = 1000
                reconnectionDelayMax = 5000
                forceNew = true
            }
            
            socket = IO.socket("$SOCKET_SERVER_URL/realtime", options)
            setupSocketListeners()
            connect()
            
        } catch (e: URISyntaxException) {
            Log.e(TAG, "Invalid socket server URL", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing socket connection", e)
        }
    }
    
    private fun setupSocketListeners() {
        socket?.let { socket ->
            
            // Connection events
            socket.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "🟢 Socket CONNECTED for user: $currentUserId")
                Log.d(TAG, "🟢 Socket ID: ${socket.id()}")
                _connectionStatus.value = true
                
                // Join location tracking room (legacy event, might not be needed)
                currentUserId?.let { userId ->
                    socket.emit("join-location-tracking", userId)
                    Log.d(TAG, "📨 Emitted join-location-tracking for user: $userId")
                }
            }
            
            socket.on(Socket.EVENT_DISCONNECT) {
                Log.d(TAG, "Socket disconnected")
                _connectionStatus.value = false
            }
            
            socket.on(Socket.EVENT_CONNECT_ERROR) { args ->
                val error = args.firstOrNull()
                Log.w(TAG, "Socket connection error: $error")
                _connectionStatus.value = false
                
                // Don't flood logs with reconnection attempts
                if (error.toString().contains("timeout") || error.toString().contains("refused")) {
                    Log.d(TAG, "Connection timeout or refused, will retry automatically")
                }
            }
            
            socket.on("reconnect") { args ->
                Log.d(TAG, "Socket reconnected after ${args.firstOrNull()} attempts")
                _connectionStatus.value = true
            }
            
            socket.on("reconnect_error") { args ->
                Log.w(TAG, "Socket reconnection error: ${args.firstOrNull()}")
            }
            
            // Location update events from backend
            socket.on("location:update") { args ->
                try {
                    val data = args[0] as JSONObject
                    val friendId = data.getString("friendId")
                    val userLocation = UserLocation(
                        userId = friendId,
                        username = "Friend", // We'll get name from friends list
                        name = "Friend User",
                        lat = data.getDouble("lat"),
                        lng = data.getDouble("lng"),
                        timestamp = System.currentTimeMillis(),
                        accuracyM = data.optDouble("accuracyM", 0.0)
                    )
                    
                    // Update friend locations map
                    val currentLocations = _friendLocations.value.toMutableMap()
                    currentLocations[friendId] = userLocation
                    _friendLocations.value = currentLocations
                    
                    Log.d(TAG, "Real-time location update received for friend $friendId at (${userLocation.lat}, ${userLocation.lng})")
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing location:update", e)
                }
            }
            
            // Location ping acknowledgments
            socket.on("location:ping:ack") { args ->
                try {
                    val data = args[0] as JSONObject
                    val shared = data.getBoolean("shared")
                    val expiresAt = data.optString("expiresAt", "N/A")
                    Log.d(TAG, "✅ location:ping:ack received for user: $currentUserId")
                    Log.d(TAG, "✅ Location shared: $shared, expires: $expiresAt")
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error parsing location:ping:ack", e)
                }
            }
            
            socket.on("location:ping:error") { args ->
                try {
                    val data = args[0] as JSONObject
                    val error = data.getString("error")
                    Log.e(TAG, "❌ location:ping:error for user: $currentUserId - $error")
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error parsing location:ping:error", e)
                }
            }
            
            // Track acknowledgments
            socket.on("location:track:ack") { args ->
                try {
                    val data = args[0] as JSONObject
                    val friendId = data.getString("friendId")
                    val status = data.getString("status")
                    Log.d(TAG, "Friend tracking acknowledged: $friendId, status: $status")
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing location:track:ack", e)
                }
            }
            
            socket.on("location:track:error") { args ->
                try {
                    val data = args[0] as JSONObject
                    val friendId = data.getString("friendId")
                    val error = data.getString("error")
                    Log.w(TAG, "Friend tracking error for $friendId: $error")
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing location:track:error", e)
                }
            }
        }
    }
    
    /**
     * Connect to Socket.io server
     */
    fun connect() {
        socket?.connect()
        Log.d(TAG, "Attempting to connect to socket server")
    }
    
    /**
     * Disconnect from Socket.io server
     */
    fun disconnect() {
        socket?.disconnect()
        _connectionStatus.value = false
        _friendLocations.value = emptyMap()
        Log.d(TAG, "Disconnected from socket server")
    }
    
    /**
     * Start tracking a specific friend's location
     */
    fun trackFriend(friendId: String) {
        socket?.emit("location:track", JSONObject().apply {
            put("friendId", friendId)
            put("durationSec", 1800) // Track for 30 minutes
        })
        Log.d(TAG, "Started tracking friend: $friendId")
    }
    
    /**
     * Stop tracking a specific friend's location
     */
    fun stopTrackingFriend(friendId: String) {
        socket?.emit("location:untrack", JSONObject().apply {
            put("friendId", friendId)
        })
        
        // Remove from local state
        val currentLocations = _friendLocations.value.toMutableMap()
        currentLocations.remove(friendId)
        _friendLocations.value = currentLocations
        
        Log.d(TAG, "Stopped tracking friend: $friendId")
    }
    
    /**
     * Get current location for a specific user
     */
    fun getFriendLocation(userId: String): UserLocation? {
        return _friendLocations.value[userId]
    }
    
    /**
     * Start sharing your location with friends
     */
    fun startLocationSharing() {
        locationSharingEnabled = true
        _isSharing.value = true
        Log.d(TAG, "🟢 Location sharing ENABLED for user: $currentUserId")
        Log.d(TAG, "🟢 Socket connected: ${socket?.connected()}")
    }
    
    /**
     * Stop sharing your location with friends
     */
    fun stopLocationSharing() {
        locationSharingEnabled = false
        _isSharing.value = false
        locationUpdateJob?.cancel()
        locationUpdateJob = null
        Log.d(TAG, "Location sharing disabled")
    }
    
    /**
     * Report current location to backend
     */
    fun reportLocation(lat: Double, lng: Double, accuracyM: Double = 0.0) {
        if (!locationSharingEnabled) {
            Log.w(TAG, "🔴 Location sharing DISABLED, not reporting location for user: $currentUserId")
            return
        }
        
        Log.d(TAG, "📍 REPORTING location for user: $currentUserId")
        Log.d(TAG, "📍 Coordinates: lat=$lat, lng=$lng, accuracy=$accuracyM")
        Log.d(TAG, "📍 Socket connected: ${socket?.connected()}")
        
        serviceScope.launch {
            try {
                // HTTP API call
                locationRepository.updateLocation(lat, lng, accuracyM)
                    .onSuccess { response ->
                        Log.d(TAG, "✅ HTTP location update SUCCESS: ${response.message}")
                        Log.d(TAG, "✅ Response data: ${response.data}")
                        
                        // Socket.io real-time update
                        if (socket?.connected() == true) {
                            Log.d(TAG, "📡 EMITTING location:ping via Socket.io...")
                            socket?.emit("location:ping", JSONObject().apply {
                                put("lat", lat)
                                put("lng", lng)
                                put("accuracyM", accuracyM)
                            })
                            Log.d(TAG, "📡 location:ping EMITTED successfully")
                        } else {
                            Log.w(TAG, "⚠️ Socket NOT CONNECTED, skipping real-time update")
                        }
                    }
                    .onFailure { error ->
                        Log.e(TAG, "❌ HTTP location update FAILED: ${error.message}")
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Error reporting location", e)
            }
        }
    }
    
    /**
     * Start real GPS-based location tracking
     */
    @SuppressLint("MissingPermission")
    fun startRealGPSTracking() {
        if (!locationSharingEnabled) {
            Log.w(TAG, "🔴 Location sharing DISABLED, not starting GPS tracking")
            return
        }
        
        Log.d(TAG, "🌍 STARTING real GPS location tracking for user: $currentUserId")
        
        // Stop any existing tracking
        stopRealGPSTracking()
        
        // Create location request
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            15000L // Update every 15 seconds
        ).apply {
            setMinUpdateIntervalMillis(10000L) // Min 10 seconds between updates
            setMaxUpdateDelayMillis(30000L) // Max 30 seconds delay
        }.build()
        
        // Create location callback
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let { location ->
                    Log.d(TAG, "📍 GPS Location received: lat=${location.latitude}, lng=${location.longitude}, accuracy=${location.accuracy}m")
                    reportLocation(location.latitude, location.longitude, location.accuracy.toDouble())
                }
            }
        }
        
        // Request location updates
        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback!!,
                Looper.getMainLooper()
            )
            Log.d(TAG, "✅ GPS location tracking started successfully")
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Location permission not granted", e)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error starting GPS tracking", e)
        }
    }
    
    /**
     * Stop real GPS tracking
     */
    fun stopRealGPSTracking() {
        locationCallback?.let {
            fusedLocationClient.removeLocationUpdates(it)
            locationCallback = null
            Log.d(TAG, "GPS location tracking stopped")
        }
    }
    
    /**
     * Start periodic location updates (for testing/simulation) - DEPRECATED
     */
    @Deprecated("Use startRealGPSTracking() instead")
    fun startPeriodicLocationUpdates(lat: Double, lng: Double, intervalMs: Long = 10000L) {
        if (!locationSharingEnabled) {
            Log.w(TAG, "🔴 Location sharing DISABLED, not starting periodic updates for user: $currentUserId")
            return
        }
        
        Log.d(TAG, "🔄 STARTING periodic location updates for user: $currentUserId")
        Log.d(TAG, "🔄 Initial position: lat=$lat, lng=$lng")
        Log.d(TAG, "🔄 Update interval: ${intervalMs}ms")
        
        locationUpdateJob?.cancel()
        locationUpdateJob = serviceScope.launch {
            var currentLat = lat
            var currentLng = lng
            var updateCount = 0
            
            while (locationSharingEnabled) {
                try {
                    updateCount++
                    
                    // Add small random movement for simulation
                    val latVariation = (Math.random() - 0.5) * 0.001 // ~100m variation
                    val lngVariation = (Math.random() - 0.5) * 0.001
                    
                    currentLat += latVariation
                    currentLng += lngVariation
                    
                    Log.d(TAG, "🔄 Periodic update #$updateCount for user: $currentUserId")
                    reportLocation(currentLat, currentLng, 5.0)
                    delay(intervalMs)
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error in periodic location updates", e)
                    delay(intervalMs)
                }
            }
        }
        
        Log.d(TAG, "Started periodic location updates every ${intervalMs}ms")
    }
    
    /**
     * Check if socket is connected
     */
    fun isConnected(): Boolean {
        return socket?.connected() == true
    }
    
    /**
     * Check if location sharing is enabled
     */
    fun isSharingLocation(): Boolean {
        return locationSharingEnabled
    }
    
    /**
     * Debug method to log current service state
     */
    fun logCurrentState() {
        Log.d(TAG, "📊 === LocationTrackingService STATE ===")
        Log.d(TAG, "📊 Current User ID: $currentUserId")
        Log.d(TAG, "📊 Location Sharing Enabled: $locationSharingEnabled")
        Log.d(TAG, "📊 Socket Connected: ${socket?.connected()}")
        Log.d(TAG, "📊 Socket ID: ${socket?.id()}")
        Log.d(TAG, "📊 Connection Status: ${_connectionStatus.value}")
        Log.d(TAG, "📊 Friend Locations Count: ${_friendLocations.value.size}")
        Log.d(TAG, "📊 Periodic Job Active: ${locationUpdateJob?.isActive}")
        Log.d(TAG, "📊 Auth Token Available: ${authToken != null}")
        Log.d(TAG, "📊 =====================================")
    }
    
    /**
     * Clean up resources
     */
    fun cleanup() {
        try {
            Log.d(TAG, "🧹 CLEANUP started for user: $currentUserId")
            
            locationUpdateJob?.cancel()
            locationUpdateJob = null
            locationSharingEnabled = false
            _isSharing.value = false
            
            socket?.off()
            socket?.disconnect()
            socket = null
            _connectionStatus.value = false
            _friendLocations.value = emptyMap()
            authToken = null
            currentUserId = null
            
            Log.d(TAG, "🧹 Location tracking service cleanup COMPLETE")
        } catch (e: Exception) {
            Log.w(TAG, "❌ Error during cleanup", e)
        }
    }
}