import { Page, Locator, expect } from '@playwright/test';

/**
 * Reset Password Page Object Model (from page-object-modal folder)
 * Handles all interactions with the reset password page
 */
export class ResetPasswordPage {
  readonly page: Page;
  
  // Locators
  readonly resetTokenInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly backToLoginLink: Locator;
  readonly goToLoginButton: Locator;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;
  readonly validationError: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Locators
    this.resetTokenInput = page.locator('#resetToken');
    this.newPasswordInput = page.locator('#newPassword');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.submitButton = page.locator('button[type="submit"]');
    this.backToLoginLink = page.locator('a[href*="login"]');
    this.goToLoginButton = page.locator('a:has-text("Go to Login")');
    this.successAlert = page.locator('.alert-success');
    this.errorAlert = page.locator('.alert-danger');
    this.validationError = page.locator('.invalid-feedback');
  }

  /**
   * Navigate to reset password page
   */
  async goto() {
    await this.page.goto('/reset-password');
    await this.resetTokenInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Fill reset token input
   */
  async fillResetToken(token: string) {
    await this.resetTokenInput.fill(token);
  }

  /**
   * Fill new password input
   */
  async fillNewPassword(password: string) {
    await this.newPasswordInput.fill(password);
  }

  /**
   * Fill confirm password input
   */
  async fillConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password);
  }

  /**
   * Submit reset password form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete reset password flow
   */
  async resetPassword(token: string, newPassword: string, confirmPassword?: string) {
    await this.fillResetToken(token);
    await this.fillNewPassword(newPassword);
    await this.fillConfirmPassword(confirmPassword || newPassword);
    await this.submit();
  }

  /**
   * Assert success message is visible
   */
  async assertSuccessMessageVisible() {
    // Wait a bit for Vue reactivity
    await this.page.waitForTimeout(500);
    await expect(this.successAlert).toBeVisible();
  }

  /**
   * Assert error message is visible
   */
  async assertErrorMessageVisible() {
    await expect(this.errorAlert).toBeVisible();
  }

  /**
   * Assert validation error is visible
   */
  async assertValidationError() {
    await expect(this.validationError).toBeVisible();
  }

  /**
   * Click go to login button
   */
  async clickGoToLogin() {
    await this.goToLoginButton.click();
  }
}

