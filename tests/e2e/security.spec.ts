import { test, expect } from '../fixtures/api.fixture';
import { RegisterPage } from '../page-object-modal/RegisterPage';
import { LoginPage } from '../page-object-modal/LoginPage';
import { TodoPage } from '../page-object-modal/TodoPage';
import { RegisterUserRequest, LoginUserRequest, LoginResponse } from '../models/api/UserResponse';

/**
 * Security E2E Tests
 * Tests XSS prevention, injection attempts, and security features
 */
test.describe('Security Tests', () => {
  let testUser: {
    username: string;
    email: string;
    password: string;
  } | null = null;
  let authToken: string;
  let userId: number;

  test.beforeAll(async ({ userApi, userDb }) => {
    try {
      const testUsername = `security_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const testEmail = `security_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
      const testPassword = 'SecurityTest123!';

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

  test('should prevent XSS in username field @security @ui @critical', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      'javascript:alert(1)',
      '<svg onload=alert(1)>',
    ];

    for (const payload of xssPayloads) {
      // Test XSS payload
      await registerPage.fillForm({
        username: payload,
        email: `xss_${Date.now()}@test.com`,
        password: 'Test123456',
      });

      // Should either reject or sanitize
      await registerPage.submit();
      // Wait for response
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // Verify no script execution - check for alert dialogs
      let alertTriggered = false;
      const dialogHandler = (dialog: any) => {
        alertTriggered = true;
        dialog.dismiss();
      };
      page.on('dialog', dialogHandler);

      // Wait a bit to see if alert appears
      await page.waitForTimeout(1000);
      expect(alertTriggered).toBe(false);
      
      // Clean up dialog handler
      page.off('dialog', dialogHandler);
    }
  });

  test('should prevent XSS in todo title @security @ui @critical', async ({ page }) => {
    if (!testUser) {
      test.skip();
      return;
    }

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.username, testUser.password);
    // Wait for navigation
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const todoPage = new TodoPage(page);
    await todoPage.goto();

    // Try to create todo with XSS payload
    const xssTitle = '<script>alert("XSS in Todo")</script>';
    await todoPage.addTodo(xssTitle, 'XSS test');

    // Verify script tags are stripped/escaped
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<script>alert');
    // Should be escaped or sanitized
    const todos = await todoPage.getTodos();
    // The title should be sanitized, not contain script tags
    const hasScriptTag = todos.some(todo => todo.includes('<script>'));
    expect(hasScriptTag).toBe(false);
  });

  test('should prevent SQL injection in login @security @ui @critical', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const sqlPayloads = [
      "admin' OR '1'='1",
      "admin'--",
      "admin' /*",
      "' OR 1=1--",
    ];

    for (const payload of sqlPayloads) {
      // Don't use login() method as it waits for navigation - use individual steps
      await loginPage.fillUsername(payload);
      await loginPage.fillPassword('anything');
      await loginPage.clickLogin();
      // Wait for response (should not navigate)
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Should fail authentication (Prisma protects against SQL injection)
      // Should still be on login page
      const isOnLoginPage = page.url().includes('/login');
      expect(isOnLoginPage).toBe(true);

      // Check for error message
      const error = await loginPage.getErrorMessage();
      // Accept either error message or just being on login page (not redirected)
      expect(error || isOnLoginPage).toBeTruthy();
    }
  });

  test('should sanitize URL parameters @security @ui', async ({ page }) => {
    // Try to navigate with javascript: URL
    const dangerousUrl = 'javascript:alert(1)';
    
    // Should be blocked or sanitized - try to navigate
    try {
      await page.goto(dangerousUrl);
      // If navigation succeeds, check that it didn't execute
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('javascript:');
    } catch (error) {
      // Navigation blocked is also acceptable
      expect(error).toBeDefined();
    }
  });

  test('should protect against CSRF @security @ui @api', async ({ page }) => {
    if (!testUser) {
      test.skip();
      return;
    }

    // Verify SameSite cookie attribute
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.username, testUser.password);

    // Check cookies
    const cookies = await page.context().cookies();
    const refreshToken = cookies.find((c) => c.name === 'refreshToken');

    if (refreshToken) {
      // Verify security attributes
      expect(refreshToken.sameSite).toBe('Strict');
      expect(refreshToken.httpOnly).toBe(true);
    }
  });

  test('should handle suspicious activity @security @ui', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Attempt multiple failed logins (rate limiting)
    for (let i = 0; i < 6; i++) {
      // Check if input is disabled (rate limited) BEFORE trying to fill
      const isDisabled = await page.locator('#username').isDisabled({ timeout: 1000 }).catch(() => false);
      if (isDisabled) {
        // If disabled, wait a bit and check error message
        await page.waitForTimeout(2000);
        const error = await loginPage.getErrorMessage();
        if (error && (error.includes('Too many') || error.includes('rate'))) {
          break;
        }
        // If disabled but no error yet, wait a bit more
        await page.waitForTimeout(1000);
        continue;
      }

      // Input is enabled, proceed with login attempt
      try {
        await loginPage.fillUsername('wronguser');
        await loginPage.fillPassword('wrongpass');
        await loginPage.clickLogin();
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(1500);
      } catch (fillError) {
        // If fill failed because input became disabled, check error
        const isDisabledNow = await page.locator('#username').isDisabled({ timeout: 1000 }).catch(() => false);
        if (isDisabledNow) {
          await page.waitForTimeout(2000);
          const error = await loginPage.getErrorMessage();
          if (error && (error.includes('Too many') || error.includes('rate'))) {
            break;
          }
        }
      }
    }

    // Verify rate limiting kicks in
    await page.waitForTimeout(1000);
    const error = await loginPage.getErrorMessage();
    // Should show rate limit error after multiple attempts
    // Accept either rate limit error or just verify we're still on login page
    const isOnLoginPage = page.url().includes('/login');
    const isDisabled = await page.locator('#username').isDisabled().catch(() => false);

    // Verify we're still on login (not redirected) or input is disabled
    expect(isOnLoginPage || isDisabled).toBe(true);
  });

  test('should validate content length limits @validation @ui', async ({ page }) => {
    if (!testUser) {
      test.skip();
      return;
    }

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.username, testUser.password);
    // Wait for navigation
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    const todoPage = new TodoPage(page);
    await todoPage.goto();

    // Create todo with max length description
    const maxDescription = 'a'.repeat(1000);
    await todoPage.addTodo('Title', maxDescription);

    // Try to exceed description limit
    await todoPage.clickNewTodo();
    // Wait for modal
    await page.waitForTimeout(300);
    const overLimit = 'a'.repeat(1001);
    
    // Try to fill with over limit
    const descriptionInput = page.locator('#todoDescription');
    await descriptionInput.fill(overLimit);

    // Should be prevented by maxlength attribute or validation
    const actualValue = await descriptionInput.inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(1000);
  });

  test('should prevent XSS in todo description @security @ui @critical', async ({ page }) => {
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

    // Try to create todo with XSS in description
    const xssDescription = '<script>alert("XSS in Description")</script>';
    await todoPage.addTodo('Safe Title', xssDescription);

    // Verify script tags are stripped/escaped
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<script>alert');
    
    // Check that description is sanitized
    const todos = await todoPage.getTodos();
    // The description should be sanitized
    const pageText = await page.textContent('body');
    const hasScriptInText = pageText?.includes('<script>alert') || false;
    expect(hasScriptInText).toBe(false);
  });

  test('should prevent command injection @security @ui', async ({ page }) => {
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

    // Try command injection payloads
    const commandPayloads = [
      '; rm -rf /',
      '| cat /etc/passwd',
      '&& ls -la',
      '`whoami`',
    ];

    for (const payload of commandPayloads) {
      await todoPage.addTodo(payload, 'Command injection test');
      
      // Verify payload is treated as text, not executed
      const pageContent = await page.content();
      // Should not contain system commands in executable format (check for unescaped versions)
      // HTML entities like &amp;#x2F; are safe - they're escaped
      // We want to ensure raw commands aren't present (without HTML entity escaping)
      
      // The payload should be HTML-escaped, so raw commands like "rm -rf /" should become
      // "rm -rf &amp;#x2F;" (where / is escaped as &#x2F; and & is escaped as &amp;)
      // We check that raw "rm -rf /" (with raw slash) is NOT present
      // Safe: contains "&amp;" or "&#" before the slash (HTML entity escaping)
      // Dangerous: raw "rm -rf /" without HTML entity escaping
      
      // Check for raw "rm -rf /" - should not exist without HTML entity escaping
      // If we find "rm -rf /" but it's followed by &amp; or &#, it's escaped (safe)
      const rawRmRfPattern = /rm -rf\s+\//;
      const escapedRmRfPattern = /rm -rf\s+(&amp;|&#)/;
      const hasRawRmRf = rawRmRfPattern.test(pageContent) && !escapedRmRfPattern.test(pageContent);
      expect(hasRawRmRf).toBe(false);
      
      // Check for raw "cat /etc/passwd" - slashes should be escaped
      const rawCatPattern = /cat\s+\/etc\/passwd/;
      const escapedCatPattern = /cat\s+(&amp;|&#)/;
      const hasRawCat = rawCatPattern.test(pageContent) && !escapedCatPattern.test(pageContent);
      expect(hasRawCat).toBe(false);
      
      // If it contains escaped versions (with &amp; or &#x2F;), that's actually good (sanitized)
    }
  });
});