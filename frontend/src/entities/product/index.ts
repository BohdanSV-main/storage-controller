import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api';

export interface Product {
  id: number;
  articleCode: string;
  name: string;
  desc: string;
  available: number;
}
export const productsKey = ['products'] as const;
export function useProducts() {
  return useQuery({
    queryKey: productsKey,
    queryFn: ({ signal }) => api<Product[]>('/products', { signal }),
  });
}
