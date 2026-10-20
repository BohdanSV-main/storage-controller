import { beforeEach, expect, test, vi } from 'vitest';
import { createAuthService } from './auth.service.js';
import { createMemoryUserRepo } from '../../infrastructure/memory/user.memory-repository.js';
import { argon2Hasher } from '../../infrastructure/security/argon2-password-hasher.js';

const email = 'bohdan@example.com';
const password = 'Test-password-123!';

let userRepo: ReturnType<typeof createMemoryUserRepo>;
let authService: ReturnType<typeof createAuthService>;

beforeEach(async () => {
  userRepo = createMemoryUserRepo([
    {
      id: 1,
      name: 'Богдан',
      email,
      passwordHash: await argon2Hasher.hash(password),
      role: 'USER',
    },
  ]);

  authService = createAuthService({
    userRepo,
    passwordHasher: argon2Hasher,
  });
});

test('returns public user data for valid credentials', async () => {
  const result = await authService.authenticate(email, password);

  expect(result).toEqual({
    id: 1,
    name: 'Богдан',
    email: 'bohdan@example.com',
    role: 'USER',
  });
});

test('returns null for an incorrect password', async () => {
  const result = await authService.authenticate(email, 'wrong-password');

  expect(result).toBeNull();
});

test('returns null for an unknown email', async () => {
  const result = await authService.authenticate(
    'unknown@example.com',
    password,
  );

  expect(result).toBeNull();
});

test('propagates repository failures', async () => {
  const storageError = new Error('Storage unavailable');

  vi.spyOn(userRepo, 'findByEmail').mockRejectedValueOnce(storageError);

  await expect(authService.authenticate(email, password)).rejects.toBe(
    storageError,
  );
});
