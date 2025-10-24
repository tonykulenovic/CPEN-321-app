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
            pinRepository.ratePin(pinId, voteType)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "Pin ${voteType}d successfully!"
                    )
                    // Refresh the pin or pins list
                    loadPins()
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
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
                        successMessage = "Pin reported successfully"
                    )
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