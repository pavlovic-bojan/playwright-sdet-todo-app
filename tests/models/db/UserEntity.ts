/**
 * User Database Entity Model
 * Based on Prisma schema structure
 */
export interface UserEntity {
  id: number;
  username: string;
  email: string;
  password: string; // Hashed password
  role: 'client' | 'admin';
  age?: number | null;
  created_at: Date;
  updated_at: Date;
}

