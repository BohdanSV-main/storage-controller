import type { User } from '../../modules/auth/user.types.js';
import type { UserRepo } from '../../modules/auth/user.repository.js';

export function createMemoryUserRepo(initialUsers: readonly User[]): UserRepo {
  const users = initialUsers.map((user) => ({ ...user }));

  return {
    async findById(id: number): Promise<User | null> {
      const user = users.find((user) => user.id === id);

      return user ? { ...user } : null;
    },
    async findByEmail(email: string): Promise<User | null> {
      const user = users.find((user) => user.email === email);

      return user ? { ...user } : null;
    },
  };
}
