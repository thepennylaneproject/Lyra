You are conducting a comprehensive intelligence extraction of the [PROJECT_NAME] codebase. Your goal is to produce a structured, investor-grade profile of this project by reading the actual code, configuration, documentation, and commit history. Do not hallucinate or infer — only report what you can verify from the codebase itself. Where you identify gaps, flag them explicitly.

Work through every section below. Be thorough. Be precise. Be honest about what's mature and what's early.

SECTION 1: PROJECT IDENTITY
Project name (as defined in package.json, config files, or README)
Repository URL (if available in config/remotes)
One-line description (pull from README, package.json description, or meta tags — quote it exactly, then write a cleaner version if needed)
Project status — Based on what you see in the code, classify as one of:
Concept (mostly scaffolding/boilerplate)
Prototype (core features partially implemented)
Alpha (core features working, rough edges)
Beta (feature-complete for v1, needs polish)
Production (deployed, handling real users)
First commit date and most recent commit date
Total number of commits
Deployment status — Is this deployed? Where? (check for netlify.toml, vercel.json, Dockerfiles, CI/CD configs, environment configs referencing production URLs)
Live URL(s) if discoverable in config
SECTION 2: TECHNICAL ARCHITECTURE
Primary language(s) and frameworks (with versions from package.json, requirements.txt, etc.)
Full dependency list — Group into:
Core framework dependencies
UI/styling libraries
State management
API/data layer
AI/ML integrations
Authentication/authorization
Testing
Build tooling
Other notable dependencies
Project structure — Provide the top-level directory tree (2 levels deep) with a one-line explanation of each major directory's purpose
Architecture pattern — What pattern is this? (monolith, microservices, serverless functions, JAMstack, etc.) Describe the data flow from user interaction to database and back.
Database/storage layer — What databases, ORMs, or storage solutions are in use? List all tables/collections you can identify from schema files, migrations, or model definitions. For each table, note its columns/fields.
API layer — Document all API endpoints or serverless functions. For each, note:
Route/path
HTTP method
Brief purpose
Authentication required (yes/no)
External service integrations — List every third-party API or service the code connects to (Stripe, OpenAI, SendGrid, etc.) with what it's used for
AI/ML components — If the project uses AI, detail:
Which models/providers
What prompts or chains exist (summarize, don't reproduce full prompts)
How AI output is processed and presented to users
Authentication and authorization model — How do users log in? What permission levels exist?
Environment variables — List all env vars referenced in the code (names only, never values) grouped by purpose
SECTION 3: FEATURE INVENTORY
For each distinct feature or capability in the application:

Feature name
User-facing description (what does this let a user do?)
Implementation completeness — classify as:
Scaffolded (route/component exists but minimal logic)
Partial (core logic works, UI incomplete or vice versa)
Functional (works end-to-end)
Polished (works well, handles edge cases, good UX)
Key files (list the 2-5 most important files for this feature)
Dependencies on other features
SECTION 4: DESIGN SYSTEM & BRAND
Color palette — Extract all defined colors from:
Tailwind config
CSS custom properties / variables
Theme files
Any design token files List each color with its name, hex value, and where it's defined.
Typography — What fonts are loaded? What's the type scale?
Component library — Is there a shared component system? List all reusable UI components with a one-line description of each.
Design language — Based on the UI code, describe the visual style (minimal, playful, corporate, editorial, etc.)
Responsive strategy — How does the app handle mobile vs desktop?
Dark mode — Is it supported? How is it implemented?
Brand assets — List any logos, illustrations, or custom icons in the repo
SECTION 5: DATA & SCALE SIGNALS
User model — What data is stored per user? What's the user journey from signup to value?
Content/data volume — Are there seed files, fixture data, or references to data volume? How many records does the system seem designed to handle?
Performance considerations — Any caching, pagination, lazy loading, code splitting, rate limiting, or optimization patterns?
Analytics/tracking — Is there any analytics integration? What events are tracked?
Error handling — How are errors caught, logged, and reported?
Testing — What test coverage exists? List test files found and what they cover.
SECTION 6: MONETIZATION & BUSINESS LOGIC
Pricing/tier structure — Is there any pricing logic, plan definitions, or feature gating in the code?
Payment integration — Stripe, PayPal, or other payment processing?
Subscription/billing logic — Recurring payments? Trial periods? Plan limits?
Feature gates — What features are restricted by plan/tier?
Usage limits — Any rate limits, quotas, or credit systems?
SECTION 7: CODE QUALITY & MATURITY SIGNALS
Code organization — Is there a clear separation of concerns? Are there well-defined modules/layers?
Patterns and conventions — What design patterns are used? (facade, repository, dependency injection, etc.) Are naming conventions consistent?
Documentation — README quality, inline comments, JSDoc/docstrings, architecture docs?
TypeScript usage — How strict? Any any types? Are interfaces well-defined?
Error handling patterns — Consistent try/catch? Custom error classes? User-facing error messages?
Git hygiene — Commit message patterns, branching strategy, PR history?
Technical debt flags — TODOs, FIXMEs, deprecated code, commented-out blocks, obvious workarounds?
Security posture — Input validation, SQL injection protection, XSS prevention, CORS config, secrets management?
SECTION 8: ECOSYSTEM CONNECTIONS
Shared code or patterns with other projects in The Penny Lane Project portfolio (Relevnt, Codra, Ready, Mythos, embr, passagr, advocera)
Shared dependencies or infrastructure (same Supabase instance? Same Netlify account? Shared component libraries?)
Data connections — Does this project read from or write to any data source shared with other projects?
Cross-references — Any imports, links, or references to sister projects in the code?
SECTION 9: WHAT'S MISSING (CRITICAL)
Based on your analysis, identify:

Gaps for a production-ready product — What would need to be built to serve real users at scale?
Gaps for investor readiness — What metrics, documentation, or infrastructure is missing that an investor would expect?
Gaps in the codebase itself — Dead code, unused dependencies, incomplete migrations, orphaned files?
Recommended next steps — If you had to prioritize the top 5 things to work on next, what would they be and why?
SECTION 10: EXECUTIVE SUMMARY
Write a 3-paragraph summary of this project suitable for an investor audience:

Paragraph 1: What this is, what problem it solves, and for whom
Paragraph 2: Technical credibility — what's built, how it's built, and what it signals about the builder's capabilities
Paragraph 3: Honest assessment of current state and what it would take to reach the next milestone
OUTPUT FORMAT
Return the completed audit as a single structured document using the exact section headers above. Use code blocks for file paths and technical details. Use tables where they improve readability (dependency lists, feature inventories, API endpoints). Flag every instance where information was not found in the codebase versus where you inferred it.

End your output with a metadata block:

Code
---
AUDIT METADATA
Project: [PROJECT_NAME]
Date: [TODAY'S DATE]
Agent: [MODEL NAME AND VERSION]
Codebase access: [full repo / partial / read-only]
Confidence level: [high / medium / low] with explanation
Sections with gaps: [list section numbers]
Total files analyzed: [count]
---
