import { expect, test, vi } from 'vitest';
import { createReservationService } from './reservation.service.js';
import type { ReservationRepo } from './reservation.repository.js';
const user = {
  id: 7,
  name: 'User',
  email: 'user@example.com',
  role: 'USER' as const,
};
const worker = { ...user, id: 8, role: 'WORKER' as const };
const input = { productId: 1, quantity: 2, idempotencyKey: 'key' };
function setup() {
  const repo = {
    create: vi
      .fn<ReservationRepo['create']>()
      .mockResolvedValue({ kind: 'product-not-found' }),
    cancel: vi
      .fn<ReservationRepo['cancel']>()
      .mockResolvedValue({ kind: 'not-found' }),
    issue: vi
      .fn<ReservationRepo['issue']>()
      .mockResolvedValue({ kind: 'not-found' }),
  };
  return { repo, service: createReservationService(repo) };
}
test('role checks happen before repository calls', async () => {
  const { repo, service } = setup();
  expect(await service.create(worker, input)).toEqual({ kind: 'forbidden' });
  expect(await service.cancel(worker, 1)).toEqual({ kind: 'forbidden' });
  expect(await service.issue(user, 1)).toEqual({ kind: 'forbidden' });
  for (const method of Object.values(repo))
    expect(method).not.toHaveBeenCalled();
});
test.each([0, -1, 1.5, NaN, Infinity, 2147483648])(
  'rejects invalid quantity %s',
  async (quantity) => {
    const { repo, service } = setup();
    expect(await service.create(user, { ...input, quantity })).toEqual({
      kind: 'validation-error',
    });
    expect(repo.create).not.toHaveBeenCalled();
  },
);
test('uses authenticated user and worker IDs', async () => {
  const { repo, service } = setup();
  await service.create(user, input);
  await service.cancel(user, 1);
  await service.issue(worker, 1);
  expect(repo.create).toHaveBeenCalledWith({ ...input, userId: 7 });
  expect(repo.cancel).toHaveBeenCalledWith({ reservationId: 1, userId: 7 });
  expect(repo.issue).toHaveBeenCalledWith({ reservationId: 1, workerId: 8 });
});

test.each([1, 2147483647])('accepts boundary value %s', async (value) => {
  const { repo, service } = setup();
  const command = { ...input, productId: value, quantity: value };

  expect(await service.create(user, command)).toEqual({
    kind: 'product-not-found',
  });
  expect(repo.create).toHaveBeenCalledWith({ ...command, userId: user.id });
});

test('rejects an invalid product ID', async () => {
  const { repo, service } = setup();

  expect(await service.create(user, { ...input, productId: 0 })).toEqual({
    kind: 'validation-error',
  });
  expect(repo.create).not.toHaveBeenCalled();
});

test.each(['', '   ', 'k'.repeat(129), 123])(
  'rejects invalid key %j',
  async (key) => {
    const { repo, service } = setup();
    const command = { ...input, idempotencyKey: key as string };

    expect(await service.create(user, command)).toEqual({
      kind: 'validation-error',
    });
    expect(repo.create).not.toHaveBeenCalled();
  },
);

test('accepts a 128-character key', async () => {
  const { repo, service } = setup();
  const command = { ...input, idempotencyKey: 'k'.repeat(128) };

  expect(await service.create(user, command)).toEqual({
    kind: 'product-not-found',
  });
  expect(repo.create).toHaveBeenCalledWith({ ...command, userId: user.id });
});

test.each([0, -1, 1.5, NaN, Infinity, 2147483648])(
  'rejects invalid reservation ID %s',
  async (id) => {
    const { repo, service } = setup();

    expect(await service.cancel(user, id)).toEqual({
      kind: 'validation-error',
    });
    expect(await service.issue(worker, id)).toEqual({
      kind: 'validation-error',
    });
    expect(repo.cancel).not.toHaveBeenCalled();
    expect(repo.issue).not.toHaveBeenCalled();
  },
);
