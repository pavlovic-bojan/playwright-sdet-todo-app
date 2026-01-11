import { Client } from 'pg';
import { TodoEntity } from '../../models/db/TodoEntity';

/**
 * Todo Database Service
 * Handles all database operations for Todo entities
 * Based on Prisma schema structure
 */
export class TodoDbService {
  constructor(private client: Client) {}

  /**
   * Get all todos from database
   */
  async getAllTodos(): Promise<TodoEntity[]> {
    const result = await this.client.query('SELECT * FROM todos ORDER BY "createdAt" DESC');
    return result.rows.map(this.mapRowToEntity);
  }

  /**
   * Get todo by ID from database
   */
  async getTodoById(id: number): Promise<TodoEntity | null> {
    const result = await this.client.query('SELECT * FROM todos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Create a new todo in database
   * Note: userId is required in the actual schema
   */
  async createTodo(title: string, userId: number, description?: string): Promise<TodoEntity> {
    const result = await this.client.query(
      'INSERT INTO todos (title, description, completed, "userId") VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description || null, false, userId]
    );
    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Update a todo in database
   */
  async updateTodo(
    id: number,
    updates: { title?: string; description?: string; completed?: boolean }
  ): Promise<TodoEntity> {
    const updatesList: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      updatesList.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      updatesList.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.completed !== undefined) {
      updatesList.push(`completed = $${paramIndex++}`);
      values.push(updates.completed);
    }

    updatesList.push(`"updatedAt" = NOW()`);
    values.push(id);
    const whereParamIndex = paramIndex;

    const query = `UPDATE todos SET ${updatesList.join(', ')} WHERE id = $${whereParamIndex} RETURNING *`;
    const result = await this.client.query(query, values);
    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Delete a todo from database
   */
  async deleteTodo(id: number): Promise<void> {
    await this.client.query('DELETE FROM todos WHERE id = $1', [id]);
  }

  /**
   * Delete all todos (useful for cleanup)
   */
  async deleteAllTodos(): Promise<void> {
    await this.client.query('DELETE FROM todos');
  }

  /**
   * Get todos by user ID
   */
  async getTodosByUserId(userId: number): Promise<TodoEntity[]> {
    const result = await this.client.query('SELECT * FROM todos WHERE "userId" = $1 ORDER BY "createdAt" DESC', [userId]);
    return result.rows.map(this.mapRowToEntity);
  }

  /**
   * Map database row to TodoEntity
   */
  private mapRowToEntity(row: any): TodoEntity {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: row.completed,
      userId: row.userId, // Map from camelCase DB column
      created_at: row.createdAt ? new Date(row.createdAt) : new Date(), // Map from camelCase DB column
      updated_at: row.updatedAt ? new Date(row.updatedAt) : new Date(), // Map from camelCase DB column
    };
  }
}
