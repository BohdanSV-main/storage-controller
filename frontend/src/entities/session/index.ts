import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../../shared/api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'WORKER';
}
export const sessionKey = ['session'] as const;

export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: async () => {
      try {
        return await api<User>('/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 30_000,
    retry: false,
  });
}
