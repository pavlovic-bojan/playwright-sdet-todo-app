import { APIRequestContext, expect } from '@playwright/test';
import {
  TodoResponse,
  CreateTodoRequest,
  UpdateTodoRequest,
  GetTodosQueryParams,
} from '../../models/api/TodoResponse';

/**
 * Todo API Service
 * Handles all API interactions for Todo operations
 * Based on Swagger API: https://todo-app-xhn2.onrender.com/api/docs/
 */
export class TodoApiService {
  private authToken?: string;

  constructor(
    private request: APIRequestContext,
    private baseUrl: string
  ) {}

  /**
   * Set authentication token for subsequent requests
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get headers with authentication if token is set
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  /**
   * Get all todos
   * Supports query parameters: completed (boolean), userId (number, Admin only)
   */
  async getAllTodos(params?: GetTodosQueryParams): Promise<TodoResponse[]> {
    let url = `${this.baseUrl}/todos`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.completed !== undefined) {
        queryParams.append('completed', params.completed.toString());
      }
      if (params.userId !== undefined) {
        queryParams.append('userId', params.userId.toString());
      }
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    const response = await this.request.get(url, {
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  /**
   * Get todo by ID
   */
  async getTodoById(id: number | string): Promise<TodoResponse> {
    // Convert to string for URL
    const idStr = String(id);
    const response = await this.request.get(`${this.baseUrl}/todos/${idStr}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok()) {
      const errorBody = await response.text();
      throw new Error(`Get todo failed: ${response.status()} ${response.statusText()}. Body: ${errorBody}`);
    }
    const data = await response.json();
    return data.todo || data;
  }

  /**
   * Create a new todo
   * Requires authentication
   */
  async createTodo(todo: CreateTodoRequest): Promise<TodoResponse> {
    const response = await this.request.post(`${this.baseUrl}/todos`, {
      headers: this.getHeaders(),
      data: todo,
    });
    if (!response.ok()) {
      const errorBody = await response.text();
      throw new Error(`Create todo failed: ${response.status()} ${response.statusText()}. Body: ${errorBody}`);
    }
    const data = await response.json();
    // Handle wrapped response if needed
    return data.todo || data;
  }

  /**
   * Update a todo
   * Uses PATCH method as per API specification
   * Requires authentication
   */
  async updateTodo(id: number | string, todo: UpdateTodoRequest): Promise<TodoResponse> {
    // Convert to string for URL
    const idStr = String(id);
    const response = await this.request.patch(`${this.baseUrl}/todos/${idStr}`, {
      headers: this.getHeaders(),
      data: todo,
    });
    if (!response.ok()) {
      const errorBody = await response.text();
      throw new Error(`Update todo failed: ${response.status()} ${response.statusText()}. Body: ${errorBody}`);
    }
    const data = await response.json();
    return data.todo || data;
  }

  /**
   * Delete a todo
   * Requires authentication
   */
  async deleteTodo(id: number | string): Promise<void> {
    // Convert to string for URL
    const idStr = String(id);
    const response = await this.request.delete(`${this.baseUrl}/todos/${idStr}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok()) {
      const errorBody = await response.text();
      throw new Error(`Delete todo failed: ${response.status()} ${response.statusText()}. Body: ${errorBody}`);
    }
  }

  /**
   * Toggle todo completion status
   * Uses PATCH /todos/{id}/toggle endpoint
   * Requires authentication
   */
  async toggleTodo(id: number | string): Promise<TodoResponse> {
    // Convert to string for URL
    const idStr = String(id);
    const response = await this.request.patch(`${this.baseUrl}/todos/${idStr}/toggle`, {
      headers: this.getHeaders(),
    });
    if (!response.ok()) {
      const errorBody = await response.text();
      throw new Error(`Toggle todo failed: ${response.status()} ${response.statusText()}. Body: ${errorBody}`);
    }
    const data = await response.json();
    return data.todo || data;
  }

  /**
   * Mark todo as completed
   */
  async completeTodo(id: number | string): Promise<TodoResponse> {
    return this.updateTodo(id, { completed: true });
  }

  /**
   * Mark todo as incomplete
   */
  async uncompleteTodo(id: number | string): Promise<TodoResponse> {
    return this.updateTodo(id, { completed: false });
  }
}
