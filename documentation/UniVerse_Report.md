# PART II – Final Project Report

1. **GitHub repository & final commit**: `https://github.com/tonykulenovic/CPEN-321-app` — final released version on `main` is `16f79ff Added glow effect on selected pins`.

2. **Test locations**:
   - **Front-end**: UI end-to-end tests live in `frontend/app/src/androidTest/java/com/cpen321/usermanagement/ui/` (see `TEST_DATA_SETUP_INSTRUCTIONS.md` for data setup). Key suites include `ManagePinsE2ETest.kt`, `ManageFriendsE2ETest.kt`, `DeclineFriendRequestE2ETest.kt`, `AdminManagePinsE2ETest.kt`, `AdminManageUsersE2ETest.kt`, and `ManageAccountE2ETest.kt`.
   - **Back-end**: Jest-based tests under `backend/tests/` (fixtures, mocked, performance, security, unmocked) and coverage reports in `backend/coverage/`.

3. **Physical device**: Not documented in the repository. Please share the manufacturer/model of the Android device you used for manual testing (the README only references connecting a physical Android 13 device, but no concrete make/model is stored here).

4. **Back-end public endpoint**: No public IP.

5. **Test accounts** (per `frontend/app/src/androidTest/java/com/cpen321/usermanagement/ui/TEST_DATA_SETUP_INSTRUCTIONS.md`):
   - **User Account 1**: Primary runner-of-tests account that creates pins, friends, and reports. (Any disposable Google account.)
   - **User Account 2**: Secondary account used to interact with pins/friend requests created by Account 1 (also disposable).
   - **Admin Account**: `universe.cpen321@gmail.com`, used by admin-focused E2E suites when prompting for admin access.

6. **M2 project scope use case mapping**:
   - **External API (M2 requirement 1)**: `Feature 6, Use Case 26 — Get Personalized Recommendations`. The backend `backend/src/services/recommendation.service.ts` consumes Google Maps (Places) APIs and OpenWeather data to surface context-aware suggestions.
   - **App reacts to external events (M2 requirement 2)**: `Feature 6, Use Case 24 — Receive Notifications`. The Firebase Cloud Messaging pipeline (`frontend/services/FirebaseMessagingService.kt` + `backend/src/services/notification.service.ts`) pushes updates that trigger the Notification Service and update the UI in response to friend requests/pin updates.
   - **Custom computation (M2 requirement 3)**: `Feature 6, Use Case 26 — Get Personalized Recommendations`. The recommendation engine implements multi-factor scoring (weather, time-of-day, meal relevance, popularity) and reason generation to rank pins; all of that logic lives in `backend/src/services/recommendation.service.ts`.

7. **Humblebrag**: The backend’s recommendation pipeline does more than just fetch nearby pins — it merges Google Maps/Places results with OpenWeather data, weights each pin by meal relevance, weather, and popularity, and even constructs human-readable explanation strings for why a pin scored highly. That reasoning is surfaced to users in the “Discover” panel to justify recommendations beyond a simple list.

8. **Limitations**:
   - The repo lacks a recorded public backend endpoint, which means testers must host the server locally or provide their own deployment before running the mobile client.
   - Physical-device testing details (manufacturer/model) are not tracked here, so anyone repeating the evaluation must supply new hardware configuration info.
   - Admin test suites require manual data prep (seeding pins/reports, admin sign in) and cannot run fully headless.
   - Real-time location sharing and notifications depend on Firebase + Socket.io, so offline usage or unavailable external services will disable those flows until connectivity returns.
   - The frontend currently targets Android 13 devices; older OS levels require additional validation and are not covered by the included tests.

