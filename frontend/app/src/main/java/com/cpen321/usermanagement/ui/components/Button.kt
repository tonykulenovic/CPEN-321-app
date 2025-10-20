import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.cpen321.usermanagement.ui.theme.LocalSpacing

@Composable
fun Button(
    type: String = "primary",
    fullWidth: Boolean = true,
    enabled: Boolean = true,
    onClick: () -> Unit,
    content: @Composable RowScope.() -> Unit,
) {
    val spacing = LocalSpacing.current

    var modifier = Modifier.height(spacing.extraLarge2)
    if (fullWidth) {
        modifier = modifier.fillMaxWidth()
    }

    if (type == "secondary") {
        // Use OutlinedButton for better visibility
        OutlinedButton(
            onClick = onClick,
            enabled = enabled,
            modifier = modifier,
            colors = ButtonDefaults.outlinedButtonColors(
                containerColor = Color(0xFF2A2A3E),
                contentColor = Color.White,
                disabledContainerColor = Color(0xFF3A4A5E),
                disabledContentColor = Color(0xFFB0B0B0)
            ),
            border = BorderStroke(2.dp, Color(0xFF4A90E2))
        ) {
            content()
        }
    } else {
        Button(
            colors = ButtonDefaults.buttonColors(
                disabledContainerColor = Color(0xFF3A4A5E),
                disabledContentColor = Color(0xFFB0B0B0)
            ),
            onClick = onClick,
            enabled = enabled,
            modifier = modifier,
        ) {
            content()
        }
    }
}