import { Page, Locator, expect } from '@playwright/test';

/**
 * Forgot Password Page Object Model (from page-object-modal folder)
 * Handles all interactions with the forgot password page
 */
export class ForgotPasswordPage {
  readonly page: Page;
  
  // Locators
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly backToLoginLink: Locator;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;
  readonly resetTokenCode: Locator;
  readonly goToResetPasswordButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Locators
    this.emailInput = page.locator('#email');
    this.submitButton = page.locator('button[type="submit"]');
    this.backToLoginLink = page.locator('a[href*="login"]');
    this.successAlert = page.locator('.alert-success');
    this.errorAlert = page.locator('.alert-danger');
    this.resetTokenCode = page.locator('code');
    this.goToResetPasswordButton = page.locator('a:has-text("Go to Reset Password")');
  }

  /**
   * Navigate to forgot password page
   */
  async goto() {
    await this.page.goto('/forgot-password');
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Fill email input
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Submit forgot password form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    await this.fillEmail(email);
    await this.submit();
    // Wait for network request to complete
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    // Wait for Vue reactivity to update the UI
    await this.page.waitForTimeout(2000);
  }

  /**
   * Get reset token from the page
   */
  async getResetToken(): Promise<string | null> {
    // Wait for success message first - check if it exists
    const hasSuccess = await this.successAlert.isVisible({ timeout: 15000 }).catch(() => false);
    if (!hasSuccess) {
      // Check for error message instead
      const hasError = await this.errorAlert.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasError) {
        return null; // Rate limited or error
      }
      // Wait a bit more
      await this.page.waitForTimeout(1000);
      const hasSuccess2 = await this.successAlert.isVisible({ timeout: 5000 }).catch(() => false);
      if (!hasSuccess2) {
        return null;
      }
    }
    
    // Wait a bit more for token to render in the code element
    await this.page.waitForTimeout(1000);
    const tokenVisible = await this.resetTokenCode.isVisible({ timeout: 10000 }).catch(() => false);
    if (!tokenVisible) {
      return null;
    }
    const token = await this.resetTokenCode.textContent();
    // Clean up token text (remove whitespace)
    return token ? token.trim() : null;
  }

  /**
   * Click back to login link
   */
  async clickBackToLogin() {
    await this.backToLoginLink.click();
  }

  /**
   * Assert success message is visible
   */
  async assertSuccessMessageVisible() {
    await expect(this.successAlert).toBeVisible();
  }

  /**
   * Assert error message is visible
   */
  async assertErrorMessageVisible() {
    await expect(this.errorAlert).toBeVisible();
  }
}

