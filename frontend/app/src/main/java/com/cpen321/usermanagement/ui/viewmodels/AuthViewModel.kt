package com.cpen321.usermanagement.ui.viewmodels

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cpen321.usermanagement.data.remote.dto.AuthData
import com.cpen321.usermanagement.data.remote.dto.User
import com.cpen321.usermanagement.data.repository.AuthRepository
import com.cpen321.usermanagement.data.repository.ProfileRepository
import com.cpen321.usermanagement.ui.navigation.NavRoutes
import com.cpen321.usermanagement.ui.navigation.NavigationStateManager
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    // Loading states
    val isSigningIn: Boolean = false,
    val isSigningUp: Boolean = false,
    val isCheckingAuth: Boolean = true,

    // Auth states
    val isAuthenticated: Boolean = false,
    val user: User? = null,

    // Message states
    val errorMessage: String? = null,
    val successMessage: String? = null,

    // Control flags
    val shouldSkipAuthCheck: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val profileRepository: ProfileRepository,
    private val navigationStateManager: NavigationStateManager
) : ViewModel() {

    companion object {
        private const val TAG = "AuthViewModel"
    }

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        if (!_uiState.value.shouldSkipAuthCheck) {
            checkAuthenticationStatus()
        }
    }

    private fun checkAuthenticationStatus() {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isCheckingAuth = true)
                updateNavigationState(isLoading = true)

                val isAuthenticated = authRepository.isUserAuthenticated()
                val user = if (isAuthenticated) authRepository.getCurrentUser() else null
                val isAdmin = user?.isAdmin ?: false
                val needsProfileCompletion = false

                _uiState.value = _uiState.value.copy(
                    isAuthenticated = isAuthenticated,
                    user = user,
                    isCheckingAuth = false
                )

                updateNavigationState(
                    isAuthenticated = isAuthenticated,
                    needsProfileCompletion = needsProfileCompletion,
                    isAdmin = isAdmin,
                    isLoading = false
                )
            } catch (e: java.net.SocketTimeoutException) {
                handleAuthError("Network timeout. Please check your connection.", e)
            } catch (e: java.net.UnknownHostException) {
                handleAuthError("No internet connection. Please check your network.", e)
            } catch (e: java.io.IOException) {
                handleAuthError("Connection error. Please try again.", e)
            }
        }
    }

    private fun updateNavigationState(
        isAuthenticated: Boolean = false,
        needsProfileCompletion: Boolean = false,
        isAdmin: Boolean = false,
        isLoading: Boolean = false
    ) {
        navigationStateManager.updateAuthenticationState(
            isAuthenticated = isAuthenticated,
            needsProfileCompletion = needsProfileCompletion,
            isAdmin = isAdmin,
            isLoading = isLoading,
            currentRoute = NavRoutes.LOADING
        )
    }

    private fun handleAuthError(errorMessage: String, exception: Exception) {
        Log.e(TAG, "Authentication check failed: $errorMessage", exception)
        _uiState.value = _uiState.value.copy(
            isCheckingAuth = false,
            isAuthenticated = false,
            errorMessage = errorMessage
        )
        updateNavigationState()
    }

    suspend fun signInWithGoogle(context: Context): Result<GoogleIdTokenCredential> {
        return authRepository.signInWithGoogle(context)
    }

    private fun handleGoogleAuthResult(
        credential: GoogleIdTokenCredential,
        isSignUp: Boolean,
        username: String? = null,
        authOperation: suspend (String, String?) -> Result<AuthData>
    ) {
        viewModelScope.launch {
            // Update loading state based on operation type
            _uiState.value = _uiState.value.copy(
                isSigningIn = !isSignUp,
                isSigningUp = isSignUp
            )

            authOperation(credential.idToken, username)
                .onSuccess { authData ->
                    val isAdmin = authData.user.isAdmin
                    val needsProfileCompletion =
                        authData.user.bio == null || authData.user.bio.isBlank()

                    _uiState.value = _uiState.value.copy(
                        isSigningIn = false,
                        isSigningUp = false,
                        isAuthenticated = true,
                        user = authData.user,
                        errorMessage = null
                    )

                    // Trigger navigation through NavigationStateManager
                    // Admins skip onboarding and go directly to admin dashboard
                    navigationStateManager.updateAuthenticationState(
                        isAuthenticated = true,
                        needsProfileCompletion = if (isAdmin) false else needsProfileCompletion,
                        isAdmin = isAdmin,
                        isLoading = false,
                        currentRoute = NavRoutes.AUTH
                    )
                }
                .onFailure { error ->
                    val operationType = if (isSignUp) "sign up" else "sign in"
                    Log.e(TAG, "Google $operationType failed", error)
                    _uiState.value = _uiState.value.copy(
                        isSigningIn = false,
                        isSigningUp = false,
                        errorMessage = error.message
                    )
                }
        }
    }

    fun handleGoogleSignInResult(credential: GoogleIdTokenCredential) {
        handleGoogleAuthResult(credential, isSignUp = false) { idToken, _ ->
            authRepository.googleSignIn(idToken)
        }
    }

    fun handleGoogleSignUpResult(credential: GoogleIdTokenCredential, username: String) {
        handleGoogleAuthResult(credential, isSignUp = true, username = username) { idToken, user ->
            authRepository.googleSignUp(idToken, user!!)
        }
    }

    fun handleAccountDeletion() {
        viewModelScope.launch {
            val deleteResult = profileRepository.deleteAccount()
            
            if (deleteResult.isSuccess) {
                authRepository.clearToken()
                _uiState.value = _uiState.value.copy(
                    isAuthenticated = false,
                    isCheckingAuth = false,
                    shouldSkipAuthCheck = true,
                    user = null,
                    isSigningIn = false,
                    isSigningUp = false
                )
            } else {
                val error = deleteResult.exceptionOrNull()
                Log.e(TAG, "Failed to delete account", error)
                _uiState.value = _uiState.value.copy(
                    errorMessage = error?.message ?: "Failed to delete account"
                )
            }
        }
    }

    fun handleLogout() {
        viewModelScope.launch {
            authRepository.clearToken()
            _uiState.value = _uiState.value.copy(
                isAuthenticated = false,
                isCheckingAuth = false,
                shouldSkipAuthCheck = true,
                user = null,
                isSigningIn = false,
                isSigningUp = false
            )
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    fun setSuccessMessage(message: String) {
        _uiState.value = _uiState.value.copy(successMessage = message)
    }

    fun clearSuccessMessage() {
        _uiState.value = _uiState.value.copy(successMessage = null)
    }

    fun checkAndProceedWithSignUp(
        credential: GoogleIdTokenCredential,
        onUserExists: () -> Unit,
        onNewUser: () -> Unit
    ) {
        viewModelScope.launch {
            authRepository.checkGoogleAccountExists(credential.idToken)
                .onSuccess { exists ->
                    if (exists) {
                        _uiState.value = _uiState.value.copy(
                            errorMessage = "User already exists, please sign in instead."
                        )
                        onUserExists()
                    } else {
                        onNewUser()
                    }
                }
                .onFailure { error ->
                    Log.e(TAG, "Failed to check account", error)
                    _uiState.value = _uiState.value.copy(
                        errorMessage = error.message ?: "Failed to verify account status"
                    )
                }
        }
    }
}
