# PART III – Reflections and Peer Evaluation

## III-a: Task and Time Distribution

### Table 1 – Task Distribution

| ID  | Task (a short description)                                               | Team Member | Duration |
| --- | ------------------------------------------------------------------------ | ----------- | -------- |
| 1   | Fixed issues on the Requirements_and_Design doc                          | Tony        | 2 hours  |
| 2   | Updated Use Case Diagram and Dependency Diagram                          | Tony        | 3 hours  |
| 3   | Created Final Project Report                                             | Tony        | 4 hours  |
| 4   | Fixed more Codacy issues with our code                                   | Tony        | 3 hours  |
| 5   | Filmed Git Actions and Codacy video                                      | Tony        | 2 hours  |
| 6   | Created slides and recorded part of the presentation                     | Tony        | 3 hours  |
| 7   | Reorganized backend test suite into modular structure                    | Makatendeka | 4 hours  |
| 8   | Updated Testing_And_Code_Review.md with comprehensive test documentation | Makatendeka | 6 hours  |
| 9   | Enhanced recommendation system with OpenWeather and Google Places APIs   | Makatendeka | 5 hours  |
| 10  | Mapped all 47 API endpoints to test file locations with line numbers     | Makatendeka | 4 hours  |
| 11  | Created testing philosophy and coverage justifications documentation     | Makatendeka | 3 hours  |
| 12  | Debugged and fixed recommendation system TypeScript errors               | Makatendeka | 2 hours  |
| 13  | Documented gateway.ts and badge service testing exclusions               | Makatendeka | 2 hours  |
| 14  | Reviewed and documented security/performance test architecture           | Makatendeka | 4 hours  |
| 15  | Implemented MainScreen with Google Maps integration and pin clustering   | Tomas       | 6 hours  |
| 16  | Created Jetpack Compose UI components following Material Design 3        | Tomas       | 5 hours  |
| 17  | Developed E2E test suites for ManagePins, ManageFriends, ManageAccount   | Tomas       | 7 hours  |
| 18  | Fixed UI styling issues and improved map rendering animations            | Tomas       | 4 hours  |
| 19  | Implemented pin rating system with real-time updates                     | Tomas       | 3 hours  |
| 20  | Created authentication UI flow with Google Sign-In integration           | Tomas       | 4 hours  |
| 21  | Optimized Compose performance and reduced unnecessary recompositions     | Tomas       | 3 hours  |
| 22  | Implemented navigation between screens with Material 3 transitions       | Tomas       | 3 hours  |
| 23  | Created UML sequence diagrams for pin management use cases               | Arav        | 3 hours  |
| 24  | Updated Requirements_and_Design.md with non-functional requirements      | Arav        | 2 hours  |
| 25  | Wrote detailed use case specifications for manage pins feature           | Arav        | 2 hours  |
| 26  | Updated dependency diagram to reflect current system architecture        | Arav        | 2 hours  |
| 27  | Documented external system integrations (Google Maps, Firebase)          | Arav        | 1 hour   |

---

### Table 2 – Time and AI Reliance Distribution

| Team Member          | Time Spent on the Assignment (hours) | AI Reliance for the assignment (0-100%) (Estimate) |
| -------------------- | ------------------------------------ | -------------------------------------------------- |
| Tony                 | 17                                   | 80-85%                                             |
| Makatendeka Chikumbu | 30+                                  | 80%                                                |
| Tomas Fernandes      | 35                                   | 85%                                                |
| Arav Verma           | 10                                   | 75%                                                |
| **Group Overall**    | **92**                               | **80%**                                            |

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

80% - Heavy reliance on AI tools, particularly Cursor IDE with Claude Sonnet 4.5, for test suite development, backend feature implementation, code organization, and documentation. The AI was instrumental in reorganizing test structure, implementing recommendation system enhancements with external APIs, debugging complex issues, and maintaining comprehensive documentation. While making architectural decisions and maintaining code quality standards, AI significantly accelerated development across testing, implementation, and documentation tasks.

#### 3.2 Major Tasks Using AI

**Task 1: Test Suite Reorganization and Documentation**

3.2.1 **Task Description**: Reorganized the entire backend test suite from monolithic test files into a modular, feature-based structure. Migrated from `backend/tests/` to `backend/test/` with organized subdirectories (unmocked, mocked, security, performance). Created comprehensive test documentation mapping all 47 API endpoints to their test file locations with accurate line numbers and mocked components. Updated Testing_And_Code_Review.md with detailed test coverage information, testing philosophy, and justifications for partial coverage.

3.2.2 **AI Interfaces, Tools, and Models Used**:

- Cursor IDE with Claude Sonnet 4.5 integrated AI assistant
- Used for analyzing test files, generating documentation, mapping endpoints to tests, and updating markdown documentation

  3.2.3 **Strategy for Utilizing AI**:
  Asked AI to scan the entire test directory structure and identify all test files, then systematically reviewed each file to extract describe blocks and line numbers. Used AI to grep search through test files to find API endpoint patterns and map them to test locations. For documentation, provided the AI with the existing table structure and asked it to update with correct paths. The AI helped identify inconsistencies between old documentation and actual test structure. When updating testing philosophy sections, asked AI to articulate the rationale for not achieving 100% coverage based on conversations about defensive programming and diminishing returns.

  3.2.4 **Advantages of Using AI Tools**:
  The AI excelled at quickly scanning large codebases and extracting structured information like test file locations and describe block line numbers. It could process multiple files in parallel and identify patterns. The AI was particularly good at maintaining consistency in documentation formatting and ensuring all endpoints were properly mapped. For generating justifications, the AI helped articulate technical reasoning in clear, professional language. The tool significantly accelerated what would have been tedious manual work of checking each test file and recording line numbers.

  3.2.5 **Disadvantages of Using AI Tools**:
  The AI occasionally made mistakes with line numbers when files were modified between scans, requiring manual verification. It sometimes suggested generic justifications that didn't reflect our specific project context, requiring refinement. The AI had difficulty understanding the full context of why certain tests were organized in specific ways, sometimes suggesting reorganizations that would break existing patterns. Manual review was necessary to ensure accuracy of all mappings and documentation updates.

**Task 2: Recommendation System Enhancement with External APIs**

3.2.1 **Task Description**: Enhanced the meal recommendation algorithm by integrating OpenWeather API for weather-based scoring and Google Places API for nearby restaurant/cafe search. Modified recommendations.controller.ts to make direct API calls, implement enhanced scoring combining proximity, rating, weather conditions, and popularity. Added graceful fallback when API keys are not configured. Fixed TypeScript compilation errors related to environment variable naming.

3.2.2 **AI Interfaces, Tools, and Models Used**:

- Cursor IDE with Claude Sonnet 4.5
- Used for API integration code generation, scoring algorithm enhancement, error handling implementation, and debugging

  3.2.3 **Strategy for Utilizing AI**:
  Described the requirement to enhance recommendations with weather and places data, specifying that API calls should be made directly in the controller rather than creating separate service files. The AI generated the initial OpenWeather API integration code with proper error handling. For Google Places API, asked the AI to implement nearby search for restaurants and cafes within a radius. When encountering the TypeScript error about GOOGLE_PLACES_API_KEY vs GOOGLE_MAPS_API_KEY, shared the error message with AI which quickly identified the variable name mismatch. Asked AI to implement graceful fallback logic when API keys are not configured, ensuring the system works without external APIs.

  3.2.4 **Advantages of Using AI Tools**:
  The AI quickly generated working API integration code with proper error handling and timeout configuration. It understood the requirement to call APIs directly in the controller and generated code that fit the existing architecture. The AI suggested good scoring algorithms combining multiple factors (weather, distance, rating, open status). When debugging the variable name mismatch, the AI immediately identified the issue and provided the fix. The AI also generated comprehensive logging statements that helped debug API integration issues.

  3.2.5 **Disadvantages of Using AI Tools**:
  The AI initially used the wrong environment variable name (GOOGLE_PLACES_API_KEY instead of GOOGLE_MAPS_API_KEY), requiring a fix. The AI sometimes generated overly complex scoring algorithms that needed simplification. The AI's generated timeout values (3-5 seconds) needed adjustment based on actual API response times. The AI occasionally suggested creating separate service files despite explicit instructions to put logic in the controller, requiring clarification.

**Task 3: Security and Performance Test Implementation**

3.2.1 **Task Description**: Reviewed and documented security test suite organization (4 test files with Phase 1-2 complexity rankings) and performance test suite (4 test files validating NFR requirements). Added documentation explaining the real-time gateway testing exclusion due to WebSocket complexity and badge service partial testing rationale. Updated documentation with testing philosophy explaining why 100% coverage is not the goal.

3.2.2 **AI Interfaces, Tools, and Models Used**:

- Cursor IDE with Claude Sonnet 4.5
- Used for analyzing test architecture, generating justifications, and creating comprehensive documentation

  3.2.3 **Strategy for Utilizing AI**:
  Asked AI to analyze the security test files and identify the complexity ranking system (Phase 1-2, Rank 1-3). The AI helped extract the testing strategy from test file comments and code structure. For performance tests, asked AI to identify which NFR requirements were being validated and how. When creating justifications for gateway.ts and badge service exclusions, provided AI with the actual code files and asked it to articulate why these components are difficult to test comprehensively. The AI helped structure the justifications in a concise, professional manner.

  3.2.4 **Advantages of Using AI Tools**:
  The AI was excellent at analyzing test code structure and identifying patterns like the complexity ranking system. It could quickly scan test files and extract the testing strategy. For generating justifications, the AI helped articulate technical complexity in clear language that non-technical stakeholders could understand. The AI maintained consistency in documentation tone and formatting across all sections.

  3.2.5 **Disadvantages of Using AI Tools**:
  The AI sometimes generated overly verbose justifications that needed condensing. It occasionally misunderstood specific testing patterns and suggested generic explanations that didn't fit the actual implementation. The AI's initial justifications were too detailed and needed to be made more concise as requested. Manual review was necessary to ensure justifications accurately reflected the actual technical constraints.

#### 3.3 Most Helpful Phases and Tasks

Generative AI was most helpful in **implementation**, **testing**, and **documentation** phases. For implementation, the AI excelled at generating API integration code (OpenWeather, Google Places), implementing enhanced scoring algorithms, and adding proper error handling with graceful fallbacks. In testing, the AI was invaluable for reorganizing test structure, mapping endpoints to test files, and articulating testing strategies. For documentation, AI was extremely helpful - it could quickly scan codebases, extract structured information (test locations, line numbers, describe blocks), generate comprehensive coverage justifications, and maintain consistency across large documentation updates. The AI was particularly valuable for **project refinement** tasks like updating documentation to reflect actual codebase structure and articulating technical rationales in clear language.

#### 3.4 Least Helpful Phases and Tasks

Generative AI was least helpful in **requirements elicitation** and **design** phases. For requirements, the AI couldn't replace actual understanding of user needs, business logic, or NFR constraints. In design, while the AI could implement features, it struggled with high-level architectural decisions like whether to use services vs direct controller calls, or how to organize test suites. The AI also had difficulty with **debugging** complex issues that required understanding full system context - it would sometimes suggest fixes that worked in isolation but conflicted with existing patterns. For tasks requiring creative problem-solving or novel approaches (like determining the right test organization strategy), the AI tended to suggest conventional patterns rather than solutions tailored to our specific needs. The AI also struggled with understanding implicit project conventions and architectural patterns that weren't explicitly documented.

#### 3.5 Team Task Split and Personal Responsibility

The team divided tasks primarily by features and components. Primary responsibility was for **backend testing infrastructure** (test suite reorganization, test documentation, coverage analysis), **recommendation system enhancements** (OpenWeather and Google Places API integration, enhanced scoring algorithm), and **comprehensive documentation** (Testing_And_Code_Review.md updates, test location mapping, coverage justifications, testing philosophy articulation). Other team members handled frontend UI implementation (Tomas), badge system (Tony), and pin management (Arav). Focus was on ensuring the backend had well-organized, thoroughly documented tests with high coverage of critical paths, enhancing recommendation quality with external data sources, and maintaining accurate documentation that reflects actual codebase structure.

#### 3.6 Use of Requirements Documents

Yes, extensively used the `Requirements_and_Design.md` document throughout the project. For the recommendation system enhancement, referenced the meal recommendation requirements to understand expected behavior and user flows. The requirements document helped identify which external data sources (weather, nearby places) would add value to recommendations. For testing documentation, used the requirements to understand which APIs needed testing and what validation was required. The security and performance requirements sections were crucial for documenting the test suite organization and explaining why certain NFR tests were structured with complexity rankings. However, much of the work involved documenting actual implementation rather than implementing from requirements, so the requirements document served more as a reference for validation than a direct implementation guide.

#### 3.7 Use of Design Documents

Yes, used design documents for understanding system architecture and component relationships. The dependency diagrams helped understand how the recommendation system integrated with other components (pins, locations, users). When reorganizing tests, the design documents helped ensure the new test structure aligned with the actual system architecture. However, for much of the documentation work, relied more on analyzing actual code structure than design documents, since the task was to document what exists rather than implement new designs. The design documents were most useful for understanding context and ensuring documentation accurately reflected the intended architecture.

#### 3.8 Additional Reflections

One unexpected benefit was how AI helped learn comprehensive documentation practices. By asking the AI to generate documentation and then refining it, learned what makes documentation clear, accurate, and useful. The AI also helped maintain consistency across large documentation updates - it could ensure formatting, terminology, and tone remained consistent across hundreds of lines of documentation. However, over-reliance on AI for documentation could lead to generic descriptions that don't capture project-specific nuances. Learned to always verify AI-generated documentation against actual code and add context that only a human familiar with the project would know.

Another key insight was the importance of iterative refinement with AI. Initial AI-generated solutions often needed 2-3 rounds of feedback to get right - whether it was code, tests, or documentation. The AI was best used as a collaborative tool rather than a black box - describing problems clearly, reviewing suggestions critically, and providing specific feedback for improvements led to much better results than accepting initial AI output.

For the recommendation system enhancement, learned that AI is excellent at implementing well-defined integrations (API calls, error handling) but needs clear architectural guidance (where to put the code, how to handle failures). The AI's suggestion to create separate service files showed it was following common patterns, but our architecture called for direct controller integration - human architectural decisions were necessary to guide the AI effectively.

Overall, AI was transformative for this project, particularly for tasks involving code analysis, documentation generation, and systematic updates across large codebases. The 80% AI reliance estimate reflects both the power of AI tools and the necessity of human oversight - the AI did most of the mechanical work, but human judgment was essential for architectural decisions, accuracy verification, and ensuring solutions fit our specific project needs.

---

### Team Member 3: Tomas Fernandes

#### 3.1 Overall AI Reliance Estimate

85% - Very heavy reliance on AI tools, particularly Cursor IDE with integrated AI assistant, for Jetpack Compose UI development, Google Maps integration, E2E testing, and frontend architecture. The AI was instrumental in understanding Compose patterns, generating UI code, implementing animations, and creating comprehensive test suites. While making UX decisions and maintaining design consistency, AI significantly accelerated learning Jetpack Compose and implementing complex UI features.

#### 3.2 Major Tasks Using AI

**Task 1: Main Map Screen Implementation**

85% - Very heavy reliance on AI tools, particularly Cursor IDE with integrated AI assistant, for Jetpack Compose UI development, Google Maps integration, E2E testing, and frontend architecture. The AI was instrumental in understanding Compose patterns, generating UI code, implementing animations, and creating comprehensive test suites. While making UX decisions and maintaining design consistency, AI significantly accelerated learning Jetpack Compose and implementing complex UI features.

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

### Team Member 4: Arav Verma

#### 3.1 Overall AI Reliance Estimate

100% - Complete reliance on AI tools for pin management feature implementation, comprehensive test development, and documentation updates. The AI was essential for generating CRUD operation code, understanding Express.js patterns, and creating test suites. While making architectural decisions and feature design choices, AI was the primary tool for generating boilerplate code and suggesting implementation patterns.

#### 3.2 Major Tasks Using AI

**Task 1: UML Sequence Diagram Creation**

3.2.1 **Task Description**: Created comprehensive UML sequence diagrams for key use cases including pin management (create, vote, report), friend management, and badge system flows. Ensured diagrams accurately reflected the implemented system architecture with proper actor interactions, API calls, and database operations.

3.2.2 **AI Interfaces, Tools, and Models Used**:

- Cursor IDE with integrated AI assistant
- Used for generating PlantUML/Mermaid code and understanding sequence diagram best practices

  3.2.3 **Strategy for Utilizing AI**:
  Started by analyzing the codebase to understand the actual flow of operations for each use case. Described the controller → service → database flow to the AI and asked it to generate PlantUML syntax for sequence diagrams. For pin voting, explained the user action → API endpoint → service method → database update sequence, and the AI generated the diagram structure. Iteratively refined diagrams by asking the AI to add error handling paths, authentication checks, and real-time update notifications. The AI helped ensure diagrams followed UML conventions with proper activation boxes, return arrows, and lifelines.

  3.2.4 **Advantages of Using AI Tools**:
  The AI excelled at generating syntactically correct PlantUML/Mermaid code quickly, saving time learning diagram syntax. It suggested proper UML notation for different interaction types (synchronous calls, returns, activation). The AI helped identify missing steps in diagrams by analyzing code flows and suggesting additional interactions. For complex multi-actor scenarios, the AI helped organize the diagram layout for clarity. The AI also maintained consistent styling and naming conventions across multiple diagrams.

  3.2.5 **Disadvantages of Using AI Tools**:
  The AI sometimes generated overly complex diagrams with too much detail, requiring simplification to focus on key interactions. It occasionally misinterpreted code flows and suggested incorrect sequence ordering, requiring manual correction based on actual implementation. The AI sometimes used generic placeholder names instead of actual class/method names from the codebase. For real-time features involving WebSockets, the AI struggled to represent bidirectional communication clearly. Had to manually verify each diagram against actual code to ensure accuracy.

**Task 2: Non-Functional Requirements Documentation**

3.2.1 **Task Description**: Updated Requirements_and_Design.md with detailed non-functional requirements (NFRs) covering performance, security, scalability, usability, and reliability. Created measurable acceptance criteria for each NFR and ensured they aligned with implemented features and test coverage.

3.2.2 **AI Interfaces, Tools, and Models Used**:

- Cursor IDE with integrated AI assistant
- Used for generating NFR specifications and creating measurable criteria

  3.2.3 **Strategy for Utilizing AI**:
  Described the system's performance characteristics (API response times, concurrent users, database query limits) and asked the AI to formulate clear, measurable NFRs. For security requirements, provided information about authentication (Firebase Auth), authorization checks, and input validation, and the AI helped structure comprehensive security NFRs. The AI assisted in creating acceptance criteria that were specific and testable. For scalability NFRs, described the Firebase Realtime Database and Cloud Functions architecture, and the AI suggested appropriate scaling requirements. Iteratively refined NFRs to ensure they were realistic, measurable, and aligned with actual system capabilities.

  3.2.4 **Advantages of Using AI Tools**:
  The AI was excellent at formulating professional, well-structured NFR descriptions following industry standards. It helped create measurable criteria rather than vague statements (e.g., "95% of API calls under 200ms" instead of "fast response times"). The AI suggested important NFR categories that might have been overlooked, such as maintainability and accessibility. For each NFR, the AI helped identify appropriate metrics and testing methods. The AI maintained consistency in format and terminology across all NFR sections.

  3.2.5 **Disadvantages of Using AI Tools**:
  The AI sometimes suggested overly ambitious NFRs that didn't reflect actual system capabilities, requiring adjustment to realistic targets. It occasionally generated generic NFRs that could apply to any system rather than project-specific requirements. The AI sometimes struggled to understand the constraints of our specific architecture (Firebase, Express.js) and suggested NFRs that weren't feasible. Had to manually verify that NFRs aligned with implemented features and existing test coverage. The AI's suggested metrics sometimes didn't match how we actually measured performance in our testing.

**Task 3: Use Case Specification and Refinement**

3.2.1 **Task Description**: Created detailed use case specifications for all major features including manage pins, manage friends, badge system, and meal recommendations. Structured each use case with actors, preconditions, main flow, alternative flows, postconditions, and exception scenarios. Ensured use cases accurately reflected implemented functionality.

3.2.2 **AI Interfaces, Tools, and Models Used**:

- Cursor IDE with integrated AI assistant
- Used for generating use case structures and ensuring completeness

  3.2.3 **Strategy for Utilizing AI**:
  Analyzed implemented features in the codebase and described the user flows to the AI. Asked it to generate formal use case specifications following standard templates with numbered steps. For example, for "Vote on Pin" use case, described the user interaction (tap upvote/downvote button), authentication requirements, and expected outcomes, and the AI generated the structured specification. The AI helped identify alternative flows (e.g., user changes vote from upvote to downvote) and exception scenarios (e.g., network failure during vote submission). Iteratively refined use cases to focus on user experience rather than technical implementation details. The AI helped ensure consistent formatting and terminology across all use case specifications.

  3.2.4 **Advantages of Using AI Tools**:
  The AI was excellent at structuring use cases in a professional, consistent format following industry standards. It helped identify edge cases and alternative flows that might have been missed, making use cases more comprehensive. The AI suggested appropriate preconditions and postconditions based on described user flows. For complex features involving multiple actors or systems, the AI helped organize the flow clearly. The AI maintained consistent numbering, formatting, and section structure across all use cases, which improved document readability.

  3.2.5 **Disadvantages of Using AI Tools**:
  The AI sometimes generated overly detailed use cases with too many steps, requiring simplification to focus on key user actions. It occasionally included implementation details (e.g., specific API calls or database operations) that should have been abstracted at the use case level. The AI sometimes struggled to differentiate between main flow and alternative flows, requiring reorganization. For features with complex business logic (like badge qualification checking), the AI generated generic descriptions that didn't capture project-specific requirements. Had to manually verify each use case against actual implemented functionality to ensure accuracy and completeness.

#### 3.3 Most Helpful Phases and Tasks

Generative AI was most helpful in **documentation** and **requirements refinement** phases. For documentation, the AI excelled at generating well-structured content following professional standards - use case specifications, NFR descriptions, and UML diagrams were created much faster with AI assistance. The AI helped maintain consistency in formatting, terminology, and style across large documentation sections. For UML sequence diagrams, the AI quickly generated syntactically correct PlantUML/Mermaid code, saving time learning diagram syntax. The AI was also valuable for **requirements analysis** - it helped identify missing edge cases, alternative flows, and exception scenarios that made requirements more comprehensive. Additionally, AI was useful for ensuring completeness - it could review documentation sections and suggest missing elements (preconditions, postconditions, acceptance criteria).

#### 3.4 Least Helpful Phases and Tasks

Generative AI was least helpful in **requirements validation** and **ensuring accuracy** tasks. For requirements validation, the AI couldn't replace actually understanding the implemented system - it would sometimes generate documentation that sounded correct but didn't match actual functionality. The AI struggled with **technical accuracy** - it would generate plausible-sounding NFRs or use case flows that didn't reflect how the system actually worked, requiring careful verification against the codebase. The AI also had difficulty with **project-specific context** - it would generate generic documentation that could apply to any system rather than capturing unique aspects of our project. For UML diagrams, the AI sometimes suggested flows that were technically correct but didn't represent our actual implementation patterns. Additionally, for tasks requiring deep understanding of the system architecture, the AI would make assumptions that required correction.

#### 3.5 Team Task Split and Personal Responsibility

The team divided tasks by features and components. Primary responsibility was for **documentation** (Requirements_and_Design.md updates, UML sequence diagrams, use case specifications, non-functional requirements). This included creating visual diagrams that clearly communicated system architecture, writing detailed use case specifications with proper flow descriptions, and formulating measurable NFRs. Other team members handled implementation: frontend UI (Tomas), backend testing and documentation (Makatendeka), and badge system implementation (Tony). Focus was on ensuring documentation accurately reflected the implemented system, was comprehensive and professional, and would be useful for future development and stakeholder communication.

#### 3.6 Use of Requirements Documents

Yes, extensively used the existing `Requirements_and_Design.md` document as a foundation for documentation updates. The document provided the overall structure and format to follow when adding new sections like detailed use cases and NFRs. Reviewed existing use case descriptions to maintain consistency in style and terminology when creating new specifications. The requirements document also served as a reference for ensuring completeness - checked that all major features (pins, friends, badges, recommendations) had corresponding UML diagrams and detailed use cases. However, much of the work involved updating and expanding the requirements document itself based on the implemented system, so used the codebase more as a reference than the requirements document.

#### 3.7 Use of Design Documents

Yes, created and updated design documents, particularly UML sequence diagrams. However, rather than using existing design documents to guide work, the task was to create design documents that accurately reflected the implemented system. Analyzed the codebase to understand actual data flows and interactions, then created sequence diagrams that documented these flows. The dependency diagram was updated to reflect current component relationships based on actual code structure. The design documents served as deliverables themselves rather than inputs - the goal was to create clear visual documentation that would help future developers and stakeholders understand the system architecture. Used the codebase as the primary reference for ensuring diagram accuracy.

#### 3.8 Additional Reflections

One unexpected benefit was how AI helped learn professional documentation standards. By reviewing AI-generated documentation and comparing it to industry examples, learned what makes documentation clear, comprehensive, and useful. The AI excelled at maintaining consistency - formatting, terminology, and style remained uniform across all documentation sections. However, the most critical lesson was that AI-generated documentation requires careful verification for accuracy. The AI could generate plausible-sounding use cases or UML diagrams that didn't match the actual system implementation, which could mislead future developers or stakeholders.

Another key insight was the importance of balancing detail with clarity. AI tended to generate either overly verbose documentation with too many edge cases, or overly generic descriptions that didn't capture project specifics. Finding the right level of detail required human judgment - understanding what information would be most valuable for readers while keeping documentation concise and maintainable.

For documentation work specifically, AI was most valuable as a formatting and structure assistant rather than a content generator. Using AI to ensure consistent numbering, proper section headers, and professional language saved significant time. However, the actual content - what flows to document, which NFRs to specify, which alternative scenarios to include - required understanding the implemented system and making informed decisions about what to document.

Overall, AI transformed documentation work from a tedious manual task to a more efficient process, but the 75% AI reliance reflects the necessity of human oversight for accuracy, relevance, and project-specific context. The AI handled the mechanical aspects of documentation well, but ensuring correctness and usefulness required constant verification against the actual codebase.

---
