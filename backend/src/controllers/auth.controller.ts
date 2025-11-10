import { NextFunction, Request, Response } from 'express';

import { authService } from '../services/auth.service';
import {
  AuthenticateUserRequest,
  SignUpUserRequest,
  AuthenticateUserResponse,
} from '../types/auth.types';
import logger from '../utils/logger.util';

export class AuthController {
  async signUp(
    req: Request<unknown, unknown, SignUpUserRequest>,
    res: Response<AuthenticateUserResponse>,
    next: NextFunction
  ) {
    try {
      const { idToken, username } = req.body;

      const data = await authService.signUpWithGoogle(String(idToken), String(username));

      return res.status(201).json({
        message: 'User signed up successfully',
        data,
      });
    } catch (error) {
      logger.error('Google sign up error:', error);

      if (error instanceof Error) {
        if (error.message === 'Invalid Google token') {
          return res.status(401).json({
            message: 'Invalid Google token',
          });
        }

        if (error.message === 'User already exists') {
          return res.status(409).json({
            message: 'User already exists, please sign in instead.',
          });
        }

        if (error.message === 'Username already taken') {
          return res.status(409).json({
            message: 'Username already taken, please choose another.',
          });
        }

        if (error.message === 'Failed to process user') {
          return res.status(500).json({
            message: 'Failed to process user information',
          });
        }
      }

      next(error);
    }
  }

  async signIn(
    req: Request<unknown, unknown, AuthenticateUserRequest>,
    res: Response<AuthenticateUserResponse>,
    next: NextFunction
  ) {
    try {
      const { idToken } = req.body;

      const data = await authService.signInWithGoogle(String(idToken));

      return res.status(200).json({
        message: 'User signed in successfully',
        data,
      });
    } catch (error) {
      logger.error('Google sign in error:', error);

      if (error instanceof Error) {
        if (error.message === 'Invalid Google token') {
          return res.status(401).json({
            message: 'Invalid Google token',
          });
        }

        if (error.message === 'User not found') {
          return res.status(404).json({
            message: 'User not found, please sign up first.',
          });
        }

        if (error.message === 'Failed to process user') {
          return res.status(500).json({
            message: 'Failed to process user information',
          });
        }
      }

      next(error);
    }
  }

  async checkGoogleAccount(
    req: Request<unknown, unknown, { idToken: string }>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { idToken } = req.body;
      
      const exists = await authService.checkGoogleAccountExists(idToken);
      
      return res.status(200).json({
        message: 'Check completed',
        data: { exists }
      });
    } catch (error) {
      logger.error('Google account check error:', error);
      
      if (error instanceof Error && error.message === 'Invalid Google token') {
        return res.status(401).json({
          message: 'Invalid Google token',
        });
      }
      
      next(error);
    }
  }
}
