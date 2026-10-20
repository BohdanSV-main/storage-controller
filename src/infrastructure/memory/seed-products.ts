import type { ProductWithStock } from '../../modules/catalog/product.types.js';

export function createSeedProducts(): ProductWithStock[] {
  return [
    {
      id: 1,
      articleCode: 'ITEM-001',
      name: 'Клавіатура',
      desc: 'Дротова USB-клавіатура',
      stock: {
        productId: 1,
        onHand: 10,
        reserved: 0,
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
        reserved: 0,
      },
    },
    {
      id: 3,
      articleCode: 'ITEM-003',
      name: 'Монітор',
      desc: 'Монітор 24 дюйми',
      stock: {
        productId: 3,
        onHand: 0,
        reserved: 0,
      },
    },
  ];
}
