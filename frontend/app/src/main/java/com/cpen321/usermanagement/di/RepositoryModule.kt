package com.cpen321.usermanagement.di

import com.cpen321.usermanagement.data.repository.AuthRepository
import com.cpen321.usermanagement.data.repository.AuthRepositoryImpl
import com.cpen321.usermanagement.data.repository.ProfileRepository
import com.cpen321.usermanagement.data.repository.ProfileRepositoryImpl
import com.cpen321.usermanagement.data.repository.FriendsRepository
import com.cpen321.usermanagement.data.repository.FriendsRepositoryImpl
import com.cpen321.usermanagement.data.remote.api.BadgeInterface
import com.cpen321.usermanagement.data.remote.api.RetrofitClient
import com.cpen321.usermanagement.data.repository.BadgeRepository
import com.cpen321.usermanagement.data.repository.BadgeRepositoryImpl
import com.cpen321.usermanagement.data.repository.PinRepository
import com.cpen321.usermanagement.data.repository.PinRepositoryImpl
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideAuthRepository(
        authRepositoryImpl: AuthRepositoryImpl
    ): AuthRepository {
        return authRepositoryImpl
    }

    @Provides
    @Singleton
    fun provideProfileRepository(
        profileRepositoryImpl: ProfileRepositoryImpl
    ): ProfileRepository {
        return profileRepositoryImpl
    }

    @Provides
    @Singleton
    fun provideFriendsRepository(
        friendsRepositoryImpl: FriendsRepositoryImpl
    ): FriendsRepository {
        return friendsRepositoryImpl
    }

    @Provides
    @Singleton
    fun provideBadgeInterface(): BadgeInterface {
        return RetrofitClient.badgeInterface
    }
    
    @Provides
    @Singleton
    fun provideBadgeRepository(badgeInterface: BadgeInterface): BadgeRepository {
        return BadgeRepositoryImpl(badgeInterface)
    }

    @Provides
    @Singleton
    fun providePinRepository(): PinRepository {
        return PinRepositoryImpl()
    }
}