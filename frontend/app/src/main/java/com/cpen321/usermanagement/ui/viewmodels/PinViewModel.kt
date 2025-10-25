package com.cpen321.usermanagement.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.usermanagement.data.remote.dto.*
import com.cpen321.usermanagement.data.repository.PinRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PinUiState(
    val pins: List<Pin> = emptyList(),
    val currentPin: Pin? = null,
    val isLoading: Boolean = false,
    val isSearching: Boolean = false,
    val isCreating: Boolean = false,
    val isUpdating: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val totalPins: Int = 0,
    val currentPage: Int = 1
)

@HiltViewModel
class PinViewModel @Inject constructor(
    private val pinRepository: PinRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(PinUiState())
    val uiState: StateFlow<PinUiState> = _uiState.asStateFlow()
    
    init {
        loadPins()
    }
    
    fun loadPins(
        category: PinCategory? = null,
        latitude: Double? = null,
        longitude: Double? = null,
        radius: Double? = null,
        search: String? = null,
        page: Int = 1
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                isSearching = search != null,
                error = null
            )
            
            pinRepository.searchPins(
                category = category,
                latitude = latitude,
                longitude = longitude,
                radius = radius,
                search = search,
                page = page,
                limit = 100 // Increased to show more pins (libraries + cafes)
            )
                .onSuccess { data ->
                    _uiState.value = _uiState.value.copy(
                        pins = data.pins,
                        totalPins = data.total,
                        currentPage = data.page,
                        isLoading = false,
                        isSearching = false
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to load pins",
                        isLoading = false,
                        isSearching = false
                    )
                }
        }
    }
    
    fun createPin(request: CreatePinRequest) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isCreating = true, error = null)
            
            pinRepository.createPin(request)
                .onSuccess { pin ->
                    _uiState.value = _uiState.value.copy(
                        successMessage = "Pin created successfully!",
                        isCreating = false
                    )
                    loadPins() // Refresh pin list
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to create pin",
                        isCreating = false
                    )
                }
        }
    }
    
    fun getPin(pinId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                currentPin = null,  // Clear old pin immediately
                isLoading = true, 
                error = null
            )
            
            pinRepository.getPin(pinId)
                .onSuccess { pin ->
                    _uiState.value = _uiState.value.copy(
                        currentPin = pin,
                        isLoading = false
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to load pin",
                        isLoading = false
                    )
                }
        }
    }
    
    // Cache-first approach: try to get pin from already loaded pins list first
    fun getPinFromCacheOrFetch(pinId: String) {
        // Check if pin is already in the loaded pins list
        val cachedPin = _uiState.value.pins.find { it.id == pinId }
        
        if (cachedPin != null) {
            // Use cached data for instant loading
            _uiState.value = _uiState.value.copy(
                currentPin = cachedPin,
                isLoading = false,
                error = null
            )
        } else {
            // Pin not in cache, fetch from network (e.g., deep link or expired cache)
            getPin(pinId)
        }
    }
    
    fun ratePin(pinId: String, voteType: String) {
        viewModelScope.launch {
            // Find the pin in the current state
            val currentPin = _uiState.value.pins.find { it.id == pinId }
                ?: _uiState.value.currentPin
            
            if (currentPin == null) {
                _uiState.value = _uiState.value.copy(
                    error = "Pin not found"
                )
                return@launch
            }

            // OPTIMISTIC UPDATE: Update UI immediately before backend responds
            val currentVote = currentPin.userVote
            val newVote = if (currentVote == voteType) null else voteType // Toggle if same
            
            // Calculate optimistic upvotes/downvotes
            var upvoteDelta = 0
            var downvoteDelta = 0
            
            when {
                currentVote == null && newVote == "upvote" -> upvoteDelta = 1
                currentVote == null && newVote == "downvote" -> downvoteDelta = 1
                currentVote == "upvote" && newVote == "downvote" -> {
                    upvoteDelta = -1
                    downvoteDelta = 1
                }
                currentVote == "downvote" && newVote == "upvote" -> {
                    upvoteDelta = 1
                    downvoteDelta = -1
                }
                currentVote == "upvote" && newVote == null -> upvoteDelta = -1
                currentVote == "downvote" && newVote == null -> downvoteDelta = -1
            }
            
            val optimisticPin = currentPin.copy(
                userVote = newVote,
                rating = currentPin.rating.copy(
                    upvotes = (currentPin.rating.upvotes + upvoteDelta).coerceAtLeast(0),
                    downvotes = (currentPin.rating.downvotes + downvoteDelta).coerceAtLeast(0)
                )
            )
            
            // Update UI immediately with optimistic data
            _uiState.value = _uiState.value.copy(
                pins = _uiState.value.pins.map { 
                    if (it.id == pinId) optimisticPin else it 
                },
                currentPin = if (_uiState.value.currentPin?.id == pinId) 
                    optimisticPin else _uiState.value.currentPin
            )
            
            // Now make the actual API call
            pinRepository.ratePin(pinId, voteType)
                .onSuccess { response ->
                    // Update with actual data from backend
                    val updatedPin = currentPin.copy(
                        userVote = response.data?.userVote,
                        rating = currentPin.rating.copy(
                            upvotes = response.data?.upvotes ?: currentPin.rating.upvotes,
                            downvotes = response.data?.downvotes ?: currentPin.rating.downvotes
                        )
                    )
                    
                    _uiState.value = _uiState.value.copy(
                        pins = _uiState.value.pins.map { 
                            if (it.id == pinId) updatedPin else it 
                        },
                        currentPin = if (_uiState.value.currentPin?.id == pinId) 
                            updatedPin else _uiState.value.currentPin,
                        successMessage = response.message
                    )
                }
                .onFailure { error ->
                    // Revert optimistic update on error
                    _uiState.value = _uiState.value.copy(
                        pins = _uiState.value.pins.map { 
                            if (it.id == pinId) currentPin else it 
                        },
                        currentPin = if (_uiState.value.currentPin?.id == pinId) 
                            currentPin else _uiState.value.currentPin,
                        error = error.message ?: "Failed to rate pin"
                    )
                }
        }
    }
    
    fun reportPin(pinId: String, reason: String) {
        viewModelScope.launch {
            pinRepository.reportPin(pinId, reason)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "Pin reported"
                    )
                    // Force refresh the pin to get updated report status
                    getPin(pinId)
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to report pin"
                    )
                }
        }
    }
    
    fun deletePin(pinId: String) {
        viewModelScope.launch {
            pinRepository.deletePin(pinId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "Pin deleted successfully"
                    )
                    loadPins() // Refresh list
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to delete pin"
                    )
                }
        }
    }

    fun updatePin(pinId: String, request: UpdatePinRequest) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isUpdating = true, error = null)
            
            pinRepository.updatePin(pinId, request)
                .onSuccess { updatedPin ->
                    _uiState.value = _uiState.value.copy(
                        successMessage = "Pin updated successfully!",
                        currentPin = updatedPin,
                        isUpdating = false
                    )
                    loadPins() // Refresh pin list
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to update pin",
                        isUpdating = false
                    )
                }
        }
    }
    
    // Admin methods
    fun loadReportedPins() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                error = null
            )
            
            pinRepository.getReportedPins()
                .onSuccess { data ->
                    _uiState.value = _uiState.value.copy(
                        pins = data.pins,
                        totalPins = data.total,
                        isLoading = false
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to load reported pins",
                        isLoading = false
                    )
                }
        }
    }
    
    fun clearPinReports(pinId: String) {
        viewModelScope.launch {
            pinRepository.clearPinReports(pinId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "Reports cleared successfully"
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to clear reports"
                    )
                }
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
    
    fun setError(message: String) {
        _uiState.value = _uiState.value.copy(error = message)
    }
    
    fun clearSuccessMessage() {
        _uiState.value = _uiState.value.copy(successMessage = null)
    }
}