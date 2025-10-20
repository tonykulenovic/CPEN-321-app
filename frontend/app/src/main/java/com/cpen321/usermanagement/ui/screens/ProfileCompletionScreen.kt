package com.cpen321.usermanagement.ui.screens

import Button
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.cpen321.usermanagement.R
import com.cpen321.usermanagement.ui.components.MessageSnackbar
import com.cpen321.usermanagement.ui.components.MessageSnackbarState
import com.cpen321.usermanagement.ui.viewmodels.ProfileUiState
import com.cpen321.usermanagement.ui.viewmodels.ProfileViewModel
import com.cpen321.usermanagement.ui.theme.LocalFontSizes
import com.cpen321.usermanagement.ui.theme.LocalSpacing
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import androidx.compose.runtime.SideEffect

private data class ProfileCompletionFormState(
    val bioText: String = "",
    val hasSavedBio: Boolean = false
) {
    fun canSave(): Boolean = bioText.isNotBlank()
}

private data class ProfileCompletionScreenData(
    val formState: ProfileCompletionFormState,
    val isSavingProfile: Boolean,
    val onBioChange: (String) -> Unit,
    val onSkipClick: () -> Unit,
    val onSaveClick: () -> Unit
)

private data class ProfileCompletionScreenContentData(
    val uiState: ProfileUiState,
    val formState: ProfileCompletionFormState,
    val snackBarHostState: SnackbarHostState,
    val onBioChange: (String) -> Unit,
    val onSkipClick: () -> Unit,
    val onSaveClick: () -> Unit,
    val onErrorMessageShown: () -> Unit
)

@Composable
fun ProfileCompletionScreen(
    profileViewModel: ProfileViewModel,
    onProfileCompleted: () -> Unit,
    onProfileCompletedWithMessage: (String) -> Unit = { onProfileCompleted() }
) {
    val uiState by profileViewModel.uiState.collectAsState()
    val snackBarHostState = remember { SnackbarHostState() }
    val successfulBioUpdateMessage = stringResource(R.string.successful_bio_update)

    // Set status bar appearance
    val systemUiController = rememberSystemUiController()
    SideEffect {
        systemUiController.setSystemBarsColor(
            color = Color(0xFF0F1419),
            darkIcons = false
        )
    }

    // Form state
    var formState by remember {
        mutableStateOf(ProfileCompletionFormState())
    }

    // Side effects
    LaunchedEffect(Unit) {
        if (uiState.user == null) {
            profileViewModel.loadProfile()
        }
    }

    ProfileCompletionContent(
        data = ProfileCompletionScreenContentData(
            uiState = uiState,
            formState = formState,
            snackBarHostState = snackBarHostState,
            onBioChange = { formState = formState.copy(bioText = it) },
            onSkipClick = onProfileCompleted,
            onSaveClick = {
                if (formState.bioText.isNotBlank()) {
                    formState = formState.copy(hasSavedBio = true)
                    profileViewModel.updateProfile(
                        name = uiState.user?.name ?: "",
                        bio = formState.bioText,
                        onSuccess = {
                            onProfileCompletedWithMessage(successfulBioUpdateMessage)
                        }
                    )
                }
            },
            onErrorMessageShown = profileViewModel::clearError
        )
    )
}

@Composable
private fun ProfileCompletionContent(
    data: ProfileCompletionScreenContentData,
    modifier: Modifier = Modifier
) {
    Scaffold(
        modifier = modifier,
        containerColor = Color(0xFF0F1419),
        snackbarHost = {
            MessageSnackbar(
                hostState = data.snackBarHostState,
                messageState = MessageSnackbarState(
                    successMessage = null,
                    errorMessage = data.uiState.errorMessage,
                    onSuccessMessageShown = { },
                    onErrorMessageShown = data.onErrorMessageShown
                )
            )
        }
    ) { paddingValues ->
        ProfileCompletionBody(
            paddingValues = paddingValues,
            data = ProfileCompletionScreenData(
                formState = data.formState,
                isSavingProfile = data.uiState.isSavingProfile,
                onBioChange = data.onBioChange,
                onSkipClick = data.onSkipClick,
                onSaveClick = data.onSaveClick
            )
        )
    }
}

@Composable
private fun ProfileCompletionBody(
    paddingValues: PaddingValues,
    data: ProfileCompletionScreenData,
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
        ProfileCompletionHeader()

        Spacer(modifier = Modifier.height(spacing.extraLarge2))

        BioInputField(
            bioText = data.formState.bioText,
            isEnabled = !data.isSavingProfile,
            onBioChange = data.onBioChange
        )

        Spacer(modifier = Modifier.height(spacing.extraLarge))

        ActionButtons(
            isSavingProfile = data.isSavingProfile,
            isSaveEnabled = data.formState.canSave(),
            onSkipClick = data.onSkipClick,
            onSaveClick = data.onSaveClick
        )
    }
}

@Composable
private fun ProfileCompletionHeader(
    modifier: Modifier = Modifier
) {
    val spacing = LocalSpacing.current

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        WelcomeTitle()

        Spacer(modifier = Modifier.height(spacing.medium))

        BioDescription()
    }
}

@Composable
private fun WelcomeTitle(
    modifier: Modifier = Modifier
) {
    Text(
        text = stringResource(R.string.complete_profile),
        style = MaterialTheme.typography.headlineLarge,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center,
        color = Color.White,
        modifier = modifier
    )
}

@Composable
private fun BioDescription(
    modifier: Modifier = Modifier
) {
    Text(
        text = stringResource(R.string.bio_description),
        style = MaterialTheme.typography.bodyLarge,
        textAlign = TextAlign.Center,
        color = Color(0xFF8B9DAF),
        modifier = modifier
    )
}

@Composable
private fun BioInputField(
    bioText: String,
    isEnabled: Boolean,
    onBioChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val spacing = LocalSpacing.current

    OutlinedTextField(
        value = bioText,
        onValueChange = onBioChange,
        label = { Text(stringResource(R.string.bio), color = Color.White) },
        placeholder = { Text(stringResource(R.string.bio_placeholder), color = Color(0xFF8B9DAF)) },
        modifier = modifier.fillMaxWidth(),
        minLines = 3,
        maxLines = 5,
        enabled = isEnabled,
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = Color.White,
            unfocusedTextColor = Color.White,
            focusedContainerColor = Color.Transparent,
            unfocusedContainerColor = Color.Transparent,
            focusedBorderColor = Color(0xFF4A90E2),
            unfocusedBorderColor = Color(0xFF4A90E2).copy(alpha = 0.5f),
            cursorColor = Color(0xFF4A90E2),
            disabledTextColor = Color(0xFFB0B0B0),
            disabledBorderColor = Color.Gray
        ),
        shape = RoundedCornerShape(8.dp)
    )
}

@Composable
private fun ActionButtons(
    isSavingProfile: Boolean,
    isSaveEnabled: Boolean,
    onSkipClick: () -> Unit,
    onSaveClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val spacing = LocalSpacing.current

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(spacing.medium)
    ) {
        Box(modifier = Modifier.weight(1f)) {
            Button(
                type = "secondary",
                onClick = onSkipClick,
                enabled = !isSavingProfile,
                fullWidth = true
            ) {
                Text(
                    text = stringResource(R.string.skip),
                    color = Color.White
                )
            }
        }

        Box(modifier = Modifier.weight(1f)) {
            Button(
                onClick = onSaveClick,
                enabled = isSaveEnabled && !isSavingProfile,
                fullWidth = true
            ) {
                if (isSavingProfile) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(spacing.medium),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = stringResource(R.string.save),
                        color = Color.White
                    )
                }
            }
        }
    }
}
