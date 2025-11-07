# Test Data Setup Instructions

## What You Need

**3 Google accounts**:
- **User Account 1** (creates pins)
- **User Account 2** (Interact/report pins from User 1)
- **Admin Account**: `universe.cpen321@gmail.com` (moderates pins)

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

## Running Admin Tests (AdminManagePinsE2ETest)

### Setup Data:

**Step 1: Create 3 pins with User Account 1**

1. **"Admin Test Pin 1 - For Clearing Reports"**
   - Category: Study, Visibility: Public

2. **"Admin Test Pin 2 - For Deletion"**
   - Category: Events, Visibility: Public

3. **"Admin Test Pin 3 - For Cancel Deletion"**
   - Category: Chill, Visibility: Public

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

