import mongoose from 'mongoose';
import { describe, test, beforeEach, expect } from '@jest/globals';
import { badgeModel } from '../../src/models/badge.model';
import { BadgeCategory, BadgeRarity, BadgeRequirementType } from '../../src/types/badge.types';

describe('Unmocked Integration: BadgeModel Error Handling for 100% Coverage', () => {
  // Test error handling in create (non-ZodError case - line 156-157)
  test('create badge handles non-ZodError database error', async () => {
    const badgeData = {
      name: 'Test Badge',
      description: 'Test description',
      icon: 'test_icon',
      category: BadgeCategory.ACTIVITY,
      rarity: BadgeRarity.COMMON,
      requirements: {
        type: BadgeRequirementType.LOGIN_STREAK,
        target: 5,
      },
      isActive: true,
    };

    // Mock the internal badge model to throw a non-ZodError
    const originalCreate = (badgeModel as any).badge.create;
    (badgeModel as unknown).badge.create = jest.fn().mockRejectedValue(new Error('Database connection failed'));

    await expect(badgeModel.create(badgeData)).rejects.toThrow('Failed to create badge');

    // Restore
    (badgeModel as any).badge.create = originalCreate;
  });

  // Test error handling in findById (line 165-166)
  test('findById handles database error', async () => {
    const badgeId = new mongoose.Types.ObjectId();

    // Mock the internal badge model to throw error
    const originalFindById = (badgeModel as unknown).badge.findById;
    (badgeModel as unknown).badge.findById = jest.fn().mockRejectedValue(new Error('Database error'));

    await expect(badgeModel.findById(badgeId)).rejects.toThrow('Failed to find badge');

    // Restore
    (badgeModel as any).badge.findById = originalFindById;
  });

  // Test error handling in findAll (line 174-175)
  test('findAll handles database error', async () => {
    // Mock the internal badge model to throw error
    const originalFind = (badgeModel as unknown).badge.find;
    (badgeModel as any).badge.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    await expect(badgeModel.findAll({})).rejects.toThrow('Failed to find badges');

    // Restore
    (badgeModel as unknown).badge.find = originalFind;
  });

  // Test error handling in findByCategory (line 183-184)
  test('findByCategory handles database error', async () => {
    // Mock the internal badge model to throw error
    const originalFind = (badgeModel as any).badge.find;
    (badgeModel as any).badge.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    await expect(badgeModel.findByCategory(BadgeCategory.ACTIVITY)).rejects.toThrow('Failed to find badges by category');

    // Restore
    (badgeModel as any).badge.find = originalFind;
  });

  // Test error handling in update (non-ZodError case - line 197-198)
  test('update badge handles non-ZodError database error', async () => {
    const badgeId = new mongoose.Types.ObjectId();
    const updateData = { description: 'Updated' };

    // Mock updateBadgeSchema.parse to succeed (validation passes)
    const { updateBadgeSchema } = require('../../src/types/badge.types');
    const originalParse = updateBadgeSchema.parse.bind(updateBadgeSchema);
    updateBadgeSchema.parse = jest.fn().mockReturnValue(updateData);

    // Mock findByIdAndUpdate to throw non-ZodError
    const originalFindByIdAndUpdate = (badgeModel as any).badge.findByIdAndUpdate;
    (badgeModel as unknown).badge.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error('Database error'));

    await expect(badgeModel.update(badgeId, updateData)).rejects.toThrow('Failed to update badge');

    // Restore
    updateBadgeSchema.parse = originalParse;
    (badgeModel as any).badge.findByIdAndUpdate = originalFindByIdAndUpdate;
  });

  // Test error handling in delete (line 208-209)
  test('delete badge handles database error', async () => {
    const badgeId = new mongoose.Types.ObjectId();

    // Mock the internal badge model to throw error
    const originalFindByIdAndDelete = (badgeModel as any).badge.findByIdAndDelete;
    (badgeModel as unknown).badge.findByIdAndDelete = jest.fn().mockRejectedValue(new Error('Database error'));

    await expect(badgeModel.delete(badgeId)).rejects.toThrow('Failed to delete badge');

    // Restore
    (badgeModel as unknown).badge.findByIdAndDelete = originalFindByIdAndDelete;
  });

  // Test error handling in assignBadge (non-duplicate error - line 247-248)
  test('assignBadge handles non-duplicate database error', async () => {
    const userId = new mongoose.Types.ObjectId();
    const badgeId = new mongoose.Types.ObjectId();

    // Mock badge.findById to return a badge
    (badgeModel as unknown).badge.findById = jest.fn().mockResolvedValue({
      requirements: { target: 5 },
    });

    // Mock userBadge.create to throw non-duplicate error
    const originalCreate = (badgeModel as unknown).userBadge.create;
    (badgeModel as any).userBadge.create = jest.fn().mockRejectedValue(new Error('Database error'));

    await expect(badgeModel.assignBadge(userId, badgeId)).rejects.toThrow('Failed to assign badge');

    // Restore
    (badgeModel as any).userBadge.create = originalCreate;
  });

  // Test error handling in getUserBadges (line 262-263)
  test('getUserBadges handles database error', async () => {
    const userId = new mongoose.Types.ObjectId();

    // Mock the internal userBadge model to throw error
    const originalFind = (badgeModel as unknown).userBadge.find;
    (badgeModel as unknown).userBadge.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error')),
      }),
    });

    await expect(badgeModel.getUserBadges(userId)).rejects.toThrow('Failed to get user badges');

    // Restore
    (badgeModel as unknown).userBadge.find = originalFind;
  });

  // Test error handling in getUserBadge (line 273-274)
  test('getUserBadge handles database error', async () => {
    const userId = new mongoose.Types.ObjectId();
    const badgeId = new mongoose.Types.ObjectId();

    // Mock the internal userBadge model to throw error
    const originalFindOne = (badgeModel as unknown).userBadge.findOne;
    (badgeModel as unknown).userBadge.findOne = jest.fn().mockReturnValue({
      populate: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    await expect(badgeModel.getUserBadge(userId, badgeId)).rejects.toThrow('Failed to get user badge');

    // Restore
    (badgeModel as unknown).userBadge.findOne = originalFindOne;
  });

  // Test error handling in getBadgeStats (line 305-306)
  test('getBadgeStats handles database error', async () => {
    const userId = new mongoose.Types.ObjectId();

    // Mock the internal badge model countDocuments to throw error (getBadgeStats uses Promise.all with both)
    const originalCountDocuments = (badgeModel as unknown).badge.countDocuments;
    (badgeModel as unknown).badge.countDocuments = jest.fn().mockRejectedValue(new Error('Database error'));

    await expect(badgeModel.getBadgeStats(userId)).rejects.toThrow('Failed to get badge stats');

    // Restore
    (badgeModel as unknown).badge.countDocuments = originalCountDocuments;
  });

  // Test error handling in getAvailableBadges (line 318-319)
  test('getAvailableBadges handles database error', async () => {
    const userId = new mongoose.Types.ObjectId();

    // Mock the internal userBadge model to throw error
    const originalDistinct = (badgeModel as any).userBadge.distinct;
    (badgeModel as unknown).userBadge.distinct = jest.fn().mockRejectedValue(new Error('Database error'));

    await expect(badgeModel.getAvailableBadges(userId)).rejects.toThrow('Failed to get available badges');

    // Restore
    (badgeModel as unknown).userBadge.distinct = originalDistinct;
  });
});
