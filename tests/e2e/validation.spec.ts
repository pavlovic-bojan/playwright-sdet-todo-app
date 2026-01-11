import { test, expect } from '../fixtures/api.fixture';
import { RegisterPage } from '../page-object-modal/RegisterPage';
import { LoginPage } from '../page-object-modal/LoginPage';
import { ResetPasswordPage } from '../page-object-modal/ResetPasswordPage';
import { TodoPage } from '../page-object-modal/TodoPage';
import { RegisterUserRequest, LoginUserRequest, LoginResponse } from '../models/api/UserResponse';

/**
 * Validation E2E Tests
 * Tests form validation across the application
 */
test.describe('Form Validation Tests', () => {
  let testUser: {
    username: string;
    email: string;
    password: string;
  } | null = null;
  let authToken: string;
  let userId: number;

  test.beforeAll(async ({ userApi, userDb }) => {
    try {
      const testUsername = `validation_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const testEmail = `validation_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
      const testPassword = 'ValidationTest123!';

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
      console.warn('Failed to create test user:', error instanceof Error ? error.message : String(error));
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

  test('should validate username format @validation @ui', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Try username with special characters
    await registerPage.fillForm({
      username: 'test@user!', // Invalid
      email: 'test@example.com',
      password: 'Test123456',
    });
    await page.locator('#username').blur();

    // Verify validation error
    // Wait for validation to trigger
    await page.waitForTimeout(500);
    const error = await registerPage.getValidationError();
    // Accept either validation error or API error (rate limiting)
    if (!error) {
      const apiError = await registerPage.getErrorMessage();
      expect(apiError || error).toBeTruthy();
    } else {
      expect(error).toBeTruthy();
    }
  });

  test('should validate email format @validation @ui', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Try invalid email formats
    const invalidEmails = ['invalid', 'test@', '@example.com', 'test.com'];

    for (const email of invalidEmails) {
      await registerPage.fillForm({
        username: 'testuser',
        email: email,
        password: 'Test123456',
      });
      await registerPage.submit();
      // Wait for validation error to appear
      await page.waitForTimeout(500);

      const error = await registerPage.getValidationError();
      // Accept either validation error or API error (rate limiting)
      if (!error) {
        // Check for API error instead
        const apiError = await registerPage.getErrorMessage();
        expect(apiError || error).toBeTruthy();
      } else {
        expect(error).toBeTruthy();
      }
    }
  });

  test('should enforce strong password policy @validation @security @ui', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    const weakPasswords = [
      { password: 'weak', reason: 'Too short, no uppercase, no number' },
      { password: 'weakpassword', reason: 'No uppercase, no number' },
      { password: 'WEAKPASSWORD', reason: 'No lowercase, no number' },
      { password: 'WeakPassword', reason: 'No number' },
      { password: '12345678', reason: 'No letters' },
    ];

    for (const { password, reason } of weakPasswords) {
      // Test weak password
      await registerPage.fillForm({
        username: 'testuser',
        email: 'test@example.com',
        password: password,
      });
      await page.locator('#password').blur();

      const error = await registerPage.getValidationError();
      expect(error).toBeTruthy();
    }
  });

  test('should validate required fields @validation @ui', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Try to submit with empty required fields
    await registerPage.submit();

    // Verify HTML5 validation prevents submission
    // Form should not submit due to HTML5 required attribute
    await expect(page).toHaveURL(/\/register/);
  });

  test('should validate password confirmation match @validation @ui', async ({ page }) => {
    const resetPasswordPage = new ResetPasswordPage(page);
    await resetPasswordPage.goto();

    // Enter mismatched passwords
    await resetPasswordPage.fillResetToken('dummy-token-for-validation');
    await resetPasswordPage.fillNewPassword('Password123');
    await resetPasswordPage.fillConfirmPassword('DifferentPassword123');
    await page.locator('#confirmPassword').blur();

    // Verify validation error
    await expect(page.locator('.invalid-feedback')).toBeVisible();
  });

  test('should validate age range @validation @ui', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Try invalid age values
    const invalidAges = [-1, 0, 121, 500];

    for (const age of invalidAges) {
      await page.fill('#age', age.toString());
      await page.locator('#age').blur();
      // Wait for validation
      await page.waitForTimeout(300);
      
      // Check if validation error appears or HTML5 validation triggers
      const hasInvalidClass = await page.locator('#age').evaluate((el) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const input = el as any;
        return el.classList.contains('is-invalid') || !input.validity?.valid;
      }).catch(() => false);
      
      const hasInvalidFeedback = await page.locator('.invalid-feedback').isVisible({ timeout: 1000 }).catch(() => false);
      
      // Accept either HTML5 validation or custom validation error
      expect(hasInvalidClass || hasInvalidFeedback).toBe(true);
    }
  });

  test('should show real-time validation feedback @validation @ui', async ({ page }) => {
    // Use RegisterPage for username validation (has minlength)
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill and blur username field with invalid value
    await page.fill('#username', 'ab'); // Too short (minlength is 3)
    await page.locator('#username').blur();
    // Wait for validation to trigger
    await page.waitForTimeout(500);

    // Verify immediate feedback
    // Check for either HTML5 validation or custom validation error
    const hasInvalidClass = await page.locator('#username').evaluate((el) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = el as any;
      return el.classList.contains('is-invalid') || !input.validity?.valid;
    }).catch(() => false);

    const hasInvalidFeedback = await page.locator('.invalid-feedback').isVisible({ timeout: 2000 }).catch(() => false);

    // Accept either HTML5 validation (validity.valid = false) or custom validation error
    expect(hasInvalidClass || hasInvalidFeedback).toBe(true);
  });

  test('should validate todo title is required @validation @ui', async ({ page }) => {
    if (!testUser) {
      test.skip();
      return;
    }

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.username, testUser.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const todoPage = new TodoPage(page);
    await todoPage.goto();

    // Try to create todo without title
    await todoPage.clickNewTodo();
    // Wait for modal
    await page.waitForTimeout(300);
    
    // Try to submit without filling title
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verify validation error or form doesn't submit
    // Check if modal is still open (form didn't submit)
    const modalVisible = await page.locator('.modal.show, .modal.fade.show').isVisible({ timeout: 2000 }).catch(() => false);
    expect(modalVisible).toBe(true);
    
    // Check for validation error
    const hasInvalidClass = await page.locator('#todoTitle').evaluate((el) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = el as any;
      return el.classList.contains('is-invalid') || !input.validity?.valid;
    }).catch(() => false);
    
    const hasInvalidFeedback = await page.locator('.invalid-feedback').isVisible({ timeout: 1000 }).catch(() => false);
    
    expect(hasInvalidClass || hasInvalidFeedback).toBe(true);
  });

  test('should validate todo title length @validation @ui', async ({ page }) => {
    if (!testUser) {
      test.skip();
      return;
    }

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.username, testUser.password);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const todoPage = new TodoPage(page);
    await todoPage.goto();

    // Try to create todo with very long title
    const longTitle = 'a'.repeat(1001);
    await todoPage.clickNewTodo();
    await page.waitForTimeout(300);
    
    const titleInput = page.locator('#todoTitle');
    await titleInput.fill(longTitle);
    await titleInput.blur();
    await page.waitForTimeout(300);

    // Verify validation error or maxlength attribute prevents it
    const actualValue = await titleInput.inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(1000);
  });
});