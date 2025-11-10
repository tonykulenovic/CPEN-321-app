import { z } from 'zod';

import { IUser } from '../types/user.types';

// Zod schemas
// ------------------------------------------------------------
export const authenticateUserSchema = z.object({
  idToken: z.string().min(1, 'Google token is required'),
});

export const signUpUserSchema = z.object({
  idToken: z.string().min(1, 'Google token is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be at most 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

// Request types
// ------------------------------------------------------------
export type AuthenticateUserRequest = z.infer<typeof authenticateUserSchema>;
export type SignUpUserRequest = z.infer<typeof signUpUserSchema>;

export interface AuthenticateUserResponse {
  message: string;
  data?: AuthResult;
};

// Generic types
// ------------------------------------------------------------
export interface AuthResult {
  token: string;
  user: IUser;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
