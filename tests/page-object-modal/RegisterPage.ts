import { Page, Locator, expect } from '@playwright/test';

/**
 * Register Page Object Model (from page-object-modal folder)
 * Handles all interactions with the registration page
 */
export class RegisterPage {
  readonly page: Page;
  
  // Locators
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly ageInput: Locator;
  readonly roleSelect: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;
  readonly validationError: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Locators
    this.usernameInput = page.locator('#username');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.ageInput = page.locator('#age');
    this.roleSelect = page.locator('#role');
    this.submitButton = page.locator('button[type="submit"]');
    this.loginLink = page.locator('a[href*="login"]').first();
    this.successAlert = page.locator('.alert-success');
    this.errorAlert = page.locator('.alert-danger');
    this.validationError = page.locator('.invalid-feedback');
  }

  /**
   * Navigate to register page
   */
  async goto() {
    await this.page.goto('/register');
    await this.usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Fill registration form
   */
  async fillForm({ username, email, password, role = 'client', age }: {
    username: string;
    email: string;
    password: string;
    role?: 'client' | 'admin';
    age?: number;
  }) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    
    if (age !== undefined) {
      await this.ageInput.fill(age.toString());
    }
    
    await this.roleSelect.selectOption(role);
  }

  /**
   * Submit registration form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete registration flow
   */
  async register(userData: {
    username: string;
    email: string;
    password: string;
    role?: 'client' | 'admin';
    age?: number;
  }) {
    await this.fillForm(userData);
    await this.submit();
  }

  /**
   * Click login link
   */
  async clickLoginLink() {
    await this.loginLink.click();
  }

  /**
   * Get success message
   */
  async getSuccessMessage(): Promise<string | null> {
    if (await this.successAlert.isVisible()) {
      return await this.successAlert.textContent();
    }
    return null;
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorAlert.isVisible()) {
      return await this.errorAlert.textContent();
    }
    return null;
  }

  /**
   * Get validation error
   */
  async getValidationError(): Promise<string | null> {
    if (await this.validationError.isVisible()) {
      return await this.validationError.textContent();
    }
    return null;
  }

  /**
   * Assert page is loaded
   */
  async assertPageLoaded() {
    await expect(this.usernameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Assert successful registration
   */
  async assertRegistrationSuccess() {
    // Wait for either success message or redirect to login
    // Check for redirect first (most common case) - redirect happens faster than success message
    const redirected = await this.page.waitForURL(/\/login/, { timeout: 5000 }).catch(() => false);
    if (redirected) {
      // Redirected to login - registration was successful
      return;
    }
    
    // If not redirected, check for success message
    try {
      await this.successAlert.waitFor({ state: 'visible', timeout: 5000 });
      await expect(this.successAlert).toBeVisible();
    } catch (error) {
      // If success alert not found, check if we're still on register page
      const currentUrl = this.page.url();
      if (currentUrl.includes('/register')) {
        // Might be validation error, check for error message
        const hasError = await this.errorAlert.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasError) {
          const errorText = await this.errorAlert.textContent();
          throw new Error(`Registration failed with error: ${errorText || 'Unknown error'}`);
        }
        // If neither success nor error, wait a bit more for Vue reactivity
        await this.page.waitForTimeout(2000);
        const hasSuccessAfterWait = await this.successAlert.isVisible({ timeout: 3000 }).catch(() => false);
        if (!hasSuccessAfterWait) {
          // Check for redirect one more time
          const redirectedAfterWait = await this.page.waitForURL(/\/login/, { timeout: 3000 }).catch(() => false);
          if (!redirectedAfterWait) {
            throw new Error('Registration did not succeed - no success message, no redirect, and no error message');
          }
        }
      } else {
        // Not on register page and not on login - might be an unexpected redirect
        throw new Error(`Unexpected page after registration: ${currentUrl}`);
      }
    }
  }

  /**
   * Assert registration error
   */
  async assertRegistrationError(message?: string) {
    await expect(this.errorAlert).toBeVisible();
    if (message) {
      await expect(this.errorAlert).toContainText(message);
    }
  }

  /**
   * Assert validation error shown
   */
  async assertValidationError(message?: string) {
    await expect(this.validationError).toBeVisible();
    if (message) {
      await expect(this.validationError).toContainText(message);
    }
  }
}

