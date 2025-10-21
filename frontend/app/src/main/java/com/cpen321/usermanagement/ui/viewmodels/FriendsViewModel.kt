package com.cpen321.usermanagement.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.usermanagement.data.remote.dto.FriendRequestSummary
import com.cpen321.usermanagement.data.remote.dto.FriendSummary
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
    val pendingRequestUserIds: Set<String> = emptySet(),  // ADD THIS - Track pending sent requests
    val isLoading: Boolean = false,
    val isSearching: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class FriendsViewModel @Inject constructor(
    private val friendsRepository: FriendsRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(FriendsUiState())
    val uiState: StateFlow<FriendsUiState> = _uiState.asStateFlow()
    
    init {
        loadFriends()
        loadFriendRequests()
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

    // ADD THIS NEW FUNCTION - Check if user has pending request
    fun isPendingRequest(userId: String): Boolean {
        return userId in _uiState.value.pendingRequestUserIds
    }
}