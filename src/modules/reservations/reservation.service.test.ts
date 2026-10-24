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
