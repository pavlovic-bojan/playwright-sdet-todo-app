import { APIRequestContext, expect } from '@playwright/test';
import {
  UserResponse,
  RegisterUserRequest,
  LoginUserRequest,
  LoginResponse,
  UpdateUserRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../../models/api/UserResponse';

/**
 * User API Service
 * Handles all API interactions for User operations
 * Based on Swagger API: https://todo-app-xhn2.onrender.com/api/docs/
 */
export class UserApiService {
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
   * Register a new user
   * POST /users/register
   * Note: API returns 201 with message only, not user object
   * To get user data, use login after registration
   */
  async register(user: RegisterUserRequest): Promise<{ message: string }> {
    const response = await this.request.post(`${this.baseUrl}/users/register`, {
      headers: this.getHeaders(),
      data: user,
      timeout: 60000, // 60 seconds timeout for registration (server may be slow)
    });
    if (!response.ok()) {
      const status = response.status();
      const errorBody = await response.text();
      
      // Check if response is HTML error page (Cloudflare/Render errors)
      const isHtml = errorBody.trim().startsWith('<!DOCTYPE') || errorBody.trim().startsWith('<html');
      
      // For HTML error pages, provide cleaner error message
      if (isHtml) {
        throw new Error(`Register failed: ${status} ${response.statusText()} (Server error - may be transient)`);
      }
      
      // For JSON errors, include truncated body
      const truncatedBody = errorBody.length > 200 ? errorBody.substring(0, 200) + '...' : errorBody;
      throw new Error(`Register failed: ${status} ${response.statusText()}. Body: ${truncatedBody}`);
    }
    
    // Try to parse JSON, but handle cases where response might be empty or HTML
    try {
      const data = await response.json();
      return data;
    } catch (parseError) {
      // If JSON parsing fails, return empty message object
      return { message: 'User registered successfully' };
    }
  }

  /**
   * Login user
   * POST /users/login
   * Returns access token and sets refresh token as httpOnly cookie
   */
  async login(credentials: LoginUserRequest): Promise<LoginResponse> {
    const response = await this.request.post(`${this.baseUrl}/users/login`, {
      headers: this.getHeaders(),
      data: credentials,
      timeout: 60000, // 60 seconds timeout for login (server may be slow)
    });
    if (!response.ok()) {
      const status = response.status();
      const errorBody = await response.text();
      
      // Check if response is HTML error page (Cloudflare/Render errors)
      const isHtml = errorBody.trim().startsWith('<!DOCTYPE') || errorBody.trim().startsWith('<html');
      
      // For HTML error pages, provide cleaner error message
      if (isHtml) {
        throw new Error(`Login failed: ${status} ${response.statusText()} (Server error - may be transient)`);
      }
      
      // For JSON errors, include truncated body
      const truncatedBody = errorBody.length > 200 ? errorBody.substring(0, 200) + '...' : errorBody;
      throw new Error(`Login failed: ${status} ${response.statusText()}. Body: ${truncatedBody}`);
    }
    
    const data = await response.json();
    // Store token if returned
    if (data.accessToken) {
      this.setAuthToken(data.accessToken);
    }
    return data;
  }

  /**
   * Refresh access token
   * POST /users/refresh
   * Uses refresh token from httpOnly cookie
   */
  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await this.request.post(`${this.baseUrl}/users/refresh`, {
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    if (data.accessToken) {
      this.setAuthToken(data.accessToken);
    }
    return data;
  }

  /**
   * Logout user
   * POST /users/logout
   * Requires authentication
   */
  async logout(): Promise<void> {
    const response = await this.request.post(`${this.baseUrl}/users/logout`, {
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
    this.authToken = undefined;
  }

  /**
   * Request password reset
   * POST /users/forgot-password
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    const response = await this.request.post(`${this.baseUrl}/users/forgot-password`, {
      headers: this.getHeaders(),
      data: request,
    });
    expect(response.ok()).toBeTruthy();
  }

  /**
   * Reset password
   * POST /users/reset-password
   */
  async resetPassword(request: ResetPasswordRequest): Promise<void> {
    const response = await this.request.post(`${this.baseUrl}/users/reset-password`, {
      headers: this.getHeaders(),
      data: request,
    });
    expect(response.ok()).toBeTruthy();
  }

  /**
   * Get all users
   * GET /users
   * Admin only
   */
  async getAllUsers(): Promise<UserResponse[]> {
    const response = await this.request.get(`${this.baseUrl}/users`, {
      headers: this.getHeaders(),
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  /**
   * Get user by ID
   * GET /users/{id}
   * Requires authentication
   */
  async getUserById(id: number | string): Promise<UserResponse> {
    // Convert to string for URL
    const idStr = String(id);
    const response = await this.request.get(`${this.baseUrl}/users/${idStr}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok()) {
      const errorBody = await response.text();
      throw new Error(`Get user failed: ${response.status()} ${response.statusText()}. Body: ${errorBody}`);
    }
    const data = await response.json();
    // Handle wrapped response if needed
    return data.user || data;
  }

  /**
   * Update user
   * PATCH /users/{id}
   * Requires authentication
   */
  async updateUser(id: number | string, updates: UpdateUserRequest): Promise<UserResponse> {
    // Convert to string for URL
    const idStr = String(id);
    const response = await this.request.patch(`${this.baseUrl}/users/${idStr}`, {
      headers: this.getHeaders(),
      data: updates,
    });
    if (!response.ok()) {
      const errorBody = await response.text();
      throw new Error(`Update user failed: ${response.status()} ${response.statusText()}. Body: ${errorBody}`);
    }
    const data = await response.json();
    return data.user || data;
  }

  /**
   * Delete user
   * DELETE /users/{id}
   * Admin only
   */
  async deleteUser(id: number | string): Promise<void> {
    // Convert to string for URL
    const idStr = String(id);
    const response = await this.request.delete(`${this.baseUrl}/users/${idStr}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok()) {
      const errorBody = await response.text();
      throw new Error(`Delete user failed: ${response.status()} ${response.statusText()}. Body: ${errorBody}`);
    }
  }
}

