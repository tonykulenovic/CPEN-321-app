# E2E Test Data Setup Instructions

## What You Need

**2-3 Google accounts** (depending on which tests you run):
- **User Account 1** (test account - creates pins, manages friends)
- **User Account 2** (interacts with pins, friend account)
- **Admin Account**: `universe.cpen321@gmail.com` (optional - only for admin tests)

---

## Running User Tests (ManagePinsE2ETest)

### Setup (2 accounts needed):
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
Run `ManagePinsE2ETest.kt` in android studio

When prompted, sign in with: **User Account 2**

---

## Running Manage Friends Tests (ManageFriendsE2ETest)

### Setup (2 accounts needed):

**Create this test account:**

**User Account 2** (Friend Account):
   - Username: `e2e_test_friend`
   - Create profile with this exact username
   - **Important**: From this account, send a friend request TO **User Account 1**

### Run the tests:
Run `ManageFriendsE2ETest.kt` in Android Studio

When prompted, sign in with: **User Account 1**

**Note:** The tests will automatically:
- Search for and add `e2e_test_friend` as a friend
- Accept/decline the friend request from `e2e_test_friend`
- View friend profiles
- Test removing friends
- Test search functionality

---

## Running Admin Tests (AdminManagePinsE2ETest)

### Setup (2 accounts needed) & Test Data:

**Step 1: Create 3 pins with User Account 1**

1. **"Admin Test Pin 1"**
   - Category: Study, Visibility: Public, Decription: anything

2. **"Admin Test Pin 2"**
   - Category: Events, Visibility: Public, Decription: anything

3. **"Admin Test Pin 3"**
   - Category: Chill, Visibility: Public, Decription: anything

**Step 2: Report all 3 pins with User Account 2**

Sign out from User Account 1 and sign in with User Account 2:

Search for each pin and report it with reason: e.g. "Test report for E2E admin testing #"

**Step 3: Run admin tests**

Run `AdminManagePinsE2ETest.kt` in android studio

When prompted, sign in with: `universe.cpen321@gmail.com`

---

## Running Manage Account Tests (ManageAccountE2ETest)

### Setup (Only 1 account needed):

**Requirement:** One Google account not in the database (this test suite test sign up use case)
 
Run `ManageAccountE2ETest.kt` in android studio

### What Happens During Test

**You'll need to authenticate TWICE:**

1. **First Authentication (Test 01):**
   - Manually, click "Sign Up with Google"
   - Authenticate with a ** Google account**
   - **DO NOT manually enter username/bio** - the test automates this!
   - The test will automatically:
     - Enter unique username: `e2e_<timestamp>`
     - Enter bio: "E2E Test User Bio - Automated testing account"
     - Click "Save"
     - Verify profile created

2. **Second Authentication (Test 03):**
   - After test 02 logs you out, you'll be prompted again
   - Click "Sign In with Google"
   - Authenticate with the **SAME account**
   - Remaining tests (04-10) reuse this authentication and run automatically

### Complete Test Flow (10 Tests)

| # | Test Name | Description |
|---|-----------|-------------|
| **01** | Sign Up & Create Profile | Sign up + automate username/bio creation |
| **02** | Logout | Logs out user | ⚠️ Logout |
| **03** | Sign In After Logout | Sign in again (tests sign-in flow) |
| **04** | View Profile | Views profile information |
| **05** | Edit Profile | Edits name and saves changes |
| **06** | Cancel Profile Edit | Tests canceling changes |
| **07** | Manage Privacy Settings | Changes location, profile, badge visibility |
| **08** | Cancel Privacy Changes | Tests canceling privacy changes |
| **09** | Delete Account Cancel | Opens delete dialog, clicks Cancel |
| **10** | Delete Account PERMANENT | **PERMANENTLY DELETES THE ACCOUNT** |

### After Running

The test account is **PERMANENTLY DELETED** from the backend. That Google account can sign up again as a brand new user if needed.

---

## Important Notes

- **Pin Tests**: Pin names must match exactly, and all pins must be set to "Public" visibility
- **Backend**: Backend server must be running at `http://10.0.2.2:3000` (Android emulator)
- **Test Files**: All tests are in `frontend/app/src/androidTest/java/com/cpen321/usermanagement/ui/`
  - `ManagePinsE2ETest.kt` - Pin management tests
  - `ManageFriendsE2ETest.kt` - Friend management tests
  - `AdminManagePinsE2ETest.kt` - Admin pin management tests
  - `ManageAccountE2ETest.kt` - Complete account lifecycle (sign up → delete)

