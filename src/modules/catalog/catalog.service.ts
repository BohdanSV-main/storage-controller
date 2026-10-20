import type { CatalogRepo } from './catalog.repository.js';
import type { CatalogItem } from './product.types.js';

export interface CatalogService {
  getCatalog(): Promise<CatalogItem[]>;
}

export function createCatalogService(catalogRepo: CatalogRepo): CatalogService {
  return {
    async getCatalog(): Promise<CatalogItem[]> {
      const products = await catalogRepo.findAllWithStock();

      return products.map((product) => ({
        id: product.id,
        articleCode: product.articleCode,
        name: product.name,
        desc: product.desc,
        available: product.stock.onHand - product.stock.reserved,
      }));
    },
  };
}
