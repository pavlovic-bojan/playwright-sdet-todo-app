/**
 * Test Data Factory
 * Provides helper functions for generating test data
 */

export interface TestUser {
  username: string;
  email: string;
  password: string;
  role?: 'client' | 'admin';
  age?: number;
}

export interface TestTodo {
  title: string;
  description?: string;
}

/**
 * Generate a unique username
 */
export function generateUsername(prefix: string = 'testuser'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate a unique email
 */
export function generateEmail(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Generate a test user object
 */
export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  return {
    username: generateUsername(),
    email: generateEmail(),
    password: 'TestPassword123!',
    role: 'client',
    age: 25,
    ...overrides,
  };
}

/**
 * Generate a test todo object
 */
export function createTestTodo(overrides?: Partial<TestTodo>): TestTodo {
  return {
    title: `Test Todo ${Date.now()}`,
    description: 'This is a test todo description',
    ...overrides,
  };
}

/**
 * Generate multiple test todos
 */
export function createTestTodos(count: number, prefix: string = 'Todo'): TestTodo[] {
  return Array.from({ length: count }, (_, i) => ({
    title: `${prefix} ${i + 1} - ${Date.now()}`,
    description: `Description for ${prefix} ${i + 1}`,
  }));
}

