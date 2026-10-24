import type { PrismaClient } from '../../generated/prisma/client.js';
import type { CatalogRepo } from '../../modules/catalog/catalog.repository.js';
import type { ProductWithStock } from '../../modules/catalog/product.types.js';

export function createPrismaCatalogRepo(prisma: PrismaClient): CatalogRepo {
  return {
    async findAllWithStock(): Promise<ProductWithStock[]> {
      const products = await prisma.product.findMany({
        include: {
          stock: true,
        },
        orderBy: {
          id: 'asc',
        },
      });

      return products.map((product) => {
        if (!product.stock) {
          throw new Error(`Stock record is missing for product ${product.id}.`);
        }

        return {
          id: product.id,
          articleCode: product.articleCode,
          name: product.name,
          desc: product.desc,
          stock: {
            productId: product.stock.productId,
            onHand: product.stock.onHand,
            reserved: product.stock.reserved,
          },
        };
      });
    },
  };
}
