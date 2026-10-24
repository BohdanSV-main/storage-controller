import type { CatalogRepo } from '../../modules/catalog/catalog.repository.js';
import type { ProductWithStock } from '../../modules/catalog/product.types.js';
import type { MemoryStore } from './memory-store.js';

export function createMemoryCatalogRepo(store: MemoryStore): CatalogRepo {
  return {
    async findAllWithStock(): Promise<ProductWithStock[]> {
      return [...store.products.values()]
        .map((product) => ({
          ...product,
          stock: { ...product.stock },
        }))
        .sort((first, second) => first.id - second.id);
    },
  };
}
