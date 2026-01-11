# Playwright SDET Todo App - Test Framework

Professional test automation framework for Todo application using Playwright, TypeScript, and best practices for SDET (Software Development Engineer in Test).

📊 **Latest Allure Report**: [View Online](https://pavlovic-bojan.github.io/playwright-sdet-todo-app/)


## 📋 Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Reports](#test-reports)
- [Test Architecture](#test-architecture)
- [Best Practices](#best-practices)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This framework implements a comprehensive testing strategy following the **Testing Pyramid**:

- **API Tests** (`tests/api/`) - Test HTTP endpoints directly, verify API contracts, and validate database persistence
- **E2E Tests** (`tests/e2e/`) - Test user experience through browser automation, verify UI flows
- **Performance Tests** (`tests/performance/`) - Load, stress, and spike testing with k6 and TypeScript
- **Page Object Model** (`tests/page-object-modal/`) - Encapsulate UI interactions for maintainability

### Key Features

✅ **API Testing** - Direct HTTP endpoint testing with database verification  
✅ **E2E Testing** - Full browser automation with Page Object Model  
✅ **Performance Testing** - Load, stress, and spike tests with k6 and TypeScript  
✅ **TypeScript** - Type-safe test code across all test types  
✅ **PostgreSQL Integration** - Direct database access for verification  
✅ **Reusable Services** - API and DB services for code reusability  
✅ **Error Handling** - Comprehensive error case testing  
✅ **Test Data Management** - Factory pattern for test data generation  
✅ **Allure Reporting** - Professional test reports with screenshots and attachments  

## 📁 Project Structure

```
tests/
├── api/                    # API test suites
│   ├── todo.spec.ts        # Todo API tests
│   └── user.spec.ts         # User API tests
├── e2e/                    # E2E test suites
│   ├── accessibility.spec.ts
│   ├── authentication.spec.ts
│   ├── security.spec.ts
│   ├── todo-management.spec.ts
│   └── validation.spec.ts
├── fixtures/               # Playwright fixtures
│   └── api.fixture.ts      # API, DB, and page fixtures
├── helpers/                # Helper utilities
│   └── testData.factory.ts # Test data generation
├── models/                 # TypeScript models
│   ├── api/                # API response models
│   └── db/                 # Database entity models
├── page-object-modal/      # Page Object Model classes
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   ├── TodoPage.ts
│   ├── ForgotPasswordPage.ts
│   └── ResetPasswordPage.ts
└── services/               # Reusable services
    ├── api/                # API service classes
    │   ├── TodoApiService.ts
    │   └── UserApiService.ts
    └── db/                 # Database service classes
        ├── TodoDbService.ts
        └── UserDbService.ts
```

## 🔧 Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** database (for database verification)
- **Access to Todo App** (backend API and frontend)
- **k6** (for performance testing - see [Installation](#k6-installation))
- **Java** (for Allure reporting - optional, only if using Allure CLI)

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `BASE_URL` - Frontend URL (default: `http://localhost:3000`)
- `API_URL` - Backend API URL (default: `http://localhost:3000/api`)
- `DB_URL` - PostgreSQL connection string

### 3. Install k6 (for Performance Testing)

**macOS (using Homebrew - Recommended):**
```bash
brew install k6
```

**macOS (Manual Installation - If Homebrew doesn't work):**

First, check your Mac architecture:
```bash
uname -m
```

Then download and install:

**For Intel Mac (x86_64):**
```bash
# Download k6
curl -L https://github.com/grafana/k6/releases/latest/download/k6-v0.48.0-darwin-amd64.zip -o k6.zip

# Extract
unzip k6.zip

# Move to /usr/local/bin (requires sudo password)
sudo mv k6 /usr/local/bin/k6

# Clean up
rm k6.zip

# Verify installation
k6 version
```

**For Apple Silicon (M1/M2/M3 - arm64):**

**Option A: Use installation script (Easiest)**
```bash
bash install-k6.sh
```

**Option B: Manual installation**
```bash
curl -L https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-darwin-arm64.tar.gz -o k6.tar.gz
tar -xzf k6.tar.gz
sudo mv k6-v0.48.0-darwin-arm64/k6 /usr/local/bin/k6
rm -rf k6.tar.gz k6-v0.48.0-darwin-arm64
k6 version
```

**Alternative: Install to User Directory (No sudo required):**
```bash
# Create local bin directory
mkdir -p ~/bin

# Download k6 (choose correct version for your Mac)
# For Intel Mac:
curl -L https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-darwin-amd64.tar.gz -o ~/k6.tar.gz
# OR for Apple Silicon:
# curl -L https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-darwin-arm64.tar.gz -o ~/k6.tar.gz

# Extract
cd ~ && tar -xzf k6.tar.gz && mv k6-v0.48.0-darwin-arm64/k6 ~/bin/k6

# Add to PATH (add to ~/.zshrc)
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Clean up
rm -rf ~/k6.tar.gz ~/k6-v0.48.0-darwin-arm64

# Verify installation
k6 version
```

**For detailed installation instructions, see [INSTALL_K6.md](INSTALL_K6.md)**

**Linux (Ubuntu/Debian):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D9
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows (using Chocolatey):**
```bash
choco install k6
```

**Windows (Manual Installation):**
Download the latest release from: https://github.com/grafana/k6/releases
Extract and add to PATH.

**Verify installation:**
```bash
k6 version
```

You should see output like: `k6 v0.48.0 (go1.21.5, darwin/amd64)`

### 4. Install Playwright Browsers

```bash
npx playwright install
```

### 4. Install Allure CLI (Optional, for viewing reports)

**macOS:**
```bash
brew install allure
```

**Windows (using Scoop):**
```bash
scoop install allure
```

**Linux:**
```bash
# Download from https://github.com/allure-framework/allure2/releases
# Or use package manager
```

## 🧪 Running Tests

### Quick Reference

```bash
# Run ALL tests (API + E2E + Performance smoke)
npm test

# Or explicitly:
npm run test:all

# Run only Playwright tests (API + E2E)
npm run test:playwright

# Run only API tests
npm run test:api

# Run only E2E tests
npm run test:e2e

# Run only Performance tests
npm run test:performance:smoke  # Smoke test (quick validation)
npm run test:performance:load   # Load test (normal expected load)
npm run test:performance:stress # Stress test (beyond normal capacity)
npm run test:performance:spike  # Spike test (sudden traffic spikes)

# View performance reports
npm run test:performance:report      # List all generated HTML reports
npm run test:performance:report:open # Open all HTML reports in browser
# Or open specific report manually:
# open performance-report-smoke.html
# open performance-report-load.html
# open performance-report-stress.html
# open performance-report-spike.html
```

### Run All Tests

**Runs all test types: API, E2E, and Performance (smoke)**

```bash
npm test
# or explicitly:
npm run test:all
```

This will run:
- ✅ **API Tests** (Playwright) - Tests HTTP endpoints with database verification
- ✅ **E2E Tests** (Playwright) - Tests user experience through browser automation
- ✅ **Performance Tests** (k6) - Smoke test for quick validation

### Run Specific Test Types

#### API Tests Only

```bash
npm run test:api
```

Tests HTTP endpoints directly, verifies API contracts, and validates database persistence.

#### E2E Tests Only

```bash
npm run test:e2e
```

Tests user experience through browser automation with Page Object Model.

#### Performance Tests

```bash
# Smoke test (quick validation) - included in npm test
npm run test:performance:smoke

# Load test (normal expected load)
npm run test:performance:load

# Stress test (beyond normal capacity)
npm run test:performance:stress

# Spike test (sudden traffic spikes)
npm run test:performance:spike

# All performance tests
npm run test:performance:all
```

**Performance Reports**: k6 automatically generates HTML reports for each test run using `k6-reporter`:
- `performance-report-smoke.html` - Smoke test results
- `performance-report-load.html` - Load test results
- `performance-report-stress.html` - Stress test results
- `performance-report-spike.html` - Spike test results

Each HTML report includes:
- Request statistics (duration, rate, failures)
- Threshold results
- Custom metrics
- Summary statistics
- Visual charts and graphs

View reports:
```bash
npm run test:performance:report      # List all reports
npm run test:performance:report:open # Open all reports in browser
```

For detailed performance testing documentation, see [tests/performance/README.md](tests/performance/README.md).

### Run Only Playwright Tests (API + E2E)

```bash
npm run test:playwright
```

This runs all Playwright tests (API and E2E) but excludes performance tests.

### Run Performance Tests

```bash
# Smoke test (quick validation)
npm run test:performance:smoke

# Load test (normal expected load)
npm run test:performance:load

# Stress test (beyond normal capacity)
npm run test:performance:stress

# Spike test (sudden traffic spikes)
npm run test:performance:spike
```

For detailed performance testing documentation, see [tests/performance/README.md](tests/performance/README.md).

### Run Tests in UI Mode

```bash
npm run test:ui
```

### Run Tests in Headed Mode

```bash
npm run test:headed
```

### Run Tests in Debug Mode

```bash
npm run test:debug
```

## 📊 Test Reports

### Playwright HTML Report

View the default Playwright HTML report:

```bash
npm run test:report
```

This opens the HTML report in your browser with:
- Test execution timeline
- Screenshots for failed tests
- Trace viewer for debugging
- Test results summary

### Allure Report (Recommended)

Generate and view Allure report:

```bash
npm run test:report:allure
```

This will:
1. Generate Allure report from test results
2. Open it in your default browser

**Allure Report Features:**
- 📸 **Screenshots** - Automatic screenshots for failed tests
- 📎 **Attachments** - Request/response data, logs, etc.
- 🏷️ **Tags** - Test categorization (epic, feature, story)
- 📈 **History** - Track test execution over time
- 🔍 **Filtering** - Filter by status, severity, tags
- 📊 **Charts** - Visual representation of test results

**Allure Report Structure:**
- **Overview** - Summary with charts and statistics
- **Suites** - Test suites organized by categories
- **Graphs** - Visual charts (duration, status, etc.)
- **Timeline** - Test execution timeline
- **Behaviors** - Tests organized by epic/feature/story
- **Packages** - Tests organized by package structure

## 🏗️ Test Architecture

### API Testing Strategy

**Purpose**: Test HTTP endpoints directly, verify API contracts, and validate database persistence.

**Approach**:
1. Make HTTP request via API service
2. Verify API response (status code, structure, data)
3. Verify database state (optional but recommended for critical operations)

**Example**:
```typescript
test('should create a new user', async ({ userApi, userDb }) => {
  await allure.epic('User Management');
  await allure.feature('User Registration');
  
  // 1. API call
  await userApi.register({ username, email, password });
  
  // 2. Verify API response
  const loginResponse = await userApi.login({ username, password });
  expect(loginResponse.accessToken).toBeDefined();
  
  // 3. Verify database
  const dbUser = await userDb.getUserById(loginResponse.user.id);
  expect(dbUser?.username).toBe(username);
});
```

### E2E Testing Strategy

**Purpose**: Test user experience through browser automation.

**Approach**:
1. Use Page Object Model for UI interactions
2. Verify UI state (elements visible, text correct, navigation)
3. Use API/DB only for setup/cleanup (not for verification)

**Example**:
```typescript
test('should create a new todo', async ({ page }) => {
  await allure.epic('Todo Management');
  await allure.feature('Todo CRUD');
  
  const todoPage = new TodoPage(page);
  
  // UI interaction
  await todoPage.addTodo('Test Todo');
  
  // UI verification
  await expect(page.locator('text=Test Todo')).toBeVisible();
});
```

### Page Object Model

All UI interactions are encapsulated in Page Object classes located in `tests/page-object-modal/`.

**Benefits**:
- Reusable UI interaction code
- Easy maintenance when UI changes
- Clear separation of concerns

### Performance Testing Strategy

**Purpose**: Test system performance, capacity, and stability under various load conditions.

**Approach**:
1. **Smoke Tests** - Quick validation that system is accessible
2. **Load Tests** - Test normal expected load (10-50 concurrent users)
3. **Stress Tests** - Find breaking point and verify recovery (up to 50+ users)
4. **Spike Tests** - Test sudden traffic spikes (1 to 100 users)

**Tools**: k6 with TypeScript support

**Example**:
```typescript
import { Options } from 'k6/options';
import { login, getAllTodos } from '../helpers/api.helper';

export const options: Partial<Options> = {
  vus: 10,
  duration: '5m',
};

export default function () {
  const loginResponse = login('username', 'password');
  if (loginResponse) {
    getAllTodos(loginResponse.accessToken);
  }
}
```

See [tests/performance/README.md](tests/performance/README.md) for detailed documentation.

## ✨ Best Practices

### 1. Test Separation

- **API tests** focus on API contracts and database verification
- **E2E tests** focus on user experience and UI flows
- No duplication between API and E2E tests

### 2. Error Handling

- Test both success and error cases
- Verify proper HTTP status codes (400, 401, 403, 404, 500)
- Test edge cases and boundary conditions

### 3. Test Data Management

- Use unique test data (timestamps, random strings)
- Clean up test data after tests (afterAll hooks)
- Use factories for test data generation

### 4. Code Reusability

- Use service classes for API and DB operations
- Use Page Objects for UI interactions
- Share fixtures across tests

### 5. Maintainability

- TypeScript for type safety
- Clear naming conventions
- Comprehensive comments and documentation

### 6. Reporting

- Use Allure for professional reports
- Add screenshots for failed tests
- Attach request/response data for API tests
- Use tags for test categorization

## ⚙️ Configuration

### Playwright Configuration

Main configuration file: `playwright.config.ts`

Key settings:
- `testDir`: `./tests` - Test directory
- `timeout`: 30000ms - Test timeout
- `retries`: 1 (local) / 2 (CI) - Retry failed tests
- `projects`: Separate projects for API and E2E tests
- `reporter`: HTML + Allure reporters

### Environment Variables

See `.env.example` for all available environment variables.

## 🐛 Troubleshooting

### Tests Failing Due to Timeout

- Increase timeout in `playwright.config.ts`
- Check if application is running
- Verify database connection

### Database Connection Issues

- Verify `DB_URL` in `.env` file
- Check PostgreSQL is running
- Verify connection string format

### API Tests Failing

- Verify `API_URL` is correct
- Check if backend server is running
- Verify authentication tokens are valid

### E2E Tests Failing

- Verify `BASE_URL` is correct
- Check if frontend is running
- Verify browser is installed (`npx playwright install`)

### Allure Report Not Generating

- Ensure `allure-playwright` is installed
- Check that tests have run and generated results in `allure-results/`
- Verify Allure CLI is installed (for viewing reports)
- Try: `allure generate allure-results --clean -o allure-report`

## 📝 Notes

- All documentation and code comments are in English
- Test data is automatically cleaned up after tests
- Tests are designed to be independent and parallelizable
- Framework follows SDET best practices for enterprise applications
- HTML reports for Playwright tests (via Allure) and k6 HTML reports for performance tests

## 🤝 Contributing

When adding new tests:
1. Follow existing patterns (API vs E2E separation)
2. Use Page Object Model for UI tests
3. Add error handling tests
4. Clean up test data
5. Add Allure tags (epic, feature, story, severity)
6. Update documentation

## 📄 License

ISC
