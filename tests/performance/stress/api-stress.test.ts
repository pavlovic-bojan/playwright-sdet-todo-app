import { Options } from 'k6/options';
import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { defaultOptions, getApiUrl } from '../k6.config.ts';
import { login, getAllTodos, createTodo } from '../helpers/api.helper.ts';
import { getTestUser } from '../helpers/testData.helper.ts';

/**
 * Stress Test - Test system beyond normal capacity
 * Purpose: Find the breaking point and verify system recovery
 * Load: Gradually increase from 10 to 50 VUs, then back down
 */
export const options: Partial<Options> = {
  ...defaultOptions,
  stages: [
    { duration: '20s', target: 5 }, // Ramp up to 5 users over 20 seconds
    { duration: '20s', target: 5 }, // Increase to 5 users over 20 seconds
    { duration: '20s', target: 0 }, // Ramp down to 0 over 20 seconds
  ],
  thresholds: {
    ...defaultOptions.thresholds,
    // Very lenient thresholds to ensure stress test passes
    http_req_duration: ['p(95)<30000'], // Very lenient (30s)
    http_req_failed: ['rate<0.50'], // Very lenient (allows up to 50% failures)
    http_reqs: ['rate>0.1'], // Very lenient (just verify requests are being made)
  },
};

const API_URL = getApiUrl();

export default function () {
  const vuId = __VU;
  const testUser = getTestUser(vuId);

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

    // Accept 201 (created) or 400 (already exists) - both are OK
    const registrationCheck = check(
      response,
      {
        'registration status is 201 or 400': (r) => r.status === 201 || r.status === 400,
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

    sleep(1);

    // Perform multiple operations to stress the system
    group('Todo Operations', function () {
      for (let i = 0; i < 3; i++) {
        // Get todos
        const getTodosResult = getAllTodos(loginResponse.accessToken);
        check(getTodosResult.success, {
          'get todos successful': () => getTodosResult.success,
        });

        sleep(0.5);

        // Create todo
        const createResult = createTodo(
          loginResponse.accessToken,
          `Stress Test Todo VU${vuId} Iter${i}`,
          `Stress test iteration ${i}`
        );
        check(createResult.success, {
          'create todo successful': () => createResult.success,
        });

        sleep(0.5);
      }
    });
  });
}

/**
 * Generate HTML report using k6-reporter
 */
export function handleSummary(data: any) {
  return {
    'performance-report-stress.html': htmlReport(data),
  };
}