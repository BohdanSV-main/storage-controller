import { useState, type ReactNode } from 'react';
import {
  QueryCache,
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ApiError } from '../../shared/api';
import { sessionKey } from '../../entities/session';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const onError = (error: Error) => {
      if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
        void queryClient.cancelQueries().then(() => {
          queryClient.removeQueries({
            predicate: (query) => query.queryKey[0] !== 'session',
          });
          queryClient.setQueryData(sessionKey, null);
        });
      }
    };
    const queryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 15_000,
          refetchOnWindowFocus: true,
        },
        mutations: { retry: false },
      },
    });
    return queryClient;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
