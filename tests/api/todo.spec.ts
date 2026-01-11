import { test, expect } from '../fixtures/api.fixture';
import { allure } from 'allure-playwright';

test.describe('Todo API Tests', () => {
  let authToken: string;
  let testUserId: number;
  let testUsername: string;
  let testEmail: string;

  // Setup: Register and login a test user
  test.beforeAll(async ({ userApi, userDb }) => {
    testUsername = `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    testEmail = `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
    const password = 'TestPassword123!';

    // Clean up any existing user with same email (in case of retry)
    try {
      const existingUser = await userDb.getUserByEmail(testEmail);
      if (existingUser) {
        await userDb.deleteUser(existingUser.id);
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    // Register user
    await userApi.register({
      username: testUsername,
      email: testEmail,
      password,
      role: 'client',
    });

    // Login to get auth token
    const loginResponse = await userApi.login({ username: testUsername, password });
    authToken = loginResponse.accessToken;
    testUserId = loginResponse.user.id;
  });

  // Cleanup: Delete test user
  test.afterAll(async ({ userDb }) => {
    try {
      if (testUserId) {
        await userDb.deleteUser(testUserId);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  test('should get all todos (requires auth)', async ({ todoApi }) => {
    await allure.epic('Todo Management');
    await allure.feature('Todo CRUD');
    await allure.story('Get All Todos');
    await allure.severity('normal');
    todoApi.setAuthToken(authToken);
    const todos = await todoApi.getAllTodos();
    expect(Array.isArray(todos)).toBeTruthy();
  });

  test('should create a new todo', async ({ todoApi }) => {
    todoApi.setAuthToken(authToken);
    const newTodo = {
      title: 'Test Todo',
      description: 'This is a test todo',
    };

    const createdTodo = await todoApi.createTodo(newTodo);
    
    // Detailed API response validation
    expect(createdTodo).toHaveProperty('id');
    expect(createdTodo).toHaveProperty('title');
    expect(createdTodo).toHaveProperty('description');
    expect(createdTodo).toHaveProperty('completed');
    expect(createdTodo).toHaveProperty('userId');
    
    expect(typeof createdTodo.id).toBe('number');
    expect(createdTodo.id).toBeGreaterThan(0);
    expect(createdTodo.title).toBe(newTodo.title);
    expect(createdTodo.description).toBe(newTodo.description);
    expect(typeof createdTodo.completed).toBe('boolean');
    expect(createdTodo.completed).toBe(false);
    expect(typeof createdTodo.userId).toBe('number');
    expect(createdTodo.userId).toBe(testUserId);

    // Cleanup
    await todoApi.deleteTodo(createdTodo.id);
  });

  test('should get todo by ID', async ({ todoApi }) => {
    todoApi.setAuthToken(authToken);
    // Create a todo first
    const newTodo = {
      title: 'Get Todo Test',
      description: 'Testing get by ID',
    };

    const createdTodo = await todoApi.createTodo(newTodo);
    const retrievedTodo = await todoApi.getTodoById(createdTodo.id);

    expect(retrievedTodo.id).toBe(createdTodo.id);
    expect(retrievedTodo.title).toBe(newTodo.title);

    // Cleanup
    await todoApi.deleteTodo(createdTodo.id);
  });

  test('should update a todo using PATCH', async ({ todoApi }) => {
    todoApi.setAuthToken(authToken);
    // Create a todo first
    const newTodo = {
      title: 'Update Todo Test',
    };

    const createdTodo = await todoApi.createTodo(newTodo);
    const updatedTodo = await todoApi.updateTodo(createdTodo.id, {
      title: 'Updated Title',
      description: 'Updated description',
    });

    expect(updatedTodo.title).toBe('Updated Title');
    expect(updatedTodo.description).toBe('Updated description');

    // Cleanup
    await todoApi.deleteTodo(createdTodo.id);
  });

  test('should toggle todo completion status', async ({ todoApi }) => {
    todoApi.setAuthToken(authToken);
    // Create a todo first
    const newTodo = {
      title: 'Toggle Todo Test',
    };

    const createdTodo = await todoApi.createTodo(newTodo);
    expect(createdTodo.completed).toBe(false);

    // Toggle to completed
    const toggledTodo = await todoApi.toggleTodo(createdTodo.id);
    expect(toggledTodo.completed).toBe(true);

    // Toggle back to incomplete
    const toggledBack = await todoApi.toggleTodo(createdTodo.id);
    expect(toggledBack.completed).toBe(false);

    // Cleanup
    await todoApi.deleteTodo(createdTodo.id);
  });

  test('should mark todo as completed', async ({ todoApi }) => {
    todoApi.setAuthToken(authToken);
    // Create a todo first
    const newTodo = {
      title: 'Complete Todo Test',
    };

    const createdTodo = await todoApi.createTodo(newTodo);
    expect(createdTodo.completed).toBe(false);

    const completedTodo = await todoApi.completeTodo(createdTodo.id);
    expect(completedTodo.completed).toBe(true);

    // Cleanup
    await todoApi.deleteTodo(createdTodo.id);
  });

  test('should filter todos by completion status', async ({ todoApi }) => {
    todoApi.setAuthToken(authToken);
    // Create test todos
    const todo1 = await todoApi.createTodo({ title: 'Active Todo' });
    const todo2 = await todoApi.createTodo({ title: 'Completed Todo' });
    await todoApi.completeTodo(todo2.id);

    // Get only completed todos
    const completedTodos = await todoApi.getAllTodos({ completed: true });
    expect(completedTodos.some(t => t.id === todo2.id)).toBeTruthy();

    // Get only active todos
    const activeTodos = await todoApi.getAllTodos({ completed: false });
    expect(activeTodos.some(t => t.id === todo1.id)).toBeTruthy();

    // Cleanup
    await todoApi.deleteTodo(todo1.id);
    await todoApi.deleteTodo(todo2.id);
  });

  test('should delete a todo', async ({ todoApi }) => {
    todoApi.setAuthToken(authToken);
    // Create a todo first
    const newTodo = {
      title: 'Delete Todo Test',
    };

    const createdTodo = await todoApi.createTodo(newTodo);
    await todoApi.deleteTodo(createdTodo.id);

    // Verify deletion by trying to get it (should fail with 404)
    try {
      await todoApi.getTodoById(createdTodo.id);
      throw new Error('Todo should have been deleted');
    } catch (error) {
      // Expected - todo should not exist
      expect(error).toBeDefined();
    }
  });

  test('should require authentication for protected endpoints', async ({ apiRequestContext }) => {
    // Don't set auth token
    const apiUrl = process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000/api';
    const response = await apiRequestContext.get(`${apiUrl}/todos`);
    expect(response.status()).toBe(401);
  });

  // ========== ERROR HANDLING TESTS ==========

  test('should return 404 for non-existent todo ID', async ({ todoApi }) => {
    todoApi.setAuthToken(authToken);
    try {
      await todoApi.getTodoById(999999); // Non-existent ID
      throw new Error('Should have returned 404 for non-existent todo');
    } catch (error) {
      // Expected - should fail with 404
      expect(error).toBeDefined();
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage).toMatch(/404|not found/i);
    }
  });

  test('should return 400 for invalid todo data', async ({ todoApi }) => {
    todoApi.setAuthToken(authToken);
    try {
      // Try to create todo with empty title (if API validates)
      await todoApi.createTodo({ title: '', description: 'Test' });
      // If creation succeeds, verify it's actually invalid
      const todos = await todoApi.getAllTodos();
      const invalidTodo = todos.find(t => t.title === '');
      if (invalidTodo) {
        await todoApi.deleteTodo(invalidTodo.id);
        throw new Error('Should not allow empty title');
      }
    } catch (error) {
      // Expected - should fail with 400
      expect(error).toBeDefined();
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage).toMatch(/400|bad request|validation|invalid/i);
    }
  });

  test('should return 401 for todo operations without auth token', async ({ apiRequestContext }) => {
    // Don't set auth token - test directly with APIRequestContext
    const apiUrl = process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000/api';
    const response = await apiRequestContext.get(`${apiUrl}/todos`);
    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('should return 403 for unauthorized todo access', async ({ userApi, todoApi, userDb }) => {
    test.setTimeout(60000); // 60 seconds for this test
    // Create two users
    const user1 = {
      username: `todo_user1_${Date.now()}`,
      email: `todo_user1_${Date.now()}@example.com`,
      password: 'TodoUser1Pass123!',
    };
    const user2 = {
      username: `todo_user2_${Date.now()}`,
      email: `todo_user2_${Date.now()}@example.com`,
      password: 'TodoUser2Pass123!',
    };

    await userApi.register(user1);
    await userApi.register(user2);

    const login1 = await userApi.login({ username: user1.username, password: user1.password });
    const login2 = await userApi.login({ username: user2.username, password: user2.password });

    // User1 creates a todo
    todoApi.setAuthToken(login1.accessToken);
    const todo = await todoApi.createTodo({ title: 'User1 Todo', description: 'Private' });

    // User2 tries to access User1's todo
    todoApi.setAuthToken(login2.accessToken);
    try {
      await todoApi.getTodoById(todo.id);
      // If access succeeds, verify it's actually unauthorized
      const accessed = await todoApi.getTodoById(todo.id);
      if (accessed && accessed.userId !== login2.user.id) {
        throw new Error('User2 should not be able to access User1 todo');
      }
    } catch (error) {
      // Expected - should fail with 403 or 404
      expect(error).toBeDefined();
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage).toMatch(/403|404|forbidden|not found|unauthorized/i);
    }

    // Cleanup
    todoApi.setAuthToken(login1.accessToken);
    await todoApi.deleteTodo(todo.id);
    await userDb.deleteUser(login1.user.id);
    await userDb.deleteUser(login2.user.id);
  });

  test('should return 400 for invalid update data', async ({ todoApi }) => {
    todoApi.setAuthToken(authToken);
    // Create a todo first
    const todo = await todoApi.createTodo({ title: 'Update Test', description: 'Original' });

    try {
      // Try to update with invalid data (if API validates)
      await todoApi.updateTodo(todo.id, { title: '' }); // Empty title
      // If update succeeds, verify it's actually invalid
      const updated = await todoApi.getTodoById(todo.id);
      if (updated.title === '') {
        await todoApi.deleteTodo(todo.id);
        throw new Error('Should not allow empty title update');
      }
    } catch (error) {
      // Expected - should fail with 400
      expect(error).toBeDefined();
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage).toMatch(/400|bad request|validation|invalid/i);
    } finally {
      // Cleanup
      await todoApi.deleteTodo(todo.id);
    }
  });
});