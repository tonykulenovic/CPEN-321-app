package com.cpen321.usermanagement.ui.viewmodels

import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.usermanagement.data.remote.dto.User
import com.cpen321.usermanagement.data.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    // Loading states
    val isLoadingProfile: Boolean = false,
    val isSavingProfile: Boolean = false,
    val isLoadingPhoto: Boolean = false,

    // Data states
    val user: User? = null,

    // Message states
    val errorMessage: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository
) : ViewModel() {

    companion object {
        private const val TAG = "ProfileViewModel"
    }

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingProfile = true, errorMessage = null)

            val profileResult = profileRepository.getProfile()

            if (profileResult.isSuccess) {
                val user = profileResult.getOrNull()!!

                _uiState.value = _uiState.value.copy(
                    isLoadingProfile = false,
                    user = user
                )
            } else {
                val error = profileResult.exceptionOrNull()
                Log.e(TAG, "Failed to load profile", error)
                val errorMessage = error?.message ?: "Failed to load profile"

                _uiState.value = _uiState.value.copy(
                    isLoadingProfile = false,
                    errorMessage = errorMessage
                )
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    fun clearSuccessMessage() {
        _uiState.value = _uiState.value.copy(successMessage = null)
    }

    fun setLoadingPhoto(isLoading: Boolean) {
        _uiState.value = _uiState.value.copy(isLoadingPhoto = isLoading)
    }

    fun uploadProfilePicture(pictureUri: Uri) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingPhoto = true)
            
            val result = profileRepository.uploadProfilePicture(pictureUri)
            if (result.isSuccess) {
                val imagePath = result.getOrNull()!!
                val currentUser = _uiState.value.user ?: return@launch
                val updatedUser = currentUser.copy(profilePicture = imagePath)
                _uiState.value = _uiState.value.copy(
                    isLoadingPhoto = false, 
                    user = updatedUser, 
                    successMessage = "Profile picture updated successfully!"
                )
            } else {
                val error = result.exceptionOrNull()
                Log.e(TAG, "Failed to upload profile picture", error)
                _uiState.value = _uiState.value.copy(
                    isLoadingPhoto = false,
                    errorMessage = error?.message ?: "Failed to upload profile picture"
                )
            }
        }
    }

    fun updateProfile(name: String, username: String, bio: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _uiState.value =
                _uiState.value.copy(
                    isSavingProfile = true,
                    errorMessage = null,
                    successMessage = null
                )

            val result = profileRepository.updateProfile(name, username, bio)
            if (result.isSuccess) {
                val updatedUser = result.getOrNull()!!
                _uiState.value = _uiState.value.copy(
                    isSavingProfile = false,
                    user = updatedUser,
                    successMessage = "Profile updated successfully!"
                )
                onSuccess()
            } else {
                _uiState.value = _uiState.value.copy(
                    isSavingProfile = false,
                    errorMessage = result.exceptionOrNull()?.message ?: "Failed to update profile"
                )
            }
        }
    }

    fun updatePrivacy(request: com.cpen321.usermanagement.data.remote.dto.UpdatePrivacyRequest) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isSavingProfile = true,
                errorMessage = null,
                successMessage = null
            )

            val result = profileRepository.updatePrivacy(request)
            if (result.isSuccess) {
                val updatedUser = result.getOrNull()!!
                _uiState.value = _uiState.value.copy(
                    isSavingProfile = false,
                    user = updatedUser,
                    successMessage = "Privacy settings updated successfully!"
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isSavingProfile = false,
                    errorMessage = result.exceptionOrNull()?.message ?: "Failed to update privacy settings"
                )
            }
        }
    }
}