# PART III – Reflections and Peer Evaluation

## III-a: Task and Time Distribution

### Table 1 – Task Distribution

| ID | Task (a short description) | Team Member | Duration |
|----|---------------------------|-------------|----------|
| 1  | Fixed issues on the Requirements_and_Design doc | Tony | 2 hours |
| 2  | Updated Use Case Diagram and Dependency Diagram | Tony | 3 hours |
| 3  | Created Final Project Report | Tony | 4 hours |
| 4  | Fixed more Codacy issues with our code | Tony | 3 hours |
| 5  | Filmed Git Actions and Codacy video | Tony | 2 hours |
| ... | ... | ... | ... |

**Note:** Please fill in the actual tasks completed for this milestone, assign them to team members, and record the duration for each task.

---

### Table 2 – Time and AI Reliance Distribution

| Team Member | Time Spent on the Assignment (hours) | AI Reliance for the assignment (0-100%) (Estimate) |
|-------------|--------------------------------------|-----------------------------------------------------|
| Tony | 14 | 80-85% |
| Team Member 2 Name | [X] | [X]% |
| Team Member 3 Name | [X] | [X]% |
| Team Member 4 Name | [X] | [X]% |
| **Group Overall** | **[Total]** | **[Average]%** |

**Note:** Please fill in each team member's name, their time spent, AI reliance percentage, and calculate the group totals/averages.

---

## III-b: Individual Reflections on AI Usage

### Team Member 1: Tony Kulenovic

#### 3.1 Overall AI Reliance Estimate
80-85% - Heavy reliance on AI tools, particularly Cursor IDE with its integrated AI assistant, throughout the project. The AI was instrumental in code generation, debugging, documentation, and code quality improvements. While maintaining oversight and making architectural decisions, the AI significantly accelerated development and helped navigate unfamiliar frameworks and patterns.

#### 3.2 Major Tasks Using AI

**Task 1: Badge System Implementation and Testing**

3.2.1 **Task Description**: Implemented the complete badge system backend service including badge templates, qualification checking, progress tracking, and event processing. Achieved 100% test coverage with comprehensive integration tests covering all badge types (login streaks, pin creation, pin visits, friend additions).

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant (Claude-based model)
- Used for code generation, test writing, and debugging

3.2.3 **Strategy for Utilizing AI**: 
Started by describing badge system requirements from Requirements_and_Design.md, then asked the AI to generate the initial BadgeService class structure. Iteratively refined the implementation by providing specific requirements (e.g., "implement checkLoginStreak that validates consecutive login days"). For testing, prompted the AI to generate comprehensive test cases covering edge cases like users who already have badges, invalid badge data, and boundary conditions. The AI helped structure test files following Jest patterns and ensured proper setup/teardown with MongoDB in-memory server. When tests failed, shared error messages with the AI to get targeted fixes, particularly helpful for debugging async/await issues and MongoDB query problems.

3.2.4 **Advantages of Using AI Tools**: 
The AI dramatically accelerated development by generating boilerplate code for badge templates, service methods, and test structures. It helped maintain consistency across similar methods. The AI also suggested edge cases that might have been missed, such as handling users who already earned badges or dealing with null/undefined values. For test coverage, the AI generated comprehensive test suites covering both happy paths and error scenarios, helping achieve 100% coverage efficiently.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes generated overly complex solutions when simpler approaches would suffice. It occasionally used incorrect MongoDB query syntax or missed TypeScript type constraints, requiring careful review. The AI sometimes generated tests that didn't properly clean up test data, leading to test pollution. Additionally, when debugging, the AI would sometimes suggest fixes that addressed symptoms rather than root causes, requiring multiple iterations.

**Task 2: Codacy Code Quality Fixes**

3.2.1 **Task Description**: Fixed multiple waves of Codacy static analysis issues across the codebase, including unbound methods, void return type mismatches, forbidden non-null assertions, invalid ObjectId templates, TypeScript compilation errors, unused variables, and security concerns.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used to understand Codacy warnings and generate fixes

3.2.3 **Strategy for Utilizing AI**: 
Copied Codacy error messages and problematic code snippets into the AI chat, then asked for explanations and fixes. For example, when Codacy flagged "forbidden non-null assertion" on code like `user!._id`, asked the AI to suggest safer alternatives using optional chaining or proper null checks. The AI helped understand TypeScript strict mode requirements and generated type-safe alternatives. Processed fixes in waves, addressing the simplest issues first, then moving to more complex ones.

3.2.4 **Advantages of Using AI Tools**: 
The AI was excellent at explaining static analysis warnings in plain language, making it much faster to understand and fix issues. It could quickly generate type-safe alternatives to problematic code patterns. For repetitive fixes, the AI could generate find-and-replace patterns to apply across the codebase. The tool was particularly helpful for understanding complex TypeScript error messages.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes suggested fixes that resolved the Codacy warning but introduced new issues or changed the code's behavior unintentionally, requiring careful testing. The AI occasionally over-engineered solutions when simple type annotations would suffice. There were also cases where the AI misunderstood the context and suggested fixes that didn't apply to the specific codebase structure.

**Task 3: Requirements and Design Documentation Updates**

3.2.1 **Task Description**: Updated the Requirements_and_Design.md document by parsing git logs to create a comprehensive change history, refining use case descriptions, updating external system descriptions, justifying non-functional requirements, and ensuring consistency across the document.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used for parsing git logs, generating documentation, and ensuring consistency

3.2.3 **Strategy for Utilizing AI**: 
Provided the AI with git log output and asked it to extract meaningful change history entries with dates, modified sections, and rationales. The AI helped structure the change history table and identify which commits were significant enough to document. For use case refinements, asked the AI to rewrite descriptions to focus on user experience rather than implementation details. When updating external system descriptions, provided the AI with code references and asked it to generate clear, concise descriptions. The AI also helped justify non-functional requirements by suggesting realistic rationales.

3.2.4 **Advantages of Using AI Tools**: 
The AI excelled at parsing large amounts of git log data and extracting meaningful patterns. It helped maintain consistent formatting and style throughout the document. The AI was particularly good at rewriting technical descriptions into user-friendly language while preserving accuracy. It also caught inconsistencies and helped standardize terminology. The AI's ability to generate well-structured justifications for non-functional requirements saved significant time.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes misinterpreted git commit messages and generated incorrect rationales, requiring manual verification. The AI occasionally over-simplified technical descriptions, losing important implementation details. When generating justifications for non-functional requirements, the AI sometimes produced generic rationales that didn't reflect the specific project context, requiring manual refinement.

**Task 4: Final Project Report and Documentation Organization**

3.2.1 **Task Description**: Created the Final Project Report (PART II) by extracting information from the codebase, git logs, and existing documentation. Organized documentation structure, updated diagrams, and created comprehensive project reports following the specified format.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used for information extraction, report generation, and documentation structure

3.2.3 **Strategy for Utilizing AI**: 
Asked the AI to scan the codebase to identify test locations, extract use case mappings to M2 requirements, and find key technical features. The AI helped navigate the codebase structure and identify relevant files. For the report, provided the AI with the required structure and asked it to fill in sections based on codebase analysis. The AI helped identify limitations by analyzing the codebase for missing features or incomplete implementations.

3.2.4 **Advantages of Using AI Tools**: 
The AI was excellent at quickly scanning large codebases and extracting relevant information, such as test file locations or API endpoint structures. It helped identify patterns and connections that might have been missed. The AI generated well-structured reports following the specified format, ensuring all required sections were included.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes made assumptions about information that wasn't explicitly documented in the codebase, requiring manual verification. The AI occasionally misinterpreted code structure, suggesting incorrect file paths or component relationships. When generating limitations, the AI sometimes focused on minor issues while missing more significant architectural limitations.

#### 3.3 Most Helpful Phases and Tasks
Generative AI was most helpful in **implementation**, **testing**, and **code review** phases. For implementation, the AI excelled at generating boilerplate code, service methods, and data models based on requirements. In testing, the AI was invaluable for generating comprehensive test suites covering edge cases, error scenarios, and integration tests. The AI also helped with code review by identifying Codacy issues, suggesting type-safe alternatives, and explaining static analysis warnings. Additionally, AI was very helpful in **documentation** - it excelled at parsing git logs, generating change history, and rewriting technical descriptions into user-friendly language.

#### 3.4 Least Helpful Phases and Tasks
Generative AI was least helpful in **requirements elicitation** and **design** phases. For requirements elicitation, the AI couldn't replace actual user feedback or domain expertise. In the design phase, while the AI could generate code from designs, it struggled with high-level architectural decisions. The AI also had difficulty with **project refinement** tasks that required deep understanding of the codebase context - it would sometimes suggest changes that conflicted with existing patterns or team conventions. Additionally, for tasks requiring creative problem-solving, the AI tended to suggest common patterns rather than innovative approaches.

#### 3.5 Team Task Split and Personal Responsibility
The team divided tasks primarily by features and components. Primary responsibility was for the **badge system** (backend service, models, and comprehensive testing), **code quality improvements** (Codacy fixes across the codebase), and **documentation** (Requirements_and_Design.md updates, Final Project Report, use case diagrams, dependency diagrams). Other team members handled frontend UI implementation (Tomas), backend integration tests and real-time features (Makatendeka), and pin management features (Arav). The focus was on ensuring the badge system was robust and well-tested, maintaining code quality standards, and keeping documentation current.

#### 3.6 Use of Requirements Documents
Yes, extensively used the `Requirements_and_Design.md` document for generating code and tests. When implementing the badge system, referenced the "Feature 5: Badge System" section which specified use cases like "Earn Badge", "View Badges", and "Track Badge Progress". These use cases guided the BadgeService implementation - for example, the "Earn Badge" use case helped design the `processBadgeEvent` method. The requirements document also specified badge types (login streaks, pin creation, pin visits, friend additions), which were used to create the badge templates. For testing, used the formal use case specifications to create test scenarios that validated each use case's success and failure paths.

#### 3.7 Use of Design Documents
Yes, used design documents, though to a lesser extent than requirements documents. The UML sequence diagrams helped understand the expected flow and data transformations, which were used when writing integration tests. The dependency diagram helped understand component relationships when fixing Codacy issues. However, for the badge system specifically, there wasn't a detailed sequence diagram, so relied more on the requirements document and code patterns from other features. The design documents were most useful for understanding the overall system architecture and ensuring implementations followed established patterns.

#### 3.8 Additional Reflections
One unexpected benefit was how AI helped learn new patterns and best practices. When the AI suggested solutions, researching why those approaches were recommended accelerated learning. The AI also helped maintain consistency across the codebase. However, over-reliance on AI could lead to less deep understanding. There were times when AI-generated code was accepted without fully understanding it, which caused issues later when modifying or debugging. Learned to use AI as a starting point and always review and understand the generated code. Another challenge was that AI sometimes generated code that worked but wasn't optimal for the specific use case - had to balance accepting AI suggestions with applying domain knowledge. Overall, AI was a powerful tool that significantly accelerated development, but it required careful oversight and critical thinking to use effectively.

---

### Team Member 2: Makatendeka Chikumbu

#### 3.1 Overall AI Reliance Estimate
50-55% - Moderate reliance on AI tools for generating test suites, understanding testing patterns, and debugging test failures. The AI was helpful for writing integration tests that required proper setup/teardown and understanding Jest testing patterns. While maintaining control over test architecture and coverage goals, AI accelerated test development and helped achieve high coverage across backend services.

#### 3.2 Major Tasks Using AI

**Task 1: Backend Integration Test Suite Development**

3.2.1 **Task Description**: Developed comprehensive unmocked integration tests for backend services including gateway (Socket.io), user management, friends, location tracking, media, recommendations, and weather services. Created test suites that achieved high code coverage while testing real database interactions and business logic.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used for test generation, test structure, and debugging test failures

3.2.3 **Strategy for Utilizing AI**: 
Started by describing the service or endpoint to test, then asked the AI to generate a test file structure with proper Jest setup. For example, when testing the LocationGateway, provided the gateway code and asked the AI to generate tests for methods like `calculateDistance` and `getFriendsLocations`. The AI helped structure tests with proper `beforeEach` and `afterEach` hooks for database cleanup. When tests failed, shared error messages and stack traces with the AI to get targeted fixes. The AI was particularly helpful for understanding async/await patterns in tests and ensuring proper test isolation.

3.2.4 **Advantages of Using AI Tools**: 
The AI excelled at generating boilerplate test code and ensuring consistent test structure across multiple test files. It helped identify edge cases that might have been missed, such as handling invalid user IDs, empty arrays, or null values. The AI also suggested proper Jest matchers and async testing patterns. For complex tests like the gateway tests, the AI helped break down the testing approach into manageable steps. The tool was particularly valuable for generating comprehensive test coverage that included both happy paths and error scenarios.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes generated tests that were too verbose or tested implementation details rather than behavior, requiring refactoring. The AI occasionally suggested mocking strategies that were inappropriate for integration tests. There were also cases where AI-generated tests had race conditions or timing issues that only appeared when running the full test suite. The AI sometimes generated tests that passed but didn't actually validate the intended behavior, requiring manual verification.

**Task 2: Security and Performance Test Implementation**

3.2.1 **Task Description**: Implemented security tests covering authentication, authorization, JWT validation, privacy controls, and injection attack prevention. Also created performance tests to validate non-functional requirements like response times for real-time features and map loading.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used to understand security testing patterns and performance benchmarking approaches

3.2.3 **Strategy for Utilizing AI**: 
Described the security requirements from the Requirements_and_Design.md document and asked the AI to generate test cases for scenarios like JWT token validation, authorization checks, and input sanitization. The AI helped understand how to test for common vulnerabilities like SQL injection, XSS attacks, and NoSQL injection. For performance tests, provided the NFR requirements and asked the AI to generate performance test structures using Jest's timing capabilities.

3.2.4 **Advantages of Using AI Tools**: 
The AI was excellent at suggesting comprehensive security test scenarios that covered various attack vectors. It helped understand security testing best practices and suggested test patterns. For performance testing, the AI generated test structures that properly measured response times and identified performance bottlenecks.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes suggested overly complex security tests that tested theoretical vulnerabilities rather than actual risks, requiring simplification. For performance tests, the AI occasionally generated tests that were flaky due to timing variations, requiring manual adjustment. The AI also sometimes suggested security test patterns that were more appropriate for different frameworks, requiring adaptation.

**Task 3: GitHub Actions CI/CD and Test Coverage Improvements**

3.2.1 **Task Description**: Fixed GitHub Actions workflow issues, improved test coverage reporting, and ensured tests run reliably in CI environments. Worked on achieving comprehensive test coverage across backend services.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used for understanding CI/CD configuration and coverage reporting

3.2.3 **Strategy for Utilizing AI**: 
When GitHub Actions failed, shared the error logs with the AI and asked for explanations and fixes. The AI helped understand YAML syntax issues, environment variable problems, and test execution failures in CI environments. For coverage improvements, asked the AI to analyze coverage reports and suggest which areas needed more tests.

3.2.4 **Advantages of Using AI Tools**: 
The AI quickly identified syntax errors and configuration issues in GitHub Actions workflows. It helped understand CI/CD best practices and suggested improvements to make tests more reliable in automated environments. For coverage analysis, the AI could quickly identify gaps and suggest targeted test cases to improve coverage metrics.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes suggested CI/CD configurations that didn't match the specific setup or requirements, requiring adaptation. For coverage improvements, the AI occasionally suggested tests that increased coverage numbers but didn't add meaningful validation, requiring careful review.

#### 3.3 Most Helpful Phases and Tasks
Generative AI was most helpful in the **testing** and **code review** phases. For testing, the AI excelled at generating comprehensive test suites with proper structure, setup/teardown, and edge case coverage. It helped understand Jest patterns, async testing, and integration testing strategies. In code review, the AI helped identify test gaps and suggest improvements. The AI was also helpful for **project refinement** - it could quickly analyze coverage reports and suggest areas needing more tests.

#### 3.4 Least Helpful Phases and Tasks
Generative AI was least helpful in **requirements elicitation** and **design** phases. For requirements, the AI couldn't replace understanding actual user needs or business logic. In design, while the AI could generate test structures, it struggled with high-level test architecture decisions. The AI also had difficulty with **implementation** tasks that required deep understanding of specific codebase patterns - it would sometimes suggest generic solutions that didn't fit the architecture. For debugging complex test failures involving multiple services or race conditions, the AI sometimes provided surface-level fixes rather than addressing root causes.

#### 3.5 Team Task Split and Personal Responsibility
The team divided tasks by features and components. Primary responsibility was for **backend testing** (integration tests, security tests, performance tests), **real-time gateway testing** (Socket.io location tracking), and **CI/CD maintenance** (GitHub Actions, coverage reporting). Other team members handled frontend E2E tests (Tomas), badge system implementation (Tony), and pin management features (Arav). Focus was on ensuring backend services were thoroughly tested with high coverage, validating security requirements, and maintaining reliable CI/CD pipelines.

#### 3.6 Use of Requirements Documents
Yes, used the `Requirements_and_Design.md` document extensively for generating tests. The security requirements section helped create security test suites covering authentication, authorization, and input validation. The non-functional requirements (NFRs) section provided specific performance targets that were translated into performance tests. The use case specifications helped understand expected behaviors and create test scenarios that validated both success and failure paths.

#### 3.7 Use of Design Documents
Yes, used design documents, particularly the UML sequence diagrams. The sequence diagrams helped understand the expected flow of operations, which was crucial for writing integration tests. The dependency diagram helped understand service relationships when writing tests that involved multiple components. However, for testing, the requirements document was more directly actionable - the design documents provided context but didn't always translate directly into test cases.

#### 3.8 Additional Reflections
One unexpected benefit was how AI helped learn testing best practices. When the AI suggested test patterns, researching why those approaches were recommended accelerated learning. The AI also helped maintain consistency across test files. However, over-reliance on AI could lead to tests that passed but didn't catch real bugs. Learned to always manually verify that tests actually validate the intended behavior. Another challenge was that AI sometimes generated tests that were too tightly coupled to implementation details, making them brittle when code was refactored. Learned to focus on behavior-driven tests rather than implementation-driven ones. Overall, AI was a powerful tool for test development, but it required careful oversight to ensure tests were meaningful and maintainable.

---

### Team Member 3: Tomas Fernandes

#### 3.1 Overall AI Reliance Estimate
80-90% - Heavy reliance on AI tools for frontend UI implementation, particularly for Jetpack Compose patterns, Google Maps integration, and E2E test development. The AI was especially helpful for understanding Compose state management, navigation patterns, and generating UI components. While making design decisions and architectural choices, AI accelerated development by generating boilerplate code and suggesting UI patterns.

#### 3.2 Major Tasks Using AI

**Task 1: Frontend UI Implementation with Jetpack Compose**

3.2.1 **Task Description**: Implemented the main map screen (MainScreen.kt) with Google Maps integration, pin clustering, glow effects on selected pins, 3D buildings, smooth animations, and real-time pin updates. Created comprehensive UI components following Material Design 3 principles.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used for Compose code generation, UI patterns, and Google Maps API integration

3.2.3 **Strategy for Utilizing AI**: 
Started by describing the UI requirements and asked the AI to generate the initial Compose structure. The AI helped understand Jetpack Compose patterns like `remember`, `LaunchedEffect`, and state management. For Google Maps integration, provided the Maps API documentation and asked the AI to generate code for adding markers, handling map clicks, and implementing clustering. When implementing animations, described the desired visual effect and the AI suggested Compose animation APIs. Iteratively refined the UI by asking the AI to adjust colors, spacing, and layout based on Material Design 3 guidelines.

3.2.4 **Advantages of Using AI Tools**: 
The AI excelled at generating Compose boilerplate code and suggesting modern UI patterns. It helped understand complex Compose concepts like recomposition, state hoisting, and side effects. For Google Maps integration, the AI quickly generated code for marker management, clustering, and map interactions. The AI also suggested performance optimizations, such as using `remember` to avoid unnecessary recompositions. When implementing animations, the AI provided working examples of Compose animation APIs.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes generated Compose code that had performance issues, such as causing excessive recompositions or not properly managing state, requiring refactoring. The AI occasionally suggested UI patterns that didn't match Material Design 3 guidelines or the app's design system, requiring manual adjustments. For complex UI interactions, the AI sometimes generated code that worked in isolation but had issues when integrated with other components. The AI sometimes generated code that was overly complex when simpler solutions would suffice.

**Task 2: End-to-End Test Development**

3.2.1 **Task Description**: Created comprehensive E2E test suites for ManagePins, ManageFriends, and ManageAccount features using Android's Compose testing framework. Implemented test utilities, authentication helpers, and test data setup instructions.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used for generating E2E test structures and understanding Compose testing patterns

3.2.3 **Strategy for Utilizing AI**: 
Described the use cases to test and asked the AI to generate E2E test code using Compose testing APIs. The AI helped understand how to use `createAndroidComposeRule`, `onNodeWithTag`, and other Compose testing utilities. For authentication flows in tests, asked the AI to generate test helpers that could handle Google Sign-In in test environments. The AI also helped create test utilities for common operations like inputting text, clicking buttons, and waiting for UI elements. When tests failed, shared error messages with the AI to get fixes for timing issues and async operation handling.

3.2.4 **Advantages of Using AI Tools**: 
The AI was excellent at generating E2E test structures with proper setup and teardown. It helped understand Compose testing patterns and suggested test utilities that improved code reusability. The AI could quickly generate test cases covering multiple scenarios (success, failure, edge cases) which helped achieve comprehensive test coverage. For complex test scenarios involving multiple screens or user flows, the AI helped break down the testing approach into manageable steps.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes generated tests that were flaky due to timing issues or improper waiting strategies, requiring manual adjustment. The AI occasionally suggested test patterns that didn't work well with the specific app architecture or navigation setup, requiring adaptation. For tests involving external services, the AI sometimes suggested mocking strategies that weren't feasible. Additionally, the AI-generated tests sometimes tested implementation details rather than user-visible behavior, making them brittle when UI was refactored.

**Task 3: UI Polish and Bug Fixes**

3.2.1 **Task Description**: Fixed UI styling issues, improved map rendering animations, fixed pin rating system, and resolved real-time pin update synchronization issues. Applied various UI tweaks to improve user experience.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used for debugging UI issues and generating fixes

3.2.3 **Strategy for Utilizing AI**: 
When encountering UI bugs, described the issue and shared relevant code with the AI. The AI helped identify potential causes and suggested fixes. For styling issues, described the visual problem and asked the AI to suggest Compose modifiers or theme adjustments. When fixing animations, provided the current animation code and asked the AI to suggest improvements. The AI also helped understand Compose performance best practices when optimizing map rendering.

3.2.4 **Advantages of Using AI Tools**: 
The AI quickly identified common UI bugs and suggested fixes based on Compose best practices. It helped understand why certain UI issues occurred and how to prevent them. For performance optimizations, the AI suggested Compose patterns that reduced unnecessary recompositions and improved rendering performance.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes suggested fixes that addressed symptoms rather than root causes, requiring multiple iterations. The AI occasionally suggested performance optimizations that were premature or unnecessary. For UI bugs that were specific to the app's architecture or state management, the AI sometimes provided generic solutions that didn't apply to the specific context.

#### 3.3 Most Helpful Phases and Tasks
Generative AI was most helpful in **implementation** and **testing** phases. For implementation, the AI excelled at generating Jetpack Compose code, understanding Compose patterns, and integrating Google Maps. It helped quickly prototype UI components and iterate on designs. In testing, the AI was valuable for generating E2E test structures and understanding Compose testing patterns. The AI was also helpful for **project refinement** - it could quickly suggest UI improvements and performance optimizations. Additionally, AI was useful for learning new frameworks - when working with Jetpack Compose and Google Maps, the AI helped understand APIs and patterns.

#### 3.4 Least Helpful Phases and Tasks
Generative AI was least helpful in **requirements elicitation** and **design** phases. For requirements, the AI couldn't replace understanding actual user needs or UX considerations. In design, while the AI could generate UI code, it struggled with high-level UX decisions and visual design choices. The AI also had difficulty with **code review** tasks that required understanding the full app context - it would sometimes suggest changes that worked in isolation but broke other parts of the app. For complex UI bugs involving state management or navigation, the AI sometimes provided surface-level fixes that didn't address underlying architectural issues.

#### 3.5 Team Task Split and Personal Responsibility
The team divided tasks by features and components. Primary responsibility was for **frontend UI implementation** (MainScreen, map features, pin display, animations), **E2E testing** (ManagePins, ManageFriends, ManageAccount test suites), and **UI polish** (styling fixes, performance optimizations, bug fixes). Other team members handled backend services (Makatendeka), badge system (Tony), and pin management backend (Arav). Focus was on creating a polished, performant user interface and ensuring frontend features were thoroughly tested through E2E tests.

#### 3.6 Use of Requirements Documents
Yes, used the `Requirements_and_Design.md` document for UI implementation and E2E testing. The use case descriptions helped understand expected user flows, which were translated into UI implementations. The use case specifications provided acceptance criteria that were used to create E2E test scenarios. The requirements document also specified UI requirements which were implemented in the map screen. However, for visual design and UX decisions, relied more on Material Design guidelines and user experience principles rather than the requirements document.

#### 3.7 Use of Design Documents
Yes, used design documents, particularly for understanding navigation flows and component relationships. The UML sequence diagrams helped understand the expected flow of operations, which informed UI implementation. However, for frontend UI work, the requirements document and Material Design guidelines were more directly actionable than the design documents. The design documents provided high-level context but didn't always translate directly into UI implementation details. Used the dependency diagram to understand how frontend components related to backend services.

#### 3.8 Additional Reflections
One unexpected benefit was how AI helped learn Jetpack Compose quickly. When the AI suggested Compose patterns, researching why those approaches were recommended accelerated learning. The AI also helped maintain consistency in UI code. However, over-reliance on AI could lead to UI code that worked but wasn't optimal for performance or maintainability. Learned to always review AI-generated UI code for performance implications and ensure it followed Compose best practices. Another challenge was that AI sometimes generated UI code that looked correct but had subtle bugs that only appeared during testing. Learned to thoroughly test all AI-generated UI code, especially for complex interactions. Overall, AI was a powerful tool for frontend development, but it required careful oversight to ensure UI code was performant, maintainable, and provided excellent user experience.

---

### Team Member 4: Arav Veeramachaneni

#### 3.1 Overall AI Reliance Estimate
100% - Complete reliance on AI tools for pin management feature implementation, comprehensive test development, and documentation updates. The AI was essential for generating CRUD operation code, understanding Express.js patterns, and creating test suites. While making architectural decisions and feature design choices, AI was the primary tool for generating boilerplate code and suggesting implementation patterns.

#### 3.2 Major Tasks Using AI

**Task 1: Pin Management Feature Implementation**

3.2.1 **Task Description**: Implemented comprehensive pin management features including CRUD operations, voting system, reporting functionality, category filtering, and enhanced metadata display. Created backend controllers, services, and routes for pin-related operations with proper validation and error handling.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used for generating Express.js routes, controllers, and service methods

3.2.3 **Strategy for Utilizing AI**: 
Started by describing the pin management requirements from the Requirements_and_Design.md document and asked the AI to generate the initial controller and service structure. For example, when implementing the voting system, described the requirement and the AI generated the controller method, service logic, and database update operations. Iteratively refined the implementation by providing specific requirements and asking the AI to update the code accordingly. For complex features like category filtering, described the filtering logic and the AI generated the database query code. When implementing validation, provided Zod schema requirements and the AI generated the validation middleware.

3.2.4 **Advantages of Using AI Tools**: 
The AI excelled at generating Express.js boilerplate code and suggesting RESTful API patterns. It helped understand Express middleware patterns, error handling, and response formatting. For database operations, the AI quickly generated Mongoose queries. The AI also suggested proper error handling patterns and HTTP status codes, which improved API consistency. When implementing complex features like voting, the AI suggested efficient database update strategies.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes generated code that didn't follow the project's specific patterns or conventions, requiring refactoring. The AI occasionally suggested overly complex solutions when simpler approaches would suffice. There were also cases where AI-generated code had subtle bugs that only appeared during testing. Had to carefully review and test all AI-generated code to ensure it worked correctly and handled edge cases properly.

**Task 2: Comprehensive Pin Test Suite Development**

3.2.1 **Task Description**: Created comprehensive test suites for pin management features, covering CRUD operations, voting, reporting, category filtering, and edge cases. Achieved high test coverage for pin-related functionality.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used for generating test structures and test cases

3.2.3 **Strategy for Utilizing AI**: 
Described the pin management features to test and asked the AI to generate test file structures with proper Jest setup. The AI helped create test cases covering success scenarios, validation errors, authorization checks, and edge cases. For example, when testing the voting system, asked the AI to generate tests for upvoting, downvoting, changing votes, and preventing duplicate votes. The AI also helped create test data factories and helper functions. When tests failed, shared error messages with the AI to get targeted fixes.

3.2.4 **Advantages of Using AI Tools**: 
The AI was excellent at generating comprehensive test suites that covered multiple scenarios. It helped identify edge cases that might have been missed, such as testing with invalid pin IDs, unauthorized access attempts, or concurrent voting scenarios. The AI also suggested proper test structure with setup/teardown hooks and test data management. For complex test scenarios, the AI helped break down the testing approach into manageable test cases.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes generated tests that were too verbose or tested implementation details rather than behavior, requiring refactoring. The AI occasionally suggested mocking strategies that weren't appropriate for integration tests, requiring adjustment. There were also cases where AI-generated tests had timing issues or didn't properly clean up test data, causing test pollution between runs.

**Task 3: Requirements and Design Documentation Updates**

3.2.1 **Task Description**: Updated the Requirements_and_Design.md document with UML sequence diagrams, detailed non-functional requirements, and use case specifications. Ensured documentation accurately reflected implemented features.

3.2.2 **AI Interfaces, Tools, and Models Used**: 
- Cursor IDE with integrated AI assistant
- Used for generating documentation and ensuring consistency

3.2.3 **Strategy for Utilizing AI**: 
Provided the AI with implemented code and asked it to generate UML sequence diagrams that reflected the actual implementation. The AI helped structure use case specifications and ensure they accurately described the implemented features. For non-functional requirements, described the performance and scalability needs, and the AI helped formulate clear, measurable requirements. The AI also helped ensure consistency in terminology and formatting across the document.

3.2.4 **Advantages of Using AI Tools**: 
The AI excelled at generating well-structured documentation and ensuring consistency in formatting and terminology. It helped translate code implementations into clear documentation that described user-facing behavior. For UML diagrams, the AI suggested appropriate diagram elements and relationships that accurately represented the system architecture.

3.2.5 **Disadvantages of Using AI Tools**: 
The AI sometimes generated documentation that was too technical or didn't focus on user experience, requiring manual refinement. For UML diagrams, the AI occasionally suggested overly complex diagrams when simpler representations would be clearer. The AI also sometimes misinterpreted code and generated inaccurate documentation, requiring careful review and correction.

#### 3.3 Most Helpful Phases and Tasks
Generative AI was most helpful in **implementation** and **testing** phases. For implementation, the AI excelled at generating Express.js boilerplate code, RESTful API patterns, and database operations. It helped quickly prototype features and iterate on implementations. In testing, the AI was valuable for generating comprehensive test suites and identifying edge cases. The AI was also helpful for **documentation** - it could quickly generate structured documentation and UML diagrams based on implemented code. Additionally, AI was useful for learning new patterns - when working with Express.js and Mongoose, the AI helped understand best practices and common patterns.

#### 3.4 Least Helpful Phases and Tasks
Generative AI was least helpful in **requirements elicitation** and **design** phases. For requirements, the AI couldn't replace understanding actual user needs or business logic. In design, while the AI could generate code from requirements, it struggled with high-level architectural decisions. The AI also had difficulty with **code review** tasks that required understanding the full system context - it would sometimes suggest changes that worked in isolation but conflicted with other parts of the system. For complex features involving multiple services or real-time updates, the AI sometimes provided solutions that didn't integrate well with the existing architecture.

#### 3.5 Team Task Split and Personal Responsibility
The team divided tasks by features and components. Primary responsibility was for **pin management features** (CRUD operations, voting, reporting, category filtering), **pin-related testing** (comprehensive test suites for pin functionality), and **documentation** (UML sequence diagrams, use case specifications, non-functional requirements). Other team members handled frontend UI (Tomas), backend testing (Makatendeka), and badge system (Tony). Focus was on creating robust, well-tested pin management functionality that met all requirements and was thoroughly documented.

#### 3.6 Use of Requirements Documents
Yes, extensively used the `Requirements_and_Design.md` document for implementing pin management features. The "Feature 2: Manage Pins" section provided clear use cases that guided implementation. The use case specifications provided acceptance criteria that were translated into API endpoints and validation logic. For example, the "Vote on Pin" use case helped design the voting system with proper validation and state management. The requirements document also specified pin categories and metadata requirements, which were used to implement filtering and enhanced display features.

#### 3.7 Use of Design Documents
Yes, used design documents, particularly the UML sequence diagrams. Created sequence diagrams for pin-related use cases that helped understand the expected flow and data transformations. These diagrams informed implementation and helped ensure the code followed the designed architecture. The dependency diagram helped understand how pin management related to other system components, which was important for integration. However, for implementation, the requirements document was more directly actionable - the design documents provided context but the requirements document provided specific acceptance criteria.

#### 3.8 Additional Reflections
One unexpected benefit was how AI helped learn Express.js and Mongoose patterns quickly. When the AI suggested implementation patterns, researching why those approaches were recommended accelerated learning. The AI also helped maintain consistency in API design. However, over-reliance on AI could lead to code that worked but wasn't optimal for the specific use case. Learned to always review AI-generated code and adapt it to the project's specific requirements and patterns. Another challenge was that AI sometimes generated code that had subtle bugs or edge cases that only appeared during testing or in production. Learned to thoroughly test all AI-generated code, especially for features involving user input or database operations. Overall, AI was a valuable tool for feature development, but it required careful oversight to ensure code quality, proper error handling, and integration with the existing system.

---

## Notes for Completion

This document is a template that needs to be filled in by each team member. Key information to gather:

1. **Team member names** - Update all "[Name]" placeholders
2. **Task distribution** - List actual tasks completed in this milestone with durations
3. **Time and AI reliance** - Each member should estimate their hours and AI reliance percentage
4. **Individual reflections** - Each member should complete their own section (3.1 through 3.8)
5. **Remove this "Notes" section** before final submission

Once completed, export this document to PDF as `UniVerse_Reflections.pdf` for submission.

