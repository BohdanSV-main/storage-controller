import type { ProductWithStock } from './product.types.js';

export interface CatalogRepo {
  findAllWithStock(): Promise<ProductWithStock[]>;
}
