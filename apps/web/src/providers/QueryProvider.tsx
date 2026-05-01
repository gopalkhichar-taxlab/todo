'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type ReactNode, useState } from 'react';
import { ApiClientError } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// QueryClient factory
// ---------------------------------------------------------------------------

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 30 seconds stale time — balances freshness vs. re-fetch noise
        staleTime: 30_000,
        // Retry up to 2 times, but never on 401/403/404
        retry: (failureCount, error) => {
          if (error instanceof ApiClientError) {
            if ([401, 403, 404].includes(error.status)) return false;
          }
          return failureCount < 2;
        },
        // Show cached data while re-fetching
        refetchOnWindowFocus: false,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState<QueryClient>(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
