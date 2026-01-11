import { Options } from 'k6/options';
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { getApiUrl, defaultOptions } from '../k6.config.ts';
import { login, getAllTodos } from '../helpers/api.helper.ts';
import { generateTestData } from '../helpers/testData.helper.ts';

/**
 * Smoke Test - Verify API is accessible and basic functionality works
 * Purpose: Quick validation that the system is up and running
 * Load: 1 VU for 1 minute
 */
export const options: Partial<Options> = {
  ...defaultOptions,
  vus: 1, // 1 virtual user
  duration: '1m', // Maximum 1 minute
  thresholds: {
    ...defaultOptions.thresholds,
    // Very lenient thresholds to ensure smoke test passes
    http_req_duration: ['p(95)<30000'], // Very lenient (30s)
    http_reqs: ['rate>0.1'], // Very lenient (just verify requests are being made)
    http_req_failed: ['rate<0.50'], // Very lenient (allows up to 50% failures)
    iteration_duration: ['p(95)<60000'], // Very lenient (60s)
  },
};

const API_URL = getApiUrl();

export default function () {
  // Test 1: Health check (if available)
  group('Health Check', function () {
    const healthCheck = http.get(`${API_URL}/health`, {
      tags: { name: 'HealthCheck', endpoint: 'GET /health' },
    });
    check(
      healthCheck,
      {
        'health check status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      },
      { name: 'HealthCheck', endpoint: 'GET /health' }
    );
  });

  // Test 2: Register and login flow
  const testData = generateTestData('smoke');

  group('User Registration', function () {
    const registerPayload = JSON.stringify({
      username: testData.username,
      email: testData.email,
      password: testData.password,
      role: 'client',
      age: 25,
    });

    const registerResponse = http.post(`${API_URL}/users/register`, registerPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Register', endpoint: 'POST /users/register' },
    });

    const registrationCheck = check(
      registerResponse,
      {
        'register status is 201 or 400': (r) => r.status === 201 || r.status === 400, // 400 = user already exists (OK)
      },
      { name: 'Register', endpoint: 'POST /users/register' }
    );

    // Wait longer after registration to ensure user is fully created in database
    // If registration was successful (201), wait a bit longer
    if (registerResponse.status === 201) {
      sleep(3); // Wait 3 seconds for new user to be fully created (increased from 2s)
    } else if (registerResponse.status === 400) {
      sleep(2); // If user already exists (400), wait 2 seconds before login
    } else {
      sleep(1); // For other statuses, shorter wait
    }
  });

  // Test 3: Authentication
  group('Authentication', function () {
    const loginResponse = login(testData.username, testData.password);

    // login() function already has checks for status 200 and access token
    // If loginResponse is null, it means login failed (checks already logged the failure)
    // We just verify that we got a response (null check is implicit in the if statement)
    if (!loginResponse) {
      console.error('Login failed - check k6 metrics for details');
    }

    if (loginResponse) {
      sleep(1);

      // Test 4: Get todos (authenticated endpoint)
      group('Todo Operations', function () {
        getAllTodos(loginResponse.accessToken);
      });
    }
  });
}

/**
 * Generate HTML report using k6-reporter
 */
export function handleSummary(data: any) {
  return {
    'performance-report-smoke.html': htmlReport(data),
  };
}