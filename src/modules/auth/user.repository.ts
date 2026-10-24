import type { User } from './user.types.js';

export interface UserRepo {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}
