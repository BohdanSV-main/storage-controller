import type { User } from '../../modules/auth/user.types.js';
import type { PasswordHasher } from '../../modules/auth/password-hasher.js';

export async function createSeedUsers(
  passwordHasher: PasswordHasher,
): Promise<User[]> {
  return [
    {
      id: 1,
      name: 'Біба',
      email: 'biba@example.com',
      passwordHash: await passwordHasher.hash('User-one-123!'),
      role: 'USER',
    },
    {
      id: 2,
      name: 'Боба',
      email: 'boba@example.com',
      passwordHash: await passwordHasher.hash('User-two-123!'),
      role: 'USER',
    },
    {
      id: 3,
      name: 'Працівник',
      email: 'worker@example.com',
      passwordHash: await passwordHasher.hash('Worker-123!'),
      role: 'WORKER',
    },
  ];
}
