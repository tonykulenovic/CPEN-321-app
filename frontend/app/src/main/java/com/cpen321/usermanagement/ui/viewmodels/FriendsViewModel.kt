package com.cpen321.usermanagement.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import android.util.Log
import com.cpen321.usermanagement.data.realtime.LocationTrackingService
import com.cpen321.usermanagement.data.remote.dto.FriendRequestSummary
import com.cpen321.usermanagement.data.remote.dto.FriendSummary
import com.cpen321.usermanagement.data.remote.dto.FriendLocation
import com.cpen321.usermanagement.data.remote.dto.UserSearchResult
import com.cpen321.usermanagement.data.repository.FriendsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FriendsUiState(
    val friends: List<FriendSummary> = emptyList(),
    val friendRequests: List<FriendRequestSummary> = emptyList(),
    val searchResults: List<UserSearchResult> = emptyList(),
    val friendLocations: List<FriendLocation> = emptyList(),
    val pendingRequestUserIds: Set<String> = emptySet(),
    val isLoading: Boolean = false,
    val isSearching: Boolean = false,
    val isLoadingLocations: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class FriendsViewModel @Inject constructor(
    private val friendsRepository: FriendsRepository,
    private val locationTrackingService: LocationTrackingService
) : ViewModel() {
    
    companion object {
        private const val TAG = "FriendsViewModel"
    }
    
    private val _uiState = MutableStateFlow(FriendsUiState())
    val uiState: StateFlow<FriendsUiState> = _uiState.asStateFlow()
    
    init {
        loadFriends()
        loadFriendRequests()
        observeRealtimeLocationUpdates()
    }
    
    /**
     * Observe real-time location updates from Socket.IO
     * This supplements HTTP-based location fetching with live updates
     */
    private fun observeRealtimeLocationUpdates() {
        viewModelScope.launch {
            Log.d(TAG, "🎯 Starting to observe real-time friend location updates...")
            locationTrackingService.friendLocations.collect { socketLocations ->
                if (socketLocations.isNotEmpty()) {
                    Log.d(TAG, "📍 Real-time location update received: ${socketLocations.size} friends")
                    
                    // Convert socket locations to FriendLocation DTOs and merge with existing
                    val currentLocations = _uiState.value.friendLocations.toMutableList()
                    
                    socketLocations.forEach { (userId, userLocation) ->
                        // Find and update existing location, or add new one
                        val existingIndex = currentLocations.indexOfFirst { it.userId == userId }
                        val newLocation = FriendLocation(
                            userId = userId,
                            lat = userLocation.lat,
                            lng = userLocation.lng,
                            accuracyM = userLocation.accuracyM,
                            ts = java.time.Instant.ofEpochMilli(userLocation.timestamp).toString()
                        )
                        
                        if (existingIndex >= 0) {
                            currentLocations[existingIndex] = newLocation
                            Log.d(TAG, "📍 Updated location for friend: $userId")
                        } else {
                            currentLocations.add(newLocation)
                            Log.d(TAG, "📍 Added new location for friend: $userId")
                        }
                    }
                    
                    _uiState.value = _uiState.value.copy(friendLocations = currentLocations)
                    Log.d(TAG, "✅ Friend locations updated. Total: ${currentLocations.size}")
                }
            }
        }
    }
    
    fun loadFriends() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            friendsRepository.getFriends()
                .onSuccess { friends ->
                    _uiState.value = _uiState.value.copy(
                        friends = friends,
                        isLoading = false
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to load friends",
                        isLoading = false
                    )
                }
        }
    }
    
    fun loadFriendRequests() {
        viewModelScope.launch {
            friendsRepository.getFriendRequests()
                .onSuccess { requests ->
                    _uiState.value = _uiState.value.copy(friendRequests = requests)
                }
                .onFailure { error ->
                    // Silently fail for friend requests - they're secondary
                }
        }
    }
    
    fun sendFriendRequest(userId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(error = null)
            
            friendsRepository.sendFriendRequest(userId)
                .onSuccess {
                    // ADD THIS - Add userId to pending set
                    val updatedPending = _uiState.value.pendingRequestUserIds + userId
                    _uiState.value = _uiState.value.copy(
                        successMessage = "Friend request sent!",
                        pendingRequestUserIds = updatedPending
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to send friend request"
                    )
                }
        }
    }
    
    fun acceptFriendRequest(requestId: String) {
        viewModelScope.launch {
            friendsRepository.acceptFriendRequest(requestId)
                .onSuccess {
                    // Remove from requests and reload friends
                    _uiState.value = _uiState.value.copy(
                        friendRequests = _uiState.value.friendRequests.filter { it._id != requestId },
                        successMessage = "Friend request accepted!"
                    )
                    loadFriends()
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to accept friend request"
                    )
                }
        }
    }
    
    fun declineFriendRequest(requestId: String) {
        viewModelScope.launch {
            friendsRepository.declineFriendRequest(requestId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        friendRequests = _uiState.value.friendRequests.filter { it._id != requestId }
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to decline friend request"
                    )
                }
        }
    }
    
    fun removeFriend(friendId: String) {
        viewModelScope.launch {
            friendsRepository.removeFriend(friendId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        friends = _uiState.value.friends.filter { it.userId != friendId },
                        successMessage = "Friend removed"
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to remove friend"
                    )
                }
        }
    }
    
    fun searchUsers(query: String) {
        if (query.isBlank()) {
            _uiState.value = _uiState.value.copy(searchResults = emptyList())
            return
        }
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSearching = true, error = null)
            
            friendsRepository.searchUsers(query)
                .onSuccess { results ->
                    _uiState.value = _uiState.value.copy(
                        searchResults = results,
                        isSearching = false
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to search users",
                        isSearching = false,
                        searchResults = emptyList()
                    )
                }
        }
    }
    
    fun clearSearchResults() {
        _uiState.value = _uiState.value.copy(searchResults = emptyList())
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
    
    fun clearSuccessMessage() {
        _uiState.value = _uiState.value.copy(successMessage = null)
    }

    fun loadFriendsLocations() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingLocations = true)
            
            friendsRepository.getFriendsLocations()
                .onSuccess { locations ->
                    _uiState.value = _uiState.value.copy(
                        friendLocations = locations,
                        isLoadingLocations = false
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoadingLocations = false
                        // Don't show error for locations - they're optional
                    )
                }
        }
    }

    // Check if user has pending request
    fun isPendingRequest(userId: String): Boolean {
        return userId in _uiState.value.pendingRequestUserIds
    }
}