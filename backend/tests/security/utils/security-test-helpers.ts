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
 * Creates XSS attack payload for testing input sanitization
 */
export function createXSSPayload(): string {
  return '<script>alert("XSS Attack")</script>';
}

/**
 * Creates SQL injection payload for testing input validation
 */
export function createSQLInjectionPayload(): string {
  return "'; DROP TABLE users; --";
}

/**
 * Creates invalid data types for testing Zod validation
 */
export function createInvalidDataTypes() {
  return {
    title: 12345, // Should be string
    latitude: "not-a-number", // Should be number
    longitude: true, // Should be number
    category: ["array", "instead", "of", "string"] // Should be string
  };
}

/**
 * Creates an expired JWT token (Phase 2 - Advanced JWT testing)
 */
export function createExpiredToken(): string {
  // For now, we'll simulate expired token with a recognizable pattern
  // In a real implementation, this would generate an actual expired JWT
  return 'Bearer expired-token-should-be-rejected';
}

/**
 * Creates an admin JWT token using the dev bypass system
 */
export function createAdminToken(userId: string = '507f1f77bcf86cd799439013'): string {
  // Using dev bypass system - in real implementation would include admin role
  return 'Bearer admin-test-token-12345';
}

/**
 * Creates a JWT token with invalid signature (Phase 2 Rank 2)
 */
export function createInvalidSignatureToken(): string {
  // Simulate a token with invalid signature
  return 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.INVALID_SIGNATURE_SHOULD_BE_REJECTED';
}

/**
 * Creates a JWT token with tampered payload (Phase 2 Rank 2)
 */
export function createTamperedPayloadToken(): string {
  // Simulate a token with modified payload but valid structure
  return 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.TAMPERED_PAYLOAD_DATA.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
}

/**
 * Creates NoSQL injection payload for MongoDB testing
 */
export function createNoSQLInjectionPayload(): any {
  return {
    $where: "function() { return true; }",
    $regex: ".*",
    $ne: null
  };
}

/**
 * Creates privacy test scenarios
 */
export function createPrivacyTestScenarios() {
  return {
    privateProfile: {
      profileVisibility: 'private',
      locationSharing: 'off',
      friendRequestsAllowed: false
    },
    friendOnlyProfile: {
      profileVisibility: 'friends-only',
      locationSharing: 'friends-only',
      friendRequestsAllowed: true
    },
    publicProfile: {
      profileVisibility: 'public',
      locationSharing: 'public',
      friendRequestsAllowed: true
    }
  };
}

/**
 * Creates a token refresh scenario for testing (Phase 2 Rank 3)
 */
export function createTokenRefreshScenario(): { originalToken: string, refreshToken: string } {
  return {
    originalToken: 'Bearer original-token-about-to-expire',
    refreshToken: 'Bearer refreshed-token-12345'
  };
}

/**
 * Creates concurrent session tokens for testing session management
 */
export function createConcurrentSessionTokens(): string[] {
  return [
    'Bearer session-token-device-1',
    'Bearer session-token-device-2', 
    'Bearer session-token-device-3'
  ];
}

/**
 * Creates friend relationship test data
 */
export function createFriendRelationshipData() {
  return {
    pendingRequest: {
      senderId: TEST_USER_IDS.VALID_USER,
      recipientId: TEST_USER_IDS.OTHER_USER,
      status: 'pending'
    },
    acceptedFriendship: {
      user1: TEST_USER_IDS.VALID_USER,
      user2: TEST_USER_IDS.FRIEND_USER,
      status: 'accepted'
    },
    blockedUser: {
      blockerId: TEST_USER_IDS.VALID_USER,
      blockedId: TEST_USER_IDS.OTHER_USER,
      status: 'blocked'
    }
  };
}

/**
 * Creates location sharing test scenarios
 */
export function createLocationSharingScenarios() {
  return {
    sharingDisabled: {
      userId: TEST_USER_IDS.PRIVATE_USER,
      locationSharing: 'disabled',
      latitude: 49.2827,
      longitude: -123.1207
    },
    friendsOnlySharing: {
      userId: TEST_USER_IDS.FRIEND_USER,
      locationSharing: 'friends-only',
      latitude: 49.2827,
      longitude: -123.1207
    },
    publicSharing: {
      userId: TEST_USER_IDS.VALID_USER,
      locationSharing: 'public',
      latitude: 49.2827,
      longitude: -123.1207
    }
  };
}

/**
 * Creates advanced attack combinations for testing
 */
export function createAdvancedAttackCombinations() {
  return {
    combinedInjection: {
      title: createXSSPayload(),
      description: createSQLInjectionPayload(),
      metadata: createNoSQLInjectionPayload()
    },
    sessionHijacking: {
      stolenToken: 'Bearer stolen-session-token-xyz',
      originalIp: '192.168.1.100',
      attackerIp: '10.0.0.1'
    },
    privacyBypass: {
      targetUser: TEST_USER_IDS.PRIVATE_USER,
      bypassAttempts: [
        '/users/' + TEST_USER_IDS.PRIVATE_USER + '/profile',
        '/users/' + TEST_USER_IDS.PRIVATE_USER + '/location',
        '/users/' + TEST_USER_IDS.PRIVATE_USER + '/friends'
      ]
    }
  };
}

/**
 * Test user IDs for different scenarios
 */
export const TEST_USER_IDS = {
  VALID_USER: '507f1f77bcf86cd799439011',
  OTHER_USER: '507f1f77bcf86cd799439012',
  ADMIN_USER: '507f1f77bcf86cd799439013',
  PRIVATE_USER: '507f1f77bcf86cd799439014',
  FRIEND_USER: '507f1f77bcf86cd799439015',
  BLOCKED_USER: '507f1f77bcf86cd799439016'
};