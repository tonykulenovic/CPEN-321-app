package com.cpen321.usermanagement.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.usermanagement.data.local.preferences.TokenManager
import com.cpen321.usermanagement.data.realtime.LocationTrackingService
import com.cpen321.usermanagement.data.realtime.UserLocation
import com.cpen321.usermanagement.data.repository.FriendsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LocationTrackingUiState(
    val isConnected: Boolean = false,
    val friendLocations: Map<String, UserLocation> = emptyMap(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class LocationTrackingViewModel @Inject constructor(
    private val locationTrackingService: LocationTrackingService,
    private val friendsRepository: FriendsRepository,
    private val tokenManager: TokenManager
) : ViewModel() {
    
    // Expose the service for direct access (temporary solution)
    val service: LocationTrackingService get() = locationTrackingService
    
    private val _uiState = MutableStateFlow(LocationTrackingUiState())
    val uiState: StateFlow<LocationTrackingUiState> = _uiState.asStateFlow()
    
    init {
        // Observe connection status and friend locations
        viewModelScope.launch {
            combine(
                locationTrackingService.connectionStatus,
                locationTrackingService.friendLocations
            ) { isConnected, friendLocations ->
                _uiState.value = _uiState.value.copy(
                    isConnected = isConnected,
                    friendLocations = friendLocations
                )
            }
        }
    }
    
    /**
     * Initialize location tracking with authentication
     */
    fun initializeLocationTracking(userId: String) {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                
                // Get auth token
                val token = tokenManager.getTokenSync()
                if (token == null) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Authentication token not found"
                    )
                    return@launch
                }
                
                // Initialize location tracking service
                locationTrackingService.initialize(token, userId)
                
                // Get friends list and start tracking their locations
                friendsRepository.getFriends()
                    .onSuccess { friends ->
                        friends.forEach { friend ->
                            locationTrackingService.trackFriend(friend.userId)
                        }
                        _uiState.value = _uiState.value.copy(isLoading = false)
                    }
                    .onFailure { error ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = "Failed to load friends: ${error.message}"
                        )
                    }
                    
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Failed to initialize location tracking: ${e.message}"
                )
            }
        }
    }
    
    /**
     * Start tracking a specific friend
     */
    fun startTrackingFriend(friendId: String) {
        locationTrackingService.trackFriend(friendId)
    }
    
    /**
     * Stop tracking a specific friend
     */
    fun stopTrackingFriend(friendId: String) {
        locationTrackingService.stopTrackingFriend(friendId)
    }
    
    /**
     * Get location for a specific friend
     */
    fun getFriendLocation(friendId: String): UserLocation? {
        return _uiState.value.friendLocations[friendId]
    }
    
    /**
     * Clear error message
     */
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
    
    /**
     * Disconnect from location tracking
     */
    fun disconnect() {
        locationTrackingService.disconnect()
    }
    
    /**
     * Reconnect to location tracking
     */
    fun reconnect(userId: String) {
        initializeLocationTracking(userId)
    }
    
    override fun onCleared() {
        super.onCleared()
        locationTrackingService.cleanup()
    }
}