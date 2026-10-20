import { expect, test } from 'vitest';
import { createCatalogService } from './catalog.service.js';
import type { CatalogRepo } from './catalog.repository.js';

test('calculates available stock and returns only catalog fields', async () => {
  const repo: CatalogRepo = {
    async findAllWithStock() {
      return [
        {
          id: 1,
          articleCode: 'ITEM-001',
          name: 'Клавіатура',
          desc: 'Дротова USB-клавіатура',
          stock: {
            productId: 1,
            onHand: 10,
            reserved: 2,
          },
        },
        {
          id: 2,
          articleCode: 'ITEM-002',
          name: 'Миша',
          desc: 'Дротова USB-миша',
          stock: {
            productId: 2,
            onHand: 5,
            reserved: 5,
          },
        },
      ];
    },
  };

  const service = createCatalogService(repo);

  const result = await service.getCatalog();

  expect(result).toEqual([
    {
      id: 1,
      articleCode: 'ITEM-001',
      name: 'Клавіатура',
      desc: 'Дротова USB-клавіатура',
      available: 8,
    },
    {
      id: 2,
      articleCode: 'ITEM-002',
      name: 'Миша',
      desc: 'Дротова USB-миша',
      available: 0,
    },
  ]);
});

test('returns an empty catalog when there are no products', async () => {
  const repo: CatalogRepo = {
    async findAllWithStock() {
      return [];
    },
  };

  const service = createCatalogService(repo);

  expect(await service.getCatalog()).toEqual([]);
});

test('propagates repository failures', async () => {
  const failure = new Error('Storage is unavailable');

  const repo: CatalogRepo = {
    async findAllWithStock() {
      throw failure;
    },
  };

  const service = createCatalogService(repo);

  await expect(service.getCatalog()).rejects.toBe(failure);
});
