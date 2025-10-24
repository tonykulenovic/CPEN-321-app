# Location Simulation System

This system allows you to simulate moving users for testing real-time location tracking on the frontend map.

## Features

- **Dev Token Bypass**: Authenticate as any user for testing without needing their actual JWT token
- **Real User Simulation**: Use existing users from your database instead of creating test users
- **UBC Campus Movement**: Users move realistically around UBC Vancouver campus
- **Real-time Updates**: Location updates are sent every 2 seconds for 5 minutes
- **Frontend Integration**: Watch users move on your frontend map in real-time

## Setup

1. **Environment Variables** (already configured in `.env`):

   ```
   DEV_AUTH_TOKEN=dev-token-12345
   NODE_ENV=development
   API_BASE_URL=http://localhost:3000/api
   ```

2. **Start your backend server**:
   ```bash
   npm run dev
   ```

## Usage

### Step 1: Find User IDs

List all users in your database to get their IDs:

```bash
npm run list:users
```

This will show you:

- User names and usernames
- User IDs (needed for simulation)
- Current privacy settings
- Example commands to run simulations

### Step 2: Run Simulation

Simulate one or more users moving around campus:

```bash
# Single user
npm run simulate:users 507f1f77bcf86cd799439011

# Multiple users
npm run simulate:users 507f1f77bcf86cd799439011 507f1f77bcf86cd799439012

# Up to 5+ users (recommended for testing)
npm run simulate:users user_id1 user_id2 user_id3
```

### Step 3: Watch on Frontend

1. Open your frontend app
2. Navigate to the map component
3. Make sure you're friends with the simulated users (or can view their location)
4. Watch them move around UBC campus in real-time!

## How It Works

### Dev Token Authentication

The system bypasses normal JWT authentication using:

```
Headers:
Authorization: Bearer dev-token-12345
x-dev-user-id: <actual_user_id>
```

This allows the simulation to act as any user without needing their real token.

### Movement Simulation

- Users start at random locations within UBC campus boundaries
- They move towards random target locations at realistic walking speeds
- When they reach a target, a new random target is set
- Location updates are sent to your backend every 2 seconds
- The simulation runs for 5 minutes by default

### UBC Campus Boundaries

```
North: 49.2750°N
South: 49.2450°N
East: -123.2200°W
West: -123.2700°W
```

## Example Session

```bash
# 1. Find users
npm run list:users

# Output:
# 1. Alice Smith (@alice123)
#    ID: 507f1f77bcf86cd799439011
# 2. Bob Johnson (@bob456)
#    ID: 507f1f77bcf86cd799439012

# 2. Simulate both users
npm run simulate:users 507f1f77bcf86cd799439011 507f1f77bcf86cd799439012

# Output:
# 🚀 Initializing Location Simulator with real users...
# 👤 Added user to simulation: Alice Smith (@alice123) - ID: 507f1f77bcf86cd799439011
# 👤 Added user to simulation: Bob Johnson (@bob456) - ID: 507f1f77bcf86cd799439012
# ✅ Initialization complete with 2 users!
# 🎬 Starting location simulation for 2 users...
# 📍 alice123: (49.2651, -123.2445)
# 📍 bob456: (49.2589, -123.2523)
```

## Configuration

You can modify these settings in `simulateMovingUsers.ts`:

- `SIMULATION_DURATION`: How long simulation runs (default: 5 minutes)
- `UPDATE_INTERVAL`: How often locations update (default: 2 seconds)
- `UBC_BOUNDS`: Campus area boundaries
- Speed ranges for realistic walking

## Troubleshooting

**"Cannot connect to server"**: Make sure your backend is running on `http://localhost:3000`

**"User not found"**: Use `npm run list:users` to get valid user IDs

**"Invalid dev user ID"**: Make sure you're using the correct ObjectId format

**No location updates on frontend**: Check that:

- Users are friends with each other
- Location privacy is set to 'live' or appropriate level
- WebSocket connections are working

## Production Safety

The dev token bypass only works when `NODE_ENV !== 'production'`, so it's safe for deployment.
