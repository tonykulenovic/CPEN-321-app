package com.cpen321.usermanagement

import android.app.Application
import android.util.Log
import com.google.firebase.FirebaseApp
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class UserManagementApplication : Application() {
    companion object {
        private const val TAG = "UserManagementApp"
    }

    override fun onCreate() {
        super.onCreate()
        
        // Initialize Firebase
        Log.d(TAG, "🔥 Initializing Firebase...")
        FirebaseApp.initializeApp(this)
        Log.d(TAG, "🔥 Firebase initialized successfully")
    }
}
