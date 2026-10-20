import { expect, test } from 'vitest';
import { argon2Hasher } from './argon2-password-hasher.js';

test('accepts the correct password and rejects an incorrect one', async () => {
  const password = 'Example-password-123';
  const passwordHash = await argon2Hasher.hash(password);

  expect(passwordHash).not.toBe(password);

  expect(await argon2Hasher.verify(passwordHash, password)).toBe(true);

  expect(await argon2Hasher.verify(passwordHash, 'wrong-password')).toBe(false);
});
