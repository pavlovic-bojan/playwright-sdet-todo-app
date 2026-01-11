import { UserResponse } from './UserResponse';

/**
 * Todo API Response Model
 * Based on Swagger API documentation
 */
export interface TodoResponse {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  userId: number;
  createdAt: string; // ISO date-time string
  updatedAt: string; // ISO date-time string
  user?: UserResponse; // Optional user object
}

export interface CreateTodoRequest {
  title: string; // Required
  description?: string; // Optional
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface GetTodosQueryParams {
  completed?: boolean; // Filter by completion status
  userId?: number; // Filter by user ID (Admin only)
}