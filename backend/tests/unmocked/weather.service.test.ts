// Weather service tests converted to API tests via recommendations endpoint
// The weather service is tested indirectly through the recommendations API
// which uses weather data to generate meal recommendations.

// All weather functionality is now tested through:
// - tests/mocked/recommendation.service.test.ts  
// - Direct weather service testing removed as it should only be tested through API endpoints

export {}; // Make this file a module to avoid TypeScript errors