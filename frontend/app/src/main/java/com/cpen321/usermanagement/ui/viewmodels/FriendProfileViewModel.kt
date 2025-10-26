package com.cpen321.usermanagement.ui.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.usermanagement.data.remote.dto.FriendProfileData
import com.cpen321.usermanagement.data.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FriendProfileUiState(
    val isLoading: Boolean = true,
    val friendProfile: FriendProfileData? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class FriendProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository
) : ViewModel() {

    companion object {
        private const val TAG = "FriendProfileViewModel"
    }

    private val _uiState = MutableStateFlow(FriendProfileUiState())
    val uiState: StateFlow<FriendProfileUiState> = _uiState.asStateFlow()

    fun loadFriendProfile(userId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)

            val result = profileRepository.getFriendProfile(userId)

            if (result.isSuccess) {
                val friendProfile = result.getOrNull()!!
                Log.d(TAG, "Friend profile loaded successfully")
                Log.d(TAG, "Badges count: ${friendProfile.badges.size}")
                Log.d(TAG, "Badges data: ${friendProfile.badges}")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    friendProfile = friendProfile
                )
            } else {
                val error = result.exceptionOrNull()
                Log.e(TAG, "Failed to load friend profile", error)
                val errorMessage = error?.message ?: "Failed to load friend profile"
                
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = errorMessage
                )
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}

