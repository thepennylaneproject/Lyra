# Testing Guide

## Overview

Lyra uses **Vitest** for unit and integration testing. Tests are located in `lib/__tests__/` directories next to the code they test.

## Running Tests

### Local Development

```bash
cd dashboard

# Run tests once
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Interactive UI
npm run test:ui

# Coverage report
npm run test:coverage
```

### CI/CD

Tests run automatically on every push to `main/master` and on pull requests via GitHub Actions. The workflow includes:

```bash
npm run lint          # Linting (ESLint)
npm run typecheck     # Type checking (TypeScript)
npm run test          # Unit tests (Vitest)
npm run build         # Build check
```

## Test Structure

### Test Files

Tests are colocated with source code in `__tests__/` directories:

```
lib/
├── auth-session.ts
├── linear.ts
├── repository.ts
└── __tests__/
    ├── auth-session.test.ts
    ├── linear.test.ts
    ├── repository.test.ts
    └── middleware.test.ts
```

### Test File Naming

- `*.test.ts` — Unit/integration tests
- `*.spec.ts` — Specification tests (alternative format)

## Test Coverage

### Critical Paths (High Priority)

The following areas have comprehensive test coverage:

1. **Auth Session** (`lib/__tests__/auth-session.test.ts`)
   - HMAC-SHA256 signature generation
   - Token expiry validation
   - TTL configuration
   - Signature verification

2. **Linear Sync** (`lib/__tests__/linear.test.ts`)
   - Lyra → Linear status mapping
   - Linear → Lyra status mapping
   - Round-trip consistency
   - Edge cases (case sensitivity, invalid statuses)

3. **Repository** (`lib/__tests__/repository.test.ts`)
   - Finding JSON parsing (`open_findings` key)
   - Alternate format support (`findings` key)
   - Preference logic (open_findings > findings)
   - Error handling (malformed JSON, missing arrays)

4. **Middleware Auth** (`lib/__tests__/middleware.test.ts`)
   - Session cookie verification
   - Bearer token validation
   - Header-based secret validation
   - Route exclusions
   - Token lifetime and expiry

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  it("should do something specific", () => {
    const result = someFunction();
    expect(result).toBe(expectedValue);
  });
});
```

### Common Assertions

```typescript
// Equality
expect(value).toBe(expected);
expect(value).toEqual(expected); // Deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(3.14);

// Strings & Arrays
expect(string).toMatch(/pattern/);
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Errors
expect(() => {
  throw new Error("message");
}).toThrow("message");
```

## Next Steps for Test Coverage

Priority areas for future test coverage:

1. **Finding merge logic** — Core data transformation
2. **Linear API client** — GraphQL queries and error handling
3. **Database operations** — Create/update/delete operations
4. **Orchestration state machine** — Job lifecycle and transitions
5. **Repair queue operations** — Finding selection and batch operations

## Debugging Tests

### Run Single Test File

```bash
npm run test:watch -- lib/__tests__/auth-session.test.ts
```

### Run Tests Matching Pattern

```bash
npm run test:watch -- --grep "should verify token"
```

### Enable Debug Output

```bash
DEBUG=* npm run test:watch
```

### Interactive UI Mode

```bash
npm run test:ui
```

Opens browser at `http://localhost:51204/__vitest__/` with interactive test exploration.

## Integration Testing

For tests that need to interact with the database or external services:

1. Use mock/stub functions to avoid network calls
2. For Postgres operations, use a test database or in-memory mock
3. For Linear API, mock GraphQL responses

Example:

```typescript
import { vi } from "vitest";

it("should handle Linear API errors", async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 401,
    text: () => Promise.resolve("Unauthorized"),
  });

  global.fetch = mockFetch;
  // Test error handling
});
```

## Best Practices

1. **Test behavior, not implementation** — Focus on what the function does, not how it does it
2. **Use descriptive test names** — Make it clear what is being tested
3. **One assertion per test** — Keep tests focused and easy to debug
4. **Arrange-Act-Assert** — Clear test structure
5. **Mock external dependencies** — Don't call real APIs in tests
6. **Keep tests fast** — Avoid unnecessary delays or database operations

## CI/CD Integration

The GitHub Actions workflow automatically:

1. Runs all tests on every push
2. Reports results in PR checks
3. Blocks merging if tests fail
4. Publishes coverage reports (future)

All commits to `main`/`master` must have passing tests.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Expect Documentation](https://vitest.dev/api/expect.html)
