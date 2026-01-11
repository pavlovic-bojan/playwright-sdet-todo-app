import { Page, Locator, expect } from '@playwright/test';

/**
 * Todo Page Object Model (from page-object-modal folder)
 * Represents the Todo Dashboard page and its interactions
 * Based on the actual application structure with modals and card-based UI
 */
export class TodoPage {
  readonly page: Page;
  
  // Page elements
  readonly pageTitle: Locator;
  readonly newTodoButton: Locator;
  
  // Modal locators
  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly todoTitleInput: Locator;
  readonly todoDescriptionInput: Locator;
  readonly modalSubmitButton: Locator;
  readonly modalCancelButton: Locator;
  readonly modalCloseButton: Locator;
  
  // Todo card locators
  readonly todoCards: Locator;
  readonly todoTitle: Locator;
  readonly todoCheckbox: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  
  // Confirm modal
  readonly confirmModal: Locator;
  readonly confirmDeleteButton: Locator;
  
  // Filter buttons
  readonly filterAll: Locator;
  readonly filterActive: Locator;
  readonly filterCompleted: Locator;
  
  // Logout
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Page elements
    this.pageTitle = page.getByText('My Todos');
    this.newTodoButton = page.locator('button:has-text("New Todo")');
    
    // Modal locators
    this.modal = page.locator('.modal.show, .modal.fade.show');
    this.modalTitle = page.locator('.modal-title, #todoModalLabel');
    this.todoTitleInput = page.locator('#todoTitle');
    this.todoDescriptionInput = page.locator('#todoDescription');
    this.modalSubmitButton = page.locator('.modal-footer button[type="submit"], .modal-footer .btn-primary:has-text("Create"), .modal-footer .btn-primary:has-text("Update")');
    this.modalCancelButton = page.locator('.modal-footer button:has-text("Cancel"), .modal-footer .btn-secondary');
    this.modalCloseButton = page.locator('.btn-close');
    
    // Todo card locators - use article.card to target only todo cards (not statistic cards which are div.card)
    this.todoCards = page.locator('article.card, article[aria-label^="Todo:"]');
    this.todoTitle = page.locator('.card-title');
    this.todoCheckbox = page.locator('input[type="checkbox"].form-check-input');
    this.editButton = page.locator('button:has-text("Edit")');
    this.deleteButton = page.locator('button:has-text("Delete")');
    
    // Confirm modal
    this.confirmModal = page.locator('.modal:has-text("Delete Todo")');
    this.confirmDeleteButton = page.locator('.modal button:has-text("Delete")');
    
    // Filter buttons - scope to the button group to avoid matching other buttons
    this.filterAll = page.locator('.btn-group button:has-text("All"), button[aria-pressed]:has-text("All")');
    this.filterActive = page.locator('.btn-group button:has-text("Active"), button[aria-pressed]:has-text("Active")');
    this.filterCompleted = page.locator('.btn-group button:has-text("Completed"), button[aria-pressed]:has-text("Completed")');
    
    // Logout
    this.logoutButton = page.locator('button.btn-outline-light:has-text("Logout"), nav button:has-text("Logout")');
  }

  /**
   * Navigate to the dashboard
   */
  async goto() {
    await this.page.goto('/dashboard');
    
    // Wait for page to load - check for title or redirect to login
    try {
      await this.pageTitle.waitFor({ state: 'visible', timeout: 15000 });
    } catch (error) {
      // Check if redirected to login
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login')) {
        throw new Error('Not authenticated - redirected to login page. Please login first.');
      }
      
      // Try alternative selectors
      await this.page.waitForSelector('h1, main, [role="main"]', { timeout: 10000 }).catch(() => {
        throw new Error(`Dashboard page did not load. Current URL: ${currentUrl}`);
      });
    }
  }

  /**
   * Click new todo button and wait for modal
   */
  async clickNewTodo() {
    // Close any existing modal first
    const modalVisible = await this.modal.isVisible({ timeout: 1000 }).catch(() => false);
    if (modalVisible) {
      await this.page.keyboard.press('Escape');
      await this.modal.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      await this.page.waitForTimeout(300);
    }
    
    await this.newTodoButton.click();
    await this.modal.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(300); // Wait for modal animation
  }

  /**
   * Fill todo form in modal
   */
  async fillTodoForm(title: string, description: string = '') {
    await this.todoTitleInput.fill(title);
    if (description) {
      await this.todoDescriptionInput.fill(description);
    }
  }

  /**
   * Submit todo form
   */
  async submitTodoForm() {
    await this.modalSubmitButton.click();
    await this.page.waitForTimeout(500);
    
    // Wait for modal to close (if valid) or stay open (if validation error)
    try {
      await this.modal.waitFor({ state: 'hidden', timeout: 3000 });
    } catch (error) {
      // Modal still visible - could be validation error
      await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    }
  }

  /**
   * Create a new todo via modal
   */
  async addTodo(title: string, description: string = '') {
    await this.clickNewTodo();
    await this.fillTodoForm(title, description);
    await this.submitTodoForm();
    // Wait for network and UI update
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  /**
   * Get all todo items (from cards)
   */
  async getTodos(): Promise<string[]> {
    await this.page.waitForTimeout(500);
    const cards = await this.todoCards.all();
    return Promise.all(cards.map(async (card) => {
      const title = await card.locator(this.todoTitle).textContent();
      return title?.trim() || '';
    }));
  }

  /**
   * Get todo card by title text
   */
  getTodoCardByTitle(text: string): Locator {
    return this.todoCards.filter({ hasText: text }).first();
  }

  /**
   * Get todo card by index
   */
  getTodoCardByIndex(index: number): Locator {
    return this.todoCards.nth(index);
  }

  /**
   * Toggle todo completion by title
   */
  async toggleTodo(text: string) {
    const card = this.getTodoCardByTitle(text);
    const checkbox = card.locator(this.todoCheckbox);
    await checkbox.click();
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  /**
   * Toggle todo completion by index
   */
  async toggleTodoByIndex(index: number) {
    const card = this.getTodoCardByIndex(index);
    const checkbox = card.locator(this.todoCheckbox);
    await checkbox.click();
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  /**
   * Delete a todo by title
   */
  async deleteTodo(text: string) {
    const card = this.getTodoCardByTitle(text);
    const deleteBtn = card.locator(this.deleteButton);
    await deleteBtn.click();
    
    // Wait for confirm modal
    await this.confirmModal.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(300);
    await this.confirmDeleteButton.click();
    
    // Wait for network or modal to close
    await Promise.race([
      this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
      this.confirmModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    ]);
    await this.page.waitForTimeout(500);
  }

  /**
   * Delete a todo by index
   */
  async deleteTodoByIndex(index: number) {
    const card = this.getTodoCardByIndex(index);
    const deleteBtn = card.locator(this.deleteButton);
    await deleteBtn.waitFor({ state: 'visible', timeout: 10000 });
    await deleteBtn.click({ force: true });
    
    // Wait for confirm modal
    await this.confirmModal.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(300);
    await this.confirmDeleteButton.click();
    
    // Wait for network or modal to close
    await Promise.race([
      this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
      this.confirmModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    ]);
    await this.page.waitForTimeout(500);
  }

  /**
   * Edit a todo by title
   */
  async editTodo(oldText: string, newTitle: string, newDescription: string = '') {
    const card = this.getTodoCardByTitle(oldText);
    const editBtn = card.locator(this.editButton);
    await editBtn.click();
    
    // Wait for modal to appear
    await this.modal.waitFor({ state: 'visible', timeout: 10000 });
    
    // Clear and fill form
    await this.todoTitleInput.fill('');
    await this.fillTodoForm(newTitle, newDescription);
    await this.submitTodoForm();
    
    // Wait for network or modal to close
    await Promise.race([
      this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
      this.modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    ]);
    await this.page.waitForTimeout(500);
  }

  /**
   * Edit a todo by index
   */
  async editTodoByIndex(index: number, newTitle: string, newDescription: string = '') {
    const card = this.getTodoCardByIndex(index);
    const editBtn = card.locator(this.editButton);
    await editBtn.click();
    
    // Wait for modal to appear
    await this.modal.waitFor({ state: 'visible', timeout: 10000 });
    
    // Clear and fill form
    await this.todoTitleInput.fill('');
    await this.fillTodoForm(newTitle, newDescription);
    await this.submitTodoForm();
    
    // Wait for network or modal to close
    await Promise.race([
      this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
      this.modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    ]);
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter todos by status
   */
  async filterBy(status: 'all' | 'active' | 'completed') {
    switch (status) {
      case 'all':
        await this.filterAll.click();
        break;
      case 'active':
        await this.filterActive.click();
        break;
      case 'completed':
        await this.filterCompleted.click();
        break;
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get count of todos
   */
  async getTodoCount(): Promise<number> {
    return await this.todoCards.count();
  }

  /**
   * Get todo title by index
   */
  async getTodoTitleByIndex(index: number): Promise<string | null> {
    const card = this.getTodoCardByIndex(index);
    const title = card.locator(this.todoTitle);
    return await title.textContent();
  }

  /**
   * Check if todo is completed by title
   */
  async isTodoCompleted(text: string): Promise<boolean> {
    const card = this.getTodoCardByTitle(text);
    const checkbox = card.locator(this.todoCheckbox);
    return await checkbox.isChecked();
  }

  /**
   * Check if todo is completed by index
   */
  async isTodoCompletedByIndex(index: number): Promise<boolean> {
    const card = this.getTodoCardByIndex(index);
    const checkbox = card.locator(this.todoCheckbox);
    return await checkbox.isChecked();
  }

  /**
   * Logout
   */
  async logout() {
    await this.logoutButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.logoutButton.click();
    await this.page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {
      return this.page.waitForTimeout(1000);
    });
  }
}
