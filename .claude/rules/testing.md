# Testing Rules
> Source of truth for testing.js hook. Edit coverage requirements and patterns here.

## Coverage Requirements
Minimum thresholds enforced by the hook when test files are written.

- min overall coverage: 80
- min security coverage: 90
- min service layer coverage: 85
- min utility coverage: 80
- min component coverage: 70

## Required Test Types
Every feature must have all three test types before it is considered complete.

- unit: individual functions, services, utilities, and pure components in isolation
- integration: API endpoints, database operations, service interactions
- e2e: critical user flows — auth, upgrade, 3D viewer access, PDF export

## Naming Conventions
Test structure that the hook verifies in test files.

- describe_format: describe blocks must name the module/function under test
- it_format: it/test blocks must start with a verb (should, returns, throws, renders, calls, creates, updates, deletes)
- file_suffix: test files must end in .test.ts, .spec.ts, .test.tsx, or .spec.tsx
- no_test_prefix: test file names must not start with test_ (use suffix instead)

## Forbidden Patterns
Entries are `name: regex_string` — matched against test file content.

- test_only: \.(only)\s*\(
- describe_only: describe\.only\s*\(
- it_only: it\.only\s*\(
- test_only_call: test\.only\s*\(
- skip_without_reason: \.(skip)\s*\(\s*['"]
- xtest_without_reason: \bxtest\s*\(
- xit_without_reason: \bxit\s*\(
- hardcoded_url: https?:\/\/(?!localhost|127\.0\.0\.1|example\.com|test\.example)[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}
- hardcoded_user_id: (?:userId|user_id)\s*[=:]\s*['"][a-z0-9]{15,}['"]
- hardcoded_email: ['"][a-z0-9._%+\-]+@(?!example\.com|test\.com)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}['"]
- sleep_in_test: await\s+(?:new\s+Promise|sleep)\s*\([^)]*\d{3,}
- no_assertions: it\s*\([^,]+,\s*(?:async\s+)?\(\s*\)\s*=>\s*\{\s*\}

## Source File Checks
Rules applied to non-test source files to ensure testability.

- no_test_logic_in_source: \b(?:describe|it|test|expect|beforeEach|afterEach)\s*\(
- exportable_functions: pure functions should be exported so they can be unit tested
