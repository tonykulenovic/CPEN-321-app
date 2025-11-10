import mongoose, { Document } from 'mongoose';
import z from 'zod';

// Friendship status enum
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

// Privacy settings for users
export interface PrivacySettings {
  profileVisibleTo: 'friends' | 'everyone' | 'private';
  showBadgesTo: 'friends' | 'everyone' | 'private';
  location: {
    sharing: 'off' | 'live' | 'approximate';
    precisionMeters: number;
  };
  allowFriendRequestsFrom: 'everyone' | 'friendsOfFriends' | 'noOne';
}

// Friendship document interface
export interface IFriendship extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // owner ("me")
  friendId: mongoose.Types.ObjectId; // other user
  status: FriendshipStatus;
  requestedBy: mongoose.Types.ObjectId; // original initiator
  shareLocation: boolean; // can friend see my location?
  closeFriend: boolean; // reserved for future use
  createdAt: Date;
  updatedAt: Date;
}

// Location document interface
export interface ILocation extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  lat: number;
  lng: number;
  accuracyM: number;
  shared: boolean;
  expiresAt: Date; // TTL cleans up
  createdAt: Date;
}

// Response/Request types for API
export interface FriendSummary {
  userId: string;
  displayName: string;
  photoUrl?: string;
  bio?: string;
  shareLocation: boolean;
}

export interface FriendRequestSummary {
  _id: string;
  from: {
    userId: string;
    displayName: string;
    photoUrl?: string;
  };
  createdAt: string;
}

export interface UserSearchResult {
  _id: string;
  username: string;
  displayName: string;
  photoUrl?: string;
}

export interface FriendLocation {
  userId: string;
  lat: number;
  lng: number;
  accuracyM: number;
  ts: string;
}

export interface LocationAck {
  shared: boolean;
  expiresAt: string;
}

// Location update event for real-time
export interface LocationUpdateEvent {
  type: 'location.update';
  version: 1;
  userId: string;
  lat: number;
  lng: number;
  accuracyM: number;
  ts: string;
  ttlSec: number;
  approx: boolean;
  idempotencyKey: string;
}

// Zod validation schemas
export const sendFriendRequestSchema = z.object({
  toUserId: z.string().min(1),
});

export const friendRequestsQuerySchema = z.object({
  inbox: z.string().optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export const updateFriendSettingsSchema = z.object({
  shareLocation: z.boolean().optional(),
  closeFriend: z.boolean().optional(),
});

export const userSearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.string().optional(),
});

export const privacySettingsSchema = z.object({
  profileVisibleTo: z.enum(['friends', 'everyone', 'private']).optional(),
  showBadgesTo: z.enum(['friends', 'everyone', 'private']).optional(),
  location: z.object({
    sharing: z.enum(['off', 'live', 'approximate']).optional(),
    precisionMeters: z.number().min(1).optional(),
  }).optional(),
  allowFriendRequestsFrom: z.enum(['everyone', 'friendsOfFriends', 'noOne']).optional(),
});

export const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).optional(),
});

// Request/Response types
export type SendFriendRequestRequest = z.infer<typeof sendFriendRequestSchema>;
export type FriendRequestsQuery = z.infer<typeof friendRequestsQuerySchema>;
export type UpdateFriendSettingsRequest = z.infer<typeof updateFriendSettingsSchema>;
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
export type UpdatePrivacyRequest = z.infer<typeof privacySettingsSchema>;
export type UpdateLocationRequest = z.infer<typeof updateLocationSchema>;

// API Response types
export interface SendFriendRequestResponse {
  message: string;
  data?: {
    requestId: string;
    status: string;
  };
};

export interface FriendRequestsResponse {
  message: string;
  data?: FriendRequestSummary[];
};

export interface FriendsListResponse {
  message: string;
  data?: FriendSummary[];
};

export interface UserSearchResponse {
  message: string;
  data?: UserSearchResult[];
};

export interface UpdateLocationResponse {
  message: string;
  data?: LocationAck;
};

export type FriendsLocationsResponse = {
  message: string;
  data?: FriendLocation[];
};