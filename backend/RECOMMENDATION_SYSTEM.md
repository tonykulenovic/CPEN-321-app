# 🍽️ Location-Based Meal Recommendation System

## Overview

The recommendation system provides personalized meal suggestions (breakfast, lunch, dinner) based on user location, preferences, weather conditions, and real-time data from both the database and Google Places API.

## 🏗️ Architecture

### Hybrid Data Sources

- **Database Pins**: Pre-seeded restaurants, cafes, and food establishments
- **Google Places API**: Real-time restaurant data with current hours, ratings, and availability
- **Weather Integration**: OpenWeather API for weather-aware recommendations

### Core Components

- `RecommendationService`: Main recommendation engine
- `PlacesApiService`: Google Places API integration
- `WeatherService`: Weather data integration
- `NotificationService`: FCM push notifications

## 🧮 Recommendation Algorithm

### 1. Multi-Factor Scoring System (0-100 points)

Each recommendation is scored based on five factors:

#### **Proximity Score (0-25 points)**

- ≤ 200m: 25 points (Very close)
- ≤ 500m: 20 points (Close)
- ≤ 1000m: 15 points (Moderate)
- ≤ 2000m: 10 points (Far)
- > 2000m: 5 points (Very far)

#### **Meal Relevance Score (0-25 points)**

Keyword-based matching against place names and descriptions:

**Breakfast Keywords**: `cafe|coffee|bakery|breakfast|brunch|pastry|espresso|latte|sandwich|bagel|muffin|croissant`
**Lunch Keywords**: `lunch|sandwich|salad|soup|deli|bistro|pizza|burger|noodle|pho|ramen`
**Dinner Keywords**: `dinner|fine.dining|steakhouse|sushi|italian|french|indian|thai|chinese|pizza|burger|bar|grill`

**Scoring Logic**:

- High relevance match: 8-10 points (scaled to 20-25)
- Moderate relevance: 4-7 points (scaled to 10-17.5)
- Low relevance: 0-3 points (scaled to 0-7.5)
- Current meal type gets +2 bonus points

#### **User Preference Score (0-25 points)**

- Based on user interaction history and place ratings
- Database pins: Historical interaction patterns
- Places API: Rating-based scoring (rating/5 \* 15-20 points)

#### **Weather Score (0-15 points)**

- **Bad weather** (temp < 5°C, rain, snow): +15 points for indoor venues
- **Hot weather** (temp > 25°C): +12 points for air-conditioned places
- **Normal weather**: 10 points (neutral)

#### **Popularity Score (0-10 points)**

- **Database pins**: Based on user interactions and votes
- **Places API**: Based on Google ratings and current open status
  - Rating-based: (rating/5) \* 8 points
  - Open status: +2 points if currently open

### 2. Candidate Selection

#### Database Sources

- **Pin Types**: `shop`, `service` (food-related establishments)
- **Keyword Filtering**: Places matching meal-specific keywords
- **Distance Filtering**: Within specified radius (default: 2km)

#### Places API Sources

- **Type Filtering by Meal**:
  - Breakfast: `cafe`, `bakery`, `breakfast_restaurant`
  - Lunch: `restaurant`, `meal_takeaway`, `sandwich_shop`, `pizza_restaurant`
  - Dinner: `restaurant`, `meal_delivery`, `fine_dining_restaurant`, `pizza_restaurant`
- **Radius**: Configurable (default: 1.5km)
- **Result Limit**: 20 places per query

### 3. Ranking & Selection

- **Minimum Threshold**: 30 points required
- **Sorting**: Descending by total score
- **Deduplication**: Database pins take precedence over Places API for same locations
- **Result Limit**: Top 5 recommendations returned

## ⏰ Automated Scheduling

### Meal Time Windows

The system automatically sends recommendation notifications during optimal meal times:

- **Breakfast**: 8:00 AM - 10:00 AM
- **Lunch**: 12:00 PM - 2:00 PM
- **Dinner**: 6:00 PM - 10:00 PM

### Cron Schedule

- **Breakfast**: `0 8,9,10 * * *` (8:00, 9:00, 10:00 AM daily)
- **Lunch**: `0 12,13,14 * * *` (12:00, 1:00, 2:00 PM daily)
- **Dinner**: `0 18,19,20,21,22 * * *` (6:00-10:00 PM daily)

### Daily Tracking

- **One Per Meal**: Users receive maximum one recommendation per meal type per day
- **Daily Reset**: Counters reset at midnight (00:00)
- **Persistent Tracking**: Stored in user profile with date validation
- **Fail-Safe**: System prevents duplicates even if manually triggered multiple times

### Batch Processing

- **Batch Size**: 10 users per batch
- **Batch Delay**: 1 second between batches
- **User Filtering**: Only users with FCM tokens receive notifications
- **Duplicate Prevention**: Users already notified today are automatically skipped
- **Error Handling**: Individual failures don't stop the batch

### User Profile Tracking

Each user profile includes daily recommendation tracking:

```typescript
recommendations: {
  currentDate: Date,    // Current tracking date
  breakfast: boolean,   // Has received breakfast recommendation today
  lunch: boolean,       // Has received lunch recommendation today
  dinner: boolean       // Has received dinner recommendation today
}
```

**Reset Logic**: When `currentDate` doesn't match today's date, all flags reset to `false` and date updates automatically.

## 📡 API Endpoints

### User Recommendation Endpoints

#### Get Recommendations

```http
GET /api/recommendations/:mealType
```

**Parameters**:

- `mealType`: `breakfast` | `lunch` | `dinner`

**Headers**:

- `Authorization: Bearer <token>`
- `x-dev-user-id: <userId>` (dev mode only)

**Response**:

```json
{
  "message": "lunch recommendations retrieved successfully",
  "data": {
    "mealType": "lunch",
    "recommendations": [
      {
        "score": 80,
        "distance": 245,
        "reason": "A great for lunch, very close, highly rated, currently open",
        "factors": {
          "proximity": 25,
          "mealRelevance": 25,
          "userPreference": 12,
          "weather": 10,
          "popularity": 8
        }
      }
    ],
    "count": 5
  }
}
```

#### Send Recommendation Notification

```http
POST /api/recommendations/notify/:mealType
```

**Parameters**:

- `mealType`: `breakfast` | `lunch` | `dinner`

**Headers**:

- `Authorization: Bearer <token>`
- `x-dev-user-id: <userId>` (dev mode only)

**Response**:

```json
{
  "message": "lunch recommendation notification sent successfully",
  "data": {
    "sent": true
  }
}
```

### Admin Scheduler Endpoints

#### Get Scheduler Status

```http
GET /api/admin/scheduler/status
```

**Headers**:

- `Authorization: Bearer <token>`

**Response**:

```json
{
  "message": "Scheduler status retrieved successfully",
  "data": {
    "isRunning": true,
    "activeJobs": ["breakfast", "lunch", "dinner"],
    "nextExecutions": [
      {
        "mealType": "breakfast",
        "nextRun": "Next execution scheduled (0 8,9,10 * * *)"
      }
    ]
  }
}
```

#### Start Scheduler

```http
POST /api/admin/scheduler/start
```

#### Stop Scheduler

```http
POST /api/admin/scheduler/stop
```

#### Manual Trigger

```http
POST /api/admin/scheduler/trigger/:mealType
```

**Parameters**:

- `mealType`: `breakfast` | `lunch` | `dinner`

**Response**:

```json
{
  "message": "lunch recommendations triggered successfully",
  "data": {
    "mealType": "lunch",
    "triggered": true,
    "note": "Recommendations are being sent asynchronously"
  }
}
```

## 🔧 Configuration

### Environment Variables

```env
# Google Places API
GOOGLE_MAPS_API_KEY=your_api_key_here
MAPS_API_KEY=your_api_key_here  # Alternative key name

# Weather Service
OPENWEATHER_API_KEY=your_weather_api_key

# Firebase (for notifications)
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/service-account.json

# Development
DEV_AUTH_TOKEN=dev-token-12345
```

### Recommendation Parameters

```typescript
interface RecommendationParams {
  maxDistance: number; // Default: 2000m
  limit: number; // Default: 5
  minScore: number; // Default: 30
}
```

## 🧪 Testing

### Manual Testing

```powershell
# Test recommendations
$headers = @{
  "Authorization" = "Bearer dev-token-12345"
  "x-dev-user-id" = "68fc28e525015583d3a51f6a"
}

# Get lunch recommendations
Invoke-RestMethod -Uri "http://localhost:3000/api/recommendations/lunch" -Headers $headers

# Send notification
Invoke-RestMethod -Uri "http://localhost:3000/api/recommendations/notify/lunch" -Headers $headers -Method POST
```

### Expected Results

- **High-scoring recommendations**: 75-85+ points typical
- **Distance variety**: Mix of very close (11m) to moderate (500m) options
- **Meal relevance**: 20-25 points for good keyword matches
- **Real-time accuracy**: Places API provides current hours and ratings

## 🚀 Performance

### Response Times

- **Database queries**: ~50-100ms
- **Places API calls**: ~200-500ms
- **Weather API**: ~100-200ms
- **Total recommendation generation**: ~300-800ms

### Caching Strategy

- Weather data cached for 30 minutes
- Places API results cached for 1 hour
- User preferences cached in memory

## 🛡️ Error Handling

### Graceful Degradation

- **Places API failure**: Falls back to database-only recommendations
- **Weather API failure**: Uses neutral weather scoring (10 points)
- **No location data**: Returns empty recommendations with informative message
- **Authentication failure**: Returns 401 with clear error message

### Logging

- All recommendation requests logged with user ID and meal type
- API failures logged with error details
- Performance metrics logged for optimization

## � Deployment & Operations

### Server Startup

The scheduler automatically starts when the server boots:

```typescript
// src/index.ts
recommendationScheduler.startScheduler();
```

### Monitoring Commands

```powershell
# Check scheduler status
$headers = @{"Authorization" = "Bearer <token>"}
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/scheduler/status" -Headers $headers

# Manual trigger (useful for testing)
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/scheduler/trigger/lunch" -Headers $headers -Method POST
```

### Production Considerations

1. **Timezone Configuration**: Update `timezone` in scheduler service for your deployment region
2. **User Filtering**: Implement proper user eligibility criteria (active users, notification preferences)
3. **Rate Limiting**: Monitor API usage during batch sends
4. **Error Monitoring**: Set up alerts for scheduler failures
5. **Database Indexing**: Ensure user and location queries are optimized

### Operational Metrics

- **Batch Size**: 10 users per batch (configurable)
- **Processing Rate**: ~10 users/second with 1s batch delay
- **Peak Load**: Dinner time (6-10 PM) processes most users
- **Success Rate**: Track notification delivery success in logs

## �🔮 Future Enhancements

### Planned Features

- **Machine Learning**: User preference learning from interaction patterns
- **Dietary Restrictions**: Vegetarian, vegan, gluten-free filtering
- **Social Features**: Friend recommendations and shared favorites
- **Time-based Learning**: Optimal recommendation timing per user
- **Budget Awareness**: Price-conscious recommendations

### Technical Improvements

- **Caching Layer**: Redis for improved performance
- **Rate Limiting**: API call optimization
- **A/B Testing**: Algorithm variant testing
- **Analytics**: Recommendation effectiveness tracking
