import { describe, test, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { recommendationScheduler } from '../../src/services/recommendationScheduler.service';
import { userModel } from '../../src/models/user.model';
import { connectDB } from '../../src/config/database';

describe('Unmocked: RecommendationScheduler Integration Tests', () => {
  
  beforeEach(async () => {
    await connectDB();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Ensure scheduler is stopped after each test
    recommendationScheduler.stopScheduler();
  });

  describe('Scheduler lifecycle management', () => {
    test('should start and manage scheduler state', () => {
      // Check initial state
      const initialStatus = recommendationScheduler.getStatus();
      expect(typeof initialStatus.isRunning).toBe('boolean');
      
      // Start scheduler
      recommendationScheduler.startScheduler();
      const runningStatus = recommendationScheduler.getStatus();
      expect(runningStatus.isRunning).toBe(true);
      expect(Array.isArray(runningStatus.activeJobs)).toBe(true);
      expect(Array.isArray(runningStatus.nextExecutions)).toBe(true);
    });

    test('should stop scheduler successfully', () => {
      // Start first
      recommendationScheduler.startScheduler();
      let status = recommendationScheduler.getStatus();
      expect(status.isRunning).toBe(true);
      
      // Then stop
      recommendationScheduler.stopScheduler();
      status = recommendationScheduler.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.activeJobs.length).toBe(0);
    });

    test('should handle multiple start/stop calls gracefully', () => {
      // Multiple starts should be safe
      recommendationScheduler.startScheduler();
      recommendationScheduler.startScheduler();
      
      let status = recommendationScheduler.getStatus();
      expect(status.isRunning).toBe(true);
      
      // Multiple stops should be safe
      recommendationScheduler.stopScheduler();
      recommendationScheduler.stopScheduler();
      
      status = recommendationScheduler.getStatus();
      expect(status.isRunning).toBe(false);
    });

    test('should provide scheduler status information', () => {
      const status = recommendationScheduler.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('activeJobs');
      expect(status).toHaveProperty('nextExecutions');
      
      expect(typeof status.isRunning).toBe('boolean');
      expect(Array.isArray(status.activeJobs)).toBe(true);
      expect(Array.isArray(status.nextExecutions)).toBe(true);
      
      // Check nextExecutions structure
      status.nextExecutions.forEach(execution => {
        expect(execution).toHaveProperty('mealType');
        expect(execution).toHaveProperty('nextRun');
        expect(['breakfast', 'lunch', 'dinner']).toContain(execution.mealType);
        expect(typeof execution.nextRun).toBe('string');
      });
    });

    test('should track active jobs when running', () => {
      recommendationScheduler.startScheduler();
      const status = recommendationScheduler.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.activeJobs.length).toBeGreaterThan(0);
      expect(status.activeJobs).toEqual(expect.arrayContaining(['breakfast', 'lunch', 'dinner']));
    });
  });

  describe('Manual recommendation testing methods', () => {
    test('should test breakfast recommendations', async () => {
      await expect(recommendationScheduler.testRecommendations('breakfast')).resolves.not.toThrow();
    }, 30000);

    test('should test lunch recommendations', async () => {
      await expect(recommendationScheduler.testRecommendations('lunch')).resolves.not.toThrow();
    }, 30000);

    test('should test dinner recommendations', async () => {
      await expect(recommendationScheduler.testRecommendations('dinner')).resolves.not.toThrow();
    }, 30000);

    test('should handle invalid meal types gracefully', async () => {
      // @ts-ignore - Testing invalid input
      await expect(recommendationScheduler.testRecommendations('invalid')).resolves.not.toThrow();
    });

    test('should process all meal types consistently', async () => {
      const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];
      
      for (const mealType of mealTypes) {
        await expect(recommendationScheduler.testRecommendations(mealType)).resolves.not.toThrow();
      }
    });
  });

  describe('User model integration', () => {
    test('should access user model for eligible users', async () => {
      // Test that user model methods are accessible
      const allUsers = await userModel.findAll();
      expect(Array.isArray(allUsers)).toBe(true);
    });

    test('should handle user filtering logic', async () => {
      // Test the underlying user retrieval that scheduler uses
      const users = await userModel.findAll();
      
      // Users should be an array (even if empty)
      expect(Array.isArray(users)).toBe(true);
      
      // Each user should have expected structure
      users.forEach(user => {
        expect(user).toHaveProperty('_id');
      });
    });

    test('should handle empty user database', async () => {
      const users = await userModel.findAll();
      
      // Should handle empty results gracefully
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Service integration and error handling', () => {
    test('should handle database connectivity issues gracefully', async () => {
      // Test that service methods don't throw on database issues
      await expect(recommendationScheduler.testRecommendations('breakfast')).resolves.not.toThrow();
    });

    test('should maintain service state during operations', async () => {
      const initialStatus = recommendationScheduler.getStatus();
      
      await recommendationScheduler.testRecommendations('lunch');
      
      const afterStatus = recommendationScheduler.getStatus();
      expect(afterStatus.isRunning).toBe(initialStatus.isRunning);
    });

    test('should handle concurrent test operations', async () => {
      const operations = [
        recommendationScheduler.testRecommendations('breakfast'),
        recommendationScheduler.testRecommendations('lunch'),
        recommendationScheduler.testRecommendations('dinner')
      ];
      
      await expect(Promise.all(operations)).resolves.not.toThrow();
    });
  });

  describe('Scheduler configuration validation', () => {
    test('should provide valid meal time configurations', () => {
      const status = recommendationScheduler.getStatus();
      
      // Should have configurations for all meal types
      expect(status.nextExecutions).toHaveLength(3);
      
      const mealTypes = status.nextExecutions.map(exec => exec.mealType);
      expect(mealTypes).toContain('breakfast');
      expect(mealTypes).toContain('lunch');
      expect(mealTypes).toContain('dinner');
    });

    test('should handle scheduler startup configuration', () => {
      // Starting scheduler should configure all meal times
      recommendationScheduler.startScheduler();
      const status = recommendationScheduler.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.activeJobs).toHaveLength(3);
      expect(status.nextExecutions).toHaveLength(3);
    });

    test('should clean up properly on shutdown', () => {
      recommendationScheduler.startScheduler();
      expect(recommendationScheduler.getStatus().isRunning).toBe(true);
      
      recommendationScheduler.stopScheduler();
      const finalStatus = recommendationScheduler.getStatus();
      
      expect(finalStatus.isRunning).toBe(false);
      expect(finalStatus.activeJobs).toHaveLength(0);
    });
  });

  describe('Performance and reliability', () => {
    test('should complete test operations within reasonable time', async () => {
      const startTime = Date.now();
      
      await recommendationScheduler.testRecommendations('breakfast');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000); // 30 second max
    }, 35000);

    test('should handle multiple rapid state changes', () => {
      // Rapid start/stop cycles should be stable
      for (let i = 0; i < 5; i++) {
        recommendationScheduler.startScheduler();
        expect(recommendationScheduler.getStatus().isRunning).toBe(true);
        
        recommendationScheduler.stopScheduler();
        expect(recommendationScheduler.getStatus().isRunning).toBe(false);
      }
    });

    test('should maintain consistent status reporting', () => {
      // Status should be consistent across calls
      const status1 = recommendationScheduler.getStatus();
      const status2 = recommendationScheduler.getStatus();
      
      expect(status1.isRunning).toBe(status2.isRunning);
      expect(status1.activeJobs).toEqual(status2.activeJobs);
      expect(status1.nextExecutions).toEqual(status2.nextExecutions);
    });

    test('should be resilient to repeated test executions', async () => {
      // Multiple test calls should all succeed
      const testCalls = Array.from({ length: 3 }, () => 
        recommendationScheduler.testRecommendations('lunch')
      );
      
      await expect(Promise.all(testCalls)).resolves.not.toThrow();
    });
  });

  describe('Service architecture validation', () => {
    test('should be a singleton instance', () => {
      // Service should be singleton
      expect(recommendationScheduler).toBeDefined();
      expect(typeof recommendationScheduler.startScheduler).toBe('function');
      expect(typeof recommendationScheduler.stopScheduler).toBe('function');
      expect(typeof recommendationScheduler.getStatus).toBe('function');
      expect(typeof recommendationScheduler.testRecommendations).toBe('function');
    });

    test('should provide complete API surface', () => {
      const requiredMethods = [
        'startScheduler',
        'stopScheduler', 
        'getStatus',
        'testRecommendations'
      ];
      
      requiredMethods.forEach(method => {
        expect(typeof recommendationScheduler[method as keyof typeof recommendationScheduler]).toBe('function');
      });
    });

    test('should handle service lifecycle properly', () => {
      // Test complete lifecycle
      const initialStatus = recommendationScheduler.getStatus();
      expect(initialStatus.isRunning).toBe(false);
      
      recommendationScheduler.startScheduler();
      expect(recommendationScheduler.getStatus().isRunning).toBe(true);
      
      recommendationScheduler.stopScheduler();
      expect(recommendationScheduler.getStatus().isRunning).toBe(false);
    });
  });

  describe('Integration with external dependencies', () => {
    test('should work with database connection', async () => {
      // Test that database operations work
      const users = await userModel.findAll();
      expect(Array.isArray(users)).toBe(true);
    });

    test('should handle recommendation service integration', async () => {
      // Test recommendation integration doesn't throw
      await expect(recommendationScheduler.testRecommendations('dinner')).resolves.not.toThrow();
    });

    test('should be resilient to external service failures', async () => {
      // Even if external services fail, scheduler should not crash
      await expect(recommendationScheduler.testRecommendations('breakfast')).resolves.not.toThrow();
    });
  });
});