# Badge API Documentation

## Overview

The Badge API provides comprehensive endpoints for managing badges in the UniVerse application. Badges are used for gamification, encouraging user engagement through various activities like logging in, creating pins, adding friends, and exploring campus locations.

## Base URL

All badge endpoints are prefixed with `/api/badges` and require authentication via JWT token.

## Authentication

All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Badge System Architecture

### Badge Categories
- **ACTIVITY**: Login streaks, daily/weekly/monthly activity
- **SOCIAL**: Friend connections, social interactions
- **EXPLORATION**: Pin creation, location visits, campus exploration
- **ACHIEVEMENT**: Special accomplishments, reports, contributions
- **SPECIAL**: Limited-time or special event badges

### Badge Rarities
- **COMMON**: Easy to earn, basic activities
- **UNCOMMON**: Moderate difficulty, regular engagement
- **RARE**: Challenging, sustained activity
- **EPIC**: Very difficult, exceptional achievements
- **LEGENDARY**: Extremely rare, outstanding accomplishments

## API Endpoints

### 1. Badge Management (Admin)

#### Get All Badges
```http
GET /api/badges
```

**Query Parameters:**
- `category` (optional): Filter by badge category
- `isActive` (optional): Filter by active status (true/false)

**Response:**
```json
{
  "message": "Badges fetched successfully",
  "data": {
    "badges": [
      {
        "_id": "badge_id",
        "name": "Early Bird",
        "description": "Log in for 5 consecutive days",
        "icon": "early_bird",
        "category": "activity",
        "rarity": "common",
        "requirements": {
          "type": "login_streak",
          "target": 5,
          "timeframe": "consecutive"
        },
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

#### Get Badge by ID
```http
GET /api/badges/:id
```

#### Create Badge
```http
POST /api/badges
```

**Request Body:**
```json
{
  "name": "Campus Explorer",
  "description": "Create 10 pins",
  "icon": "campus_explorer",
  "category": "exploration",
  "rarity": "uncommon",
  "requirements": {
    "type": "pins_created",
    "target": 10
  },
  "isActive": true
}
```

#### Update Badge
```http
PUT /api/badges/:id
```

#### Delete Badge
```http
DELETE /api/badges/:id
```

#### Get Badges by Category
```http
GET /api/badges/category/:category
```

#### Initialize Default Badges
```http
POST /api/badges/initialize
```

### 2. User Badge Interaction

#### Get User's Earned Badges
```http
GET /api/badges/user/earned
```

**Response:**
```json
{
  "message": "User badges fetched successfully",
  "data": {
    "userBadges": [
      {
        "_id": "user_badge_id",
        "userId": "user_id",
        "badgeId": {
          "_id": "badge_id",
          "name": "Early Bird",
          "description": "Log in for 5 consecutive days",
          "icon": "early_bird",
          "category": "activity",
          "rarity": "common"
        },
        "earnedAt": "2024-01-01T00:00:00.000Z",
        "progress": {
          "current": 5,
          "target": 5,
          "percentage": 100,
          "lastUpdated": "2024-01-01T00:00:00.000Z"
        },
        "isDisplayed": true
      }
    ]
  }
}
```

#### Get Available Badges (Not Yet Earned)
```http
GET /api/badges/user/available
```

#### Get Badge Progress
```http
GET /api/badges/user/progress
```

**Response:**
```json
{
  "message": "Badge progress fetched successfully",
  "data": {
    "progress": {
      "earned": [...],
      "available": [...],
      "progress": [
        {
          "badge": { /* badge object */ },
          "progress": {
            "current": 3,
            "target": 5,
            "percentage": 60,
            "lastUpdated": "2024-01-01T00:00:00.000Z"
          }
        }
      ]
    }
  }
}
```

#### Get Badge Statistics
```http
GET /api/badges/user/stats
```

**Response:**
```json
{
  "message": "Badge statistics fetched successfully",
  "data": {
    "totalBadges": 25,
    "earnedBadges": 8,
    "categoryBreakdown": {
      "activity": 3,
      "social": 2,
      "exploration": 2,
      "achievement": 1,
      "special": 0
    },
    "recentBadges": [...]
  }
}
```

### 3. Badge Assignment and Events

#### Manually Assign Badge (Admin)
```http
POST /api/badges/user/assign
```

**Request Body:**
```json
{
  "badgeId": "badge_id",
  "userId": "user_id", // Optional, defaults to current user
  "progress": {
    "current": 5,
    "target": 5,
    "percentage": 100
  }
}
```

#### Process Badge Earning Event
```http
POST /api/badges/user/event
```

**Request Body:**
```json
{
  "eventType": "pins_created",
  "value": 1,
  "metadata": {
    "pinId": "pin_id",
    "location": "Library"
  }
}
```

#### Update Badge Progress
```http
PUT /api/badges/user/:badgeId/progress
```

**Request Body:**
```json
{
  "progress": {
    "current": 3,
    "target": 5,
    "percentage": 60
  }
}
```

#### Remove Badge from User (Admin)
```http
DELETE /api/badges/user/:badgeId
```

## Badge Requirement Types

### Activity-Based
- `login_streak`: Consecutive login days
- `daily_active`: Daily activity
- `weekly_active`: Weekly activity
- `monthly_active`: Monthly activity

### Social-Based
- `friends_added`: Number of friends added

### Exploration-Based
- `pins_created`: Number of pins created
- `pins_visited`: Number of pins visited
- `locations_explored`: Number of unique locations visited
- `time_spent`: Time spent at locations

### Achievement-Based
- `reports_made`: Number of reports submitted

## Integration Examples

### Frontend Integration

#### Display User Badges
```javascript
// Fetch user's earned badges
const response = await fetch('/api/badges/user/earned', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();
const userBadges = data.userBadges;
```

#### Track Badge Events
```javascript
// When user creates a pin
await fetch('/api/badges/user/event', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventType: 'pins_created',
    value: 1,
    metadata: {
      pinId: newPinId,
      location: pinLocation
    }
  })
});
```

#### Show Badge Progress
```javascript
// Get badge progress for progress bars
const response = await fetch('/api/badges/user/progress', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();
const progress = data.progress;
```

### Backend Integration

#### Initialize Default Badges
```javascript
// Call this when setting up the application
await BadgeService.initializeDefaultBadges();
```

#### Process User Activity
```javascript
// When user logs in
const event = {
  userId: user._id.toString(),
  eventType: BadgeRequirementType.LOGIN_STREAK,
  value: 1,
  timestamp: new Date()
};
const earnedBadges = await BadgeService.processBadgeEvent(event);
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `404`: Not Found
- `500`: Internal Server Error

Error responses follow this format:
```json
{
  "message": "Error description"
}
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Admin endpoints should implement role-based access control
3. **Validation**: All input data is validated using Zod schemas
4. **Rate Limiting**: Consider implementing rate limiting for badge event processing
5. **Data Sanitization**: All user input is sanitized before processing

## Performance Considerations

1. **Indexing**: Database indexes are created for efficient queries
2. **Pagination**: Consider implementing pagination for large badge lists
3. **Caching**: Badge templates and user progress can be cached
4. **Batch Processing**: Badge events can be processed in batches for better performance

## Future Enhancements

1. **Badge Notifications**: Real-time notifications when badges are earned
2. **Badge Sharing**: Allow users to share their badge achievements
3. **Badge Leaderboards**: Competitive elements with friend comparisons
4. **Custom Badges**: Allow users to create custom badges for events
5. **Badge Collections**: Group badges into themed collections
6. **Badge Trading**: Allow users to trade or gift badges (if applicable)
