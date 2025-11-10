import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

import type { AuthResult } from '../types/auth.types';
import type { GoogleUserInfo, IUser } from '../types/user.types';
import logger from '../utils/logger.util';
import { userModel } from '../models/user.model';
import { BadgeService } from './badge.service';
import { BadgeRequirementType } from '../types/badge.types';

export class AuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  private async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid token payload');
      }

      if (!payload.email || !payload.name) {
        throw new Error('Missing required user information from Google');
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        profilePicture: payload.picture,
      };
    } catch (error) {
      logger.error('Google token verification failed:', error);
      throw new Error('Invalid Google token');
    }
  }

  private generateAccessToken(user: IUser): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.sign({ id: user._id }, secret, {
      expiresIn: '365d',
    });
  }

  async signUpWithGoogle(idToken: string, username: string): Promise<AuthResult> {
    try {
      const googleUserInfo = await this.verifyGoogleToken(idToken);

      // Check if user already exists
      const existingUser = await userModel.findByGoogleId(
        googleUserInfo.googleId
      );
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Create new user with provided username
      // Check if this is the admin email
      const isAdmin = googleUserInfo.email === 'universe.cpen321@gmail.com';
      
      const signUpData = {
        ...googleUserInfo,
        username,
        isAdmin,
      };
      let user;
      try {
        user = await userModel.create(signUpData);
      } catch (err: unknown) {
        // Handle duplicate key error (MongoDB)
        if (err && typeof err === 'object' && 'code' in err) {
          const mongoError = err as { code: number; keyPattern?: { username?: boolean } };
          if (mongoError.code === 11000) {
            if (mongoError.keyPattern?.username) {
              throw new Error('Username already taken');
            }
          }
        }
        throw err;
      }
      const token = this.generateAccessToken(user);

      return { token, user };
    } catch (error) {
      logger.error('Sign up failed:', error);
      throw error;
    }
  }

  async signInWithGoogle(idToken: string): Promise<AuthResult> {
    try {
      const googleUserInfo = await this.verifyGoogleToken(idToken);

      // Find existing user
      let user = await userModel.findByGoogleId(googleUserInfo.googleId);
      
      // Auto-create admin user if signing in with admin email and user doesn't exist
      if (!user && googleUserInfo.email === 'universe.cpen321@gmail.com') {
        logger.info('Auto-creating admin user for universe.cpen321@gmail.com');
        const adminData = {
          googleId: googleUserInfo.googleId,
          email: googleUserInfo.email,
          name: googleUserInfo.name,
          profilePicture: googleUserInfo.profilePicture,
          username: 'admin',
          isAdmin: true,
        };
        user = await userModel.create(adminData);
      }
      
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is suspended
      if (user.isSuspended) {
        throw new Error('Your account has been suspended. Please contact support for assistance.');
      }

      // Update login streak
      try {
        const currentStreak = await userModel.updateLoginStreak(user._id);
        
        // Process badge event for login streak
        await BadgeService.processBadgeEvent({
          userId: user._id.toString(),
          eventType: BadgeRequirementType.LOGIN_STREAK,
          value: currentStreak,
          timestamp: new Date(),
          metadata: {
            currentStreak,
          },
        });
      } catch (streakError) {
        // Log error but don't fail the login
        logger.error('Error updating login streak:', streakError);
      }

      const token = this.generateAccessToken(user);

      return { token, user };
    } catch (error) {
      logger.error('Sign in failed:', error);
      throw error;
    }
  }

  async checkGoogleAccountExists(idToken: string): Promise<boolean> {
    try {
      const googleUserInfo = await this.verifyGoogleToken(idToken);

      const existingUser = await userModel.findByGoogleId(
        googleUserInfo.googleId
      );

      return existingUser !== null;
    } catch (error) {
      logger.error('Check account failed:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
