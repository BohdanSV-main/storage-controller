import { expect, test } from 'vitest';
import { createMemoryStore } from './memory-store.js';
import { createMemoryReservationRepo } from './reservation.memory-repository.js';
const product = {
  id: 1,
  articleCode: 'KB-001',
  name: 'Keyboard',
  desc: '',
  stock: { productId: 1, onHand: 5, reserved: 0 },
};
const input = { userId: 1, productId: 1, quantity: 3, idempotencyKey: 'first' };
function setup() {
  const store = createMemoryStore([product]);
  return { store, repo: createMemoryReservationRepo(store) };
}
test('simultaneous requests cannot overbook stock', async () => {
  const { repo, store } = setup();
  const results = await Promise.all([
    repo.create(input),
    repo.create({ ...input, idempotencyKey: 'second' }),
  ]);
  expect(results.map((item) => item.kind).sort()).toEqual([
    'created',
    'insufficient-stock',
  ]);
  expect(store.reservations.size).toBe(1);
  expect(store.products.get(1)?.stock.reserved).toBe(3);
});
test('simultaneous retries create one reservation', async () => {
  const { repo, store } = setup();
  const results = await Promise.all([repo.create(input), repo.create(input)]);
  expect(results.map((item) => item.kind).sort()).toEqual([
    'created',
    'replayed',
  ]);
  expect(store.reservations.size).toBe(1);
  expect(store.products.get(1)?.stock.reserved).toBe(3);
});
test('returned objects cannot change stored reservations', async () => {
  const { repo, store } = setup();
  const result = await repo.create(input);
  if (result.kind !== 'created') throw new Error('Expected reservation');
  result.reservation.quantity = 100;
  result.reservation.createdAt.setFullYear(2000);
  expect(store.reservations.get(result.reservation.id)?.quantity).toBe(3);
  expect(
    store.reservations.get(result.reservation.id)?.createdAt.getFullYear(),
  ).not.toBe(2000);
});
