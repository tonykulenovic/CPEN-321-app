package com.cpen321.usermanagement.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.usermanagement.data.remote.dto.*
import com.cpen321.usermanagement.data.repository.BadgeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BadgeUiState(
    val isLoading: Boolean = false,
    val earnedBadges: List<UserBadge> = emptyList(),
    val availableBadges: List<Badge> = emptyList(),
    val badgeProgressItems: List<BadgeProgressItem> = emptyList(),
    val stats: BadgeStatsData? = null,
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class BadgeViewModel @Inject constructor(
    private val badgeRepository: BadgeRepository
) : ViewModel() {
    
    companion object {
        private const val TAG = "BadgeViewModel"
    }
    
    private val _uiState = MutableStateFlow(BadgeUiState())
    val uiState: StateFlow<BadgeUiState> = _uiState.asStateFlow()
    
    init {
        loadBadgeProgress()
        loadBadgeStats()
    }
    
    fun loadBadgeProgress() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            badgeRepository.getBadgeProgress()
                .onSuccess { progress ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        earnedBadges = progress.earned,
                        availableBadges = progress.available,
                        badgeProgressItems = progress.progress,
                        error = null
                    )
                    Log.d(TAG, "Badge progress loaded successfully")
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message ?: "Failed to load badge progress"
                    )
                    Log.e(TAG, "Failed to load badge progress", exception)
                }
        }
    }
    
    fun loadBadgeStats() {
        viewModelScope.launch {
            badgeRepository.getBadgeStats()
                .onSuccess { stats ->
                    _uiState.value = _uiState.value.copy(stats = stats)
                    Log.d(TAG, "Badge stats loaded successfully")
                }
                .onFailure { exception ->
                    Log.e(TAG, "Failed to load badge stats", exception)
                }
        }
    }
    
    fun processBadgeEvent(eventType: String, value: Int = 1, metadata: Map<String, Any>? = null) {
        viewModelScope.launch {
            badgeRepository.processBadgeEvent(eventType, value, metadata)
                .onSuccess { newBadges ->
                    if (newBadges.isNotEmpty()) {
                        _uiState.value = _uiState.value.copy(
                            successMessage = "New badge${if (newBadges.size > 1) "s" else ""} earned!"
                        )
                        // Refresh badge progress
                        loadBadgeProgress()
                        loadBadgeStats()
                    }
                    Log.d(TAG, "Badge event processed successfully")
                }
                .onFailure { exception ->
                    Log.e(TAG, "Failed to process badge event", exception)
                }
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
    
    fun clearSuccessMessage() {
        _uiState.value = _uiState.value.copy(successMessage = null)
    }
}