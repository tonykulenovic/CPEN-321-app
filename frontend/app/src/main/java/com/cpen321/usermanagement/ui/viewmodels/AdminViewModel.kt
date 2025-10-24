package com.cpen321.usermanagement.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.usermanagement.data.remote.dto.User
import com.cpen321.usermanagement.data.repository.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AdminUiState(
    val users: List<User> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class AdminViewModel @Inject constructor(
    private val adminRepository: AdminRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminUiState())
    val uiState: StateFlow<AdminUiState> = _uiState.asStateFlow()

    fun loadAllUsers() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            adminRepository.getAllUsers()
                .onSuccess { users ->
                    _uiState.value = _uiState.value.copy(
                        users = users,
                        isLoading = false,
                        error = null
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to load users"
                    )
                }
        }
    }

    fun suspendUser(userId: String) {
        viewModelScope.launch {
            adminRepository.suspendUser(userId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "User suspended successfully"
                    )
                    loadAllUsers() // Refresh list
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to suspend user"
                    )
                }
        }
    }

    fun unsuspendUser(userId: String) {
        viewModelScope.launch {
            adminRepository.unsuspendUser(userId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "User unsuspended successfully"
                    )
                    loadAllUsers() // Refresh list
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to unsuspend user"
                    )
                }
        }
    }

    fun deleteUser(userId: String) {
        viewModelScope.launch {
            adminRepository.deleteUser(userId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        successMessage = "User deleted successfully"
                    )
                    loadAllUsers() // Refresh list
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        error = error.message ?: "Failed to delete user"
                    )
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

