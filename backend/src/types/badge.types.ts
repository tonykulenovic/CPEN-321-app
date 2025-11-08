import mongoose, { Document } from 'mongoose';
import z from 'zod';

// Badge model interfaces   
// ------------------------------------------------------------
export interface IBadge extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  icon: string; // URL or icon identifier
  category: BadgeCategory;
  rarity: BadgeRarity;
  requirements: BadgeRequirements;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserBadge extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  badgeId: mongoose.Types.ObjectId;
  earnedAt: Date;
  progress?: BadgeProgress;
  isDisplayed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Enums and types
// ------------------------------------------------------------
export enum BadgeCategory {
  ACTIVITY = 'activity',
  SOCIAL = 'social',
  EXPLORATION = 'exploration',
  ACHIEVEMENT = 'achievement',
  SPECIAL = 'special'
}

export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export interface BadgeRequirements {
  type: BadgeRequirementType;
  target: number;
  timeframe?: string; // e.g., 'daily', 'weekly', 'monthly', 'all-time'
  conditions?: Record<string, any>; // Additional conditions
}

export enum BadgeRequirementType {
  LOGIN_STREAK = 'login_streak',
  PINS_CREATED = 'pins_created',
  PINS_VISITED = 'pins_visited',
  FRIENDS_ADDED = 'friends_added',
  TIME_SPENT = 'time_spent',
  REPORTS_MADE = 'reports_made',
  LOCATIONS_EXPLORED = 'locations_explored',
  LIBRARIES_VISITED = 'libraries_visited',
  CAFES_VISITED = 'cafes_visited',
  RESTAURANTS_VISITED = 'restaurants_visited',
  DAILY_ACTIVE = 'daily_active',
  WEEKLY_ACTIVE = 'weekly_active',
  MONTHLY_ACTIVE = 'monthly_active'
}

export interface BadgeProgress {
  current: number;
  target: number;
  percentage: number;
  lastUpdated: Date;
}

// Zod schemas for validation
// ------------------------------------------------------------
export const createBadgeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  icon: z.string().min(1),
  category: z.nativeEnum(BadgeCategory),
  rarity: z.nativeEnum(BadgeRarity),
  requirements: z.object({
    type: z.nativeEnum(BadgeRequirementType),
    target: z.number().positive(),
    timeframe: z.string().optional(),
    conditions: z.record(z.string(), z.any()).optional()
  }),
  isActive: z.boolean().default(true)
});

export const updateBadgeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  icon: z.string().min(1).optional(),
  category: z.nativeEnum(BadgeCategory).optional(),
  rarity: z.nativeEnum(BadgeRarity).optional(),
  requirements: z.object({
    type: z.nativeEnum(BadgeRequirementType),
    target: z.number().positive(),
    timeframe: z.string().optional(),
    conditions: z.record(z.string(), z.any()).optional()
  }).optional(),
  isActive: z.boolean().optional()
});

// Request/Response types
// ------------------------------------------------------------
export type CreateBadgeRequest = z.infer<typeof createBadgeSchema>;
export type UpdateBadgeRequest = z.infer<typeof updateBadgeSchema>;

export type BadgeResponse = {
  message: string;
  data?: {
    badge?: IBadge;
    badges?: IBadge[];
    userBadge?: IUserBadge;
    userBadges?: IUserBadge[];
    progress?: BadgeProgress | {
      earned: IUserBadge[];
      available: IBadge[];
      progress: Array<{ badge: IBadge; progress: BadgeProgress | null }>;
    };
  };
};

export type BadgeStatsResponse = {
  message: string;
  data: {
    totalBadges: number;
    earnedBadges: number;
    recentBadges: IUserBadge[];
    categoryBreakdown: Record<BadgeCategory, number>;
  };
};

// Badge earning event types
// ------------------------------------------------------------
export interface BadgeEarningEvent {
  userId: string;
  eventType: BadgeRequirementType;
  value: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// Badge template for predefined badges
// ------------------------------------------------------------
export interface BadgeTemplate {
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  requirements: BadgeRequirements;
}
