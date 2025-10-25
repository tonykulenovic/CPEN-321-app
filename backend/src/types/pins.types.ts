import mongoose from 'mongoose';
import { z } from 'zod';

export enum PinCategory {
  STUDY = 'study',
  EVENTS = 'events',
  CHILL = 'chill',
  SHOPS_SERVICES = 'shops_services',
}

export enum PinStatus {
  ACTIVE = 'active',
  REPORTED = 'reported',
  HIDDEN = 'hidden',
}

export enum PinVisibility {
  PUBLIC = 'public',
  FRIENDS_ONLY = 'friends',
  PRIVATE = 'private',
}

export interface IPin {
  _id: mongoose.Types.ObjectId;
  name: string;
  category: PinCategory;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdBy: mongoose.Types.ObjectId;
  metadata?: {
    capacity?: number;
    openingHours?: string;
    amenities?: string[];
    crowdLevel?: 'quiet' | 'moderate' | 'busy';
  };
  rating: {
    upvotes: number;
    downvotes: number;
    voters: mongoose.Types.ObjectId[];
  };
  reports: Array<{
    reportedBy: mongoose.Types.ObjectId;
    reason: string;
    timestamp: Date;
  }>;
  status: PinStatus;
  visibility: PinVisibility;
  isPreSeeded: boolean;
  expiresAt?: Date;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPinVote {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  pinId: mongoose.Types.ObjectId;
  voteType: 'upvote' | 'downvote';
  createdAt: Date;
}

export const createPinSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.nativeEnum(PinCategory),
  description: z.string().min(10).max(500),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
  visibility: z.nativeEnum(PinVisibility).default(PinVisibility.PUBLIC),
  metadata: z
    .object({
      capacity: z.number().min(0).optional(),
      openingHours: z.string().optional(),
      amenities: z.array(z.string()).optional(),
      crowdLevel: z.enum(['quiet', 'moderate', 'busy']).optional(),
    })
    .optional(),
  expiresAt: z.preprocess((val: unknown) => (val ? new Date(String(val)) : undefined), z.date().optional()),
  imageUrl: z.string().url().optional(),
});

export const updatePinSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(10).max(500).optional(),
  visibility: z.nativeEnum(PinVisibility).optional(),
  metadata: z
    .object({
      capacity: z.number().min(0).optional(),
      openingHours: z.string().optional(),
      amenities: z.array(z.string()).optional(),
      crowdLevel: z.enum(['quiet', 'moderate', 'busy']).optional(),
    })
    .optional(),
  imageUrl: z.string().url().optional(),
});

export const ratePinSchema = z.object({
  voteType: z.enum(['upvote', 'downvote']),
});

export const reportPinSchema = z.object({
  reason: z.string().max(500).optional().default(''),
});

export const searchPinsSchema = z.object({
  category: z.nativeEnum(PinCategory).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0).max(50).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export type CreatePinRequest = z.infer<typeof createPinSchema>;
export type UpdatePinRequest = z.infer<typeof updatePinSchema>;
export type RatePinRequest = z.infer<typeof ratePinSchema>;
export type ReportPinRequest = z.infer<typeof reportPinSchema>;
export type SearchPinsRequest = z.infer<typeof searchPinsSchema>;

export type PinResponse = {
  message: string;
  data?: {
    pin: IPin;
  };
};

export type PinsListResponse = {
  message: string;
  data?: {
    pins: IPin[];
    total: number;
    page: number;
    limit: number;
  };
};


