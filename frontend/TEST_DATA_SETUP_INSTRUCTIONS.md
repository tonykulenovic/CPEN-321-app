# Test Data Setup Instructions

## What You Need

**2-3 Google accounts** (depending on which tests you run):
- **User Account 1** (test account - creates pins, manages friends)
- **User Account 2** (interacts with pins, friend account)
- **Admin Account**: `universe.cpen321@gmail.com` (optional - only for admin tests)

---

## Running User Tests (ManagePinsE2ETest)

### Setup:
1. Create test pin with **User Account 1** as instructed below
2. Launch app and wait for the test to prompt you to sign in
3. Sign in with **User Account 2**
4. Tests will run automatically

### Create this pin with **User Account 1** (for multi-user tests):

**Pin Name**: `E2E Test Pin - Other User`
- Category: Study
- Description: "Pin created by another user for testing report functionality"
- Visibility: Public
- Location: Any location

### Run the tests:
Run ManagePinsE2ETest.kt in android studio

When prompted, sign in with: **User Account 2**

---

## Running Manage Friends Tests (ManageFriendsE2ETest)

### Setup (Only 2 accounts needed):

**Create this test account:**

**User Account 2** (Friend Account):
   - Username: `e2e_test_friend`
   - Create profile with this exact username
   - **Important**: From this account, send a friend request TO **User Account 1**

### Run the tests:
Run ManageFriendsE2ETest.kt in Android Studio

When prompted, sign in with: **User Account 1**

**Note:** The tests will automatically:
- Search for and add `e2e_test_friend` as a friend
- Accept/decline the friend request from `e2e_test_friend`
- Test removing friends
- Test search functionality

---

## Running Admin Tests (AdminManagePinsE2ETest)

### Setup Data:

**Step 1: Create 3 pins with User Account 1**

1. **"Admin Test Pin 1"**
   - Category: Study, Visibility: Public, Decription: anything

2. **"Admin Test Pin 2"**
   - Category: Events, Visibility: Public, Decription: anything

3. **"Admin Test Pin 3"**
   - Category: Chill, Visibility: Public, Decription: anything

**Step 2: Report all 3 pins with User Account 2**

Sign out from User Account 1 and sign in with User Account 2:

Search for each pin and report it with reason: e.g. "Test report for E2E admin testing"

**Step 3: Run admin tests**

Run AdminManagePinsE2ETest.kt in android studio

When prompted, sign in with: `universe.cpen321@gmail.com`

---

## Important

- Pin names must match exactly
- Backend server must be running
- All pins must be set to "Public" visibility

