import { SharedArray } from 'k6/data';

/**
 * Test Data Helper for k6 Performance Tests
 * Uses SharedArray for efficient data sharing across VUs
 */

export interface TestUser {
  username: string;
  email: string;
  password: string;
}

/**
 * Pre-generated test users (shared across all VUs)
 * This is more efficient than generating data in each VU
 */
export const testUsers = new SharedArray<TestUser>('testUsers', function () {
  const users: TestUser[] = [];
  const baseTimestamp = Date.now();

  // Generate 100 test users upfront
  for (let i = 0; i < 100; i++) {
    users.push({
      username: `perf_user_${baseTimestamp}_${i}`,
      email: `perf_${baseTimestamp}_${i}@example.com`,
      password: 'TestPassword123!',
    });
  }

  return users;
});

/**
 * Get a test user for the current VU
 * Uses VU ID to ensure each VU gets a unique user
 */
export function getTestUser(vuId: number): TestUser {
  const index = (vuId - 1) % testUsers.length;
  return testUsers[index];
}

/**
 * Generate unique test data on the fly (for dynamic scenarios)
 */
export function generateTestData(prefix: string = 'perf'): TestUser {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return {
    username: `${prefix}_${timestamp}_${random}`,
    email: `${prefix}_${timestamp}_${random}@example.com`,
    password: 'TestPassword123!',
  };
}

