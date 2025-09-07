# Authentication Testing Guide

This document explains how authentication testing works in this project and how to run different types of authentication tests.

## Overview

We use Playwright for end-to-end authentication testing with the following approaches:

1. **Authentication State Reuse**: Pre-authenticated states are saved and reused across tests for performance
2. **Role-based Testing**: Tests can run with different user roles (admin, user)
3. **Test Bypass Provider**: Fast authentication in test environments
4. **Comprehensive Flow Testing**: Full registration, login, and logout flows

## Authentication Setup

The authentication testing setup consists of:

1. **Global Setup Script** (`tests/global-setup.ts`): Creates authenticated states for different user roles
2. **Storage States**: Saved authentication states in `tests/storage-state/`
3. **Test Helpers** (`tests/auth-test-utils.ts`): Utility functions for authentication operations
4. **Test Bypass Provider**: Special NextAuth provider for fast testing authentication

## Running Authentication Tests

### Run All Authentication Tests

```bash
npm run test:e2e:auth
```

### Run Specific Authentication Test Suites

```bash
# Run tests with pre-authenticated admin user
npm run test:e2e -- --project=chromium-admin

# Run tests with pre-authenticated regular user
npm run test:e2e -- --project=chromium-user

# Run tests without authentication
npm run test:e2e -- --project=chromium-no-auth
```

### Run Authentication Setup Only

```bash
npm run test:e2e:setup
```

## Test Organization

### Authentication Flow Tests (`tests/auth-flow.spec.ts`)

Tests that verify complete authentication flows:
- Login with different user roles
- Logout functionality
- Access control based on roles
- Unauthenticated access restrictions

### Authentication Integration Tests (`tests/auth.spec.ts`)

Tests that verify integration with the existing authentication system:
- Registration flows
- Login/logout cycles
- Session management

## Adding New Authentication Tests

### Using Pre-authenticated States

To write tests that use pre-authenticated users:

```typescript
// For admin user
test.use({ storageState: 'tests/storage-state/admin.json' });

test("admin can access admin features", async ({ page }) => {
  // Test code here - user is already authenticated as admin
});

// For regular user
test.use({ storageState: 'tests/storage-state/user.json' });

test("user cannot access admin features", async ({ page }) => {
  // Test code here - user is already authenticated as regular user
});
```

### Manual Authentication in Tests

For tests that need to perform authentication flows:

```typescript
import { loginAsTestUser, logoutUser } from "./auth-test-utils";

test("user can login and logout", async ({ page }) => {
  await loginAsTestUser(page, 'user');
  // Perform actions as authenticated user
  
  await logoutUser(page);
  // Verify logout behavior
});
```

## Test Users

The system provides predefined test users:

- **Admin User**: `test@test.com` with role `ADMIN`
- **Regular User**: `testuser@test.com` with role `USER`

These users are available in all test environments when the Test Bypass provider is enabled.

## Environment Configuration

To enable the Test Bypass provider, set the following environment variables:

```bash
NODE_ENV=test
ENABLE_TEST_AUTH=true
```

Or run tests with:

```bash
NODE_ENV=test npm run test:e2e
```

## Troubleshooting

### Authentication State Not Working

1. Regenerate authentication states:
   ```bash
   npm run test:e2e:setup
   ```

2. Check that the Test Bypass provider is enabled in the environment

### Session Persistence Issues

1. Ensure `AUTH_SECRET` is set consistently
2. Check cookie configuration in `auth.ts`
3. Verify that `useSecureCookies` is correctly configured for the environment

### Test Bypass Provider Not Available

1. Ensure `NODE_ENV=test` or `ENABLE_TEST_AUTH=true` is set
2. Check that the test bypass provider is configured in `auth.ts`