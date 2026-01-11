import { Page, Locator, expect } from '@playwright/test';

/**
 * Login Page Object Model (from page-object-modal folder)
 * Handles all interactions with the login page
 */
export class LoginPage {
  readonly page: Page;
  
  // Locators
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly errorAlert: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Locators
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('button[type="submit"]');
    this.forgotPasswordLink = page.locator('a[href*="forgot-password"]');
    this.registerLink = page.locator('a[href*="register"]');
    this.errorAlert = page.locator('.alert-danger');
    this.loadingSpinner = page.locator('.spinner-border');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Fill username
   */
  async fillUsername(username: string) {
    await this.usernameInput.fill(username);
  }

  /**
   * Fill password
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Click login button
   */
  async clickLogin() {
    await this.loginButton.click();
  }

  /**
   * Complete login flow
   */
  async login(username: string, password: string) {
    // Small delay to avoid rate limiting when multiple tests run quickly
    await this.page.waitForTimeout(500);
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickLogin();
    
    // Wait for network request to complete
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    
    // Check if we're still on login page (error) or navigated to dashboard (success)
    const currentUrl = this.page.url();
    const isOnLoginPage = currentUrl.includes('/login');
    const isOnDashboard = currentUrl.includes('/dashboard');
    
    if (isOnDashboard) {
      // Success - already navigated
      return;
    }
    
    if (isOnLoginPage) {
      // Still on login page - check for error
      await this.page.waitForTimeout(1500); // Wait for error message to render
      const errorMsg = await this.getErrorMessage();
      
      if (errorMsg) {
        // If rate limited, wait and retry once
        if (errorMsg.includes('Too many') || errorMsg.includes('rate')) {
          await this.page.waitForTimeout(3000);
          await this.fillUsername(username);
          await this.fillPassword(password);
          await this.clickLogin();
          await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
          await this.page.waitForURL(/\/dashboard/, { timeout: 20000 });
        } else {
          throw new Error(`Login failed: ${errorMsg}`);
        }
      } else {
        // No error message but still on login - wait a bit more for navigation
        try {
          await this.page.waitForURL(/\/dashboard/, { timeout: 10000 });
        } catch (e) {
          throw new Error('Login failed: No navigation and no error message');
        }
      }
    } else {
      // Unknown state - wait for navigation
      await this.page.waitForURL(/\/dashboard/, { timeout: 20000 });
    }
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * Click register link
   */
  async clickRegister() {
    // Use first() to handle multiple register links on the page
    await this.registerLink.first().click();
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
   * Check if loading
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  /**
   * Assert successful login (redirected to dashboard)
   */
  async assertLoginSuccess() {
    // Wait for URL to contain dashboard with longer timeout
    await this.page.waitForURL(/\/dashboard/, { timeout: 20000 });
    expect(this.page.url()).toContain('/dashboard');
  }

  /**
   * Assert login error displayed
   */
  async assertLoginError(errorMessage?: string) {
    await expect(this.errorAlert).toBeVisible();
    if (errorMessage) {
      await expect(this.errorAlert).toContainText(errorMessage);
    }
  }

  /**
   * Assert page is loaded
   */
  async assertPageLoaded() {
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}

