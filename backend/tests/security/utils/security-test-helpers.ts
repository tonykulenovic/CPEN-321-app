/**
 * Simple Security Test Helpers
 * 
 * Basic utilities for Phase 1 Rank 1 security tests
 */

/**
 * Creates a valid test JWT token using the dev bypass system
 */
export function createValidToken(userId: string = '507f1f77bcf86cd799439011'): string {
  return 'Bearer test-token-12345';
}

/**
 * Creates a malformed/invalid JWT token
 */
export function createMalformedToken(): string {
  return 'Bearer invalid-garbage-token-xyz123';
}

/**
 * Creates an empty/missing token scenario
 */
export function createMissingToken(): undefined {
  return undefined;
}

/**
 * Creates oversized input string for testing size limits
 */
export function createOversizedInput(sizeInMB: number = 1): string {
  const oneMB = 'a'.repeat(1024 * 1024);
  return oneMB.repeat(sizeInMB);
}

/**
 * Creates valid test pin data
 */
export function createValidPinData() {
  return {
    title: 'Test Study Spot',
    description: 'A great place to study with WiFi and quiet atmosphere',
    latitude: 49.2827,
    longitude: -123.1207,
    category: 'study'
  };
}

/**
 * Creates test user data with missing required fields
 */
export function createIncompleteUserData() {
  return {
    // Missing required fields like email, name, etc.
    bio: 'Just a test user'
  };
}

/**
 * Test user IDs for different scenarios
 */
export const TEST_USER_IDS = {
  VALID_USER: '507f1f77bcf86cd799439011',
  OTHER_USER: '507f1f77bcf86cd799439012',
  ADMIN_USER: '507f1f77bcf86cd799439013'
};