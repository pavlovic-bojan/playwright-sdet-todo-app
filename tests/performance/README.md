# Performance Testing with k6

This directory contains performance tests using k6 with TypeScript support, following k6 best practices.

## 📁 Structure

```
tests/performance/
├── smoke/              # Smoke tests - Quick validation
│   └── api-smoke.test.ts
├── load/               # Load tests - Normal expected load
│   └── api-load.test.ts
├── stress/             # Stress tests - Beyond normal capacity
│   └── api-stress.test.ts
├── spike/              # Spike tests - Sudden traffic spikes
│   └── api-spike.test.ts
└── helpers/            # Reusable helper functions
    ├── api.helper.ts    # API interaction helpers with custom metrics
    └── testData.helper.ts # Test data management with SharedArray
```

## 🚀 Quick Start

### Prerequisites

1. **Install k6**: 
   ```bash
   # macOS
   brew install k6
   
   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D9
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   
   # Windows (using Chocolatey)
   choco install k6
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Running Tests

```bash
# Smoke test (quick validation) - generates HTML report
npm run test:performance:smoke

# Load test (normal expected load) - generates HTML report
npm run test:performance:load

# Stress test (beyond normal capacity) - generates HTML report
npm run test:performance:stress

# Spike test (sudden traffic spikes) - generates HTML report
npm run test:performance:spike

# All performance tests
npm run test:performance:all
```

## 📊 HTML Reports

k6 performance test results are **automatically generated as HTML reports** using `k6-reporter`.

### How It Works

1. k6 runs the test and executes the test script
2. At the end, `handleSummary()` function is called
3. HTML report is generated using `k6-reporter` library
4. Report is saved as `performance-report-*.html` in the project root

### Viewing Results

1. After running tests, HTML reports are automatically generated:
   - `performance-report-smoke.html`
   - `performance-report-load.html`
   - `performance-report-stress.html`
   - `performance-report-spike.html`

2. Open reports in your browser:
   ```bash
   # List all reports
   npm run test:performance:report
   
   # Open all reports (macOS)
   npm run test:performance:report:open
   
   # Or open manually
   open performance-report-smoke.html
   open performance-report-load.html
   ```

3. Each HTML report includes:
   - Request statistics (duration, rate, failures)
   - Threshold results
   - Custom metrics
   - Summary statistics
   - Visual charts and graphs

## 📊 Test Types

### 1. Smoke Test
- **Purpose**: Quick validation that the system is up and running
- **Load**: 1 VU for 1 minute
- **Use Case**: Verify basic functionality before running heavier tests

### 2. Load Test
- **Purpose**: Test system performance under normal expected load
- **Load**: Gradually ramp up to 10 VUs over 5 minutes
- **Use Case**: Verify system can handle expected user traffic

### 3. Stress Test
- **Purpose**: Find the breaking point and verify system recovery
- **Load**: Gradually increase from 10 to 50 VUs, then back down
- **Use Case**: Identify maximum capacity and recovery behavior

### 4. Spike Test
- **Purpose**: Test system response to sudden traffic spikes
- **Load**: Sudden spike from 1 to 100 VUs, then back to 1
- **Use Case**: Verify system can handle viral traffic or marketing campaigns

## ✨ Best Practices Implemented

### 1. **SharedArray for Test Data**
- Pre-generates test data once and shares across all VUs
- More memory efficient than generating data in each VU
- See `helpers/testData.helper.ts`

### 2. **Group() for Logical Request Grouping**
- Groups related requests together (e.g., "User Registration", "Authentication")
- Better metric organization and readability
- Example:
  ```typescript
  group('Authentication', function () {
    const loginResponse = login(username, password);
    // ...
  });
  ```

### 3. **Custom Metrics**
- `login_duration` - Tracks login request duration
- `todo_creation_duration` - Tracks todo creation duration
- `login_success_rate` - Tracks login success rate
- See `helpers/api.helper.ts`

### 4. **Tags for Metric Organization**
- Tags requests with `name` and `endpoint` for better filtering
- Enables per-endpoint thresholds
- Example:
  ```typescript
  http.get(url, {
    tags: { name: 'GetAllTodos', endpoint: 'GET /todos' }
  });
  ```

### 5. **Per-Endpoint Thresholds**
- Different thresholds for different endpoints
- More realistic than global thresholds
- Example:
  ```typescript
  thresholds: {
    'http_req_duration{name:Login}': ['p(95)<2000'],
    'http_req_duration{name:GetAllTodos}': ['p(95)<1000'],
  }
  ```

### 6. **Realistic User Behavior**
- Uses `sleep()` to simulate think time between requests
- Mimics real user behavior patterns
- Example:
  ```typescript
  sleep(1); // Wait 1 second (think time)
  ```

### 7. **Comprehensive Thresholds**
- Multiple threshold types (duration, error rate, request rate)
- Per-endpoint and global thresholds
- Custom metric thresholds

### 8. **TypeScript Type Safety**
- Full TypeScript support for type safety
- Interface definitions for API responses
- Better IDE support and error detection

### 9. **HTML Report Generation**
- Automatic HTML report generation using k6-reporter
- Professional visual reports with charts and statistics
- Easy to share and view in any browser

## ⚙️ Configuration

### Environment Variables

Set these in your `.env` file or as environment variables:

```bash
API_URL=https://todo-app-xhn2.onrender.com/api
BASE_URL=https://todo-app-frontend-seven-rho.vercel.app
```

### Thresholds

Default thresholds are defined in `k6.config.ts`:

- **http_req_duration**: Response time thresholds (p95 < 2s)
- **http_req_failed**: Error rate thresholds (< 1%)
- **http_reqs**: Request rate thresholds (> 10 req/s)
- **iteration_duration**: Complete iteration duration (p95 < 5s)

You can override these in individual test files.

## 📈 Understanding Results

### k6 Console Output

k6 provides detailed metrics in the console:

- **http_req_duration**: Request duration (avg, min, max, p90, p95, p99)
- **http_req_failed**: Failed request rate
- **http_reqs**: Total requests and rate
- **vus**: Virtual users
- **iterations**: Total test iterations
- **Custom metrics**: login_duration, todo_creation_duration, login_success_rate

### HTML Report

Performance tests generate HTML reports with:
- Test name and execution summary
- Performance metrics with visual charts
- Threshold results (passed/failed)
- Check results (passed/failed)
- Request statistics (duration, rate, failures)
- Custom metrics visualization

### Example k6 Output

```
✓ login status is 200
✓ login response time < 2s
✓ login returns access token
✓ get todos status is 200
✓ get todos response time < 1s

checks.........................: 100.00% ✓ 400      ✗ 0
data_received..................: 2.5 MB  8.3 kB/s
data_sent......................: 1.2 MB  4.0 kB/s
http_req_duration..............: avg=450ms min=120ms med=380ms max=2100ms p(90)=850ms p(95)=1200ms
http_req_failed................: 0.00%   ✓ 0        ✗ 100
http_reqs......................: 100     0.33/s
iteration_duration.............: avg=1.2s min=0.5s med=1.0s max=3.5s
iterations.....................: 100     0.33/s
vus............................: 1       min=1      max=1
login_duration.................: avg=380ms min=120ms med=350ms max=1800ms
login_success_rate.............: 100.00% ✓ 100      ✗ 0
```

## 🔧 Customization

### Creating Custom Tests

1. Create a new test file in the appropriate directory
2. Import helpers from `../helpers/api.helper.ts` and `../helpers/testData.helper.ts`
3. Use `group()` for logical request grouping
4. Use `sleep()` for realistic user behavior
5. Define your options and test function
6. Add `handleSummary()` function for HTML report generation

Example:

```typescript
import { Options } from 'k6/options';
import { group, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { defaultOptions } from '../k6.config.ts';
import { login, getAllTodos } from '../helpers/api.helper.ts';
import { getTestUser } from '../helpers/testData.helper.ts';

export const options: Partial<Options> = {
  ...defaultOptions,
  vus: 5,
  duration: '2m',
};

export default function () {
  const testUser = getTestUser(__VU);
  
  group('Authentication', function () {
    const loginResponse = login(testUser.username, testUser.password);
    sleep(1);
    
    if (loginResponse) {
      group('Todo Operations', function () {
        getAllTodos(loginResponse.accessToken);
        sleep(2);
      });
    }
  });
}

export function handleSummary(data: any) {
  return {
    'performance-report-custom.html': htmlReport(data),
  };
}
```

Then add to `package.json`:
```json
"test:performance:custom": "k6 run --insecure-skip-tls-verify tests/performance/custom/api-custom.test.ts"
```

## 🎯 Best Practices Summary

1. **Start with smoke tests** - Always verify basic functionality first
2. **Use SharedArray** - For efficient test data sharing
3. **Use group()** - For logical request grouping
4. **Use tags** - For better metric organization
5. **Use custom metrics** - For domain-specific observability
6. **Gradual ramp-up** - Use stages to gradually increase load
7. **Set realistic thresholds** - Based on your SLA requirements
8. **Add think time** - Use sleep() to simulate real user behavior
9. **Monitor system resources** - Watch CPU, memory, and database during tests
10. **Test in production-like environment** - Use staging environment that mirrors production
11. **Document findings** - Keep track of performance baselines and degradation
12. **Use HTML reports** - Professional visual reports for performance metrics

## 📚 Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 TypeScript Support](https://k6.io/docs/using-k6/typescript/)
- [k6 Best Practices](https://k6.io/docs/using-k6/best-practices/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [k6 HTML Reporter](https://github.com/benc-uk/k6-reporter)
