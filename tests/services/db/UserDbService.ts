import { Client } from 'pg';
import { UserEntity } from '../../models/db/UserEntity';

/**
 * User Database Service
 * Handles all database operations for User entities
 * Based on Prisma schema structure
 */
export class UserDbService {
  constructor(private client: Client) {}

  /**
   * Get all users from database
   */
  async getAllUsers(): Promise<UserEntity[]> {
    const result = await this.client.query('SELECT * FROM users ORDER BY "createdAt" DESC');
    return result.rows.map(this.mapRowToEntity);
  }

  /**
   * Get user by ID from database
   */
  async getUserById(id: number): Promise<UserEntity | null> {
    const result = await this.client.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Get user by email from database
   */
  async getUserByEmail(email: string): Promise<UserEntity | null> {
    const result = await this.client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Get user by username from database
   */
  async getUserByUsername(username: string): Promise<UserEntity | null> {
    const result = await this.client.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Create a new user in database
   * Note: Password should be hashed before calling this method
   */
  async createUser(
    username: string,
    email: string,
    password: string,
    role: 'client' | 'admin' = 'client',
    age?: number
  ): Promise<UserEntity> {
    const result = await this.client.query(
      'INSERT INTO users (username, email, "hashedPassword", role, age) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [username, email, password, role, age || null]
    );
    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Update a user in database
   */
  async updateUser(
    id: number,
    updates: {
      username?: string;
      email?: string;
      password?: string;
      role?: 'client' | 'admin';
      age?: number | null;
    }
  ): Promise<UserEntity> {
    const updatesList: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.username !== undefined) {
      updatesList.push(`username = $${paramIndex++}`);
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      updatesList.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.password !== undefined) {
      updatesList.push(`"hashedPassword" = $${paramIndex++}`);
      values.push(updates.password);
    }
    if (updates.role !== undefined) {
      updatesList.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }
    if (updates.age !== undefined) {
      updatesList.push(`age = $${paramIndex++}`);
      values.push(updates.age);
    }

    // Update updatedAt timestamp
    updatesList.push(`"updatedAt" = NOW()`);
    
    // Ensure we have at least one update field
    if (updatesList.length === 0) {
      throw new Error('No fields to update');
    }
    
    // Add id as the last parameter for WHERE clause
    values.push(id);
    const whereParamIndex = paramIndex++;

    const query = `UPDATE users SET ${updatesList.join(', ')} WHERE id = $${whereParamIndex} RETURNING *`;
    const result = await this.client.query(query, values);
    return this.mapRowToEntity(result.rows[0]);
  }

  /**
   * Delete a user from database
   */
  async deleteUser(id: number): Promise<void> {
    await this.client.query('DELETE FROM users WHERE id = $1', [id]);
  }

  /**
   * Delete all users (useful for cleanup)
   */
  async deleteAllUsers(): Promise<void> {
    await this.client.query('DELETE FROM users');
  }

  /**
   * Delete user by email
   */
  async deleteUserByEmail(email: string): Promise<void> {
    await this.client.query('DELETE FROM users WHERE email = $1', [email]);
  }

  /**
   * Delete user by username
   */
  async deleteUserByUsername(username: string): Promise<void> {
    await this.client.query('DELETE FROM users WHERE username = $1', [username]);
  }

  /**
   * Map database row to UserEntity
   */
  private mapRowToEntity(row: any): UserEntity {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      password: row.hashedPassword, // Map from camelCase DB column to snake_case entity
      role: row.role,
      age: row.age,
      created_at: row.createdAt ? new Date(row.createdAt) : new Date(), // Map from camelCase DB column
      updated_at: row.updatedAt ? new Date(row.updatedAt) : new Date(), // Map from camelCase DB column
    };
  }
}

