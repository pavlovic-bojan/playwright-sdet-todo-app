/**
 * User API Response Model
 * Based on Swagger API documentation
 */
export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: 'client' | 'admin';
  age?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * User Registration Request
 */
export interface RegisterUserRequest {
  username: string; // Required
  email: string; // Required
  password: string; // Required
  role?: 'client' | 'admin'; // Optional, defaults to 'client'
  age?: number; // Optional
}

/**
 * User Login Request
 */
export interface LoginUserRequest {
  username: string; // Required
  password: string; // Required
}

/**
 * Login Response
 */
export interface LoginResponse {
  accessToken: string;
  user: UserResponse;
}

/**
 * Update User Request
 */
export interface UpdateUserRequest {
  email?: string;
  password?: string;
  role?: 'client' | 'admin';
  age?: number;
}

/**
 * Forgot Password Request
 */
export interface ForgotPasswordRequest {
  email: string; // Required
}

/**
 * Reset Password Request
 */
export interface ResetPasswordRequest {
  resetToken: string; // Required
  newPassword: string; // Required
}