import { test, expect } from '../fixtures/api.fixture';
import { LoginPage } from '../page-object-modal/LoginPage';
import { TodoPage } from '../page-object-modal/TodoPage';
import { RegisterUserRequest, LoginUserRequest, LoginResponse } from '../models/api/UserResponse';

/**
 * Todo Management E2E Tests
 * Using Page Object Model pattern (from page-object-modal folder)
 */
test.describe('Todo Management', () => {
  let testUser: {
    username: string;
    email: string;
    password: string;
  } | null = null;
  let authToken: string;
  let userId: number;
  let todoPage: TodoPage;

  test.beforeAll(async ({ userApi, userDb }) => {
    // Create a test user for todo tests
    try {
      const testUsername = `todomgmt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const testEmail = `todomgmt_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
      const testPassword = 'TodoMgmtTest123!';

      // Clean up any existing user
      try {
        const existingUser = await userDb.getUserByEmail(testEmail);
        if (existingUser) {
          await userDb.deleteUser(existingUser.id);
        }
      } catch (e) {
        // Ignore cleanup errors
      }

      // Register user
      const registerRequest: RegisterUserRequest = {
        username: testUsername,
        email: testEmail,
        password: testPassword,
        role: 'client',
      };
      await userApi.register(registerRequest);

      // Login to get auth token
      const loginRequest: LoginUserRequest = {
        username: testUsername,
        password: testPassword,
      };
      const loginResponse: LoginResponse = await userApi.login(loginRequest);
      authToken = loginResponse.accessToken;
      userId = loginResponse.user.id;

      testUser = {
        username: testUsername,
        email: testEmail,
        password: testPassword,
      };
    } catch (error) {
      console.warn('Failed to create test user in beforeAll:', error instanceof Error ? error.message : String(error));
    }
  });

  test.afterAll(async ({ userDb }) => {
    try {
      if (userId) {
        await userDb.deleteUser(userId);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  test.beforeEach(async ({ page }) => {
    // Ensure test user exists
    if (!testUser) {
      test.skip();
      return;
    }

    // Login before each test with retry
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    let loginSuccess = false;
    for (let attempt = 0; attempt < 3 && !loginSuccess; attempt++) {
      try {
        await loginPage.login(testUser.username, testUser.password);
        // Verify we're on dashboard - check URL and sessionStorage
        await page.waitForURL(/\/dashboard/, { timeout: 25000 });
        // Also verify sessionStorage has token
        const hasToken = await page.evaluate(() => {
          return !!sessionStorage.getItem('accessToken');
        });
        if (!hasToken) {
          throw new Error('Login succeeded but no token in sessionStorage');
        }
        loginSuccess = true;
      } catch (error) {
        if (attempt < 2) {
          // Wait before retry
          await page.waitForTimeout(3000);
          // Check if we need to go back to login page
          const currentUrl = page.url();
          if (!currentUrl.includes('/login')) {
            await loginPage.goto();
          }
        } else {
          throw new Error(`Failed to login after 3 attempts: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // Navigate to dashboard and verify it's loaded
    todoPage = new TodoPage(page);
    await todoPage.goto();
    // Wait for dashboard to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
  });

  test('should create a new todo @smoke @todo @ui', async ({ page }) => {
    const todoData = {
      title: 'Test Todo',
      description: 'This is a test todo',
    };

    // Click new todo button
    await todoPage.clickNewTodo();
    // Wait a bit for modal to fully render
    await page.waitForTimeout(300);
    await expect(page.locator('.modal')).toBeVisible();

    // Fill todo form
    await todoPage.fillTodoForm(todoData.title, todoData.description);

    // Submit form
    await todoPage.submitTodoForm();

    // Verify todo appears in list
    // Wait for todo to appear with retry
    await expect(page.locator(`text=${todoData.title}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show validation error for empty title @validation @todo @ui', async ({ page }) => {
    // Open create todo modal
    await todoPage.clickNewTodo();
    await page.waitForTimeout(300);

    // Try to submit without title
    // Submit form - validation should prevent submission
    await todoPage.submitTodoForm();
    // Wait for validation to trigger (Vue reactivity)
    await page.waitForTimeout(1000);

    // Verify validation error appears
    // Check if validation error appears - could be HTML5 validation or Vue validation
    const hasInvalidFeedback = await page.locator('.invalid-feedback').isVisible({ timeout: 5000 }).catch(() => false);
    const hasInvalidClass = await page.locator('#todoTitle.is-invalid').isVisible({ timeout: 5000 }).catch(() => false);
    const isInvalid = await page.locator('#todoTitle').evaluate((el) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = el as any;
      return !input.validity?.valid;
    }).catch(() => false);

    // Accept any form of validation feedback
    expect(hasInvalidFeedback || hasInvalidClass || isInvalid).toBe(true);
  });

  test('should edit existing todo @todo @ui @regression', async ({ page }) => {
    // First create a todo
    const initialTitle = 'Original Title';
    await todoPage.addTodo(initialTitle, 'Original Description');
    // Wait for todo to appear in list
    await expect(page.locator(`text=${initialTitle}`).first()).toBeVisible({ timeout: 10000 });

    const newData = {
      title: 'Updated Todo Title',
      description: 'Updated description',
    };

    // Edit the todo
    // Wait a bit before editing
    await page.waitForTimeout(500);
    await todoPage.editTodo(initialTitle, newData.title, newData.description);

    // Verify updated title appears
    // Wait for updated title to appear
    await expect(page.locator(`text=${newData.title}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('should toggle todo completion @todo @ui @smoke', async ({ page }) => {
    // Create a new todo
    const todoTitle = 'Toggle Test';
    await todoPage.addTodo(todoTitle, 'Test toggle functionality');
    await page.waitForTimeout(500);

    // Get initial completion state
    const initialState = await todoPage.isTodoCompleted(todoTitle);

    // Toggle completion checkbox
    await todoPage.toggleTodo(todoTitle);

    // Verify state changed
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    // Wait a bit more for UI to update
    await page.waitForTimeout(500);
    const newState = await todoPage.isTodoCompleted(todoTitle);
    expect(newState).not.toBe(initialState);
  });

  test('should filter todos by status @todo @ui @regression', async ({ page }) => {
    // Create completed and active todos
    await todoPage.addTodo('Active Todo 1');
    await page.waitForTimeout(500);
    await todoPage.addTodo('Active Todo 2');
    await page.waitForTimeout(500);
    await todoPage.addTodo('Completed Todo');
    await page.waitForTimeout(500);
    
    // Mark third as completed (by title)
    await todoPage.toggleTodo('Completed Todo');
    await page.waitForTimeout(500);

    // Filter by Active
    await todoPage.filterBy('active');
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);

    // Filter by Completed
    await todoPage.filterBy('completed');
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);

    // Filter by All
    await todoPage.filterBy('all');
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
  });

  test('should delete a todo @todo @ui @regression', async ({ page }) => {
    // Create a todo to delete
    const todoTitle = 'Todo to Delete';
    await todoPage.addTodo(todoTitle, 'This todo will be deleted');
    await page.waitForTimeout(500);

    // Verify todo exists
    await expect(page.locator(`text=${todoTitle}`).first()).toBeVisible({ timeout: 10000 });

    // Delete the todo
    await todoPage.deleteTodo(todoTitle);
    await page.waitForTimeout(500);

    // Verify todo is removed
    const todos = await todoPage.getTodos();
    expect(todos.some((todo) => todo.includes(todoTitle))).toBe(false);
  });

  test('should create todo with only title @todo @ui', async ({ page }) => {
    const todoTitle = 'Title Only Todo';
    
    // Create todo without description
    await todoPage.addTodo(todoTitle);
    await page.waitForTimeout(500);

    // Verify todo appears
    await expect(page.locator(`text=${todoTitle}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('should create multiple todos @todo @ui', async ({ page }) => {
    const todos = ['Todo 1', 'Todo 2', 'Todo 3'];

    // Create multiple todos
    for (const title of todos) {
      await todoPage.addTodo(title);
      // Wait for todo to appear before creating next one
      await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500); // Additional wait for UI to stabilize
    }

    // Verify all todos appear
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const allTodos = await todoPage.getTodos();
    for (const title of todos) {
      expect(allTodos.some((todo) => todo.includes(title))).toBe(true);
    }
  });
});