import mongoose, { Document } from 'mongoose';
import z from 'zod';
import { PrivacySettings } from './friends.types';

// User model
// ------------------------------------------------------------
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  googleId: string;
  email: string;
  name: string;
  username: string; // unique username for search
  profilePicture?: string;
  bio?: string;
  campus?: string;
  privacy: PrivacySettings;
  friendsCount: number;
  badgesCount: number;
  isAdmin: boolean;
  isSuspended: boolean;
  fcmToken?: string;
  lastActiveAt: Date;

  recommendations?: {
    currentDate: Date;
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };

  stats: {
    pinsCreated: number;
    pinsVisited: number;
    reportsMade: number;
    locationsExplored: number;
    librariesVisited: number;
    cafesVisited: number;
    restaurantsVisited: number;
  };
  visitedPins: mongoose.Types.ObjectId[];
  loginTracking: {
    lastLoginDate: Date | null;
    currentStreak: number;
    longestStreak: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Zod schemas
// ------------------------------------------------------------
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  username: z.string().min(1),
  googleId: z.string().min(1),
  profilePicture: z.string().optional(),
  bio: z.string().max(500).optional(),
  campus: z.string().optional(),
  isAdmin: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
  profilePicture: z.string().min(1).optional(),
  campus: z.string().optional(),
});

// Request types
// ------------------------------------------------------------
export type GetProfileResponse = {
  message: string;
  data?: {
    user: IUser;
  };
};

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

// Generic types
// ------------------------------------------------------------
export type GoogleUserInfo = {
  googleId: string;
  email: string;
  name: string;
  profilePicture?: string;
};

export type SignUpRequest = GoogleUserInfo & {
  username: string;
};