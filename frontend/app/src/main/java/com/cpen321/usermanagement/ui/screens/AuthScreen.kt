package com.cpen321.usermanagement.ui.screens

import Button
import androidx.activity.ComponentActivity
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import com.cpen321.usermanagement.R
import com.cpen321.usermanagement.ui.components.MessageSnackbar
import com.cpen321.usermanagement.ui.components.MessageSnackbarState
import com.cpen321.usermanagement.ui.viewmodels.AuthUiState
import com.cpen321.usermanagement.ui.viewmodels.AuthViewModel
import com.cpen321.usermanagement.ui.viewmodels.ProfileViewModel
import com.cpen321.usermanagement.ui.theme.LocalSpacing
import kotlinx.coroutines.launch
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import androidx.compose.runtime.SideEffect
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.window.DialogProperties
import androidx.compose.foundation.layout.Box

private data class AuthSnackbarData(
    val successMessage: String?,
    val errorMessage: String?,
    val onSuccessMessageShown: () -> Unit,
    val onErrorMessageShown: () -> Unit
)

private data class AuthScreenActions(
    val isSigningIn: Boolean,
    val isSigningUp: Boolean,
    val onSignInClick: () -> Unit,
    val onSignUpClick: () -> Unit
)

@Composable
fun AuthScreen(
    authViewModel: AuthViewModel,
    profileViewModel: ProfileViewModel
) {
    val context = LocalContext.current
    val uiState by authViewModel.uiState.collectAsState()
    val snackBarHostState = remember { SnackbarHostState() }
    
    var showUsernameDialog by remember { mutableStateOf(false) }
    var pendingCredential by remember { mutableStateOf<com.google.android.libraries.identity.googleid.GoogleIdTokenCredential?>(null) }
    var isSubmittingUsername by remember { mutableStateOf(false) }
    var isCheckingAccount by remember { mutableStateOf(false) }

    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF0F1419),
            darkIcons = false
        )
    }

    LaunchedEffect(uiState.isAuthenticated) {
        if (uiState.isAuthenticated && !uiState.isCheckingAuth) {
            profileViewModel.loadProfile()
        }
    }
    
    LaunchedEffect(uiState.isSigningUp) {
        if (!uiState.isSigningUp && isSubmittingUsername) {
            isSubmittingUsername = false
            if (uiState.isAuthenticated || uiState.errorMessage != null) {
                showUsernameDialog = false
                pendingCredential = null
            }
        }
    }

    AuthContent(
        uiState = uiState,
        snackBarHostState = snackBarHostState,
        onSignInClick = {
            (context as? ComponentActivity)?.lifecycleScope?.launch {
                val result = authViewModel.signInWithGoogle(context)
                result.onSuccess { credential ->
                    authViewModel.handleGoogleSignInResult(credential)
                }
            }
        },
        onSignUpClick = {
            (context as? ComponentActivity)?.lifecycleScope?.launch {
                isCheckingAccount = true
                val result = authViewModel.signInWithGoogle(context)
                result.onSuccess { credential ->
                    authViewModel.checkAndProceedWithSignUp(
                        credential = credential,
                        onUserExists = {
                            // User exists, error message already set, just reset state
                            isCheckingAccount = false
                            pendingCredential = null
                        },
                        onNewUser = {
                            // New user, show username dialog
                            isCheckingAccount = false
                            pendingCredential = credential
                            showUsernameDialog = true
                        }
                    )
                }.onFailure {
                    isCheckingAccount = false
                }
            }
        },
        onSuccessMessageShown = authViewModel::clearSuccessMessage,
        onErrorMessageShown = authViewModel::clearError
    )
    
    if (showUsernameDialog && pendingCredential != null) {
        UsernameInputDialog(
            isLoading = isSubmittingUsername,
            onDismiss = {
                if (!isSubmittingUsername) {
                    showUsernameDialog = false
                    pendingCredential = null
                }
            },
            onConfirm = { username ->
                if (!isSubmittingUsername) {
                    isSubmittingUsername = true
                    authViewModel.handleGoogleSignUpResult(pendingCredential!!, username)
                }
            }
        )
    }
    
    // ADD THIS: Show loading overlay while checking
    if (isCheckingAccount) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.5f)),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = Color(0xFF00BCD4))
        }
    }
}

@Composable
private fun AuthContent(
    uiState: AuthUiState,
    snackBarHostState: SnackbarHostState,
    onSignInClick: () -> Unit,
    onSignUpClick: () -> Unit,
    onSuccessMessageShown: () -> Unit,
    onErrorMessageShown: () -> Unit,
    modifier: Modifier = Modifier
) {
    Scaffold(
        modifier = modifier,
        containerColor = Color(0xFF0F1419), // Dark background to match app theme
        snackbarHost = {
            AuthSnackbarHost(
                hostState = snackBarHostState,
                messages = AuthSnackbarData(
                    successMessage = uiState.successMessage,
                    errorMessage = uiState.errorMessage,
                    onSuccessMessageShown = onSuccessMessageShown,
                    onErrorMessageShown = onErrorMessageShown
                )
            )
        }
    ) { paddingValues ->
        AuthBody(
            paddingValues = paddingValues,
            actions = AuthScreenActions(
                isSigningIn = uiState.isSigningIn,
                isSigningUp = uiState.isSigningUp,
                onSignInClick = onSignInClick,
                onSignUpClick = onSignUpClick
            )
        )
    }
}

@Composable
private fun AuthSnackbarHost(
    hostState: SnackbarHostState,
    messages: AuthSnackbarData,
    modifier: Modifier = Modifier
) {
    MessageSnackbar(
        hostState = hostState,
        messageState = MessageSnackbarState(
            successMessage = messages.successMessage,
            errorMessage = messages.errorMessage,
            onSuccessMessageShown = messages.onSuccessMessageShown,
            onErrorMessageShown = messages.onErrorMessageShown
        ),
        modifier = modifier
    )
}

@Composable
private fun AuthBody(
    paddingValues: PaddingValues,
    actions: AuthScreenActions,
    modifier: Modifier = Modifier
) {
    val spacing = LocalSpacing.current

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(paddingValues)
            .padding(spacing.extraLarge),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        AuthHeader()

        Spacer(modifier = Modifier.height(spacing.extraLarge2))

        AuthButtons(
            isSigningIn = actions.isSigningIn,
            isSigningUp = actions.isSigningUp,
            onSignInClick = actions.onSignInClick,
            onSignUpClick = actions.onSignUpClick
        )
    }
}

@Composable
private fun AuthHeader(
    modifier: Modifier = Modifier
) {
    AppTitle(modifier = modifier)
}

@Composable
private fun AppTitle(
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.universe_logo),
            contentDescription = "Logo",
            contentScale = ContentScale.Fit,
            modifier = Modifier.size(80.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = stringResource(R.string.app_name),
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = Color.White,
        )
    }
}

@Composable
private fun AuthButtons(
    isSigningIn: Boolean,
    isSigningUp: Boolean,
    onSignInClick: () -> Unit,
    onSignUpClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val spacing = LocalSpacing.current

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.medium)
    ) {
        GoogleSignInButton(
            isLoading = isSigningIn,
            onClick = onSignInClick,
            enabled = !isSigningIn && !isSigningUp
        )

        GoogleSignUpButton(
            isLoading = isSigningUp,
            onClick = onSignUpClick,
            enabled = !isSigningIn && !isSigningUp
        )
    }
}

@Composable
private fun GoogleSignInButton(
    isLoading: Boolean,
    onClick: () -> Unit,
    enabled: Boolean,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
    ) {
        GoogleButtonContent(
            isLoading = isLoading,
            text = stringResource(R.string.sign_in_with_google),
            showOnPrimaryColor = true
        )
    }
}

@Composable
private fun GoogleSignUpButton(
    isLoading: Boolean,
    onClick: () -> Unit,
    enabled: Boolean,
) {
    Button(
        type = "secondary",
        onClick = onClick,
        enabled = enabled,
    ) {
        GoogleButtonContent(
            isLoading = isLoading,
            text = stringResource(R.string.sign_up_with_google),
            showOnPrimaryColor = false
        )
    }
}

@Composable
private fun GoogleButtonContent(
    isLoading: Boolean,
    text: String,
    showOnPrimaryColor: Boolean,
    modifier: Modifier = Modifier
) {
    val spacing = LocalSpacing.current

    if (isLoading) {
        ButtonLoadingIndicator(
            showOnPrimaryColor = showOnPrimaryColor,
            modifier = modifier
        )
    } else {
        Row(
            modifier = modifier,
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            GoogleLogo()
            Spacer(modifier = Modifier.width(spacing.small))
            ButtonText(
                text = text,
                color = Color.White
            )
        }
    }
}

@Composable
private fun ButtonLoadingIndicator(
    showOnPrimaryColor: Boolean,
    modifier: Modifier = Modifier
) {
    val spacing = LocalSpacing.current

    CircularProgressIndicator(
        modifier = modifier.size(spacing.large),
        color = if (showOnPrimaryColor) {
            Color.White
        } else {
            MaterialTheme.colorScheme.primary
        },
        strokeWidth = 2.dp
    )
}

@Composable
private fun GoogleLogo(
    modifier: Modifier = Modifier
) {
    val spacing = LocalSpacing.current

    Image(
        painter = painterResource(id = R.drawable.ic_google),
        contentDescription = stringResource(R.string.google_logo),
        modifier = modifier.size(spacing.large)
    )
}

@Composable
private fun ButtonText(
    text: String,
    color: Color = Color.White,
    modifier: Modifier = Modifier
) {
    Text(
        text = text,
        modifier = modifier,
        color = color
    )
}

@Composable
private fun UsernameInputDialog(
    isLoading: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var username by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF1A2332),
        titleContentColor = Color.White,
        textContentColor = Color.White,
        title = {
            Text(
                text = "Choose a Username",
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        },
        text = {
            Column {
                Text(
                    text = "Enter a unique username (3-20 characters, letters, numbers, and underscores only)",
                    color = Color(0xFF8B9DAF),
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = username,
                    onValueChange = {
                        username = it
                        errorMessage = validateUsername(it)
                    },
                    placeholder = { Text("username", color = Color(0xFF8B9DAF)) },
                    isError = errorMessage != null,
                    singleLine = true,
                    enabled = !isLoading,
                    colors = androidx.compose.material3.TextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        disabledTextColor = Color(0xFF8B9DAF),
                        focusedContainerColor = Color(0xFF0F1419),
                        unfocusedContainerColor = Color(0xFF0F1419),
                        disabledContainerColor = Color(0xFF0F1419),
                        focusedIndicatorColor = Color(0xFF4A90E2),
                        unfocusedIndicatorColor = Color(0xFF8B9DAF),
                        disabledIndicatorColor = Color(0xFF8B9DAF)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = errorMessage!!,
                        color = Color(0xFFFF5252),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (errorMessage == null && username.isNotBlank() && !isLoading) {
                        onConfirm(username)
                    }
                },
                enabled = errorMessage == null && username.isNotBlank() && !isLoading,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = Color(0xFF00BCD4)
                )
            ) {
                // CHANGED: Show loading indicator or text
                if (isLoading) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = Color(0xFF00BCD4),
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Creating...")
                    }
                } else {
                    Text("Create Account")
                }
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                enabled = !isLoading,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = Color(0xFF8B9DAF)
                )
            ) {
                Text("Cancel")
            }
        },
        properties = DialogProperties(dismissOnBackPress = !isLoading, dismissOnClickOutside = !isLoading)
    )
}

private fun validateUsername(username: String): String? {
    return when {
        username.isBlank() -> "Username cannot be empty"
        username.length < 3 -> "Username must be at least 3 characters"
        username.length > 20 -> "Username must be at most 20 characters"
        !username.matches(Regex("^[a-zA-Z0-9_]+$")) -> "Username can only contain letters, numbers, and underscores"
        else -> null
    }
}