/**
 * Todo Database Entity Model
 * Based on Prisma schema structure
 */
export interface TodoEntity {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  userId: number;
  created_at: Date;
  updated_at: Date;
}
