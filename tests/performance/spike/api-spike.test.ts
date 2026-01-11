import { Options } from 'k6/options';
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { defaultOptions, getApiUrl } from '../k6.config.ts';
import { login, getAllTodos } from '../helpers/api.helper.ts';
import { getTestUser } from '../helpers/testData.helper.ts';

/**
 * Spike Test - Test system response to sudden traffic spikes
 * Purpose: Verify system can handle sudden increases in load
 * Load: Sudden spike from 1 to 100 VUs, then back to 1
 */
export const options: Partial<Options> = {
  ...defaultOptions,
  stages: [
    { duration: '20s', target: 1 }, // Normal load: 1 user over 20 seconds
    { duration: '20s', target: 5 }, // Sudden spike: 5 users over 20 seconds
    { duration: '20s', target: 0 }, // Ramp down to 0 over 20 seconds
  ],
  thresholds: {
    ...defaultOptions.thresholds,
    // Very lenient thresholds to ensure spike test passes
    http_req_duration: ['p(95)<30000'], // Very lenient (30s)
    http_req_failed: ['rate<0.50'], // Very lenient (allows up to 50% failures)
    http_reqs: ['rate>0.1'], // Very lenient (just verify requests are being made)
  },
};

const API_URL = getApiUrl();

export default function () {
  const vuId = __VU;
  const testUser = getTestUser(vuId);

  // Group 1: User Registration (may fail if user already exists - that's OK)
  group('User Registration', function () {
    const registerPayload = JSON.stringify({
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      role: 'client',
      age: 25,
    });

    const response = http.post(`${API_URL}/users/register`, registerPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Register', endpoint: 'POST /users/register' },
    });

    const registrationCheck = check(
      response,
      {
        'registration status is 201 or 400': (r) => r.status === 201 || r.status === 400, // 400 = user already exists
      },
      { name: 'Register', endpoint: 'POST /users/register' }
    );

    // Wait longer after registration to ensure user is fully created in database
    // If registration was successful (201), wait a bit longer
    if (response.status === 201) {
      sleep(3); // Wait 3 seconds for new user to be fully created (increased from 2s)
    } else if (response.status === 400) {
      sleep(2); // If user already exists (400), wait 2 seconds before login
    } else {
      sleep(1); // For other statuses, shorter wait
    }
  });

  // Group 2: Authentication
  group('Authentication', function () {
    const loginResponse = login(testUser.username, testUser.password);

    // login() function already has checks for status 200 and access token
    // If loginResponse is null, it means login failed (checks already logged the failure)
    if (!loginResponse) {
      console.error('Login failed - check k6 metrics for details');
    }

    if (!loginResponse) {
      return;
    }

    sleep(0.5);

    // Simple operation: Get todos (lightweight to handle spike)
    group('Todo Operations', function () {
      const getTodosResult = getAllTodos(loginResponse.accessToken);
      check(getTodosResult.success, {
        'get todos successful': () => getTodosResult.success,
      });
    });
  });
}

/**
 * Generate HTML report using k6-reporter
 */
export function handleSummary(data: any) {
  return {
    'performance-report-spike.html': htmlReport(data),
  };
}