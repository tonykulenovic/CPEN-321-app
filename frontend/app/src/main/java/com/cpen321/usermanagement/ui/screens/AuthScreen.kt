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

    // Set status bar appearance
    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF0F1419),
            darkIcons = false
        )
    }

    // Side effects
    LaunchedEffect(uiState.isAuthenticated) {
        if (uiState.isAuthenticated && !uiState.isCheckingAuth) {
            profileViewModel.loadProfile()
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
                val result = authViewModel.signInWithGoogle(context)
                result.onSuccess { credential ->
                    authViewModel.handleGoogleSignUpResult(credential)
                }
            }
        },
        onSuccessMessageShown = authViewModel::clearSuccessMessage,
        onErrorMessageShown = authViewModel::clearError
    )
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