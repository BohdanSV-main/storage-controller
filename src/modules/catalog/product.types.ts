export interface Product {
  id: number;
  articleCode: string;
  name: string;
  desc: string;
}

export interface Stock {
  productId: number;
  onHand: number;
  reserved: number;
}

export interface CatalogItem extends Product {
  available: number;
}

export interface ProductWithStock extends Product {
  stock: Stock;
}
